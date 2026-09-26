'use strict';

const fs = require('fs');
const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

function electronBinary(context) {
  const product = context.packager.appInfo.productFilename;
  if (context.electronPlatformName === 'darwin') {
    return path.join(context.appOutDir, product + '.app', 'Contents', 'MacOS', product);
  }
  if (context.electronPlatformName === 'win32') {
    return path.join(context.appOutDir, product + '.exe');
  }
  return path.join(context.appOutDir, product);
}

function assertPresent(file) {
  if (!fs.existsSync(file)) {
    throw new Error('The package is missing ' + file + '. Electron cannot start without that runtime file.');
  }
}

function assertWindowsRuntime(appOutDir) {
  for (const name of ['snapshot_blob.bin', 'v8_context_snapshot.bin', 'resources.pak', 'icudtl.dat', 'ffmpeg.dll']) {
    assertPresent(path.join(appOutDir, name));
  }
  assertPresent(path.join(appOutDir, 'resources', 'app.asar'));
}

module.exports = async function hardenFuses(context) {
  if (context.electronPlatformName === 'win32') assertWindowsRuntime(context.appOutDir);
  await flipFuses(electronBinary(context), {
    version: FuseVersion.V1,
    strictlyRequireAllFuses: true,
    resetAdHocDarwinSignature: context.electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    // Stock Electron ships snapshot_blob.bin and v8_context_snapshot.bin beside the executable.
    // browser_v8_context_snapshot.bin is not part of that runtime.
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false
  });
};
