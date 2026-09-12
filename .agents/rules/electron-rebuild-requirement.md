# Electron Automatic Rebuild Requirement

Whenever you modify or update the NeuroShield Electron project, you must also rebuild the Windows application before considering the task complete.

## Mandatory Workflow (Every Time)

1. Inspect the existing `package.json` and determine the configured Electron build command.
2. Verify that Electron and the configured packaging tool (`electron-builder`) are correctly installed.
3. If the Electron installation is broken or incomplete, repair it safely before building.
4. Run the project development/test command and verify that the application starts successfully.
5. Build the Windows application using the project existing build configuration.
6. Generate a fresh Windows `.exe` installer in the configured output directory (`dist/`).
7. Verify that the newly generated `.exe` actually contains the latest source-code changes.
8. Do not simply reuse or report an old `.exe`.
9. If the build fails, diagnose and fix the underlying problem rather than stopping after reporting the error.
10. Do not modify unrelated project functionality while fixing the build.
11. Preserve the existing Electron version and package versions unless a version change is genuinely required.

## Build Commands (NeuroShield)

- **Dev/test**: `npm run dev` -> `electron .`
- **Package/build**: `npm run dist` -> `electron-builder --win nsis`
- **Output directory**: `dist/`

## Post-Build Report

After a successful build, clearly report:

- Build command used
- Build status
- Exact location of the new `.exe`
- Whether Electron packaging succeeded
- Any remaining warnings or errors

## Electron Dependency Recovery

If an error such as "Electron failed to install correctly, please delete node_modules/electron and try installing again" appears:

1. Stop the build.
2. Inspect `package.json` and `package-lock.json`.
3. Remove the broken install: `Remove-Item -Recurse -Force node_modules/electron`
4. Reinstall dependencies: `npm install`
5. Verify Electron with: `npx electron --version`
6. Retry the build: `npm run dist`
7. Do NOT blindly upgrade Electron to the latest version - use the project declared version (`^34.2.0`).

## Completion Definition

A task is NOT complete merely because the source code was modified.

The task is complete only after:
  Source code updated
  -> dependencies verified
  -> application tested
  -> Windows build executed (npm run dist)
  -> new .exe generated in dist/
  -> build result verified

If any step fails, fix the issue and retry until the build succeeds, or explain the specific blocking issue with the exact terminal error.
