// Génère les captures du guide PDF (guide-images/*.png) et le manifeste
// guide-shots.js (positions des repères numérotés en pourcentage).
//
// Usage : NODE_PATH=/chemin/vers/node_modules node tools/capture-guide.js
// Prérequis : playwright-core et Google Chrome installé.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "guide-images");
const CHROME = process.env.CHROME_PATH
	|| "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Jeu de données fixe : les captures sont identiques à chaque génération.
const REPORTS = [
	{
		id: 101, title: "Nid de poule", category: "Voirie", status: "Envoyé",
		description: "Gros trou sur la chaussée, dangereux pour les deux-roues.",
		date: "12/05/2025",
		location: "12 rue de la Paix, Angers", latitude: 47.4712, longitude: -0.5513,
		services: ["Voirie"], photoUrl: "image/nid-de-poule-kyiv.jpg",
		userName: "Camille Martin", userEmail: "camille@exemple.fr", userPhone: ""
	},
	{
		id: 102, title: "Nid de poule", category: "Voirie", status: "Reçu",
		description: "Le trou s'agrandit après la pluie.", date: "12/05/2025",
		location: "14 rue de la Paix, Angers", latitude: 47.4715, longitude: -0.5511,
		photoUrl: "image/nid-de-poule-montreal.jpg", userName: "Lucas Bernard"
	},
	{
		id: 103, title: "Lampadaire en panne", category: "Éclairage public",
		status: "Reçu", description: "Le lampadaire ne s'allume plus depuis 3 jours.",
		date: "11/05/2025",
		location: "Place du Ralliement, Angers", latitude: 47.4698, longitude: -0.5538,
		photoUrl: "image/lampadaire-casse.jpg", userName: "Inès Moreau"
	},
	{
		id: 104, title: "Dépôt sauvage", category: "Propreté", status: "Traité",
		description: "Encombrants abandonnés sur le trottoir.", date: "10/05/2025",
		location: "Rue Saint-Aubin, Angers", latitude: 47.4731, longitude: -0.5549,
		services: ["Propreté"], photoUrl: "image/depot-sauvage.jpg",
		assignedTo: "EMP-0001", assignedName: "Sophie Durand",
		report: "Encombrants évacués."
	}
];

const EMPLOYEES = [
	{ id: 1, code: "EMP-0001", name: "Sophie Durand", email: "sophie@ville.fr", services: ["Voirie", "Propreté"] },
	{ id: 2, code: "EMP-0002", name: "Marc Lefèvre", email: "marc@ville.fr", services: ["Éclairage public"] }
];

const shots = [];
let page;

// Attend l'affichage complet d'une carte (tuiles réseau).
const mapWait = () => page.waitForTimeout(9000);

// Exécute du code dans la page.
const run = (code) => page.evaluate(code);

// Redémarre l'application avec les données de démonstration.
async function reload() {
	await page.goto("file://" + path.join(ROOT, "app.html"));
	await page.waitForFunction(() => typeof render === "function");
	await page.waitForTimeout(600);
}

// Photographie un élément et calcule la position des repères.
async function shoot(file, kind, title, clip, marks) {
	await page.waitForTimeout(700);

	let box = await page.locator(clip).first().boundingBox();

	// La fenêtre du logiciel : de la barre de titre au bas du contenu.
	if (kind === "window") {
		const bar = await page.locator(".mac-window-bar").boundingBox();
		const body = await page.locator(".mac-window-body").boundingBox();

		box = {
			x: bar.x,
			y: bar.y,
			width: bar.width,
			height: body.y + body.height - bar.y
		};
	}

	await page.screenshot({
		path: path.join(OUT, file + ".png"),
		clip: box
	});

	const result = [];

	for (const [selector, text, anchor] of marks) {
		const target = await page.locator(selector).first().boundingBox()
			.catch(() => null);

		if (!target) {
			console.warn("Repère introuvable :", file, selector);
			continue;
		}

		// Un grand élément reçoit son repère près de son bord gauche.
		const x = anchor === "left" || target.width > box.width * 0.5
			? target.x - box.x + 18
			: target.x - box.x + target.width / 2;
		const y = target.y - box.y + Math.min(target.height / 2, 22);

		result.push({
			x: +Math.max(2, Math.min(98, x / box.width * 100)).toFixed(1),
			y: +Math.max(2, Math.min(98, y / box.height * 100)).toFixed(1),
			text
		});
	}

	shots.push({
		file: "guide-images/" + file + ".png",
		kind,
		title,
		ratio: +(box.width / box.height).toFixed(3),
		marks: result
	});
	console.log("OK", file);
}

const phone = (file, title, marks) => shoot(file, "phone", title, ".phone", marks);
const win = (file, title, marks) =>
	shoot(file, "window", title, ".management-preview", marks);

