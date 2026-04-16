import BaseController from "./BaseController";
import { openAccessPopover } from "ui5-smart-access";
import UIEvent from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";

/**
 * @namespace test.controller
 */
export default class Main extends BaseController {

	public onInit(): void {
		const oData = {
			products: [
				{ name: "Smartphone X", code: "SPX-100", category: "Electronics", price: 799, status: "Verfügbar", statusState: "Success" },
				{ name: "Laptop Pro 15", code: "LP-215", category: "Electronics", price: 1499, status: "Wenige", statusState: "Warning" },
				{ name: "Bluetooth Kopfhörer", code: "BK-050", category: "Audio", price: 129, status: "Verfügbar", statusState: "Success" },
				{ name: "4K Monitor", code: "MON-4K", category: "Electronics", price: 349, status: "Nicht verfügbar", statusState: "Error" },
				{ name: "Kaffeemaschine", code: "KM-010", category: "Haushalt", price: 89, status: "Verfügbar", statusState: "Success" },
				{ name: "Bürostuhl Ergo", code: "BS-ERG", category: "Möbel", price: 259, status: "Verfügbar", statusState: "Success" },
				{ name: "Gaming Maus", code: "GM-700", category: "Accessoires", price: 59, status: "Wenige", statusState: "Warning" },
				{ name: "Tastatur Mechanisch", code: "TM-RGB", category: "Accessoires", price: 119, status: "Verfügbar", statusState: "Success" },
				{ name: "Smartwatch Lite", code: "SW-LT", category: "Wearables", price: 199, status: "Verfügbar", statusState: "Success" },
				{ name: "Tablet 11 Zoll", code: "TB-11", category: "Electronics", price: 499, status: "Nicht verfügbar", statusState: "Error" }
			],
			tasks: [
				{ title: "Dokumentation lesen", description: "Die neue UI5 Dokumentation prüfen", icon: "sap-icon://document-text", info: "Heute", infoState: "Information" },
				{ title: "Meeting vorbereiten", description: "Agenda für morgen erstellen", icon: "sap-icon://meeting-room", info: "Wichtig", infoState: "Warning" },
				{ title: "Code Review", description: "Pull Requests durchsehen", icon: "sap-icon://inspect-down", info: "3 offen", infoState: "Error" },
				{ title: "Release Notes", description: "Version 1.2 vorbereiten", icon: "sap-icon://release", info: "Erledigt", infoState: "Success" },
				{ title: "Tests laufen lassen", description: "E2E Tests aktualisieren", icon: "sap-icon://begin", info: "Heute", infoState: "Information" }
			],
			contacts: [
				{ name: "Anna Müller", role: "Projektleiterin", email: "anna.mueller@example.com", city: "München", phone: "+49 89 1234567", status: "Online", statusState: "Success" },
				{ name: "Max Schmidt", role: "Frontend Entwickler", email: "max.schmidt@example.com", city: "Berlin", phone: "+49 30 7654321", status: "Abwesend", statusState: "Warning" },
				{ name: "Lisa Weber", role: "UX Designerin", email: "lisa.weber@example.com", city: "Hamburg", phone: "+49 40 2233445", status: "Offline", statusState: "Error" },
				{ name: "Tom Fischer", role: "Backend Entwickler", email: "tom.fischer@example.com", city: "Köln", phone: "+49 221 9988776", status: "Online", statusState: "Success" }
			]
		};
		const oModel = new JSONModel(oData);
		this.getView()?.setModel(oModel);
	}

	public openAbicsAccessibilityPopover(oEvent: UIEvent): void {
		void openAccessPopover(this, oEvent);
	}

	public onSavePress(): void {
		MessageToast.show("Formulardaten gespeichert (Demo)");
	}

	public onShowToast(): void {
		MessageToast.show("Aktion erfolgreich ausgeführt");
	}

	public onShowInfoDialog(): void {
		MessageBox.information("Dies ist ein Beispiel-Info-Dialog zum Testen des Night Mode und der Schriftgrößen-Funktion.", {
			title: "Information"
		});
	}

	public onShowErrorDialog(): void {
		MessageBox.error("Dies ist ein Beispiel-Fehler-Dialog zum Testen der Barrierefreiheit.", {
			title: "Fehler"
		});
	}
}
