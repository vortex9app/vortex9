from __future__ import annotations

STEALTH_INIT_SCRIPT = """
(() => {
  const spoof = (object, key, value) => {
    try {
      Object.defineProperty(object, key, { get: () => value, configurable: true });
    } catch (error) {
      /* ignore locked descriptors */
    }
  };

  spoof(navigator, "webdriver", undefined);
  spoof(navigator, "languages", ["en-GB", "en-US", "en"]);
  spoof(navigator, "language", "en-GB");
  spoof(navigator, "platform", "Win32");
  spoof(navigator, "hardwareConcurrency", 8);
  spoof(navigator, "deviceMemory", 8);
  spoof(navigator, "maxTouchPoints", 0);

  if (!window.chrome) {
    window.chrome = { runtime: {} };
  }

  const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters) => (
      parameters && parameters.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery.call(window.navigator.permissions, parameters)
    );
  }

  const pluginData = [
    { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
    { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
    { name: "Native Client", filename: "internal-nacl-plugin" },
  ];
  spoof(navigator, "plugins", pluginData);
})();
"""
