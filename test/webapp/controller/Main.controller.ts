import BaseController from "./BaseController";
import { openAccessPopover } from "ui5-smart-access";
import UIEvent from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";

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
			],
			// Runtime environments the library is tested against.
			compat: [
				{ name: "Google Chrome", detail: "≥ 90", note: "Voll unterstützt", statusState: "Success" },
				{ name: "Microsoft Edge", detail: "≥ 90", note: "Voll unterstützt", statusState: "Success" },
				{ name: "Mozilla Firefox", detail: "≥ 88", note: "Voll unterstützt", statusState: "Success" },
				{ name: "Apple Safari", detail: "≥ 14", note: "Voll unterstützt", statusState: "Success" },
				{ name: "SAPUI5 / OpenUI5", detail: "≥ 1.120", note: "Empfohlen ab 1.136", statusState: "Success" }
			],
			useCases: [
				{ name: "Öffentliche Verwaltung", intro: "BITV 2.0 · EN 301 549", benefit1: "Erfüllt gesetzliche Vorgaben zur Barrierefreiheit", benefit2: "Keine Backend-Anpassungen nötig", status: "Empfohlen", statusState: "Success" },
				{ name: "E-Commerce", intro: "Mehr Reichweite", benefit1: "Erreicht Nutzer mit Einschränkungen", benefit2: "Bessere Lesbarkeit steigert die Conversion", status: "Empfohlen", statusState: "Success" },
				{ name: "Bildung & E-Learning", intro: "Inklusives Lernen", benefit1: "Vorlesefunktion für lange Texte", benefit2: "Anpassbare Schrift und Kontraste", status: "Beliebt", statusState: "Information" },
				{ name: "Gesundheitswesen", intro: "Für alle Altersgruppen", benefit1: "Große Schrift und großer Mauszeiger", benefit2: "Kontrastmodus für Sehschwächen", status: "Empfohlen", statusState: "Success" }
			]
		};
		const oModel = new JSONModel(oData);
		this.getView()?.setModel(oModel);
	}

	public openAbicsAccessibilityPopover(oEvent: UIEvent): void {
		void openAccessPopover(this, oEvent);
	}
}
