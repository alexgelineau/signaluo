/*
* Signaluo - application citoyenne
* --------------------------------
* Ce fichier contient la logique de l'application présente dans le faux
* téléphone : navigation, formulaire, carte, historique et changement de
* version utilisateur / professionnel.
*/

// ---------------------------------------------------------------------------
// Données statiques utilisées par l'application
// ---------------------------------------------------------------------------

const CATEGORIES = [
	["Voirie", "construction", "road"],
	["Éclairage", "lightbulb", "light"],
	["Propreté", "trash-2", "clean"],
	["Espaces Verts", "trees", "nature"],
	["Autre", "•••", "other"]
];

const SERVICES = [
	"Voirie",
	"Éclairage public",
	"Propreté",
	"Espaces verts",
	"Sécurité"
];

// ---------------------------------------------------------------------------
// SECTION : STOCKAGE (localStorage) et catégories personnalisées
// ---------------------------------------------------------------------------

// Catégories créées par le gestionnaire : elles deviennent aussi des services
// et sont proposées aux citoyens lors d'un signalement.
let customCategories = JSON.parse(
	localStorage.getItem("signaluo-categories") || "[]"
);
let categoryColors = JSON.parse(
	localStorage.getItem("signaluo-category-colors") || "{}"
);

// Au chargement, on réinjecte chaque catégorie sauvegardée dans les listes.
customCategories.forEach(name => {
	// On évite d'ajouter deux fois le même service.
	if (!SERVICES.includes(name)) {
		SERVICES.push(name);
	}
	addCategory(name);
});

// Insère une catégorie avant « Autre », qui reste toujours la dernière.
function addCategory(name) {
	// On repère la position de « Autre » pour s'insérer juste avant.
	const otherIndex = CATEGORIES.findIndex(item => item[0] === "Autre");

	CATEGORIES.splice(otherIndex, 0, [name, "pin", "other"]);
}

// Enregistre les catégories personnalisées et leurs couleurs dans le stockage.
function saveCategories() {
	localStorage.setItem(
		"signaluo-categories",
		JSON.stringify(customCategories)
	);
	localStorage.setItem(
		"signaluo-category-colors",
		JSON.stringify(categoryColors)
	);
}

// Couleurs par défaut des catégories d'origine.
const DEFAULT_CATEGORY_COLORS = {
	"Voirie": "#3b82f6",
	"Éclairage": "#f59e0b",
	"Propreté": "#ef4444",
	"Espaces Verts": "#10b981",
	"Autre": "#6b7280"
};

// Renvoie la couleur d'une catégorie (personnalisée, par défaut, ou gris).
function categoryColor(name) {
	return categoryColors[name]
		|| DEFAULT_CATEGORY_COLORS[name]
		|| "#6b7280";
}

// Style inline de la couleur d'une catégorie personnalisée (vide pour les autres).
function categoryColorStyle(name, property = "background") {
	// Seules les catégories avec une couleur choisie reçoivent un style.
	return categoryColors[name]
		? `style="${property}:${esc(categoryColors[name])}"`
		: "";
}

// Photos locales (voir image/CREDITS.md) : une est choisie au hasard à chaque
// « Prendre une photo ».
const CAMERA_PHOTOS = [
	"image/vreverv.jpeg",
	"image/vsdv.jpeg",
	"image/vsdvs.jpeg",
	"image/images.jpeg",
	"image/nid-de-poule-kyiv.jpg",
	"image/nid-de-poule-bengaluru.jpg",
	"image/nid-de-poule-montreal.jpg",
	"image/lampadaire-casse.jpg",
	"image/depot-sauvage.jpg",
	"image/depot-sauvage-lynnwood.jpg",
	"image/arbre-tombe.jpg",
	"image/poubelle-pleine.jpg",
	"image/graffiti.jpg"
];

const today = new Intl.DateTimeFormat("fr-FR").format(new Date());

// Ces données permettent d'afficher immédiatement un historique réaliste lors
// de la première ouverture, avant qu'un utilisateur n'envoie son propre
// signalement.
const seed = [
	{
		id: 1,
		title: "Nid de poule",
		description: "Gros trou sur la chaussée au niveau du 12 rue de la Paix.",
		category: "Voirie",
		date: today,
		status: "Envoyé",
		location: "47.4712° N, 0.5513° W"
	},
	{
		id: 2,
		title: "Lampadaire en panne",
		description: "Le lampadaire ne s’allume plus depuis 3 jours.",
		category: "Éclairage",
		date: today,
		status: "Envoyé",
		location: "47.4712° N, 0.5513° W"
	}
];

// ---------------------------------------------------------------------------
// État de l'application
// ---------------------------------------------------------------------------

// Passe à true après le premier rendu ; save() n'a rien à rafraîchir avant.
let appReady = false;
let appVersion = "user";
let screen = "wizard";
let adminView = "dashboard";

const savedReports = localStorage.getItem("signaluo-reports");
const statusMigrationKey = "signaluo-statuses-v2";

// Signalements : ceux du stockage, sinon les données d'exemple.
let reports = savedReports ? JSON.parse(savedReports) : seed;

// Migration unique des anciens statuts vers les nouveaux.
if (savedReports && !localStorage.getItem(statusMigrationKey)) {
	reports = reports.map(report => ({
		...report,
		status: report.status === "En cours"
			? "Envoyé"
			: report.status === "Envoyé"
				? "Reçu"
				: report.status
	}));

	save();
	localStorage.setItem(statusMigrationKey, "true");
}

// Employés enregistrés par le gestionnaire.
let employees = JSON.parse(
	localStorage.getItem("signaluo-employees") || "[]"
);

// Identifiant unique d'employé (EMP-0001...), réutilisé par la version professionnelle.
function nextEmployeeCode() {
	// On cherche le plus grand numéro déjà attribué.
	const max = employees.reduce(
		(highest, employee) => Math.max(
			highest,
			Number((employee.code || "").replace("EMP-", "")) || 0
		),
		0
	);

	return `EMP-${String(max + 1).padStart(4, "0")}`;
}

// Mise à niveau des anciens employés : liste de services et code unique.
employees.forEach(employee => {
	// Ancien format : un seul « service » devient une liste « services ».
	if (!employee.services) {
		employee.services = employee.service ? [employee.service] : [];
		delete employee.service;
	}

	// Attribution d'un code aux employés qui n'en ont pas encore.
	if (!employee.code) {
		employee.code = nextEmployeeCode();
	}
});
localStorage.setItem("signaluo-employees", JSON.stringify(employees));

// Le signalement d'exemple était faussement marqué « Traité » : on le corrige une fois.
const seedFixKey = "signaluo-seed-fix-v1";
if (savedReports && !localStorage.getItem(seedFixKey)) {
	reports.forEach(report => {
		if (
			report.id === 2
			&& report.title === "Lampadaire en panne"
			&& report.status === "Traité"
		) {
			report.status = "Envoyé";
		}
	});

	save();
	localStorage.setItem(seedFixKey, "true");
}

// Indique si le mode gestionnaire est actif.
let manager = false;
let step = 0;
let mapInstance = null;
let mapMarker = null;
let adminTransitioning = false;
let adminTransitionTimeout = null;
let adminTransitionFrame = null;

// Le brouillon est conservé en mémoire pendant que l'utilisateur navigue
// entre les étapes ou change temporairement de version d'application.
let draft = {
	photo: false,
	category: "",
	location: "",
	description: "",
	anonymous: true,
	lastName: "",
	firstName: "",
	email: "",
	phone: ""
};

const app = document.querySelector("#app");
const phoneFrame = document.querySelector(".phone");

// Case « Sans animation » : saute l'écran d'accueil animé du téléphone.
const skipHomeCheckbox = document.querySelector("#skip-home-anim");
let skipHomeAnimation = localStorage.getItem("signaluo-skip-home") === "true";

if (skipHomeCheckbox) {
	skipHomeCheckbox.checked = skipHomeAnimation;

	// Mémorise le choix et l'applique aux prochains lancements.
	skipHomeCheckbox.addEventListener("change", () => {
		skipHomeAnimation = skipHomeCheckbox.checked;
		localStorage.setItem("signaluo-skip-home", String(skipHomeAnimation));
	});
}
const versionTabs = document.querySelectorAll("[data-version]");
const adminContent = document.querySelector("#admin-content");
const adminNavigation = document.querySelectorAll("[data-admin-action]");

// ---------------------------------------------------------------------------
// Petites fonctions utilitaires
// ---------------------------------------------------------------------------

// Échappe les valeurs avant leur insertion dans du HTML généré.
// Cette fonction fléchée protège les textes affichés dans les modèles HTML.
const esc = value => String(value).replace(
	/[&<>"']/g,
	// Cette fonction fléchée remplace chaque caractère spécial par son équivalent.
	character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;"
	}[character])
);

// Sauvegarde les employés puis rafraîchit la version professionnelle si elle est active.
function saveEmployees() {
	localStorage.setItem("signaluo-employees", JSON.stringify(employees));

	// Rafraîchissement uniquement si l'application est prête et en mode pro.
	if (appReady && appVersion === "professional") {
		renderProfessional();
	}
}

// Sauvegarde l'historique pour le retrouver après un rechargement.
function save() {
	localStorage.setItem("signaluo-reports", JSON.stringify(reports));

	// Garde l'historique du téléphone synchronisé avec le logiciel de gestion
	// (rien à rafraîchir tant que l'application n'est pas initialisée).
	if (
		appReady
		&& appVersion === "user"
		&& (screen === "history" || screen === "dashboard")
	) {
		render();
	}

	// Rafraîchit la version professionnelle.
	if (appReady && appVersion === "professional") {
		renderProfessional();
	}

	// Rafraîchit le tableau de bord du logiciel de gestion.
	if (appReady && adminView === "dashboard") {
		renderAdminDashboard();
	}

	// Garde le centre de suivi à jour quand l'agent modifie un signalement.
	if (
		appReady
		&& adminView === "reports"
		&& adminContent.querySelector(".admin-report-list")
	) {
		renderAdminReportList();
	}
}

// Affiche un message temporaire en bas de l'écran.
function toast(message) {
	const node = document.querySelector("#toast");

	node.textContent = message;
	node.classList.add("show");

	// Cette fonction fléchée masque le message après sa durée d'affichage.
	window.setTimeout(() => {
		node.classList.remove("show");
	}, 2600);
}

// ---------------------------------------------------------------------------
// SECTION : CENTRE DE NOTIFICATIONS (cloche du logiciel de gestion)
// ---------------------------------------------------------------------------

// Historique des notifications, conservé dans le navigateur.
let notifHistory = [];

try {
	notifHistory = JSON.parse(localStorage.getItem("signaluo-notifs")) || [];
} catch {
	notifHistory = [];
}

// Enregistre l'historique.
function saveNotifs() {
	localStorage.setItem("signaluo-notifs", JSON.stringify(notifHistory));
}

// Ajoute une notification (la plus récente en premier, 30 maximum).
function addNotifHistory(type, title, text) {
	notifHistory.unshift({
		id: Date.now() + Math.random(),
		type,
		title,
		text,
		time: Date.now(),
		read: false
	});
	notifHistory = notifHistory.slice(0, 30);
	saveNotifs();
	renderNotifBell();
}

// Donne un temps relatif lisible (« à l'instant », « il y a 5 min »).
function timeAgo(time) {
	const minutes = Math.floor((Date.now() - time) / 60000);

	if (minutes < 1) {
		return "à l'instant";
	}

	if (minutes < 60) {
		return `il y a ${minutes} min`;
	}

	const hours = Math.floor(minutes / 60);

	if (hours < 24) {
		return `il y a ${hours} h`;
	}

	return `il y a ${Math.floor(hours / 24)} j`;
}

// Met à jour la cloche (icône + pastille du nombre de non-lus).
function renderNotifBell() {
	const bell = document.querySelector("[data-notif-toggle]");

	if (!bell) {
		return;
	}

	const unread = notifHistory.filter(item => !item.read).length;

	bell.innerHTML = `
		${ico(unread ? "bell-ring" : "bell")}
		${unread ? `<b>${unread > 9 ? "9+" : unread}</b>` : ""}
	`;

	// Rafraîchit aussi le panneau s'il est ouvert.
	if (document.querySelector(".notif-panel")) {
		renderNotifPanel();
	}
}