(async () => {
	fs.mkdirSync(OUT, { recursive: true });

	const browser = await chromium.launch({
		executablePath: CHROME,
		args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
	});
	const context = await browser.newContext({
		viewport: { width: 1600, height: 1000 },
		deviceScaleFactor: 2
	});

	await context.addInitScript(({ reports, employees }) => {
		if (sessionStorage.getItem("seeded")) {
			return;
		}

		localStorage.clear();
		localStorage.setItem("signaluo-reports", JSON.stringify(reports));
		localStorage.setItem("signaluo-employees", JSON.stringify(employees));
		localStorage.setItem("signaluo-statuses-v2", "true");
		localStorage.setItem("signaluo-seed-fix-v1", "true");
		localStorage.setItem("signaluo-skip-home", "true");
		sessionStorage.setItem("seeded", "1");
	}, { reports: REPORTS, employees: EMPLOYEES });

	page = await context.newPage();
	await reload();

	// ------------------------------------------------------------ Citoyen
	// L'ouverture automatique de l'application est bloquée pour la capture.
	await run(`
		window.realTimeout = window.setTimeout;
		window.setTimeout = (fn, delay, ...args) =>
			delay === 3400 ? 0 : window.realTimeout(fn, delay, ...args);
		appVersion="user";screen="home";render();
	`);
	await page.waitForTimeout(2500);
	await run(`window.setTimeout = window.realTimeout;`);
	await phone("citoyen-accueil", "Écran d'accueil du téléphone", [
		[".phone-home-icon", "Icône de l'application : touchez-la pour ouvrir Signaluo"],
		["[data-phone-reset]", "Bouton ↻ : remet le téléphone à son état de départ", "left"]
	]);

	await run(`screen="wizard";step=0;render();`);
	await phone("citoyen-lancement", "Écran de lancement", [
		[".launch-mark", "Logo de l'application"],
		[".launch-button", "Lance le parcours de signalement"]
	]);

	await run(`step=1;draft=Object.assign(draft,{photo:false,photoUrl:""});render();`);
	await phone("citoyen-photo", "Étape 1 : photo du problème", [
		[".steps", "Indicateur de progression (4 étapes)"],
		["[data-action=camera]", "Prend une photo avec la caméra simulée"],
		["[data-action=gallery]", "Choisit une image dans la galerie"]
	]);

	await run(`draft.photo=true;draft.photoUrl="image/nid-de-poule-kyiv.jpg";render();`);
	await phone("citoyen-photo-ok", "Étape 1 : photo prise", [
		[".photo-preview", "Aperçu de la photo choisie"],
		["[data-action=photo]", "Permet de changer la photo"],
		["[data-action=next]", "Passe à l'étape suivante (activé une fois la photo prise)"]
	]);

	await run(`step=2;render();`);
	await phone("citoyen-categorie", "Étape 2 : type de problème", [
		[".categories", "Liste des catégories : un seul choix possible"],
		["[data-action=next]", "Reste grisé tant qu'aucune catégorie n'est choisie"]
	]);

	await run(`draft.category="Voirie";render();`);
	await phone("citoyen-categorie-ok", "Étape 2 : catégorie choisie", [
		[".categories .selected, .categories .active", "Catégorie sélectionnée"],
		["[data-action=next]", "Devient actif : on peut continuer"]
	]);

	await run(`
		step=3;draft.description="Gros trou sur la chaussée.";render();
		setMapLocation(47.4712,-0.5513,"12 rue de la Paix, Angers");
	`);
	await mapWait();
	await phone("citoyen-details", "Étape 3 : détails et localisation", [
		["#description", "Description du problème"],
		["[data-action=location]", "Détecte la position de l'utilisateur"],
		["#map", "Carte : repère de position, boutons 3D/2D et zoom"],
		["[data-action=next]", "Actif quand description et lieu sont renseignés"]
	]);

	await run(`step=4;draft.anonymous=false;render();`);
	await phone("citoyen-envoi", "Étape 4 : envoi du signalement", [
		["#firstName", "Prénom et nom (facultatifs si anonyme)"],
		["#email", "Coordonnées de contact"],
		["[data-action=submit]", "Envoie le signalement au logiciel de gestion"]
	]);

	await run(`screen="success";render();`);
	await phone("citoyen-succes", "Signalement envoyé", [
		[".success-check", "Confirmation d'envoi"],
		["[data-action=new-report]", "Démarre un nouveau signalement"],
		["[data-action=history]", "Ouvre l'historique"]
	]);

	await run(`screen="dashboard";render();`);
	await phone("citoyen-tableau", "Tableau de bord citoyen", [
		[".hero", "Résumé de l'activité"],
		[".stats", "Compteurs de signalements"],
		["[data-action=start]", "Nouveau signalement"],
		["[data-action=history]", "Historique complet"]
	]);

	await run(`screen="history";render();`);
	await phone("citoyen-historique", "Historique des signalements", [
		[".topbar", "Retour et bouton « Nouveau »"],
		[".screen .section-title + *", "Un signalement : toucher pour voir le détail"]
	]);

	// ------------------------------------------------------------ Logiciel
	await run(`appVersion="user";screen="home";render();setAdminView("dashboard");`);
	await win("logiciel-tableau", "Tableau de bord du logiciel", [
		[".mac-nav[data-admin-action=dashboard]", "Menu de navigation : 5 pages"],
		[".notif-bell", "Centre de notifications"]
	]);

	await run(`setAdminView("reports");`);
	await win("logiciel-signalements", "Page Signalements", [
		[".filter-bar", "Filtres et recherche"],
		[".mail-row", "Un signalement : cliquer pour le déplier"],
		[".admin-report-duplicates", "Signalements similaires regroupés (même catégorie, moins de 100 m)"]
	]);

	await run(`
		document.querySelectorAll(".mail-row").forEach(d => d.open = false);
		document.querySelector(".mail-row").open = true;
	`);
	await win("logiciel-signalement-ouvert", "Signalement déplié", [
		[".mail-body img", "Photo jointe"],
		[".admin-send", "Envoie le signalement aux services choisis"],
		[".admin-delete", "Supprime le signalement (confirmation demandée)"]
	]);

	await run(`document.querySelector(".admin-send").click();`);
	await win("logiciel-envoi-services", "Choix des services destinataires", [
		[".send-dialog", "Pop-up : cocher les services concernés"],
		[".service-options", "Liste des services"]
	]);
	await run(`document.querySelector(".send-dialog").parentElement.remove();`);

	await run(`setAdminView("map");`);
	await mapWait();
	await win("logiciel-carte", "Page Carte", [
		[".admin-pin", "Repère coloré selon le statut"],
		[".admin-map-legend", "Légende des statuts"],
		[".admin-map .maplibregl-ctrl-top-right", "Zoom et bouton 3D/2D", "left"]
	]);

	await run(`document.querySelector(".admin-pin")?.click();`);
	await win("logiciel-carte-fiche", "Carte : fiche d'un signalement", [
		[".admin-map-card", "Fiche du signalement sélectionné"]
	]);

	await run(`setAdminView("employees");`);
	await win("logiciel-employes", "Page Employés", [
		[".add-employee-btn", "Ajoute un employé (code EMP-xxxx généré)"],
		[".filter-bar", "Filtres par service"],
		["#employee-list", "Liste par service"]
	]);

	await run(`setAdminView("settings");`);
	await win("logiciel-parametres", "Page Paramètres", [
		["[data-setting=radius]", "Distance de regroupement"],
		[".theme-picker", "Thème de l'interface"],
		["[data-settings-guide]", "Télécharge ce guide PDF"]
	]);

	await run(`setAdminView("dashboard");adminNotify("new","Nouveau signalement","Nid de poule — Voirie");`);
	await win("logiciel-notification", "Notification éphémère (3 s)", [
		[".admin-notif", "Notification : nouveau signalement ou signalement traité"]
	]);
	await page.waitForTimeout(4500);

	await run(`document.querySelector("[data-notif-toggle]").click();`);
	await win("logiciel-notifications", "Centre de notifications", [
		[".notif-bell", "Cloche avec pastille de non-lus"],
		[".notif-panel", "Historique des notifications"]
	]);
	await run(`document.querySelector("[data-notif-toggle]").click();`);

	// ------------------------------------------------------------ Pro
	await run(`appVersion="professional";proSession=null;proStage="launch";render();`);
	await phone("pro-lancement", "Application pro : lancement", [
		[".launch-button", "Ouvre l'écran de connexion"]
	]);

	await run(`proStage="login";render();`);
	await phone("pro-connexion", "Connexion par code employé", [
		["#pro-code", "Code employé (EMP-0001)"],
		[".pro-keyboard", "Clavier numérique"]
	]);

	await run(`proSession="EMP-0001";proStage="app";proTab="todo";render();`);
	await phone("pro-accueil", "Accueil : À prendre", [
		[".pro-header", "Agent connecté et déconnexion"],
		[".pro-stats", "Compteurs"],
		[".pro-tabs", "Onglets : À prendre, Mes missions, Terminés"],
		[".pro-card", "Signalement à prendre en charge"]
	]);

	await run(`document.querySelector("[data-pro-open]").click();`);
	await phone("pro-detail", "Détail d'un signalement à prendre en charge", [
		[".pro-screen img", "Photo du signalement"],
		["[data-pro-route]", "Itinéraire vers le lieu"],
		[".pro-screen .primary", "Prend le signalement en charge"]
	]);

	await run(`document.querySelector("[data-pro-route]")?.click();`);
	await mapWait();
	await page.waitForTimeout(3000);
	await phone("pro-itineraire", "Itinéraire", [
		[".route-map", "Carte avec tracé, durée et distance"],
		[".route-sheet", "Résumé du trajet"],
		[".route-close", "Retour au détail"]
	]);
	await run(`document.querySelector("[data-pro-route-close]")?.click();`);

	await run(`proTab="done";proReportId=null;render();`);
	await phone("pro-termines", "Onglet Terminés", [
		[".pro-tabs", "Onglet Terminés"],
		[".pro-card", "Signalement clôturé"]
	]);

	fs.writeFileSync(
		path.join(ROOT, "guide-shots.js"),
		"// Fichier généré par tools/capture-guide.js : ne pas modifier à la main.\n"
		+ "const GUIDE_SHOTS = " + JSON.stringify(shots, null, "\t") + ";\n"
	);

	await browser.close();
	console.log(shots.length, "captures");
})();
