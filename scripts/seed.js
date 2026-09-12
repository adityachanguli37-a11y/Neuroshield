const { connectDatabase, disconnectDatabase } = require('../server/config/database');
const { autoSeedDatabase } = require('../server/utils/autoSeed');

async function runSeed() {
  console.log('[Seed] Initializing database connection for seeding...');
  await connectDatabase();
  const res = await autoSeedDatabase(true);
  if (res.seeded) {
    console.log('[Seed] Database successfully seeded with demo accounts.');
  } else {
    console.log('[Seed] Seeding notice:', res.reason || res.error);
  }
  await disconnectDatabase();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('[Seed] Seeding failed:', err.message);
  process.exit(1);
});