// Dessine (ou redessine) le panneau déroulant sous la cloche.
function renderNotifPanel() {
	const body = document.querySelector(".mac-window-body");

	if (!body) {
		return;
	}

	let panel = body.querySelector(".notif-panel");

	if (!panel) {
		panel = document.createElement("section");
		panel.className = "notif-panel";
		body.appendChild(panel);
	}

	panel.innerHTML = `
		<header>
			<h4>Notifications</h4>
			<div>
				<button type="button" data-notif-readall title="Tout marquer comme lu">${ico("check-check")}</button>
				<button type="button" data-notif-clear title="Tout effacer">${ico("trash-2")}</button>
			</div>
		</header>
		<div class="notif-list">
			${notifHistory.length ? notifHistory.map(item => `
				<article class="notif-item ${item.type} ${item.read ? "" : "unread"}">
					<span class="notif-item-icon">${ico(item.type === "new" ? "bell" : "circle-check")}</span>
					<div>
						<strong>${esc(item.title)}</strong>
						<small>${esc(item.text)}</small>
						<em>${timeAgo(item.time)}</em>
					</div>
				</article>
			`).join("") : `<p class="notif-empty">Aucune notification pour l'instant.</p>`}
		</div>
	`;
}

// Ouvre ou ferme le panneau (l'ouverture marque tout comme lu).
function toggleNotifPanel(forceClose = false) {
	const existing = document.querySelector(".notif-panel");

	if (existing || forceClose) {
		existing?.remove();
		return;
	}

	renderNotifPanel();
	notifHistory.forEach(item => {
		item.read = true;
	});
	saveNotifs();

	// La pastille disparaît, mais les éléments gardent leur style « nouveau »
	// le temps de l'ouverture : on ne redessine que la cloche.
	const bell = document.querySelector("[data-notif-toggle]");

	bell.innerHTML = ico("bell");
}

// Clics sur la cloche, le panneau, et en dehors (fermeture).
document.addEventListener("click", event => {
	if (event.target.closest("[data-notif-toggle]")) {
		toggleNotifPanel();
		return;
	}

	if (event.target.closest("[data-notif-clear]")) {
		notifHistory = [];
		saveNotifs();
		renderNotifPanel();
		return;
	}

	if (event.target.closest("[data-notif-readall]")) {
		notifHistory.forEach(item => {
			item.read = true;
		});
		saveNotifs();
		renderNotifPanel();
		return;
	}

	if (!event.target.closest(".notif-panel")) {
		toggleNotifPanel(true);
	}
});

// Affiche une petite notification en haut à gauche du logiciel de gestion.
// type : "new" (nouveau signalement) ou "treated" (signalement traité).
function adminNotify(type, title, text) {
	// L'option correspondante des Paramètres doit être activée.
	const enabled = type === "new" ? settings.notifyNew : settings.notifyTreated;

	if (!enabled) {
		return;
	}

	// Garde la notification dans l'historique du centre de notifications.
	addNotifHistory(type, title, text);

	const windowBody = document.querySelector(".mac-window-body");

	if (!windowBody) {
		return;
	}

	// Conteneur créé une seule fois : il empile les notifications.
	let stack = windowBody.querySelector(".admin-notifs");

	if (!stack) {
		stack = document.createElement("div");
		stack.className = "admin-notifs";
		stack.setAttribute("aria-live", "polite");
		windowBody.appendChild(stack);
	}

	const note = document.createElement("div");
	note.className = `admin-notif ${type}`;
	note.innerHTML = `
		<span class="admin-notif-icon">${ico(type === "new" ? "bell" : "circle-check")}</span>
		<div>
			<strong>${esc(title)}</strong>
			<small>${esc(text)}</small>
		</div>
	`;
	stack.prepend(note);

	// Disparition en fondu après 3 secondes, puis retrait du DOM.
	window.setTimeout(() => {
		note.classList.add("leaving");
		window.setTimeout(() => note.remove(), 600);
	}, 3000);
}

// Affiche la cloche dès le chargement de la page.
renderNotifBell();

// Associe chaque statut métier à une classe CSS.
function statusClass(status) {
	// Signalement terminé.
	if (status === "Traité") {
		return "resolved";
	}

	// Signalement envoyé au service.
	if (status === "Envoyé") {
		return "sent";
	}

	// Par défaut : signalement reçu.
	return "received";
}

// Vérifie qu'un numéro respecte la numérotation française à 10 chiffres.
function isValidFrenchPhone(phone) {
	// On retire espaces et ponctuation, et on convertit le préfixe 0033.
	const normalizedPhone = phone
		.replace(/[\s().-]/g, "")
		.replace(/^0033/, "+33");

	return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalizedPhone);
}

// ---------------------------------------------------------------------------
// SECTION : LOGICIEL DE GESTION (administration)
// ---------------------------------------------------------------------------

// Génère les barres de statistiques (libellé, barre proportionnelle, valeur).
function statBars(entries, total) {
	// Aucun message de barre si la liste est vide.
	if (!entries.length) {
		return '<p class="management-note">Aucune donnée pour le moment.</p>';
	}

	return entries.map(([label, count, color]) => `
		<div class="stat-bar">
			<span class="stat-bar-label">${esc(label)}</span>
			<div class="stat-bar-track"><i style="width:${total ? Math.round((count / total) * 100) : 0}%;background:${esc(color)}"></i></div>
			<b>${count}</b>
		</div>
	`).join("");
}

// Tableau de bord : toutes les statistiques calculées à partir des signalements.
function renderAdminDashboard() {
	// Compteurs globaux par statut.
	const total = reports.length;
	const count = status => reports.filter(
		report => report.status === status
	).length;
	const received = count("Reçu");
	const sent = count("Envoyé");
	const treated = count("Traité");
	const rate = total ? Math.round((treated / total) * 100) : 0;

	// Nombre de signalements similaires, d'envois non pris en charge et en cours.
	const similar = groupReports(reports).reduce(
		(sum, group) => sum + group.duplicates.length,
		0
	);
	const unassigned = reports.filter(
		report => report.status === "Envoyé" && !report.assignedTo
	).length;
	const inProgress = reports.filter(
		report => report.status === "Envoyé" && report.assignedTo
	).length;

	// Répartition par catégorie, de la plus fréquente à la moins fréquente.
	const categories = [...new Set(reports.map(report => report.category))]
		.map(name => [
			name,
			reports.filter(report => report.category === name).length,
			categoryColor(name)
		])
		.sort((a, b) => b[1] - a[1]);

	// Activité des 7 derniers jours.
	const days = Array.from({ length: 7 }, (_, index) => {
		const day = new Date();

		day.setDate(day.getDate() - (6 - index));
		const label = new Intl.DateTimeFormat("fr-FR").format(day);

		return [
			new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day),
			reports.filter(report => report.date === label).length
		];
	});
	const maxDay = Math.max(1, ...days.map(day => day[1]));

	// Les 4 agents ayant traité le plus de signalements.
	const topEmployees = employees
		.map(employee => [
			employee.name,
			reports.filter(report => report.treatedBy === employee.code).length
		])
		.filter(entry => entry[1] > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4);
	const withPhoto = reports.filter(report => report.photo).length;

	// Indicateurs clés affichés en tête de page.
	const kpis = [
		["inbox", total, "Signalements", "#2563eb"],
		["mail-plus", received, "À traiter", "#f59e0b"],
		["send", sent, "Envoyés", "#7c3aed"],
		["circle-check", treated, "Traités", "#10b981"]
	];

	// Affichage du tableau de bord.
	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
		</div>
		<div class="admin-reports-heading">
			<div>
				<span class="eyebrow">VUE D'ENSEMBLE</span>
				<h2 id="management-title">Tableau de bord</h2>
			</div>
			<div class="resolution-ring" style="--p:${rate}"><b>${rate}%</b><small>résolus</small></div>
		</div>
		<div class="kpi-grid">
			${kpis.map(([icon, value, label, color]) => `
				<div class="kpi-card" style="--c:${color}">
					<span>${ico(icon)}</span>
					<b>${value}</b>
					<small>${label}</small>
				</div>
			`).join("")}
		</div>
		<div class="stats-grid">
			<section class="settings-card">
				<h3>${ico("chart-column")} Par catégorie</h3>
				${statBars(categories, total)}
			</section>
			<section class="settings-card">
				<h3>${ico("chart-line")} 7 derniers jours</h3>
				<div class="week-chart">
					${days.map(([label, value]) => `
						<div><i style="height:${Math.round((value / maxDay) * 100)}%"></i><b>${value}</b><span>${esc(label)}</span></div>
					`).join("")}
				</div>
			</section>
			<section class="settings-card">
				<h3>${ico("compass")} Activité</h3>
				<div class="mini-stats">
					<div><b>${unassigned}</b><span>Envoyés non pris en charge</span></div>
					<div><b>${inProgress}</b><span>Interventions en cours</span></div>
					<div><b>${similar}</b><span>Signalements similaires</span></div>
					<div><b>${withPhoto}</b><span>Avec photo</span></div>
					<div><b>${employees.length}</b><span>Employés</span></div>
					<div><b>${SERVICES.length}</b><span>Services</span></div>
				</div>
			</section>
			<section class="settings-card">
				<h3>${ico("trophy")} Agents les plus actifs</h3>
				${topEmployees.length
					? statBars(
						topEmployees.map(([name, value]) => [name, value, "#10b981"]),
						topEmployees[0][1]
					)
					: '<p class="management-note">Aucun signalement traité par un agent pour l\'instant.</p>'}
			</section>
		</div>
	`;
}

// Extrait les coordonnées [latitude, longitude] d'un signalement (ou null).
function reportCoordinates(report) {
	// Coordonnées numériques directes si elles existent.
	if (Number.isFinite(report.latitude) && Number.isFinite(report.longitude)) {
		return [report.latitude, report.longitude];
	}

	// Sinon, lecture du texte « 47.47° N, 0.55° W ».
	const match = /([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])/
		.exec(report.location || "");

	if (!match) {
		return null;
	}

	// Le sud et l'ouest donnent des valeurs négatives.
	return [
		Number(match[1]) * (match[2] === "S" ? -1 : 1),
		Number(match[3]) * (match[4] === "W" ? -1 : 1)
	];
}

// Distance en mètres entre deux points (formule de haversine).
function distanceMeters(a, b) {
	const rad = degrees => degrees * Math.PI / 180;
	const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2
		+ Math.cos(rad(a[0])) * Math.cos(rad(b[0]))
		* Math.sin(rad(b[1] - a[1]) / 2) ** 2;

	return 12742000 * Math.asin(Math.sqrt(h));
}

// Regroupe les signalements de même catégorie proches du premier reçu (distance réglable).
function groupReports(list) {
	const groups = [];

	// Distance de regroupement choisie dans les paramètres (100 m par défaut).
	const maxDistance = Number(settings.radius) || 100;

	list.forEach(report => {
		const coordinates = reportCoordinates(report);

		// Cherche un groupe existant compatible (catégorie et proximité).
		const group = coordinates && !report.standalone && groups.find(item =>
			item.coordinates
			&& !item.main.standalone
			&& item.main.category === report.category
			&& distanceMeters(item.coordinates, coordinates) <= maxDistance
		);

		// Ajoute au groupe trouvé, sinon crée un nouveau groupe.
		if (group) {
			group.duplicates.push(report);
		} else {
			groups.push({ main: report, coordinates, duplicates: [] });
		}
	});

	return groups;
}

// Ligne compacte façon boîte mail ; un clic déplie le détail et les actions.
function adminReportCard(report, className = "", canSeparate = false) {
	// Services destinataires déjà choisis.
	const services = report.services || [];

	return `
		<details class="mail-row ${className}">
			<summary>
				<span class="mail-dot ${statusClass(report.status)}"></span>
				<span class="mail-category" style="--cat:${esc(categoryColor(report.category))}">${esc(report.category)}</span>
				<span class="mail-preview">${esc(report.description || "Aucune description")}</span>
				<span class="mail-date">${esc(report.date)}</span>
				<span class="admin-report-status ${statusClass(report.status)}">${esc(report.status)}</span>
			</summary>
			<div class="mail-body">
				<div class="mail-meta">
					${report.photoUrl ? `<img src="${esc(report.photoUrl)}" alt="">` : ""}
					<div>
						<p>${esc(report.description || "Aucune description.")}</p>
						<small>${ico("map-pin")} ${esc(report.location)}</small>
						${report.assignedName ? `<small>${ico("wrench")} Pris en charge par ${esc(report.assignedName)}${report.status === "Traité" && report.treatedAt ? ` · traité le ${esc(report.treatedAt)}` : ""}</small>` : ""}
						${report.note ? `<small>${ico("file-text")} ${esc(report.note)}</small>` : ""}
						${services.length
							? `<div class="service-tags">${services.map(service => `<em>${esc(service)}</em>`).join("")}</div>`
							: ""}
					</div>
				</div>
				<div class="admin-report-actions">
					${report.status === "Reçu"
						? `<button type="button" class="admin-send" data-admin-send="${report.id}">Envoyer</button>`
						: ""}
					${report.status === "Envoyé"
						? `<button type="button" class="admin-send" data-admin-resolve="${report.id}">Marquer comme traité</button>`
						: ""}
					${canSeparate
						? `<button type="button" class="admin-separate" data-admin-separate="${report.id}">Déclarer comme signalement unique</button>`
						: ""}
					<button type="button" class="admin-delete" data-admin-delete="${report.id}">Supprimer</button>
				</div>
			</div>
		</details>
	`;
}

// Fenêtre pop-up pour choisir les services destinataires.
function openSendDialog(id) {
	// Recherche du signalement concerné.
	const report = reports.find(item => item.id === id);

	if (!report) {
		return;
	}

	// Construction du pop-up avec la liste des services.
	const overlay = document.createElement("div");

	overlay.className = "send-dialog-backdrop";
	overlay.innerHTML = `
		<div class="send-dialog" role="dialog" aria-modal="true">
			<h3>Envoyer le signalement</h3>
			<p>${esc((report.description || "").slice(0, 80))}</p>
			<div class="service-options">
				${SERVICES.map(service => `
					<label class="option service-option">
						<input type="checkbox" value="${esc(service)}">
						${esc(service)}
					</label>
				`).join("")}
			</div>
			<div class="send-dialog-actions">
				<button type="button" class="admin-cancel">Annuler</button>
				<button type="button" class="admin-send">Envoyer</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);

	// Gère les clics : fermeture ou envoi du signalement.
	overlay.addEventListener("click", event => {
		// Annuler ou clic en dehors du pop-up : on le ferme.
		if (event.target === overlay || event.target.closest(".admin-cancel")) {
			overlay.remove();
		} else if (event.target.closest(".admin-send")) {
			// Récupère les services cochés.
			const services = [...overlay.querySelectorAll("input:checked")]
				.map(input => input.value);

			// Au moins un service est obligatoire.
			if (!services.length) {
				toast("Veuillez choisir au moins un service");
				return;
			}

			// Mise à jour du statut, sauvegarde puis rafraîchissement.
			report.status = "Envoyé";
			report.services = services;
			save();
			overlay.remove();
			renderAdminReports();
			toast("Signalement envoyé");
		}
	});

	// Met en évidence les services cochés.
	overlay.addEventListener("change", event => {
		event.target.closest(".option")
			?.classList.toggle("selected", event.target.checked);
	});
}

// Pop-up de confirmation moderne (remplace window.confirm).
function confirmDialog(
	{ icon = "trash-2", title, message, confirmLabel = "Confirmer", danger = true },
	onConfirm
) {
	// Construction du pop-up de confirmation.
	const overlay = document.createElement("div");

	overlay.className = "send-dialog-backdrop";
	overlay.innerHTML = `
		<div class="send-dialog confirm-dialog" role="alertdialog" aria-modal="true">
			<div class="confirm-icon ${danger ? "danger" : ""}">${ico(icon)}</div>
			<h3>${esc(title)}</h3>
			<p>${esc(message)}</p>
			<div class="confirm-actions">
				<button type="button" class="admin-btn admin-cancel">Annuler</button>
				<button type="button" class="admin-btn ${danger ? "admin-delete" : "admin-primary"} confirm-ok">${esc(confirmLabel)}</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	overlay.querySelector(".confirm-ok").focus();

	// Ferme le pop-up et retire l'écouteur du clavier.
	const close = () => {
		overlay.remove();
		document.removeEventListener("keydown", onKey);
	};

	// La touche Échap ferme le pop-up.
	const onKey = event => {
		if (event.key === "Escape") {
			close();
		}
	};

	document.addEventListener("keydown", onKey);

	// Clic sur Annuler / fond : fermer ; clic sur Confirmer : fermer et exécuter.
	overlay.addEventListener("click", event => {
		if (event.target === overlay || event.target.closest(".admin-cancel")) {
			close();
		} else if (event.target.closest(".confirm-ok")) {
			close();
			onConfirm();
		}
	});
}

// Gère les actions des boutons du centre de suivi (envoyer, traiter, séparer, supprimer).
adminContent.addEventListener("click", event => {
	const sendButton = event.target.closest("[data-admin-send]");
	const deleteButton = event.target.closest("[data-admin-delete]");
	const separateButton = event.target.closest("[data-admin-separate]");
	const resolveButton = event.target.closest("[data-admin-resolve]");

	// Marquer comme traité, après confirmation.
	if (resolveButton) {
		const report = reports.find(
			item => item.id === Number(resolveButton.dataset.adminResolve)
		);

		if (report) {
			confirmDialog({
				icon: "circle-check",
				title: "Marquer comme traité ?",
				message: "Confirmez que ce signalement a bien été traité. Le citoyen verra le statut « Traité ».",
				confirmLabel: "Oui, traité",
				danger: false
			}, () => {
				report.status = "Traité";
				save();
				renderAdminReportList();
				toast("Signalement marqué comme traité");
			});
		}

		return;
	}

	// Déclarer un signalement comme unique (hors groupe).
	if (separateButton) {
		const report = reports.find(
			item => item.id === Number(separateButton.dataset.adminSeparate)
		);

		if (report) {
			report.standalone = true;
			save();
			renderAdminReports();
			toast("Signalement séparé du groupe");
		}

		return;
	}

	if (sendButton) {
		// Ouvre le choix des services destinataires.
		openSendDialog(Number(sendButton.dataset.adminSend));
	} else if (deleteButton) {
		// Suppression définitive, après confirmation.
		const id = Number(deleteButton.dataset.adminDelete);

		confirmDialog({
			title: "Supprimer ce signalement ?",
			message: "Cette action est définitive : le signalement disparaîtra aussi de l'historique du citoyen.",
			confirmLabel: "Supprimer"
		}, () => {
			reports = reports.filter(item => item.id !== id);
			save();
			renderAdminReports();
			toast("Signalement supprimé");
		});
	}
});

// Valeurs par défaut des filtres du centre de suivi.
const DEFAULT_FILTERS = {
	search: "",
	status: "",
	category: "",
	service: "",
	from: "",
	to: "",
	photo: "",
	contact: "",
	grouping: "",
	sort: "recent"
};
let reportFilters = { ...DEFAULT_FILTERS };

// Convertit une date « jj/mm/aaaa » en horodatage pour les comparaisons.
function parseFrenchDate(value) {
	const [day, month, year] = String(value).split("/").map(Number);

	return new Date(year, month - 1, day).getTime();
}

