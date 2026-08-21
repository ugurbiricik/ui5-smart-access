import BaseController from "./BaseController";
import { openAccessPopover, initAccessibility } from "ui5-smart-access";
import UIEvent from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import Control from "sap/ui/core/Control";

/**
 * @namespace test.controller
 */
export default class Main extends BaseController {

	public onInit(): void {
		const oData = {
			// The eight capabilities the accessibility assistant ships with.
			features: [
				{ name: "Schriftgröße", category: "Anzeige", icon: "sap-icon://text", desc: "Vergrößern oder verkleinern Sie die Schrift der gesamten Seite – stufenlos, auch unter die Ausgangsgröße.", status: "Verfügbar", statusState: "Success" },
				{ name: "Vorlesen (TTS)", category: "Audio", icon: "sap-icon://sound-loud", desc: "Liest markierten oder überfahrenen Text vor – mit einstellbarem Tempo und Lautstärke.", status: "Verfügbar", statusState: "Success" },
				{ name: "Farbschwäche-Filter", category: "Farbe", icon: "sap-icon://palette", desc: "Kompensiert Rot-Grün- und Blau-Gelb-Sehschwächen über Farbmatrizen.", status: "Verfügbar", statusState: "Success" },
				{ name: "Blaulichtfilter", category: "Farbe", icon: "sap-icon://filter", desc: "Reduziert den Blauanteil der Anzeige für angenehmeres Lesen bei wenig Licht.", status: "Verfügbar", statusState: "Success" },
				{ name: "Nachtmodus", category: "Anzeige", icon: "sap-icon://lightbulb", desc: "Schaltet die Anwendung in ein augenschonendes dunkles Design um.", status: "Verfügbar", statusState: "Success" },
				{ name: "Bilder ausblenden", category: "Anzeige", icon: "sap-icon://hide", desc: "Blendet alle Bilder aus, um Ablenkungen und kognitive Last zu reduzieren.", status: "Verfügbar", statusState: "Success" },
				{ name: "Kontrastmodus", category: "Farbe", icon: "sap-icon://color-fill", desc: "Setzt frei wählbare Hinter- und Vordergrundfarben für maximale Lesbarkeit.", status: "Verfügbar", statusState: "Success" },
				{ name: "Großer Mauszeiger", category: "Navigation", icon: "sap-icon://cursor-arrow", desc: "Vergrößert und färbt den Mauszeiger für bessere Sichtbarkeit und Orientierung.", status: "Verfügbar", statusState: "Success" }
			]
		};
		const oModel = new JSONModel(oData);
		this.getView()?.setModel(oModel);

		// Re-apply saved preferences on load + enable the global Alt+Shift+<key>
		// shortcuts, anchored to the launcher button.
		const oFab = this.byId("accessFab") as Control;
		initAccessibility(this, oFab);
	}

	public openAbicsAccessibilityPopover(oEvent: UIEvent): void {
		void openAccessPopover(this, oEvent);
	}
}
