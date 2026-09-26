'use strict';

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

module.exports = async function hardenFuses(context) {
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
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false
  });
};