// Indique si un signalement respecte tous les filtres actifs.
function reportMatchesFilters(report) {
	const f = reportFilters;

	// Texte de recherche : tous les champs utiles concaténés en minuscules.
	const text = [
		report.title, report.description, report.category, report.location,
		report.userName, report.userEmail, report.userPhone,
		(report.services || []).join(" ")
	].join(" ").toLowerCase();
	const time = parseFrenchDate(report.date);

	// Chaque filtre vide est ignoré ; sinon le signalement doit y correspondre.
	return (!f.search || text.includes(f.search.toLowerCase()))
		&& (!f.status || report.status === f.status)
		&& (!f.category || report.category === f.category)
		&& (!f.service || (report.services || []).includes(f.service))
		&& (!f.from || time >= new Date(f.from).setHours(0, 0, 0, 0))
		&& (!f.to || time <= new Date(f.to).setHours(0, 0, 0, 0))
		&& (
			!f.photo
			|| (f.photo === "with" ? !!report.photoUrl : !report.photoUrl)
		)
		&& (
			!f.contact
			|| (f.contact === "identified" ? !!report.userName : !report.userName)
		);
}

// Renvoie les groupes de signalements filtrés puis triés.
function filteredAdminGroups() {
	const f = reportFilters;

	// Filtrage puis regroupement par proximité.
	let groups = groupReports(reports.filter(reportMatchesFilters));

	// Filtre sur la présence de signalements similaires.
	if (f.grouping === "grouped") {
		groups = groups.filter(group => group.duplicates.length);
	} else if (f.grouping === "single") {
		groups = groups.filter(group => !group.duplicates.length);
	}

	// Les différentes méthodes de tri disponibles.
	const key = group => group.main.id;
	const sorters = {
		recent: (x, y) => key(y) - key(x),
		oldest: (x, y) => key(x) - key(y),
		title: (x, y) => x.main.title.localeCompare(y.main.title, "fr"),
		category: (x, y) => x.main.category.localeCompare(y.main.category, "fr"),
		similar: (x, y) => y.duplicates.length - x.duplicates.length
	};

	return groups.sort(sorters[f.sort] || sorters.recent);
}

// Affiche la liste des signalements et leur compteur selon les filtres.
function renderAdminReportList(newReportId = null) {
	const groups = filteredAdminGroups();
	const total = groups.reduce(
		(sum, group) => sum + 1 + group.duplicates.length,
		0
	);
	const list = adminContent.querySelector(".admin-report-list");
	const counter = adminContent.querySelector("#report-count");

	// Vrai quand les filtres masquent une partie des signalements.
	const filtered = total !== reports.length;

	// Mise à jour du compteur.
	counter.innerHTML = `
		<b>${total}</b>
		<small>${filtered ? `sur ${reports.length}` : `signalement${total > 1 ? "s" : ""}`}</small>
	`;

	// Affiche chaque groupe (signalement principal + similaires), ou un message vide.
	list.innerHTML = groups.length
		? groups
			// Cette fonction fléchée transforme chaque groupe en ligne administrative.
			.map((group, index) => {
				// Animation : la nouvelle carte apparaît, les autres sont décalées.
				const className = group.main.id === newReportId
					? "admin-report-new"
					: newReportId && index > 0
						? "admin-report-shifted"
						: "";
				const count = group.duplicates.length;

				return `
					<div class="admin-report-group">
						${adminReportCard(group.main, className, count > 0)}
						${count ? `
							<details class="admin-report-duplicates">
								<summary><span class="dup-count">${count}</span>similaire${count > 1 ? "s" : ""} à moins de 100 m<span class="dup-chevron"></span></summary>
								${group.duplicates.map(report => adminReportCard(report, "admin-report-duplicate", true)).join("")}
							</details>
						` : ""}
					</div>
				`;
			})
			.join("")
		: `<p class="management-note">${reports.length ? "Aucun signalement ne correspond aux filtres." : "Aucun signalement enregistré."}</p>`;
}

// Génère le code HTML d'une liste déroulante de filtre.
function filterSelect(name, label, options) {
	// Liste déroulante liée au filtre « name », option courante présélectionnée.
	return `
		<label class="filter-field">
			<span>${label}</span>
			<select data-filter="${name}">
				${options.map(([value, text]) => `
					<option value="${esc(value)}" ${reportFilters[name] === value ? "selected" : ""}>${esc(text)}</option>
				`).join("")}
			</select>
		</label>
	`;
}

// Affiche les mêmes données que celles enregistrées par l'application mobile.
function renderAdminReports(newReportId = null) {
	const f = reportFilters;

	// Catégories d'origine + catégories présentes dans les signalements.
	const categories = [
		...new Set([
			...CATEGORIES.map(item => item[0]),
			...reports.map(report => report.category)
		])
	];

	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
		</div>
		<div class="admin-reports-heading">
			<div>
				<span class="eyebrow">CENTRE DE SUIVI</span>
				<h2>Signalements reçus</h2>
			</div>
			<strong id="report-count"></strong>
		</div>
		<div class="filter-bar">
			<div class="filter-row">
				<input class="filter-search" type="search" data-filter="search" value="${esc(f.search)}" placeholder="Rechercher…">
				${filterSelect("category", "", [["", "Catégorie"], ...categories.map(name => [name, name])])}
				${filterSelect("service", "", [["", "Service"], ...SERVICES.map(name => [name, name])])}
				${filterSelect("sort", "", [["recent", "Plus récents"], ["oldest", "Plus anciens"], ["category", "Catégorie"], ["similar", "Plus de similaires"]])}
			</div>
			<div class="filter-quick">
				${[["Reçu", "À traiter"], ["Envoyé", "Envoyés"], ["Traité", "Traités"]].map(([value, label]) => `
					<button type="button" class="admin-btn ${f.status === value ? "filter-active" : ""}" data-filter-status="${value}">${label}</button>
				`).join("")}
				<button type="button" class="admin-btn" data-filter-reset>Réinitialiser</button>
			</div>
		</div>
		<div class="admin-report-list"></div>
	`;

	renderAdminReportList(newReportId);

	// Après l'ajout d'un signalement, on remonte en haut de la liste.
	if (newReportId) {
		const list = adminContent.querySelector(".admin-report-list");

		// Cette fonction fléchée lance le défilement après le rendu de la nouvelle carte.
		window.requestAnimationFrame(() => {
			list?.scrollTo({
				top: 0,
				behavior: "smooth"
			});
		});
	}
}

// Changement de couleur d'une catégorie personnalisée (enregistré aussitôt).
adminContent.addEventListener("change", event => {
	const name = event.target.dataset?.categoryColor;

	if (name) {
		categoryColors[name] = event.target.value;
		saveCategories();
		toast("Couleur mise à jour");
	}
});

// Les filtres se mettent à jour sans reconstruire la barre (le focus est conservé).
adminContent.addEventListener("input", event => {
	const name = event.target.dataset?.filter;

	// Applique le filtre saisi et rafraîchit seulement la liste.
	if (name && adminView === "reports") {
		reportFilters[name] = event.target.value;
		renderAdminReportList();
	}
});

// Boutons rapides de statut et réinitialisation des filtres.
adminContent.addEventListener("click", event => {
	const quick = event.target.closest("[data-filter-status]");

	if (quick) {
		// Un second clic sur le même statut retire le filtre.
		reportFilters.status = reportFilters.status === quick.dataset.filterStatus
			? ""
			: quick.dataset.filterStatus;
		renderAdminReports();
	} else if (event.target.closest("[data-filter-reset]")) {
		// Retour aux filtres par défaut.
		reportFilters = { ...DEFAULT_FILTERS };
		renderAdminReports();
	}
});

// Filtres de la liste des employés (recherche et service).
let employeeFilters = { search: "", service: "" };

// Liste des employés par service, filtrée par la recherche et le service choisi.
function employeeGroupsHtml() {
	const query = employeeFilters.search.trim().toLowerCase();
	const filtering = Boolean(query || employeeFilters.service);

	// Un employé correspond si son nom, code ou e-mail contient la recherche.
	const matches = employee => !query
		|| [employee.name, employee.code, employee.email || ""]
			.some(value => value.toLowerCase().includes(query));

	// Un bloc HTML par service.
	const html = SERVICES
		.filter(service => !employeeFilters.service || service === employeeFilters.service)
		.map(service => {
			const members = employees.filter(
				employee => employee.services.includes(service) && matches(employee)
			);

			// Pendant un filtrage, on masque les services sans résultat.
			if (filtering && !members.length) {
				return "";
			}

			return `
				<section class="employee-group">
					<h3>${esc(service)} <span>${members.length}</span></h3>
					${members.length
						? members.map(employee => `
							<div class="employee-row">
								<div class="employee-avatar">${esc(employee.name.charAt(0).toUpperCase())}</div>
								<div class="employee-info">
									<strong>${esc(employee.name)}</strong>
									<small>${esc(employee.code)} · ${esc(employee.email || "Aucun e-mail")}</small>
								</div>
								<button type="button" class="admin-btn" data-employee-view="${employee.id}">Infos</button>
								<button type="button" class="admin-separate" data-employee-edit="${employee.id}">Modifier</button>
								<button type="button" class="admin-delete" data-employee-delete="${employee.id}">Supprimer</button>
							</div>
						`).join("")
						: '<p class="management-note">Aucun employé.</p>'}
				</section>
			`;
		})
		.join("");

	return html
		|| '<p class="management-note">Aucun employé ne correspond à la recherche.</p>';
}

// Recherche / filtre de service des employés : rafraîchit seulement la liste.
adminContent.addEventListener("input", event => {
	const name = event.target.dataset?.empFilter;

	if (name && adminView === "employees") {
		employeeFilters[name] = event.target.value;
		adminContent.querySelector("#employee-list").innerHTML = employeeGroupsHtml();
	}
});

// Ajout d'un employé et réinitialisation des filtres employés.
adminContent.addEventListener("click", event => {
	if (event.target.closest("[data-employee-add]")) {
		openAddEmployeeDialog();
	} else if (event.target.closest("[data-emp-filter-reset]")) {
		employeeFilters = { search: "", service: "" };
		renderAdminEmployees();
	}
});

// Paramètres du logiciel (maquette) : préférences enregistrées dans le navigateur.
const DEFAULT_SETTINGS = {
	city: "Mairie d'Angers",
	email: "contact@mairie-angers.fr",
	notifyNew: true,
	notifyTreated: true,
	notifyDigest: false,
	digestEmail: "",
	radius: "100",
	language: "fr",
	density: "comfortable",
	theme: "ocean",
	transitions: true
};

// Paramètres courants : valeurs par défaut surchargées par celles enregistrées.
let settings = {
	...DEFAULT_SETTINGS,
	...JSON.parse(localStorage.getItem("signaluo-settings") || "{}")
};

// Thèmes proposés : identifiant, nom et couleurs de l'aperçu (fond, accent, détail).
const THEMES = [
	{ id: "ocean", name: "Océan", colors: ["#eef2f7", "#2563eb", "#dbeafe"] },
	{ id: "foret", name: "Forêt", colors: ["#e6f4ec", "#059669", "#a7f3d0"] },
	{ id: "soleil", name: "Coucher de soleil", colors: ["#fdeee3", "#ea580c", "#fed7aa"] },
	{ id: "lavande", name: "Lavande", colors: ["#f0ebfa", "#7c3aed", "#ddd6fe"] },
	{ id: "nuit", name: "Nuit", colors: ["#111827", "#60a5fa", "#1f2937"] }
];

// Applique la densité de liste (confortable ou compacte) sur toute la page.
function applyDensity() {
	document.documentElement.dataset.density = settings.density;
}

// Active ou désactive les transitions fluides entre les pages.
function applyTransitions() {
	document.documentElement.dataset.transitions = settings.transitions ? "on" : "off";
}

// Applique le thème choisi sur toute la page (Océan = apparence d'origine).
function applyTheme() {
	document.documentElement.dataset.theme = settings.theme;
}

applyDensity();
applyTheme();
applyTransitions();

// Enregistre les paramètres dans le stockage du navigateur.
function saveSettings() {
	localStorage.setItem("signaluo-settings", JSON.stringify(settings));
}

// Génère une ligne de réglage avec interrupteur.
function settingToggle(key, title, description) {
	return `
		<label class="setting-row">
			<span class="setting-text"><strong>${title}</strong><small>${description}</small></span>
			<input type="checkbox" class="switch" data-setting="${key}" ${settings[key] ? "checked" : ""}>
		</label>
	`;
}

// Affiche la page des paramètres du logiciel de gestion.
function renderAdminSettings() {
	// Pastilles des catégories personnalisées (couleur, renommer, supprimer).
	const categoryChips = customCategories.length
		? customCategories.map(name => `
			<span class="category-chip">
				<input type="color" class="color-dot" data-category-color="${esc(name)}" value="${esc(categoryColors[name] || "#6b7280")}" title="Changer la couleur">
				${esc(name)}
				<button type="button" data-category-rename="${esc(name)}" title="Renommer">${ico("pencil")}</button>
				<button type="button" data-category-delete="${esc(name)}" title="Supprimer">×</button>
			</span>
		`).join("")
		: '<span class="management-note">Aucune catégorie personnalisée.</span>';

	// Gabarit de la page des paramètres.
	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
		</div>
		<div class="admin-reports-heading">
			<div>
				<span class="eyebrow">CONFIGURATION</span>
				<h2>Paramètres</h2>
			</div>
		</div>
		<div class="settings-grid">
			<section class="settings-card">
				<h3>${ico("landmark")} Collectivité</h3>
				<label class="setting-field">Nom de la structure
					<input data-setting="city" value="${esc(settings.city)}">
				</label>
				<label class="setting-field">E-mail de contact
					<input type="email" data-setting="email" value="${esc(settings.email)}">
				</label>
				<label class="setting-field">Langue
					<select data-setting="language">
						<option value="fr" ${settings.language === "fr" ? "selected" : ""}>Français</option>
						<option value="en" ${settings.language === "en" ? "selected" : ""}>English</option>
					</select>
				</label>
			</section>
			<section class="settings-card">
				<h3>${ico("bell")} Notifications</h3>
				${settingToggle("notifyNew", "Nouveau signalement", "Être alerté dès qu'un citoyen envoie un signalement.")}
				${settingToggle("notifyTreated", "Signalement traité", "Être prévenu quand un agent clôture une intervention.")}
				${settingToggle("notifyDigest", "Résumé quotidien", "Recevoir un récapitulatif par e-mail chaque matin.")}
				${settings.notifyDigest ? `
					<label class="setting-field digest-email">E-mail de réception du résumé
						<input type="email" data-setting="digestEmail" value="${esc(settings.digestEmail)}" placeholder="prenom.nom@mairie.fr">
					</label>
				` : ""}
			</section>
			<section class="settings-card">
				<h3>${ico("compass")} Signalements</h3>
				<label class="setting-field">Distance de regroupement
					<select data-setting="radius">
						${["50", "100", "200", "500"].map(value => `<option value="${value}" ${settings.radius === value ? "selected" : ""}>${value} m</option>`).join("")}
					</select>
				</label>
				<label class="setting-field">Affichage de la liste
					<select data-setting="density">
						<option value="comfortable" ${settings.density === "comfortable" ? "selected" : ""}>Confortable</option>
						<option value="compact" ${settings.density === "compact" ? "selected" : ""}>Compact</option>
					</select>
				</label>
			</section>
			<section class="settings-card">
				<h3>${ico("book-open")} Documentation</h3>
				<p class="management-note">Un PDF avec le schéma de fonctionnement du logiciel et des deux applications, l'explication de chaque page et bouton, et ce qui se passe après chaque action.</p>
				<button type="button" class="settings-export settings-push" data-settings-guide>
					<span>${ico("file-down")}</span> Télécharger le guide PDF
				</button>
			</section>
			<section class="settings-card settings-wide">
				<h3>${ico("palette")} Apparence</h3>
				${settingToggle("transitions", "Transitions fluides", "Animation douce lors du changement de page.")}
				<p class="management-note">Choisissez le thème de couleurs de l'application.</p>
				<div class="theme-picker">
					${THEMES.map(theme => `
						<button type="button" class="theme-option ${settings.theme === theme.id ? "active" : ""}" data-theme-choice="${theme.id}">
							<span class="theme-swatch" style="background:${theme.colors[0]}">
								<i style="background:${theme.colors[1]}"></i>
								<i style="background:${theme.colors[2]}"></i>
							</span>
							<strong>${theme.name}</strong>
						</button>
					`).join("")}
				</div>
			</section>
			<section class="settings-card settings-wide">
				<h3>${ico("tags")} Catégories et services</h3>
				<p class="management-note">Les catégories créées sont proposées aux citoyens et deviennent un service auquel rattacher des employés. « Autre » reste toujours en dernier.</p>
				<form id="category-form" class="employee-form category-form">
					<input name="category" placeholder="Nouvelle catégorie / service" required>
					<input name="color" type="color" class="color-dot color-dot-large" value="#8b5cf6" title="Couleur de la catégorie">
					<button type="submit" class="primary">Créer</button>
				</form>
				<details class="category-details">
					<summary>Catégories créées <span>${customCategories.length}</span></summary>
					<div class="category-chips">${categoryChips}</div>
				</details>
			</section>
			<section class="settings-card settings-wide settings-data">
				<h3>${ico("database")} Données</h3>
				<p class="management-note">Exportez vos signalements et employés, ou repartez d'une maquette vierge.</p>
				<button type="button" class="settings-export" data-settings-export>
					<span>${ico("download")}</span> Exporter mes données
				</button>
				<div class="danger-zone">
					<div>
						<strong>Zone sensible</strong>
						<small>Efface signalements, employés et catégories ajoutés.</small>
					</div>
					<button type="button" class="reset-demo" data-settings-reset>
						<span>${ico("rotate-ccw")}</span> Réinitialiser la démo
					</button>
				</div>
			</section>
		</div>
	`;
}

