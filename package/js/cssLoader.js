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
    link.href = sCorrectPath;
    document.head.appendChild(link);

    isCustomStyleLoaded = true;
  } catch (error) {
    console.error("[ui5-smart-access] Failed to load custom CSS:", error);
  }
}
