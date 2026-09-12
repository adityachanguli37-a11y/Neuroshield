const mongoose = require('mongoose');

let installed = false;

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function getPathValue(doc, path) {
  return path.split('.').reduce((current, segment) => {
    if (current == null) return undefined;
    return current[segment];
  }, doc);
}

function toComparable(value) {
  if (value == null) return value;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (Array.isArray(value)) {
    return value.map(toComparable);
  }

  if (typeof value === 'object') {
    if (typeof value.valueOf === 'function') {
      const primitive = value.valueOf();
      if (primitive !== value) {
        return toComparable(primitive);
      }
    }

    if (typeof value.toString === 'function') {
      const stringValue = value.toString();
      if (stringValue !== '[object Object]') {
        return stringValue;
      }
    }
  }

  return value;
}

function compareValues(left, right) {
  const a = toComparable(left);
  const b = toComparable(right);

  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function matchesCondition(actual, expected) {
  if (expected instanceof RegExp) {
    return expected.test(String(actual ?? ''));
  }

  if (isPlainObject(expected)) {
    const keys = Object.keys(expected);
    const hasOperator = keys.some((key) => key.startsWith('$'));

    if (hasOperator) {
      if (Array.isArray(expected.$in)) {
        return expected.$in.some((candidate) => compareValues(actual, candidate) === 0);
      }

      if (Array.isArray(expected.$nin)) {
        return !expected.$nin.some((candidate) => compareValues(actual, candidate) === 0);
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$ne')) {
        return compareValues(actual, expected.$ne) !== 0;
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$eq')) {
        return compareValues(actual, expected.$eq) === 0;
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$exists')) {
        return expected.$exists ? actual !== undefined : actual === undefined;
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$gte')) {
        return compareValues(actual, expected.$gte) >= 0;
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$gt')) {
        return compareValues(actual, expected.$gt) > 0;
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$lte')) {
        return compareValues(actual, expected.$lte) <= 0;
      }

      if (Object.prototype.hasOwnProperty.call(expected, '$lt')) {
        return compareValues(actual, expected.$lt) < 0;
      }
    }

    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  return compareValues(actual, expected) === 0;
}

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([path, expected]) => {
    if (path === '$or' && Array.isArray(expected)) {
      return expected.some((subQuery) => matchesQuery(doc, subQuery));
    }

    if (path === '$and' && Array.isArray(expected)) {
      return expected.every((subQuery) => matchesQuery(doc, subQuery));
    }

    if (path === '$nor' && Array.isArray(expected)) {
      return !expected.some((subQuery) => matchesQuery(doc, subQuery));
    }

    const actual = getPathValue(doc, path);
    return matchesCondition(actual, expected);
  });
}

function sortDocuments(documents, sortSpec = {}) {
  const entries = Object.entries(sortSpec);
  if (entries.length === 0) return [...documents];

  return [...documents].sort((left, right) => {
    for (const [path, direction] of entries) {
      const compare = compareValues(getPathValue(left, path), getPathValue(right, path));
      if (compare !== 0) {
        return direction < 0 ? -compare : compare;
      }
    }

    return 0;
  });
}

class InMemoryQuery {
  constructor(model, query = {}, { single = false } = {}) {
    this.model = model;
    this.query = query;
    this.single = single;
    this.sortSpec = null;
    this.limitCount = null;
  }

  select() {
    return this;
  }

  sort(sortSpec = {}) {
    this.sortSpec = sortSpec;
    return this;
  }

  limit(limitCount) {
    this.limitCount = limitCount;
    return this;
  }

  exec() {
    let results = this.model.__memoryStore.filter((doc) => matchesQuery(doc, this.query));

    if (this.sortSpec) {
      results = sortDocuments(results, this.sortSpec);
    }

    if (this.limitCount !== null && this.limitCount !== undefined) {
      results = results.slice(0, this.limitCount);
    }

    return this.single ? (results[0] || null) : results;
  }

  then(resolve, reject) {
    return Promise.resolve(this.exec()).then(resolve, reject);
  }

  catch(reject) {
    return Promise.resolve(this.exec()).catch(reject);
  }
}

function attachInMemoryBackend(model) {
  if (!model || model.__inMemoryBackendInstalled) {
    return model;
  }

  const store = [];

  Object.defineProperty(model, '__memoryStore', {
    value: store,
    enumerable: false,
    configurable: false,
    writable: false
  });

  model.__resetStore = function resetStore() {
    store.splice(0, store.length);
  };

  model.find = function find(query = {}) {
    return new InMemoryQuery(model, query, { single: false });
  };

  model.findOne = function findOne(query = {}) {
    return new InMemoryQuery(model, query, { single: true });
  };

  model.findById = function findById(id) {
    return new InMemoryQuery(model, { _id: id }, { single: true });
  };

  model.countDocuments = async function countDocuments(query = {}) {
    return store.filter((doc) => matchesQuery(doc, query)).length;
  };

  model.create = async function create(doc) {
    if (Array.isArray(doc)) {
      return Promise.all(doc.map((entry) => model.create(entry)));
    }

    const instance = new model(doc);
    await instance.save();
    return instance;
  };

  model.prototype.save = async function saveInMemory() {
    if (typeof this.validate === 'function') {
      await this.validate();
    }

    const timestamps = this.schema && this.schema.options && this.schema.options.timestamps;
    if (timestamps) {
      const createdAtKey = typeof timestamps === 'object' && timestamps.createdAt ? timestamps.createdAt : 'createdAt';
      const updatedAtKey = typeof timestamps === 'object' && timestamps.updatedAt ? timestamps.updatedAt : 'updatedAt';
      const now = new Date();

      if (!this[createdAtKey]) {
        this[createdAtKey] = now;
      }

      this[updatedAtKey] = now;
    }

    const index = store.findIndex((doc) => String(doc._id) === String(this._id));
    if (index >= 0) {
      store[index] = this;
    } else {
      store.push(this);
    }

    this.isNew = false;
    if (this.$__) {
      this.$__.isNew = false;
    }

    return this;
  };

  model.watch = function watch() {
    return {
      on() {
        return this;
      },
      close() {}
    };
  };

  model.__inMemoryBackendInstalled = true;
  return model;
}

function installInMemoryMongoose() {
  if (installed) {
    return;
  }

  installed = true;

  const originalModel = mongoose.model.bind(mongoose);
  const originalConnect = mongoose.connect.bind(mongoose);
  const originalDisconnect = mongoose.disconnect.bind(mongoose);

  mongoose.model = function patchedModel(name, schema, collection, options) {
    if (schema) {
      const model = mongoose.models[name] || originalModel(name, schema, collection, options);
      return attachInMemoryBackend(model);
    }

    return attachInMemoryBackend(originalModel(name));
  };

  mongoose.connect = async function connectInMemory() {
    return mongoose;
  };

  mongoose.disconnect = async function disconnectInMemory() {
    return mongoose;
  };

  mongoose.__restoreConnectionMethods = function restoreConnectionMethods() {
    mongoose.connect = originalConnect;
    mongoose.disconnect = originalDisconnect;
  };

  for (const model of Object.values(mongoose.models)) {
    attachInMemoryBackend(model);
  }
}

module.exports = {
  installInMemoryMongoose
};