// Enregistre un paramètre modifié (interrupteur, champ ou liste).
adminContent.addEventListener("change", event => {
	const key = event.target.dataset?.setting;

	// On ignore les éléments sans réglage ou hors de la page paramètres.
	if (!key || adminView !== "settings") {
		return;
	}

	// Case à cocher : booléen ; sinon valeur saisie.
	settings[key] = event.target.type === "checkbox"
		? event.target.checked
		: event.target.value;
	saveSettings();
	toast("Paramètre enregistré");

	// Applique tout de suite le réglage des transitions.
	if (key === "transitions") {
		applyTransitions();
	}

	// Applique tout de suite la densité d'affichage des listes.
	if (key === "density") {
		applyDensity();
	}

	// Affiche ou masque le champ e-mail selon l'état du résumé quotidien.
	if (key === "notifyDigest") {
		renderAdminSettings();
	}
});

// Actions de la page paramètres : guide PDF, export, réinitialisation.
adminContent.addEventListener("click", event => {
	// Choix d'un thème : appliqué et enregistré immédiatement.
	const themeButton = event.target.closest("[data-theme-choice]");

	if (themeButton) {
		settings.theme = themeButton.dataset.themeChoice;
		saveSettings();
		applyTheme();
		renderAdminSettings();
		toast("Thème appliqué");
		return;
	}

	if (event.target.closest("[data-settings-guide]")) {
		// Téléchargement du guide PDF (si disponible).
		window.downloadGuide?.();
	} else if (event.target.closest("[data-settings-export]")) {
		// Export JSON des données, téléchargé via un lien temporaire.
		const blob = new Blob(
			[JSON.stringify({ reports, employees, settings }, null, 2)],
			{ type: "application/json" }
		);
		const link = document.createElement("a");

		link.href = URL.createObjectURL(blob);
		link.download = "signaluo-export.json";
		link.click();
		URL.revokeObjectURL(link.href);
		toast("Export téléchargé");
	} else if (event.target.closest("[data-settings-reset]")) {
		// Réinitialisation de la démo, après confirmation.
		confirmDialog({
			icon: "rotate-ccw",
			title: "Réinitialiser la démo ?",
			message: "Tous les signalements, employés et catégories ajoutés seront supprimés de ce navigateur.",
			confirmLabel: "Réinitialiser"
		}, () => {
			// Supprime toutes les clés de stockage de l'application.
			Object.keys(localStorage)
				.filter(key => key.startsWith("signaluo-"))
				.forEach(key => localStorage.removeItem(key));
			window.location.replace("index.html");
		});
	}
});

// Gestion des employés rattachés à chaque service.
function renderAdminEmployees() {
	// Gabarit de la page des employés.
	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
		</div>
		<div class="admin-reports-heading">
			<div>
				<span class="eyebrow">ÉQUIPE</span>
				<h2>Employés</h2>
			</div>
			<div class="heading-actions">
				<strong>${employees.length}</strong>
				<button type="button" class="add-employee-btn" data-employee-add title="Ajouter un employé" aria-label="Ajouter un employé">+</button>
			</div>
		</div>
		<div class="filter-bar">
			<div class="filter-row">
				<input class="filter-search" type="search" data-emp-filter="search" value="${esc(employeeFilters.search)}" placeholder="Nom, identifiant ou e-mail…">
				<label class="filter-field">
					<select data-emp-filter="service">
						<option value="">Tous les services</option>
						${SERVICES.map(name => `<option value="${esc(name)}" ${employeeFilters.service === name ? "selected" : ""}>${esc(name)}</option>`).join("")}
					</select>
				</label>
				<button type="button" class="admin-btn" data-emp-filter-reset>Réinitialiser</button>
			</div>
		</div>
		<div class="admin-report-list" id="employee-list">${employeeGroupsHtml()}</div>
	`;
}

// Création d'une catégorie depuis le formulaire des paramètres.
adminContent.addEventListener("submit", event => {
	if (event.target.id === "category-form") {
		event.preventDefault();

		// Lecture et normalisation du nom saisi.
		const formData = new FormData(event.target);
		const name = String(formData.get("category")).trim();
		const exists = SERVICES.some(
			item => item.toLowerCase() === name.toLowerCase()
		);

		if (!name) {
			return;
		}

		// Refuse les doublons et le nom réservé « Autre ».
		if (exists || name.toLowerCase() === "autre") {
			toast("Cette catégorie existe déjà ou n'est pas autorisée");
			return;
		}

		// Enregistre la catégorie, sa couleur et son service associé.
		customCategories.push(name);
		categoryColors[name] = String(formData.get("color"));
		SERVICES.push(name);
		addCategory(name);
		saveCategories();
		renderAdminSettings();
		toast("Catégorie créée");
		return;
	}

});

// Pop-up d'ajout d'un employé.
function openAddEmployeeDialog() {
	// Construction du pop-up d'ajout.
	const overlay = document.createElement("div");

	overlay.className = "send-dialog-backdrop";
	overlay.innerHTML = `
		<form class="send-dialog" role="dialog" aria-modal="true">
			<h3>Nouvel employé</h3>
			<p>Un identifiant (${esc(nextEmployeeCode())}) lui sera attribué automatiquement.</p>
			<label>Nom</label>
			<input name="name" placeholder="Nom de l'employé" required>
			<label>E-mail (facultatif)</label>
			<input name="email" type="email" placeholder="prenom.nom@mairie.fr">
			<label>Services</label>
			<div class="service-options">
				${SERVICES.map(service => `
					<label class="option service-option">
						<input type="checkbox" name="services" value="${esc(service)}">
						${esc(service)}
					</label>
				`).join("")}
			</div>
			<div class="send-dialog-actions">
				<button type="button" class="admin-btn admin-cancel">Annuler</button>
				<button type="submit" class="admin-btn admin-primary">Ajouter</button>
			</div>
		</form>
	`;
	document.body.appendChild(overlay);
	overlay.querySelector("input[name=name]").focus();

	// Ferme le pop-up via Annuler ou un clic sur le fond.
	overlay.addEventListener("click", event => {
		if (event.target === overlay || event.target.closest(".admin-cancel")) {
			overlay.remove();
		}
	});

	// Validation du formulaire : crée l'employé.
	overlay.querySelector("form").addEventListener("submit", event => {
		event.preventDefault();

		// Lecture des champs saisis.
		const data = new FormData(event.target);
		const name = String(data.get("name")).trim();
		const services = data.getAll("services");

		if (!name) {
			return;
		}

		// Au moins un service est obligatoire.
		if (!services.length) {
			toast("Choisissez au moins un service");
			return;
		}

		// Ajoute l'employé, sauvegarde et rafraîchit la liste.
		employees.push({
			id: Date.now(),
			code: nextEmployeeCode(),
			name,
			email: String(data.get("email")).trim(),
			services
		});
		saveEmployees();
		overlay.remove();
		renderAdminEmployees();
		toast("Employé ajouté");
	});
}

// Pop-up de consultation ou de modification (nom et e-mail ensemble) d'un employé.
function openEmployeeDialog(id, editable) {
	// Recherche de l'employé concerné.
	const employee = employees.find(item => item.id === id);

	if (!employee) {
		return;
	}

	// Construction du pop-up (champs en lecture seule si non modifiable).
	const overlay = document.createElement("div");

	overlay.className = "send-dialog-backdrop";
	overlay.innerHTML = `
		<form class="send-dialog" role="dialog" aria-modal="true">
			<h3>${editable ? "Modifier l'employé" : "Infos de l'employé"}</h3>
			<p>Identifiant : <strong>${esc(employee.code)}</strong></p>
			<label>Nom</label>
			<input name="name" value="${esc(employee.name)}" ${editable ? "required" : "readonly"}>
			<label>E-mail</label>
			<input name="email" type="email" value="${esc(employee.email || "")}" ${editable ? "" : "readonly"}>
			<label>Services</label>
			<div class="service-options">
				${SERVICES.map(service => `
					<label class="option service-option ${employee.services.includes(service) ? "selected" : ""}">
						<input type="checkbox" name="services" value="${esc(service)}" ${employee.services.includes(service) ? "checked" : ""} ${editable ? "" : "disabled"}>
						${esc(service)}
					</label>
				`).join("")}
			</div>
			<div class="send-dialog-actions">
				<button type="button" class="admin-btn admin-cancel">${editable ? "Annuler" : "Fermer"}</button>
				${editable ? '<button type="submit" class="admin-btn admin-primary">Enregistrer</button>' : ""}
			</div>
		</form>
	`;
	document.body.appendChild(overlay);

	// Ferme le pop-up via Annuler/Fermer ou un clic sur le fond.
	overlay.addEventListener("click", event => {
		if (event.target === overlay || event.target.closest(".admin-cancel")) {
			overlay.remove();
		}
	});

	// Validation du formulaire : met à jour l'employé.
	overlay.querySelector("form").addEventListener("submit", event => {
		event.preventDefault();

		const data = new FormData(event.target);
		const name = String(data.get("name")).trim();

		const services = data.getAll("services");

		if (!name) {
			return;
		}

		// Au moins un service est obligatoire.
		if (!services.length) {
			toast("Choisissez au moins un service");
			return;
		}

		// Applique les modifications puis sauvegarde.
		employee.name = name;
		employee.services = services;
		employee.email = String(data.get("email")).trim();
		saveEmployees();
		overlay.remove();
		renderAdminEmployees();
		toast("Employé modifié");
	});
}

// Renomme une catégorie partout (listes, employés et signalements).
function renameCategory(oldName, newName) {
	// Rien à faire si le nom est vide ou inchangé.
	if (!newName || newName === oldName) {
		return;
	}

	// Refuse « Autre » et les noms déjà utilisés.
	if (
		newName.toLowerCase() === "autre"
		|| SERVICES.some(
			item => item !== oldName && item.toLowerCase() === newName.toLowerCase()
		)
	) {
		toast("Ce nom existe déjà ou n'est pas autorisé");
		return;
	}

	// Renomme dans les catégories personnalisées et reporte la couleur.
	customCategories = customCategories.map(
		item => item === oldName ? newName : item
	);

	if (categoryColors[oldName]) {
		categoryColors[newName] = categoryColors[oldName];
		delete categoryColors[oldName];
	}

	// Renomme dans les listes de services et de catégories.
	SERVICES[SERVICES.indexOf(oldName)] = newName;
	CATEGORIES.find(item => item[0] === oldName)[0] = newName;

	// Met à jour les services des employés.
	employees.forEach(employee => {
		employee.services = employee.services.map(
			item => item === oldName ? newName : item
		);
	});

	// Met à jour catégorie et services des signalements.
	reports.forEach(report => {
		if (report.category === oldName) {
			report.category = newName;
		}

		report.services = (report.services || []).map(
			item => item === oldName ? newName : item
		);
	});

	// Sauvegarde et rafraîchissement.
	saveCategories();
	saveEmployees();
	save();
	renderAdminSettings();
	toast("Catégorie renommée");
}

// Pop-up de saisie du nouveau nom d'une catégorie.
function openRenameCategoryDialog(oldName) {
	// Construction du pop-up.
	const overlay = document.createElement("div");

	overlay.className = "send-dialog-backdrop";
	overlay.innerHTML = `
		<form class="send-dialog" role="dialog" aria-modal="true">
			<h3>Renommer la catégorie</h3>
			<label>Nouveau nom</label>
			<input name="name" value="${esc(oldName)}" required>
			<div class="send-dialog-actions">
				<button type="button" class="admin-btn admin-cancel">Annuler</button>
				<button type="submit" class="admin-btn admin-primary">Renommer</button>
			</div>
		</form>
	`;
	document.body.appendChild(overlay);
	overlay.querySelector("input").select();

	// Ferme le pop-up via Annuler ou un clic sur le fond.
	overlay.addEventListener("click", event => {
		if (event.target === overlay || event.target.closest(".admin-cancel")) {
			overlay.remove();
		}
	});

	// Validation : ferme le pop-up puis renomme la catégorie.
	overlay.querySelector("form").addEventListener("submit", event => {
		event.preventDefault();
		overlay.remove();
		renameCategory(oldName, new FormData(event.target).get("name").trim());
	});
}

// Actions de la page paramètres/employés : renommer, modifier, consulter, supprimer.
adminContent.addEventListener("click", event => {
	const renameButton = event.target.closest("[data-category-rename]");
	const editButton = event.target.closest("[data-employee-edit]");

	// Renommer une catégorie.
	if (renameButton) {
		openRenameCategoryDialog(renameButton.dataset.categoryRename);
		return;
	}

	// Modifier un employé.
	if (editButton) {
		openEmployeeDialog(Number(editButton.dataset.employeeEdit), true);
		return;
	}

	// Consulter les infos d'un employé (lecture seule).
	if (event.target.closest("[data-employee-view]")) {
		openEmployeeDialog(
			Number(event.target.closest("[data-employee-view]").dataset.employeeView),
			false
		);
		return;
	}

	// Supprimer une catégorie personnalisée.
	const categoryButton = event.target.closest("[data-category-delete]");

	if (categoryButton) {
		const name = categoryButton.dataset.categoryDelete;

		// Impossible si des employés y sont rattachés.
		if (employees.some(employee => employee.services.includes(name))) {
			toast("Des employés sont rattachés à cette catégorie");
		} else {
			confirmDialog({
				title: `Supprimer « ${name} » ?`,
				message: "La catégorie ne sera plus proposée aux citoyens.",
				confirmLabel: "Supprimer"
			}, () => {
				// Retire la catégorie de toutes les listes.
				customCategories = customCategories.filter(item => item !== name);
				delete categoryColors[name];
				SERVICES.splice(SERVICES.indexOf(name), 1);
				CATEGORIES.splice(
					CATEGORIES.findIndex(item => item[0] === name),
					1
				);
				saveCategories();
				renderAdminSettings();
				toast("Catégorie supprimée");
			});
		}

		return;
	}

	// Supprimer un employé, après confirmation.
	const button = event.target.closest("[data-employee-delete]");

	if (button) {
		confirmDialog({
			title: "Supprimer cet employé ?",
			message: "Il ne pourra plus se connecter à la version professionnelle.",
			confirmLabel: "Supprimer"
		}, () => {
			employees = employees.filter(
				item => item.id !== Number(button.dataset.employeeDelete)
			);
			saveEmployees();
			renderAdminEmployees();
			toast("Employé supprimé");
		});
	}
});

// ---------------------------------------------------------------------------
// SECTION : VUE CARTE DU LOGICIEL DE GESTION
// ---------------------------------------------------------------------------

// Instance MapLibre de la vue carte (détruite en quittant la page).
let adminMapInstance = null;

// Couleur du repère selon le statut du signalement.
const STATUS_COLORS = {
	"Reçu": "#f59e0b",
	"Envoyé": "#7c3aed",
	"Traité": "#16a34a"
};

// Affiche tous les signalements géolocalisés sur une carte.
function renderAdminMap() {
	// Seuls les signalements avec coordonnées peuvent être placés.
	const located = reports.filter(report => (
		Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
	));

	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
		</div>
		<div class="admin-reports-heading">
			<div>
				<span class="eyebrow">GÉOLOCALISATION</span>
				<h2 id="management-title">Carte</h2>
			</div>
			<div class="map-count"><b>${located.length}</b><small>sur la carte</small></div>
		</div>
		<div class="admin-map-wrap">
			<div id="admin-map" class="admin-map"></div>
			<div class="admin-map-legend">
				${[["Reçu", "À traiter"], ["Envoyé", "Envoyé"], ["Traité", "Traité"]].map(([name, label]) => `
					<span><i style="background:${STATUS_COLORS[name]}"></i>${label}</span>
				`).join("")}
			</div>
			<div class="admin-map-card" hidden></div>
		</div>
	`;

	if (!window.maplibregl) {
		adminContent.querySelector("#admin-map").textContent
			= "La carte n'a pas pu être chargée.";
		return;
	}

	adminMapInstance = createAppMap({
		container: "admin-map",
		center: [-0.5513, 47.4712],
		zoom: 12.5
	});

	const card = adminContent.querySelector(".admin-map-card");
	const bounds = new maplibregl.LngLatBounds();

	// Un repère coloré par signalement ; un clic ouvre la fiche.
	located.forEach(report => {
		const pin = document.createElement("button");

		pin.type = "button";
		pin.className = "admin-pin";
		pin.style.setProperty("--c", STATUS_COLORS[report.status] || "#2563eb");
		pin.title = report.title;
		pin.innerHTML = ico("map-pin");
		pin.addEventListener("click", event => {
			event.stopPropagation();
			showAdminMapCard(card, report);
		});

		new maplibregl.Marker({ element: pin, anchor: "bottom" })
			.setLngLat([report.longitude, report.latitude])
			.addTo(adminMapInstance);
		bounds.extend([report.longitude, report.latitude]);
	});

	// Cadre tous les signalements (ou un seul avec un zoom raisonnable).
	if (located.length === 1) {
		adminMapInstance.setCenter([located[0].longitude, located[0].latitude]);
		adminMapInstance.setZoom(15.5);
	} else if (located.length > 1) {
		adminMapInstance.fitBounds(bounds, { padding: 70, maxZoom: 16, duration: 0 });
	}

	// Un clic sur la carte ferme la fiche.
	adminMapInstance.on("click", () => {
		card.hidden = true;
	});
}

