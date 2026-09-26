# Vortex9 desktop build

© 2026 Mampi Technologies Ltd. All rights reserved.

The app lives in `desktop/vortex9`. Installers are written to `desktop/vortex9/dist`, which is excluded from the mystic9.net web deploy. Publish those files to the GitHub release used by the `/vortex9` download buttons. Do not put `.exe` or `.app` files in the website folder.

## Windows `.exe`

From `desktop/vortex9` on Windows:

```
npm install
npm run check
npm run build:win
```

`npm run build:win` writes `desktop/vortex9/dist/Vortex9-Windows-Setup.exe`. The Windows build is unsigned so it can be produced without a code-signing certificate. Windows SmartScreen will warn until the installer is signed. Upload that file to the Windows release URL on the `/vortex9` page.

## macOS `.app`

Build this on a Mac. electron-builder produces a disk image that contains `Vortex9.app`.

```
npm install
npm run check
npm run build:mac
```

The downloadable file is `desktop/vortex9/dist/Vortex9-macOS.dmg`. Open it and drag Vortex9 to Applications. The `.app` bundle is inside the disk image. Upload that disk image to the macOS release URL on the `/vortex9` page.

`npm start` runs the unpackaged app on either platform after `npm install`.
