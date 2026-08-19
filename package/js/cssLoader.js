let isCustomStyleLoaded = false;

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
    // Cache-bust so an updated stylesheet is always picked up (browsers
    // otherwise keep serving a cached copy from the same URL).
    link.href = sCorrectPath + "?v=" + Date.now();
    document.head.appendChild(link);

    isCustomStyleLoaded = true;
  } catch (error) {
    console.error("[ui5-smart-access] Failed to load custom CSS:", error);
  }
}