// Remplit et affiche la fiche d'un signalement sur la carte.
function showAdminMapCard(card, report) {
	card.hidden = false;
	card.innerHTML = `
		<div class="admin-map-card-head">
			<span class="badge ${statusClass(report.status)}">${esc(report.status)}</span>
			<small>${esc(report.category)} · ${esc(report.date)}</small>
		</div>
		<h4>${esc(report.title)}</h4>
		<p>${esc(report.description || "Aucune description.")}</p>
		<small>${ico("map-pin")} ${esc(report.location)}</small>
		<button type="button" class="secondary" data-admin-action="reports">
			Ouvrir la liste
		</button>
	`;
}

// Met à jour l'onglet visuel et le contenu de la fenêtre macOS.
function setAdminView(view) {
	adminView = view;

	// La carte WebGL est détruite en quittant la vue carte.
	if (adminMapInstance) {
		adminMapInstance.remove();
		adminMapInstance = null;
	}

	// Retire l'animation de transition si aucune n'est en cours.
	if (!adminTransitioning) {
		adminContent.classList.remove("admin-content-transition");
	}

	// Annule l'animation précédente en attente.
	if (adminTransitionFrame) {
		window.cancelAnimationFrame(adminTransitionFrame);
	}

	// Cette fonction fléchée synchronise l'état actif de chaque bouton administratif.
	adminNavigation.forEach(navigationItem => {
		navigationItem.classList.toggle(
			"active",
			navigationItem.dataset.adminAction === view
		);
	});

	// Affiche la page demandée (tableau de bord par défaut).
	if (view === "reports") {
		renderAdminReports();
	} else if (view === "map") {
		renderAdminMap();
	} else if (view === "employees") {
		renderAdminEmployees();
	} else if (view === "settings") {
		renderAdminSettings();
	} else {
		renderAdminDashboard();
	}

	// Pas de nouvelle animation si une transition est déjà en cours.
	if (adminTransitioning) {
		return;
	}

	// Lance la transition après le nouveau rendu du panneau.
	adminTransitionFrame = window.requestAnimationFrame(() => {
		adminContent.classList.add("admin-content-transition");
		adminTransitioning = true;
		adminTransitionFrame = null;

		// Fin de la transition après 1,05 s.
		adminTransitionTimeout = window.setTimeout(() => {
			adminTransitioning = false;
		}, 1050);
	});
}

// ---------------------------------------------------------------------------
// SECTION : APPLICATION CITOYENNE (faux téléphone)
// Historique et détails d'un signalement
// ---------------------------------------------------------------------------

// Construit la carte visuelle d'un signalement dans l'application citoyenne.
function reportCard(report, showStatus = true) {
	// Cette fonction fléchée retrouve la catégorie correspondant au signalement.
	const category = CATEGORIES.find(item => item[0] === report.category)
		|| CATEGORIES[CATEGORIES.length - 1];

	// Pastille de statut (facultative).
	const status = showStatus
		? `<span class="badge ${statusClass(report.status)}">${esc(report.status)}</span>`
		: "";

	// Photo du signalement, sinon icône de la catégorie.
	const icon = report.photoUrl
		? `<img class="report-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
		: ico(category[1]);

	return `
		<article class="report" data-id="${report.id}">
			<div class="report-icon ${category[2]}" ${categoryColorStyle(report.category)}>${icon}</div>
			<div>
				<h4>${esc(report.title)}</h4>
				<p>${ico("map-pin")} ${esc(report.location)} · ${esc(report.date)}</p>
				${status}
			</div>
		</article>
	`;
}

// Affiche les informations complètes d'un signalement dans une fenêtre modale.
function showReportDetails(id) {
	// Recherche du signalement à détailler.
	const report = reports.find(item => item.id === id);

	if (!report) {
		return;
	}

	// Cette fonction fléchée retrouve la catégorie correspondant au signalement détaillé.
	const category = CATEGORIES.find(item => item[0] === report.category)
		|| CATEGORIES[CATEGORIES.length - 1];

	// Photo du signalement, sinon pastille de la catégorie.
	const photo = report.photoUrl
		? `<img class="details-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
		: `<div class="details-placeholder ${category[2]}" ${categoryColorStyle(report.category)}>${ico(category[1])}</div>`;

	// Bloc de coordonnées, affiché seulement si le citoyen en a fourni.
	const contact = report.userName || report.userEmail || report.userPhone
		? `
			<div class="details-section">
				<h4>Coordonnées</h4>
				<p>${esc(report.userName || "—")}</p>
				<p>${esc(report.userEmail || "—")}</p>
				<p>${esc(report.userPhone || "—")}</p>
			</div>
		`
		: "";

	// Insère la fenêtre modale à la fin de l'application.
	app.insertAdjacentHTML(
		"beforeend",
		`
			<div class="modal-backdrop" data-action="close-details">
				<section
					class="details-modal"
					role="dialog"
					aria-modal="true"
					aria-labelledby="details-title"
				>
					<button
						class="modal-close"
						data-action="close-details"
						aria-label="Fermer"
					>
						×
					</button>
					${photo}
					<h3 id="details-title">${esc(report.title)}</h3>
					<div class="details-section">
						<p><strong>Catégorie :</strong> ${esc(report.category)}</p>
						<p><strong>Date :</strong> ${esc(report.date)}</p>
						<p><strong>Localisation :</strong> ${esc(report.location)}</p>
					</div>
					<div class="details-section">
						<h4>Description</h4>
						<p>${esc(report.description || "Aucune description fournie.")}</p>
					</div>
					${contact}
				</section>
			</div>
		`
	);
}

// ---------------------------------------------------------------------------
// Rendu des écrans principaux
// ---------------------------------------------------------------------------

// Affiche l'écran d'accueil de l'application citoyenne.
function renderDashboard() {
	// Cette fonction fléchée compte les signalements reçus.
	const received = reports.filter(report => report.status === "Reçu").length;

	// Cette fonction fléchée compte les signalements déjà traités.
	const resolved = reports.filter(report => report.status === "Traité").length;

	// Bandeau affiché uniquement en mode gestionnaire.
	const managerBanner = manager
		? `
			<div class="option selected">
				${ico("lock-open")}
				<b>Mode gestionnaire actif</b>
				<small>Cliquez sur une demande pour changer son statut.</small>
			</div>
		`
		: "";

	// Les 3 derniers signalements, du plus récent au plus ancien.
	const recentReports = reports.length
		? reports.slice(-3).reverse().map(reportCard).join("")
		: `<div class="empty"><div>${ico("crosshair")}</div>Aucun signalement</div>`;

	// Affichage de l'écran d'accueil.
	app.innerHTML = `
		<div class="screen">
			<div class="topbar">
				<button class="icon-btn" data-action="manager" title="Mode gestionnaire">${ico("lock")}</button>
				<h2>Mes Signalements</h2>
				<button class="icon-btn" data-action="history" title="Historique">${ico("history")}</button>
			</div>
			${managerBanner}
			<div class="hero">
				<small>Bonjour ${ico("hand")}</small>
				<h3>Améliorons la ville ensemble.</h3>
				<p>Un signalement simple, un impact concret sur votre quotidien.</p>
			</div>
			<div class="stats">
				<div class="stat">
					<b>${received}</b>
					<small>REÇUS</small>
				</div>
				<div class="stat">
					<b>${resolved}</b>
					<small>TRAITÉS</small>
				</div>
			</div>
			<button class="primary" data-action="start">＋ Signaler un problème</button>
			<div class="section-title">
				<b>Derniers signalements</b>
				<button data-action="history">Voir tout l’historique</button>
			</div>
			${recentReports}
		</div>
	`;

	// Cette fonction fléchée ouvre le détail du signalement sélectionné.
	app.querySelectorAll(".report").forEach(card => {
		// Cette fonction fléchée réagit au clic sur une carte.
		card.addEventListener("click", () => {
			// Mode gestionnaire : change le statut ; sinon ouvre le détail.
			if (manager) {
				cycleStatus(Number(card.dataset.id));
			} else {
				showReportDetails(Number(card.dataset.id));
			}
		});
	});
}

// Affiche l'historique complet des signalements de l'utilisateur.
function renderHistory() {
	// Libellé du nombre de demandes (avec pluriel).
	const reportCount = `${reports.length} demande${reports.length > 1 ? "s" : ""}`;

	// Cartes du plus récent au plus ancien, ou message vide.
	const history = reports.length
		? reports.slice().reverse().map(report => reportCard(report, manager)).join("")
		: `<div class="empty"><div>${ico("crosshair")}</div>Vous n’avez pas encore réalisé de signalement.</div>`;

	// Affichage de l'historique.
	app.innerHTML = `
		<div class="screen">
			<div class="topbar">
				<button class="icon-btn" data-action="wizard">${ico("arrow-left")}</button>
				<h2>Mes Signalements</h2>
				<span></span>
			</div>
			<div class="section-title">
				<b>${reportCount}</b>
				<button data-action="start">＋ Nouveau</button>
			</div>
			${history}
		</div>
	`;

	// Cette fonction fléchée ouvre le détail du signalement sélectionné.
	app.querySelectorAll(".report").forEach(card => {
		// Cette fonction fléchée réagit au clic sur une carte historique.
		card.addEventListener("click", () => {
			// Mode gestionnaire : change le statut ; sinon ouvre le détail.
			if (manager) {
				cycleStatus(Number(card.dataset.id));
			} else {
				showReportDetails(Number(card.dataset.id));
			}
		});
	});
}

// Affiche l'étape courante du parcours de création d'un signalement.
function renderWizard() {
	// Étape 0 : écran de lancement.
	if (step === 0) {
		app.innerHTML = `
			<div class="screen launch-screen" aria-labelledby="launch-title">
				<div class="launch-mark">${ico("crosshair")}</div>
				<span class="eyebrow">ESPACE CITOYEN</span>
				<h1 id="launch-title">Prêt à agir pour votre ville ?</h1>
				<p>
					Lancez l’application Signaluo pour signaler rapidement un problème
					près de chez vous.
				</p>
				<button class="launch-button" type="button" data-action="launch">
					Lancer l’application
					<span>${ico("arrow-right")}</span>
				</button>
			</div>
		`;

		return;
	}

	// Titres des 4 étapes et bouton retour (absent à l'étape 1).
	const titles = [
		"Photo du problème",
		"Type de problème",
		"Détails & localisation",
		"Envoi du signalement"
	];
	const backButton = step > 1
		? `<button class="icon-btn" data-action="back">${ico("arrow-left")}</button>`
		: "<span></span>";

	// Indicateur de progression.
	const progressSteps = [1, 2, 3, 4]
		// Cette fonction fléchée génère un indicateur pour chaque étape du parcours.
		.map(number => `
			<span class="step ${number <= step ? "active" : ""}"></span>
		`)
		.join("");

	// Affichage de l'étape.
	app.innerHTML = `
		<div class="screen">
			<div class="topbar">
				${backButton}
				<h2>${step}. ${titles[step - 1]}</h2>
				<button class="icon-btn" data-action="history" title="Historique">${ico("history")}</button>
			</div>
			<div class="steps">${progressSteps}</div>
			${wizardContent()}
		</div>
	`;

	// Branche les événements de l'étape.
	bindWizard();

	// La carte n'existe qu'à l'étape 3.
	if (step === 3) {
		initMap();
	}
}

