let isCustomStyleLoaded = false;

// Bump on every stylesheet change; keep in sync with package.json version. Used
// as the cache-bust token so the browser CAN cache the sheet and only re-fetches
// it on an upgrade (a Date.now() token would re-download it on every page load).
const CSS_VERSION = "1.2.0";

export function loadCustomStyleOnce() {
  if (isCustomStyleLoaded) {
    return;
  }

  try {
    const sCorrectPath = sap.ui.require.toUrl("ui5-smart-access/css/style.css");

    const link = document.createElement("link");
    link.id = "ui5-smart-access-styles";
    link.rel = "stylesheet";
    link.type = "text/css";
    // Version-based cache-bust: refreshes on upgrade, cacheable in between.
    link.href = sCorrectPath + "?v=" + CSS_VERSION;
    document.head.appendChild(link);

    isCustomStyleLoaded = true;
  } catch (error) {
    console.error("[ui5-smart-access] Failed to load custom CSS:", error);
  }
}