// Génère le contenu HTML de l'étape courante du parcours.
function wizardContent() {
	// Étape 1 : choix de la photo.
	if (step === 1) {
		// Aperçu de la photo (ou message si aucune photo).
		const photoContent = draft.photo
			? draft.photoUrl
				? `
					<img
						class="photo-preview"
						src="${draft.photoUrl}"
						alt="Photo sélectionnée"
					>
					<strong>Photo ajoutée</strong>
				`
				: `<div style="font-size:4rem">${ico("image")}<strong>Photo ajoutée</strong></div>`
			: `<div style="font-size:3rem">${ico("camera")}<strong>Aucune photo sélectionnée</strong></div>`;

		// Boutons proposés selon qu'une photo existe ou non.
		const photoActions = draft.photo
			? '<button class="primary" data-action="photo">Changer la photo</button>'
			: `
				<button class="primary" data-action="camera">${ico("camera")} Prendre une photo</button>
				<button class="secondary" data-action="gallery">${ico("image")} Ajouter depuis la galerie</button>
			`;

		return `
			<p>Une image aide les services de la ville à comprendre rapidement la situation.</p>
			<div class="photo-box ${draft.photo ? "has-photo" : ""}">
				${photoContent}
			</div>
			<input id="gallery-input" type="file" accept="image/*" hidden>
			<div class="actions">
				${photoActions}
				<button class="secondary" data-action="next" ${draft.photo ? "" : "disabled"}>
					Suivant
				</button>
			</div>
		`;
	}

	// Étape 2 : choix de la catégorie.
	if (step === 2) {
		const categories = CATEGORIES
			// Cette fonction fléchée génère un bouton pour chaque catégorie disponible.
			.map(category => `
				<button
					class="category ${category[2]} ${draft.category === category[0] ? "selected" : ""}"
					${categoryColorStyle(category[0])}
					data-category="${category[0]}"
				>
					<span>${ico(category[1])}</span>
					<small>${category[0]}</small>
				</button>
			`)
			.join("");

		return `
			<p>Quel type de problème souhaitez-vous signaler ?</p>
			<div class="categories">${categories}</div>
			<div class="actions">
				<button class="primary" data-action="next" ${draft.category ? "" : "disabled"}>
					Suivant
				</button>
			</div>
		`;
	}

	// Étape 3 : description et localisation.
	if (step === 3) {
		return `
			<p>Décrivez le problème et indiquez où il se trouve.</p>
			<label for="description">Description détaillée (obligatoire)</label>
			<textarea id="description" required placeholder="Ex. Gros nid de poule au niveau du carrefour, dangereux pour les vélos...">${esc(draft.description)}</textarea>
			<div id="map" class="map" aria-label="Carte interactive"></div>
			<button class="secondary" data-action="location">${ico("locate-fixed")} Détecter ma position</button>
			<p id="location-status" style="margin:9px 0 0;color:var(--green);font-size:.72rem">
				${ico("check")} ${esc(draft.location || "Position non définie")}
			</p>
			<div class="actions">
				<button class="primary" data-action="next" ${draft.description && draft.location ? "" : "disabled"}>
					Suivant
				</button>
			</div>
		`;
	}

	// Étape 4 : choix anonyme / avec coordonnées.
	// Champs de contact affichés seulement si l'envoi n'est pas anonyme.
	const contactFields = draft.anonymous
		? ""
		: `
			<div class="contact-fields">
				<label for="lastName">Nom</label>
				<input id="lastName" value="${esc(draft.lastName)}" placeholder="Votre nom">
				<label for="firstName">Prénom</label>
				<input id="firstName" value="${esc(draft.firstName)}" placeholder="Votre prénom">
				<label for="email">Adresse e-mail</label>
				<input id="email" type="email" value="${esc(draft.email)}" placeholder="vous@exemple.fr">
				<label for="phone">Numéro de téléphone</label>
				<input id="phone" type="tel" value="${esc(draft.phone)}" placeholder="06 12 34 56 78">
			</div>
		`;

	return `
		<p>Choisissez comment transmettre votre demande à la mairie.</p>
		<label class="option ${draft.anonymous ? "selected" : ""}">
			<input type="radio" name="privacy" value="anonymous" ${draft.anonymous ? "checked" : ""}>
			Envoyer anonymement
		</label>
		<label class="option ${!draft.anonymous ? "selected" : ""}">
			<input type="radio" name="privacy" value="contact" ${!draft.anonymous ? "checked" : ""}>
			Envoyer avec mes coordonnées
		</label>
		${contactFields}
		<div class="actions">
			<button class="primary" data-action="submit">Envoyer le signalement</button>
		</div>
	`;
}

// ---------------------------------------------------------------------------
// Événements propres au formulaire
// ---------------------------------------------------------------------------

// Met à jour visuellement la catégorie choisie sans reconstruire l'écran.
function updateCategorySelection() {
	// Marque comme sélectionné uniquement le bouton de la catégorie choisie.
	app.querySelectorAll("[data-category]").forEach(categoryButton => {
		const isSelected = categoryButton.dataset.category === draft.category;

		categoryButton.classList.toggle("selected", isSelected);
	});

	updateWizardNext();
}

// Branche les événements des champs et boutons de l'étape courante.
function bindWizard() {
	// Cette fonction fléchée prépare chaque bouton de catégorie.
	app.querySelectorAll("[data-category]").forEach(button => {
		// Cette fonction fléchée enregistre la catégorie choisie sans recharger l'écran.
		button.onclick = () => {
			draft.category = button.dataset.category;
			updateCategorySelection();
		};
	});

	// Sélection d'une image depuis la galerie.
	const galleryInput = app.querySelector("#gallery-input");

	if (galleryInput) {
		// Cette fonction fléchée traite une image choisie depuis la galerie.
		galleryInput.addEventListener("change", () => {
			const file = galleryInput.files?.[0];

			if (!file) {
				return;
			}

			// Seuls les fichiers image sont acceptés.
			if (!file.type.startsWith("image/")) {
				toast("Veuillez sélectionner une image");
				return;
			}

			const reader = new FileReader();

			// Cette fonction fléchée affiche l'image une fois sa lecture terminée.
			reader.onload = () => {
				draft.photo = true;
				draft.photoUrl = reader.result;
				renderWizard();
				toast("Image ajoutée depuis la galerie");
			};

			reader.readAsDataURL(file);
		});
	}

	// Cette fonction fléchée prépare chaque option de confidentialité.
	app.querySelectorAll('input[name="privacy"]').forEach(input => {
		// Cette fonction fléchée mémorise le choix de confidentialité.
		input.onchange = () => {
			draft.anonymous = input.value === "anonymous";
			renderWizard();
		};
	});

	// Champ de description (étape 3).
	const description = app.querySelector("#description");

	// Cette fonction fléchée prépare le champ de description.
	[description].forEach(input => {
		if (!input) {
			return;
		}

		// Cette fonction fléchée mémorise chaque modification du champ.
		input.addEventListener("input", () => {
			draft[input.id] = input.value.trim();
			updateWizardNext();
		});
	});

	// Cette fonction fléchée prépare chaque champ de contact.
	["lastName", "firstName", "email", "phone"].forEach(field => {
		const input = app.querySelector(`#${field}`);

		if (input) {
			// Cette fonction fléchée mémorise chaque modification de contact.
			input.addEventListener("input", () => {
				draft[field] = input.value.trim();
			});
		}
	});
}

// Active ou désactive le bouton « Suivant » selon les champs remplis.
function updateWizardNext() {
	const next = app.querySelector('[data-action="next"]');

	// Étape 2 : une catégorie est requise.
	if (next && step === 2) {
		next.disabled = !draft.category;
	}

	// Étape 3 : description et position sont requises.
	if (next && step === 3) {
		next.disabled = !(draft.description && draft.location);
	}
}

// ---------------------------------------------------------------------------
// Carte interactive
// ---------------------------------------------------------------------------

// Format attendu pour des coordonnées affichées (ex. « 47.47° N, 0.55° W »).
const COORDINATES_PATTERN = /^[\d.]+°\s*[NS],\s*[\d.]+°\s*[EW]$/;

// Cache des adresses déjà trouvées, conservé dans le stockage.
const addressCache = JSON.parse(
	localStorage.getItem("signaluo-addresses") || "{}"
);

// Convertit des coordonnées en nom de rue (OpenStreetMap Nominatim).
async function reverseGeocode(latitude, longitude) {
	// Clé de cache arrondie à 5 décimales.
	const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

	// Adresse déjà connue : pas de requête réseau.
	if (addressCache[key]) {
		return addressCache[key];
	}

	try {
		// Requête au service de géocodage inverse.
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=fr&lat=${latitude}&lon=${longitude}`
		);
		const { address } = await response.json();

		// Construit « numéro rue, ville » à partir des champs disponibles.
		const street = [
			address.house_number,
			address.road
				|| address.pedestrian
				|| address.footway
				|| address.neighbourhood
		]
			.filter(Boolean).join(" ");
		const city = address.city
			|| address.town
			|| address.village
			|| address.municipality;
		const label = [street, city].filter(Boolean).join(", ");

		// Mémorise l'adresse trouvée.
		if (label) {
			addressCache[key] = label;
			localStorage.setItem(
				"signaluo-addresses",
				JSON.stringify(addressCache)
			);
		}

		return label || null;
	} catch {
		// En cas d'erreur réseau, on renvoie simplement null.
		return null;
	}
}

// Remplace les anciennes coordonnées GPS enregistrées par le nom de la rue.
let resolvingAddresses = false;

// Parcourt les signalements et remplace leurs coordonnées par une adresse.
async function resolveReportAddresses() {
	// Évite deux résolutions simultanées.
	if (resolvingAddresses) {
		return;
	}

	resolvingAddresses = true;
	let changed = false;

	// Parcourt les signalements dont la position est encore en coordonnées.
	for (const report of reports) {
		if (!COORDINATES_PATTERN.test(report.location || "")) {
			continue;
		}

		const coordinates = reportCoordinates(report);
		const address = coordinates && await reverseGeocode(...coordinates);

		// Remplace la position par l'adresse trouvée.
		if (address) {
			report.latitude = coordinates[0];
			report.longitude = coordinates[1];
			report.location = address;
			changed = true;
		}
	}

	resolvingAddresses = false;

	// Sauvegarde et rafraîchit les écrans si quelque chose a changé.
	if (changed) {
		save();

		// Évite de reconstruire le formulaire pendant une saisie.
		if (screen !== "wizard") {
			render();
		}

		setAdminView(adminView);
	}
}

// Enregistre une position et met à jour le repère visible sur la carte.
function setMapLocation(
	latitude,
	longitude,
	message = "Recherche de l'adresse…"
) {
	// Mémorise la position dans le brouillon.
	draft.location = message;
	draft.latitude = latitude;
	draft.longitude = longitude;

	// Déplace le repère existant ou en crée un nouveau.
	if (mapMarker) {
		mapMarker.setLngLat([longitude, latitude]);
	} else if (mapInstance) {
		// Élément HTML du repère : épingle avec halo animé.
		const pin = document.createElement("div");
		pin.className = "map-pin";
		pin.innerHTML = ico("map-pin");

		mapMarker = new maplibregl.Marker({ element: pin, anchor: "bottom" })
			.setLngLat([longitude, latitude])
			.addTo(mapInstance);
	}

	// Recentre la carte sur la position avec un léger déplacement animé.
	if (mapInstance) {
		mapInstance.easeTo({
			center: [longitude, latitude],
			zoom: 16.5,
			duration: 700
		});
	}

	// Affiche la position sous la carte.
	const status = app.querySelector("#location-status");

	if (status) {
		status.innerHTML = `${ico("check")} ${esc(draft.location)}`;
	}

	updateWizardNext();

	// L'adresse remplace le message provisoire dès qu'elle est trouvée.
	if (message === "Recherche de l'adresse…") {
		reverseGeocode(latitude, longitude).then(address => {
			// On ignore la réponse si le repère a changé entre-temps.
			if (draft.latitude === latitude && draft.longitude === longitude) {
				draft.location = address || formatCoordinates(latitude, longitude);

				const currentStatus = app.querySelector("#location-status");

				if (currentStatus) {
					currentStatus.innerHTML = `${ico("check")} ${esc(draft.location)}`;
				}
			}
		});
	}
}

// Formate les coordonnées avec les points cardinaux correspondant à leur signe.
function formatCoordinates(latitude, longitude) {
	const latitudeDirection = latitude >= 0 ? "N" : "S";
	const longitudeDirection = longitude >= 0 ? "E" : "W";

	return `${Math.abs(latitude).toFixed(4)}° ${latitudeDirection}, `
		+ `${Math.abs(longitude).toFixed(4)}° ${longitudeDirection}`;
}

// Crée le bouton qui bascule la carte entre la vue 2D et la vue 3D.
function createMapTiltControl(map) {
	const container = document.createElement("div");
	container.className = "maplibregl-ctrl maplibregl-ctrl-group";

	const button = document.createElement("button");
	button.type = "button";
	button.className = "map-tilt-btn";
	container.appendChild(button);

	// Met à jour le libellé selon l'inclinaison actuelle de la carte.
	const refresh = () => {
		const is3d = map.getPitch() > 5;
		button.textContent = is3d ? "2D" : "3D";
		button.title = is3d ? "Passer en vue 2D" : "Passer en vue 3D";
	};

	// Un clic alterne entre vue à plat et vue inclinée.
	button.addEventListener("click", event => {
		event.stopPropagation();
		const is3d = map.getPitch() > 5;

		map.easeTo({
			pitch: is3d ? 0 : 55,
			bearing: is3d ? 0 : -12,
			duration: 600
		});
	});

	// Le libellé suit aussi les inclinaisons faites à la main.
	map.on("pitchend", refresh);
	setTimeout(refresh);

	return {
		onAdd: () => container,
		onRemove: () => container.remove()
	};
}

// Crée une carte au même style que celle de l'application utilisateur
// (vectorielle, inclinée, bâtiments 3D, boutons de zoom et 3D/2D).
function createAppMap(options) {
	const map = new maplibregl.Map({
		style: "https://tiles.openfreemap.org/styles/liberty",
		zoom: 15.5,
		pitch: 40,
		bearing: -12,
		attributionControl: false,
		...options
	});

	map.addControl(
		new maplibregl.NavigationControl({ showCompass: false }),
		"top-right"
	);
	map.addControl(createMapTiltControl(map), "top-right");
	map.addControl(
		new maplibregl.AttributionControl({ compact: true }),
		"bottom-right"
	);

	return map;
}

// Initialise la carte interactive de l'étape de localisation.
function initMap() {
	// La bibliothèque MapLibre doit être chargée.
	if (!window.maplibregl) {
		toast("La carte n’a pas pu être chargée");
		return;
	}

	const mapElement = app.querySelector("#map");

	if (!mapElement) {
		return;
	}

	// Centre par défaut de la carte : [longitude, latitude].
	const center = [-0.5513, 47.4712];

	// La carte est recréée à chaque retour sur cette étape. On supprime
	// l'ancienne instance pour éviter les doublons de repères.
	if (mapInstance) {
		mapInstance.remove();
	}

	// Carte vectorielle OpenFreeMap « Liberty » : nette à tous les zooms,
	// avec bâtiments en 3D, légèrement inclinée pour un rendu moderne.
	mapMarker = null;
	mapInstance = createAppMap({ container: mapElement, center });

	// Cette fonction fléchée place un repère après un clic sur la carte.
	mapInstance.on("click", event => {
		setMapLocation(event.lngLat.lat, event.lngLat.lng);
		toast("Repère placé sur la carte");
	});

	// Restaure le repère déjà choisi, s'il existe.
	if (
		draft.location
		&& Number.isFinite(draft.latitude)
		&& Number.isFinite(draft.longitude)
	) {
		setMapLocation(draft.latitude, draft.longitude, draft.location);
	}
}

// ---------------------------------------------------------------------------
// Version professionnelle et rendu global
// ---------------------------------------------------------------------------

// Fait progresser le statut d'un signalement en mode gestionnaire.
function cycleStatus(id) {
	const report = reports.find(item => item.id === id);

	if (!report) {
		return;
	}

	// Reçu → Envoyé → Traité.
	if (report.status === "Reçu") {
		report.status = "Envoyé";
	} else if (report.status === "Envoyé") {
		report.status = "Traité";
	}

	save();
	render();
	toast(`Statut mis à jour : ${report.status}`);
}

// ---------------------------------------------------------------------------
// SECTION : APPLICATION PROFESSIONNELLE (agents de terrain)
// ---------------------------------------------------------------------------

// L'agent se connecte avec l'identifiant (EMP-0001...) créé dans le logiciel de gestion.
let proSession = sessionStorage.getItem("signaluo-pro-session") || "";
let proTab = "todo";
let proReportId = null;
let proStage = proSession ? "app" : "launch";
let proTypingToken = 0;

// Renvoie l'employé connecté (ou null).
function proEmployee() {
	return employees.find(employee => employee.code === proSession) || null;
}

// Signalements envoyés aux services de l'agent, classés par onglet.
function proReports(employee) {
	// Ceux dont un service correspond à l'agent, du plus récent au plus ancien.
	const mine = reports
		.filter(
			report => (report.services || [])
				.some(service => employee.services.includes(service))
		)
		.slice()
		.reverse();

	// À prendre, pris en charge par l'agent, et terminés.
	return {
		todo: mine.filter(
			report => report.status === "Envoyé" && !report.assignedTo
		),
		mine: mine.filter(
			report => report.status === "Envoyé"
				&& report.assignedTo === employee.code
		),
		done: mine.filter(report => report.status === "Traité")
	};
}

// Génère la carte d'un signalement dans les listes de l'agent.
function proReportRow(report) {
	const color = categoryColor(report.category);

	// Nom de l'agent affiché tant que le signalement n'est pas traité.
	const assignee = report.assignedName && report.status !== "Traité"
		? `<small>${ico("user")} ${esc(report.assignedName)}</small>`
		: "";

	return `
		<button type="button" class="pro-card" data-pro-open="${report.id}" style="--cat:${esc(color)}">
			<span class="pro-card-bar"></span>
			<div class="pro-card-body">
				<div class="pro-card-top">
					<b>${esc(report.category)}</b>
					<span>${esc(report.date)}</span>
				</div>
				<p>${esc(report.description || "Aucune description")}</p>
				<small>${ico("map-pin")} ${esc(report.location)}</small>
				${assignee}
			</div>
		</button>
	`;
}

// Affiche l'application pro : écran de lancement, connexion ou contenu de l'agent.
function renderProfessional() {
	const employee = proEmployee();

	// Aucun agent connecté : on efface la session et on affiche l'étape courante.
	if (!employee) {
		proSession = "";
		sessionStorage.removeItem("signaluo-pro-session");

		if (proStage === "launch") {
			renderProLaunch();
		} else if (proStage === "home") {
			renderPhoneHome(true);
		} else {
			renderProLogin();
		}
	} else if (proReportId) {
		// Détail d'un signalement ouvert.
		renderProDetail(employee);
	} else {
		// Sinon, liste des signalements de l'agent.
		renderProHome(employee);
	}
}

// Affiche l'écran de lancement de l'application professionnelle.
function renderProLaunch() {
	app.innerHTML = `
		<div class="screen launch-screen" aria-labelledby="launch-title">
			<div class="launch-mark">${ico("crosshair")}</div>
			<span class="eyebrow">ESPACE PROFESSIONNEL</span>
			<h1 id="launch-title">Prêt à intervenir sur le terrain ?</h1>
			<p>
				Lancez Signaluo Pro pour consulter les signalements de vos services,
				les prendre en charge et les clôturer depuis votre téléphone.
			</p>
			<button class="launch-button" type="button" data-action="pro-launch">
				Lancer l’application
				<span>${ico("arrow-right")}</span>
			</button>
		</div>
	`;
}

// Lignes du faux clavier affiché sur l'écran de connexion.
const PRO_KEYBOARD_ROWS = ["1234567890", "AZERTYUIOP", "QSDFGHJKLM", "WXCVBN-"];

// Affiche l'écran de connexion de l'agent avec un faux clavier.
function renderProLogin() {
	// Premier employé : sert de démonstration pour la saisie automatique.
	const demo = employees[0];

	app.innerHTML = `
		<div class="screen pro-login">
			<div class="pro-logo">${ico("crosshair")}</div>
			<span class="eyebrow">ESPACE PROFESSIONNEL</span>
			<h2>Connexion agent</h2>
			<p>Saisissez votre identifiant employé pour accéder aux signalements de vos services.</p>
			<form id="pro-login-form">
				<label for="pro-code">Identifiant</label>
				<input id="pro-code" name="code" placeholder="EMP-0001" autocomplete="off" autocapitalize="characters" required ${demo ? "readonly" : ""}>
				<button class="primary" type="submit">Se connecter</button>
			</form>
			${demo
				? `<div class="pro-keyboard" aria-hidden="true">
					${PRO_KEYBOARD_ROWS.map(row => `<div>${[...row].map(key => `<span data-key="${key}">${key}</span>`).join("")}</div>`).join("")}
				</div>`
				: '<p class="pro-hint">Aucun employé n’existe encore. Créez-en un depuis le logiciel de gestion (onglet Employés).</p>'}
		</div>
	`;

	// Lance la saisie automatique de l'identifiant de démonstration.
	if (demo) {
		proTypeCode(demo.code);
	}
}

// Faux clavier : l'identifiant se tape tout seul, puis l'agent est connecté.
function proTypeCode(code) {
	// Jeton pour annuler une saisie obsolète si l'écran change.
	const token = ++proTypingToken;
	const input = app.querySelector("#pro-code");
	const submit = app.querySelector("#pro-login-form .primary");

	// Vrai tant que la saisie automatique est toujours pertinente.
	const alive = () => token === proTypingToken
		&& app.querySelector("#pro-code") === input;
	let index = 0;

	// Anime l'appui d'une touche du clavier.
	const press = key => {
		const element = app.querySelector(`.pro-keyboard [data-key="${key}"]`);

		element?.classList.add("pressed");
		window.setTimeout(() => element?.classList.remove("pressed"), 180);
	};

	// Tape le caractère suivant, puis valide le formulaire à la fin.
	const next = () => {
		if (!alive()) {
			return;
		}

		if (index < code.length) {
			// Appuie sur la touche et affiche le texte tapé.
			press(code[index]);
			input.value = code.slice(0, ++index);
			window.setTimeout(next, 380);
		} else {
			// Tout est tapé : on « appuie » sur le bouton puis on connecte l'agent.
			window.setTimeout(() => {
				if (!alive()) {
					return;
				}

				submit.classList.add("pressed");
				window.setTimeout(() => {
					if (alive()) {
						proLogin(employees.find(item => item.code === code));
					}
				}, 450);
			}, 600);
		}
	};

	// Démarre la saisie après une courte pause.
	window.setTimeout(next, 900);
}

// Connecte un agent et affiche ses signalements.
function proLogin(employee) {
	if (!employee) {
		return;
	}

	// Réinitialise l'état de l'application pro et mémorise la session.
	proTypingToken++;
	proSession = employee.code;
	proStage = "app";
	proTab = "todo";
	proReportId = null;
	sessionStorage.setItem("signaluo-pro-session", proSession);
	toast(`Bonjour ${employee.name}`);
	renderProfessional();
}

// Affiche l'accueil de l'agent : statistiques, onglets et liste.
function renderProHome(employee) {
	const lists = proReports(employee);

	// Onglets disponibles.
	const tabs = [
		["todo", "À prendre"],
		["mine", "Mes missions"],
		["done", "Terminés"]
	];

	// Liste de l'onglet actif et message si elle est vide.
	const current = lists[proTab];
	const empty = {
		todo: "Aucun nouveau signalement pour vos services.",
		mine: "Vous n’avez aucune mission en cours.",
		done: "Aucun signalement terminé."
	}[proTab];

	app.innerHTML = `
		<div class="screen pro-screen">
			<header class="pro-header">
				<div class="pro-avatar">${esc(employee.name.charAt(0).toUpperCase())}</div>
				<div class="pro-who">
					<strong>${esc(employee.name)}</strong>
					<small>${esc(employee.code)} · ${esc(employee.services.join(", "))}</small>
				</div>
				<button type="button" class="icon-btn" data-pro-logout title="Se déconnecter">${ico("log-out")}</button>
			</header>
			<div class="pro-stats">
				<div><b>${lists.todo.length}</b><span>À prendre</span></div>
				<div><b>${lists.mine.length}</b><span>En cours</span></div>
				<div><b>${lists.done.length}</b><span>Terminés</span></div>
			</div>
			<div class="pro-tabs">
				${tabs.map(([id, label]) => `
					<button type="button" class="${proTab === id ? "active" : ""}" data-pro-tab="${id}">${label}</button>
				`).join("")}
			</div>
			<div class="pro-list">
				${current.length
					? current.map(proReportRow).join("")
					: `<div class="empty"><div>${ico("circle-check")}</div>${empty}</div>`}
			</div>
		</div>
	`;
}

// Affiche le détail d'un signalement pour l'agent, avec les actions possibles.
function renderProDetail(employee) {
	const report = reports.find(item => item.id === proReportId);

	// Signalement introuvable : retour à l'accueil.
	if (!report) {
		proReportId = null;
		renderProHome(employee);
		return;
	}

	const color = categoryColor(report.category);

	// Lien vers la carte, seulement si les coordonnées sont connues.
	const hasCoordinates = Number.isFinite(report.latitude)
		&& Number.isFinite(report.longitude);
	const mapLink = hasCoordinates
		? `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=18/${report.latitude}/${report.longitude}`
		: "";
	const mine = report.assignedTo === employee.code;

	// Actions selon l'état : prendre, traiter/rendre, ou information.
	let actions = "";

	if (report.status === "Envoyé" && !report.assignedTo) {
		actions = `<button class="primary" type="button" data-pro-assign>${ico("hand-helping")} Prendre en charge</button>`;
	} else if (report.status === "Envoyé" && mine) {
		actions = `
			<label for="pro-note">Compte rendu (facultatif)</label>
			<textarea id="pro-note" placeholder="Ex. Trou rebouché, intervention terminée."></textarea>
			<button class="primary" type="button" data-pro-resolve>${ico("check")} Marquer comme traité</button>
			<button class="secondary" type="button" data-pro-release>Rendre le signalement</button>
		`;
	} else if (report.status === "Envoyé") {
		actions = `<p class="pro-hint">Pris en charge par ${esc(report.assignedName)}.</p>`;
	}

	// Affichage du détail.
	app.innerHTML = `
		<div class="screen pro-screen pro-detail">
			<div class="topbar">
				<button class="icon-btn" type="button" data-pro-back>${ico("arrow-left")}</button>
				<h2>Signalement</h2>
				<span></span>
			</div>
			${report.photoUrl
				? `<img class="pro-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
				: ""}
			<div class="pro-detail-head">
				<span class="pro-chip" style="--cat:${esc(color)}">${esc(report.category)}</span>
				<span class="badge ${statusClass(report.status)}">${esc(report.status)}</span>
			</div>
			<p class="pro-description">${esc(report.description || "Aucune description.")}</p>
			<div class="pro-info">
				<div><span>${ico("map-pin")}</span><p>${esc(report.location)}</p>${mapLink ? `<a href="${mapLink}" target="_blank" rel="noopener">Voir sur la carte</a>` : ""}</div>
				<div><span>${ico("calendar")}</span><p>Reçu le ${esc(report.date)}</p></div>
				<div><span>${ico("user")}</span><p>${report.userName
					? `${esc(report.userName)}${report.userPhone ? ` · ${esc(report.userPhone)}` : ""}${report.userEmail ? `<br>${esc(report.userEmail)}` : ""}`
					: "Signalement anonyme"}</p></div>
				${report.assignedName ? `<div><span>${ico("wrench")}</span><p>Pris en charge par ${esc(report.assignedName)}</p></div>` : ""}
				${report.status === "Traité" && report.note ? `<div><span>${ico("file-text")}</span><p>${esc(report.note)}</p></div>` : ""}
			</div>
			${hasCoordinates ? `<button class="pro-route" type="button" data-pro-route>${ico("navigation")} Itinéraire</button>` : ""}
			<div class="pro-actions">${actions}</div>
		</div>
	`;
}

// Connexion manuelle de l'agent via le formulaire d'identifiant.
app.addEventListener("submit", event => {
	if (event.target.id !== "pro-login-form") {
		return;
	}

	event.preventDefault();

	// Identifiant saisi, mis en majuscules.
	const code = String(new FormData(event.target).get("code")).trim().toUpperCase();
	const employee = employees.find(item => item.code === code);

	if (!employee) {
		toast("Identifiant inconnu");
		return;
	}

	proLogin(employee);
});

// Gère tous les clics de l'application professionnelle.
// Décalage simulé du point de départ de l'agent par rapport au signalement
// (environ 200 m), pour garder un zoom proche de la carte de l'application.
const AGENT_OFFSET = [-0.0016, -0.0009];

// Instance MapLibre de l'écran d'itinéraire.
let routeMap = null;

// Formate une distance en mètres (« 850 m » ou « 3,2 km »).
function formatDistance(meters) {
	return meters < 1000
		? `${Math.round(meters)} m`
		: `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

// Affiche l'itinéraire de l'agent vers le signalement sur la carte de l'application.
async function showRouteMap(report) {
	const destination = [report.longitude, report.latitude];
	const AGENT_START = [
		destination[0] + AGENT_OFFSET[0],
		destination[1] + AGENT_OFFSET[1]
	];

	// Écran plein cadre ajouté au-dessus du détail (défilement remis en haut).
	app.scrollTop = 0;
	app.insertAdjacentHTML("beforeend", `
		<div class="route-screen">
			<div id="route-map" class="route-map"></div>
			<button class="route-close" type="button" data-pro-route-close aria-label="Fermer">${ico("x")}</button>
			<div class="route-sheet">
				<span class="route-eyebrow">${ico("navigation")} Itinéraire</span>
				<h4>${esc(report.title)}</h4>
				<p>${ico("map-pin")} ${esc(report.location)}</p>
				<div class="route-stats"><b>Calcul…</b></div>
			</div>
		</div>
	`);

	if (!window.maplibregl) {
		toast("La carte n’a pas pu être chargée");
		return;
	}

	routeMap = createAppMap({
		container: "route-map",
		center: destination,
		zoom: 15.5
	});

	// Repères de départ et d'arrivée.
	const start = document.createElement("div");

	start.className = "route-dot";
	new maplibregl.Marker({ element: start }).setLngLat(AGENT_START).addTo(routeMap);

	const end = document.createElement("div");

	end.className = "map-pin";
	end.innerHTML = ico("map-pin");
	new maplibregl.Marker({ element: end, anchor: "bottom" })
		.setLngLat(destination)
		.addTo(routeMap);

	// Tracé par défaut : ligne droite, remplacée par la route réelle si possible.
	let line = [AGENT_START, destination];
	let distance = null;
	let duration = null;

	try {
		const url = "https://router.project-osrm.org/route/v1/driving/"
			+ `${AGENT_START.join(",")};${destination.join(",")}`
			+ "?overview=full&geometries=geojson";
		const response = await fetch(url);
		const data = await response.json();

		if (data.routes && data.routes[0]) {
			line = data.routes[0].geometry.coordinates;
			distance = data.routes[0].distance;
			duration = data.routes[0].duration;
		}
	} catch {
		// Pas de réseau : on garde la ligne droite.
	}

	// L'écran a pu être fermé pendant le calcul.
	if (!routeMap) {
		return;
	}

	const stats = app.querySelector(".route-stats");

	if (stats) {
		stats.innerHTML = distance === null
			? "<b>Trajet à vol d'oiseau</b>"
			: `<b>${Math.max(1, Math.round(duration / 60))} min</b><span>${formatDistance(distance)} · en voiture</span>`;
	}

	// Ajoute le tracé dès que le style de la carte est prêt.
	const drawLine = () => {
		routeMap.addSource("route", {
			type: "geojson",
			data: { type: "Feature", geometry: { type: "LineString", coordinates: line } }
		});
		routeMap.addLayer({
			id: "route-casing",
			type: "line",
			source: "route",
			layout: { "line-cap": "round", "line-join": "round" },
			paint: { "line-color": "#ffffff", "line-width": 11 }
		});
		routeMap.addLayer({
			id: "route-line",
			type: "line",
			source: "route",
			layout: { "line-cap": "round", "line-join": "round" },
			paint: { "line-color": "#2563eb", "line-width": 6 }
		});

		// Cadre départ et arrivée : le zoom reste celui de la carte de
		// l'application (bâtiments 3D visibles), même si la route fait un détour.
		const bounds = new maplibregl.LngLatBounds(AGENT_START, destination);

		routeMap.fitBounds(bounds, {
			padding: { top: 70, bottom: 190, left: 50, right: 50 },
			maxZoom: 16,
			pitch: 40,
			bearing: -12,
			duration: 700
		});
	};

	if (routeMap.isStyleLoaded()) {
		drawLine();
	} else {
		routeMap.once("load", drawLine);
	}
}

// Ferme l'écran d'itinéraire et libère la carte.
function closeRouteMap() {
	if (routeMap) {
		routeMap.remove();
		routeMap = null;
	}

	app.querySelector(".route-screen")?.remove();
}

app.addEventListener("click", event => {
	// Écran d'itinéraire : ouverture et fermeture.
	if (event.target.closest("[data-pro-route-close]")) {
		closeRouteMap();
		return;
	}

	if (event.target.closest("[data-pro-route]")) {
		const current = reports.find(item => item.id === proReportId);

		if (current) {
			showRouteMap(current);
		}

		return;
	}

	// Ignoré si la version pro n'est pas active.
	if (appVersion !== "professional") {
		return;
	}

	const employee = proEmployee();
	const target = event.target;
	const tab = target.closest("[data-pro-tab]");
	const open = target.closest("[data-pro-open]");
	const report = reports.find(item => item.id === proReportId);

	if (!employee) {
		return;
	}

	if (tab) {
		// Changement d'onglet.
		proTab = tab.dataset.proTab;
	} else if (open) {
		// Ouverture d'un signalement.
		proReportId = Number(open.dataset.proOpen);
	} else if (target.closest("[data-pro-back]")) {
		// Retour à la liste.
		proReportId = null;
	} else if (target.closest("[data-pro-logout]")) {
		// Déconnexion : retour à l'écran de lancement.
		proSession = "";
		proStage = "launch";
		proReportId = null;
		sessionStorage.removeItem("signaluo-pro-session");
		document.body.classList.remove("hide-cursor");
	} else if (report && target.closest("[data-pro-assign]")) {
		// Prise en charge du signalement par l'agent.
		report.assignedTo = employee.code;
		report.assignedName = employee.name;
		save();
		toast("Signalement pris en charge");
		return;
	} else if (report && target.closest("[data-pro-release]")) {
		// L'agent rend le signalement à l'équipe.
		delete report.assignedTo;
		delete report.assignedName;
		proReportId = null;
		save();
		toast("Signalement rendu à l'équipe");
		return;
	} else if (report && target.closest("[data-pro-resolve]")) {
		// Clôture du signalement avec compte rendu facultatif.
		report.status = "Traité";
		report.treatedBy = employee.code;
		report.treatedAt = new Intl.DateTimeFormat("fr-FR").format(new Date());
		report.note = app.querySelector("#pro-note")?.value.trim() || "";
		proTab = "done";
		proReportId = null;
		save();
		toast("Signalement traité");
		adminNotify("treated", "Signalement traité", `${report.title} · par ${employee.code}`);
		return;
	} else {
		return;
	}

	renderProfessional();
});

// ---------------------------------------------------------------------------
// SECTION : GESTION DES ÉVÉNEMENTS ET RENDU GLOBAL
// ---------------------------------------------------------------------------

// Met à jour l'apparence et l'accessibilité des onglets de version.
function updateVersionTabs() {
	// Cette fonction fléchée synchronise chaque onglet avec la version active.
	versionTabs.forEach(tab => {
		const active = tab.dataset.version === appVersion;

		tab.classList.toggle("active", active);
		tab.setAttribute("aria-selected", String(active));
	});
}

// Page de confirmation affichée après l'envoi d'un signalement.
function renderSuccess() {
	// Affichage de la confirmation avec confettis.
	app.innerHTML = `
		<div class="screen success-screen">
			<div class="success-confetti" aria-hidden="true">
				${Array.from({ length: 14 }, (_, index) => `<i style="--i:${index}"></i>`).join("")}
			</div>
			<div class="success-check">
				<svg viewBox="0 0 52 52" aria-hidden="true">
					<circle cx="26" cy="26" r="24"></circle>
					<path d="M15 27l8 8 14-16"></path>
				</svg>
			</div>
			<h2>Signalement envoyé !</h2>
			<p>Merci pour votre aide. La mairie a bien reçu votre signalement et le prendra en charge très vite.</p>
			<div class="success-actions">
				<button class="primary" type="button" data-action="new-report">＋ Faire un nouveau signalement</button>
				<button class="secondary" type="button" data-action="history">Voir mon historique</button>
			</div>
		</div>
	`;
}

// Fausse page d'accueil de téléphone : l'icône Signaluo ouvre l'application.
function renderPhoneHome(pro = false) {
	// Heure et date affichées sur l'écran d'accueil.
	const time = new Intl.DateTimeFormat(
		"fr-FR",
		{ hour: "2-digit", minute: "2-digit" }
	).format(new Date());
	const date = new Intl.DateTimeFormat(
		"fr-FR",
		{ weekday: "long", day: "numeric", month: "long" }
	).format(new Date());

	// Applications décoratives de la grille (nom, icône, couleur de fond).
	const fakeApps = [
		["Messages", "message-circle", "#22c55e, #16a34a"],
		["Photos", "image", "#f472b6, #f59e0b"],
		["Météo", "cloud-sun", "#38bdf8, #2563eb"],
		["Agenda", "calendar", "#f87171, #dc2626"],
		["Cartes", "map", "#34d399, #0d9488"],
		["Musique", "music", "#fb7185, #be123c"],
		["Notes", "notebook-pen", "#fde047, #f59e0b"]
	];

	// Icônes du dock.
	const dockApps = ["phone", "mail", "globe", "camera"];

	// Application Signaluo : seule icône réellement cliquable.
	const mainName = pro ? "Signaluo Pro" : "Signaluo";
	const mainAction = pro ? "pro-open-app" : "open-app";

	app.innerHTML = `
		<div class="screen phone-home">
			<i class="home-blob home-blob-a"></i>
			<i class="home-blob home-blob-b"></i>

			<div class="phone-home-clock">
				<strong>${time}</strong>
				<span>${date}</span>
			</div>

			<div class="home-widget">
				<span class="home-widget-icon">${ico("cloud-sun")}</span>
				<div>
					<strong>18°</strong>
					<small>Partiellement nuageux</small>
				</div>
				<em>${ico("map-pin")} Votre ville</em>
			</div>

			<div class="home-grid">
				<button class="phone-home-icon" type="button" data-action="${mainAction}" aria-label="Ouvrir ${mainName}">
					<span class="phone-home-glyph">${ico("crosshair")}</span>
					<small>${mainName}</small>
				</button>

				${fakeApps.map(([name, icon, colors]) => `
					<span class="home-app" aria-hidden="true">
						<span class="home-app-glyph" style="background:linear-gradient(145deg,${colors})">${ico(icon)}</span>
						<small>${name}</small>
					</span>
				`).join("")}
			</div>

			<div class="phone-home-dock">
				${dockApps.map(name => `<span>${ico(name)}</span>`).join("")}
			</div>

			<div class="home-indicator"></div>
			<div class="fake-finger" aria-hidden="true"><i></i>${ico("pointer")}</div>
		</div>
	`;

	// Le fond d'écran recouvre aussi la barre du haut du téléphone.
	phoneFrame.classList.add("on-home");

	// Place le faux doigt exactement sur l'icône Signaluo.
	const home = app.querySelector(".phone-home");
	const iconBox = home.querySelector(".phone-home-glyph").getBoundingClientRect();
	const homeBox = home.getBoundingClientRect();
	home.style.setProperty("--fx", `${iconBox.left - homeBox.left + iconBox.width / 2 - 28}px`);
	home.style.setProperty("--fy", `${iconBox.top - homeBox.top + iconBox.height / 2 - 4}px`);

	// Après l'animation du faux doigt, l'application s'ouvre toute seule.
	window.setTimeout(() => {
		const home = app.querySelector(".phone-home");

		if (home && !home.classList.contains("opening")) {
			home.querySelector(".phone-home-icon").click();
		}
	}, 3400);
}

// Réinitialise uniquement le téléphone actuellement affiché.
function resetActivePhone() {
	proTypingToken++;

	if (appVersion === "professional") {
		// Version pro : déconnexion et retour à l'écran de lancement.
		proSession = "";
		proStage = "launch";
		proReportId = null;
		proTab = "todo";
		sessionStorage.removeItem("signaluo-pro-session");
	} else {
		// Version citoyenne : brouillon vierge et écran de lancement.
		screen = "wizard";
		step = 0;
		draft = {
			photo: false,
			category: "",
			location: "",
			description: "",
			anonymous: true,
			lastName: "",
			firstName: "",
			email: "",
			phone: ""
		};
	}

	render();
	toast("Téléphone réinitialisé");
}

// Choisit et affiche l'écran correspondant à l'état actuel de l'application.
function render() {
	updateVersionTabs();

	// Le fond de la fausse page d'accueil n'est actif que sur cet écran.
	phoneFrame.classList.remove("on-home");

	// Le curseur est masqué dans la zone du téléphone pendant la fausse page d'accueil.
	document.body.classList.toggle(
		"hide-cursor",
		appVersion === "user"
			? screen === "home"
			: proStage === "home" && !proEmployee()
	);

	// Version professionnelle : rendu dédié.
	if (appVersion === "professional") {
		renderProfessional();
		return;
	}

	// Version citoyenne : l'écran dépend de la variable « screen ».
	if (screen === "success") {
		renderSuccess();
	} else if (screen === "home") {
		renderPhoneHome();
	} else if (screen === "dashboard") {
		renderDashboard();
	} else if (screen === "history") {
		renderHistory();
	} else {
		renderWizard();
	}
}

// ---------------------------------------------------------------------------
// Gestion centralisée des clics
// ---------------------------------------------------------------------------

// Cette fonction fléchée centralise les clics de navigation de la page.
document.addEventListener("click", event => {
	// Changement de version (citoyen / professionnel).
	const version = event.target.closest("[data-version]")?.dataset.version;

	if (version && version !== appVersion) {
		appVersion = version;
		proTypingToken++;

		// L'application pro repart de l'écran de lancement sans session.
		if (version === "professional" && !proEmployee()) {
			proStage = "launch";
		}

		render();
		return;
	}

	// Bouton de réinitialisation : remet le téléphone actif à son état de départ.
	if (event.target.closest("[data-phone-reset]")) {
		resetActivePhone();
		return;
	}

	// Navigation du logiciel de gestion.
	const adminAction = event.target.closest("[data-admin-action]")
		?.dataset.adminAction;

	if (adminAction) {
		setAdminView(adminAction);
		return;
	}

	// Actions de l'application citoyenne (attribut data-action).
	const action = event.target.closest("[data-action]")?.dataset.action;

	if (!action) {
		return;
	}

	// Nouveau signalement : brouillon vierge, étape 1.
	if (action === "start") {
		screen = "wizard";
		step = 1;
		draft = {
			photo: false,
			category: "",
			location: "",
			description: "",
			anonymous: true,
			lastName: "",
			firstName: "",
			email: "",
			phone: ""
		};
	}

	// Retour à l'accueil citoyen.
	if (action === "home") {
		screen = "dashboard";
	}

	// Ouverture de l'historique.
	if (action === "history") {
		screen = "history";
	}

	// Retour au parcours de signalement.
	if (action === "wizard") {
		screen = "wizard";
		step = 1;
	}

	// Lancement de l'application : fausse page d'accueil du téléphone.
	if (action === "launch") {
		// Option cochée : on saute la fausse page d'accueil animée.
		if (skipHomeAnimation) {
			screen = "wizard";
			step = 1;
		} else {
			screen = "home";
		}
	}

	// Lancement de l'application pro.
	if (action === "pro-launch") {
		// Option cochée : direction l'écran de connexion.
		proStage = skipHomeAnimation ? "login" : "home";
		render();
		return;
	}

	// Ouverture de l'application depuis l'écran d'accueil du téléphone.
	if (action === "open-app" || action === "pro-open-app") {
		const home = app.querySelector(".phone-home");
		const pro = action === "pro-open-app";

		// Évite de relancer l'animation si elle est déjà en cours.
		if (home && !home.classList.contains("opening")) {
			home.classList.add("opening");
			window.setTimeout(() => {
				// Écran de chargement affiché brièvement avant l'application.
				app.innerHTML = `
					<div class="screen app-loading">
						<div class="phone-home-glyph">${ico("crosshair")}</div>
						<strong>${pro ? "Signaluo Pro" : "Signaluo"}</strong>
						<div class="loading-bar"><span></span></div>
					</div>
				`;

				// Puis on affiche la connexion pro ou le formulaire citoyen.
				window.setTimeout(() => {
					if (pro) {
						proStage = "login";
					} else {
						screen = "wizard";
						step = 1;
					}

					render();
				}, 1400);
			}, 450);
		}

		return;
	}

	// Étape précédente (ou retour à l'écran de lancement).
	if (action === "back") {
		if (step > 1) {
			step--;
		} else {
			step = 0;
		}
	}

	// Changer la photo (la réinitialise) ou ouvrir la galerie.
	if (action === "photo") {
		if (draft.photo) {
			// Libère l'URL temporaire de l'image précédente.
			if (draft.photoUrl?.startsWith("blob:")) {
				URL.revokeObjectURL(draft.photoUrl);
			}

			draft.photo = false;
			draft.photoUrl = "";
			renderWizard();
			toast("Photo réinitialisée");
		} else {
			document.querySelector("#gallery-input")?.click();
		}
	}

	// Photo prise : on simule l'appareil avec une image aléatoire.
	if (action === "camera") {
		draft.photo = true;
		draft.photoUrl = CAMERA_PHOTOS[
			Math.floor(Math.random() * CAMERA_PHOTOS.length)
		];
		renderWizard();
		toast("Photo capturée");
		return;
	}

	// Photo depuis la galerie.
	if (action === "gallery") {
		document.querySelector("#gallery-input")?.click();
		return;
	}

	// Fermeture de la fenêtre de détails.
	if (action === "close-details") {
		event.target.closest(".modal-backdrop")?.remove();
		return;
	}

	// Position fixe simulant la détection de l'utilisateur.
	if (action === "location") {
		setMapLocation(
			47.481016398119436,
			-0.600092579188889
		);
		toast("Position du Campus de Belle-Beille mise à jour");
	}

	// Étape suivante.
	if (action === "next" && step < 4) {
		step++;
	}

	// Activation / désactivation du mode gestionnaire par mot de passe.
	if (action === "manager") {
		const password = prompt("Mot de passe gestionnaire");

		if (password === "admin") {
			manager = !manager;
			toast(
				manager
					? "Mode gestionnaire activé"
					: "Mode gestionnaire désactivé"
			);
		} else if (password !== null) {
			toast("Mot de passe incorrect");
		}
	}

	// Envoi du signalement.
	if (action === "submit") {
		// Les coordonnées complètes sont obligatoires hors mode anonyme.
		if (
			!draft.anonymous &&
			(!draft.lastName || !draft.firstName || !draft.email || !draft.phone)
		) {
			toast("Veuillez remplir tous les champs de contact");
			return;
		}

		// Validation de l'e-mail et du téléphone.
		if (!draft.anonymous) {
			const emailInput = app.querySelector("#email");

			if (!emailInput?.checkValidity()) {
				toast("Veuillez saisir une adresse e-mail valide");
				emailInput?.focus();
				return;
			}

			if (!isValidFrenchPhone(draft.phone)) {
				toast("Veuillez saisir un numéro de téléphone français valide");
				app.querySelector("#phone")?.focus();
				return;
			}
		}

		// Création du signalement.
		reports.push({
			id: Date.now(),
			// Le titre affiché dans les listes est tiré du début de la description.
			title: draft.description.length > 48
				? `${draft.description.slice(0, 48).trim()}…`
				: draft.description,
			description: draft.description,
			category: draft.category,
			location: draft.location === "Recherche de l'adresse…"
				? formatCoordinates(draft.latitude, draft.longitude)
				: draft.location,
			latitude: draft.latitude,
			longitude: draft.longitude,
			date: new Intl.DateTimeFormat("fr-FR").format(new Date()),
			status: "Reçu",
			photoUrl: draft.photoUrl || "",
			userName: draft.anonymous
				? ""
				: `${draft.firstName} ${draft.lastName}`,
			userEmail: draft.anonymous ? "" : draft.email,
			userPhone: draft.anonymous ? "" : draft.phone
		});

		// Sauvegarde, mise à jour du logiciel de gestion, puis écran de succès.
		save();

		if (adminView === "reports") {
			renderAdminReports(reports[reports.length - 1].id);
		}

		// Notification dans le logiciel de gestion.
		adminNotify("new", "Nouveau signalement", draft.category || "Un citoyen vient d'écrire");

		screen = "success";
		step = 1;

		// Brouillon remis à zéro pour le prochain signalement.
		draft = {
			photo: false,
			category: "",
			location: "",
			description: "",
			anonymous: true,
			lastName: "",
			firstName: "",
			email: "",
			phone: ""
		};
	}

	// Nouveau signalement après la page de succès.
	if (action === "new-report") {
		screen = "wizard";
		step = 1;
	}

	// Rafraîchit l'écran après chaque action.
	render();
});

// Premier rendu : l'application démarre sur la page 0 de lancement.
appReady = true;
render();
setAdminView("dashboard");
resolveReportAddresses();
