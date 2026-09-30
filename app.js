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
	["Voirie", "🛣️", "road"],
	["Éclairage", "💡", "light"],
	["Propreté", "🗑️", "clean"],
	["Espaces Verts", "🌿", "nature"],
	["Autre", "•••", "other"]
];

const CAMERA_PHOTOS = [
	"image/vreverv.jpeg",
	"image/vsdv.jpeg",
	"image/vsdvs.jpeg",
	"image/images.jpeg"
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
		status: "En cours",
		location: "47.4712° N, 0.5513° W"
	},
	{
		id: 2,
		title: "Lampadaire en panne",
		description: "Le lampadaire ne s’allume plus depuis 3 jours.",
		category: "Éclairage",
		date: today,
		status: "Traité",
		location: "47.4712° N, 0.5513° W"
	}
];

// ---------------------------------------------------------------------------
// État de l'application
// ---------------------------------------------------------------------------

const savedReports = localStorage.getItem("signaluo-reports");

let reports = savedReports ? JSON.parse(savedReports) : seed;
let appVersion = "user";
let manager = false;
let screen = "wizard";
let step = 0;
let mapInstance = null;
let mapMarker = null;
let adminView = "dashboard";
let adminTransitioning = false;
let adminTransitionTimeout = null;
let adminTransitionFrame = null;

// Le brouillon est conservé en mémoire pendant que l'utilisateur navigue
// entre les étapes ou change temporairement de version d'application.
let draft = {
	photo: false,
	category: "",
	location: "",
	title: "",
	description: "",
	anonymous: true,
	lastName: "",
	firstName: "",
	email: "",
	phone: ""
};

const app = document.querySelector("#app");
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
	// Cette fonction fléchée remplace chaque caractère spécial par son équivalent sécurisé.
	character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;"
	}[character])
);


// Sauvegarde l'historique pour le retrouver après un rechargement.
function save() {
	localStorage.setItem("signaluo-reports", JSON.stringify(reports));
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


// Associe chaque statut métier à une classe CSS.
function statusClass(status) {
	if (status === "Traité") {
		return "resolved";
	}

	if (status === "En cours") {
		return "progress";
	}

	return "sent";
}


// Affiche le tableau de bord de l'interface d'administration.
function renderAdminDashboard() {
	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
			<span class="development-badge">EN DÉVELOPPEMENT</span>
		</div>
		<div class="management-icon">⌘</div>
		<h1 id="management-title">Logiciel de gestion des signalements</h1>
		<p>
			Un espace dédié aux équipes municipales pour centraliser, suivre et
			traiter les signalements des citoyens.
		</p>
		<div class="management-preview-card">
			<div class="preview-line preview-line-title"></div>
			<div class="preview-grid">
				<span></span>
				<span></span>
				<span></span>
			</div>
			<div class="preview-list">
				<span></span>
				<span></span>
				<span></span>
			</div>
		</div>
		<p class="management-note">Sélectionnez « Signalements » pour consulter la liste.</p>
	`;
}


// Affiche les mêmes données que celles enregistrées par l'application mobile.
function renderAdminReports(newReportId = null) {
	const reportList = reports.length
		? reports
			.slice()
			.reverse()
			// Cette fonction fléchée transforme chaque signalement en carte administrative.
			.map((report, index) => `
				<article class="admin-report ${
					report.id === newReportId
						? "admin-report-new"
						: newReportId && index > 0
							? "admin-report-shifted"
							: ""
				}">
					<div class="admin-report-icon">
						${report.photoUrl
							? `<img src="${esc(report.photoUrl)}" alt="">`
							: "⌖"}
					</div>
					<div class="admin-report-content">
						<strong>${esc(report.title)}</strong>
						<span>${esc(report.category)} · ${esc(report.date)}</span>
						<small>${esc(report.location)}</small>
					</div>
					<span class="admin-report-status ${statusClass(report.status)}">
						${esc(report.status)}
					</span>
				</article>
			`)
			.join("")
		: '<p class="management-note">Aucun signalement enregistré.</p>';

	adminContent.innerHTML = `
		<div class="management-header">
			<span class="management-kicker">ESPACE PROFESSIONNEL</span>
			<span class="development-badge">EN DÉVELOPPEMENT</span>
		</div>
		<div class="admin-reports-heading">
			<div>
				<span class="eyebrow">CENTRE DE SUIVI</span>
				<h2>Signalements reçus</h2>
			</div>
			<strong>${reports.length}</strong>
		</div>
		<div class="admin-report-list">${reportList}</div>
	`;

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


// Met à jour l'onglet visuel et le contenu de la fenêtre macOS.
function setAdminView(view) {
	adminView = view;

	if (!adminTransitioning) {
		adminContent.classList.remove("admin-content-transition");
	}

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

	if (view === "reports") {
		renderAdminReports();
	} else {
		renderAdminDashboard();
	}

	if (adminTransitioning) {
		return;
	}

	// Cette fonction fléchée lance la transition après le nouveau rendu du panneau.
	adminTransitionFrame = window.requestAnimationFrame(() => {
		adminContent.classList.add("admin-content-transition");
		adminTransitioning = true;
		adminTransitionFrame = null;

		adminTransitionTimeout = window.setTimeout(() => {
			adminTransitioning = false;
		}, 1050);
	});
}


// ---------------------------------------------------------------------------
// Historique et détails d'un signalement
// ---------------------------------------------------------------------------

// Construit la carte visuelle d'un signalement dans l'application citoyenne.
function reportCard(report, showStatus = true) {
	// Cette fonction fléchée retrouve la catégorie correspondant au signalement.
	const category = CATEGORIES.find(item => item[0] === report.category) || CATEGORIES[4];
	const status = showStatus
		? `<span class="badge ${statusClass(report.status)}">${esc(report.status)}</span>`
		: "";
	const icon = report.photoUrl
		? `<img class="report-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
		: category[1];

	return `
		<article class="report" data-id="${report.id}">
			<div class="report-icon ${category[2]}">${icon}</div>
			<div>
				<h4>${esc(report.title)}</h4>
				<p>📍 ${esc(report.location)} · ${esc(report.date)}</p>
				${status}
			</div>
		</article>
	`;
}


// Affiche les informations complètes d'un signalement dans une fenêtre modale.
function showReportDetails(id) {
	const report = reports.find(item => item.id === id);

	if (!report) {
		return;
	}

	// Cette fonction fléchée retrouve la catégorie correspondant au signalement détaillé.
	const category = CATEGORIES.find(item => item[0] === report.category) || CATEGORIES[4];
	const photo = report.photoUrl
		? `<img class="details-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
		: `<div class="details-placeholder ${category[2]}">${category[1]}</div>`;
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
	// Cette fonction fléchée compte les signalements actuellement en cours.
	const inProgress = reports.filter(report => report.status === "En cours").length;
	// Cette fonction fléchée compte les signalements déjà traités.
	const resolved = reports.filter(report => report.status === "Traité").length;
	const managerBanner = manager
		? `
			<div class="option selected">
				🔓
				<b>Mode gestionnaire actif</b>
				<small>Cliquez sur une demande pour changer son statut.</small>
			</div>
		`
		: "";
	const recentReports = reports.length
		? reports.slice(-3).reverse().map(reportCard).join("")
		: '<div class="empty"><div>⌖</div>Aucun signalement</div>';

	app.innerHTML = `
		<div class="screen">
			<div class="topbar">
				<button class="icon-btn" data-action="manager" title="Mode gestionnaire">🔒</button>
				<h2>Mes Signalements</h2>
				<button class="icon-btn" data-action="history" title="Historique">↻</button>
			</div>
			${managerBanner}
			<div class="hero">
				<small>Bonjour 👋</small>
				<h3>Améliorons la ville ensemble.</h3>
				<p>Un signalement simple, un impact concret sur votre quotidien.</p>
			</div>
			<div class="stats">
				<div class="stat">
					<b>${inProgress}</b>
					<small>EN COURS</small>
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
			showReportDetails(Number(card.dataset.id));
		});
	});
}


// Affiche l'historique complet des signalements de l'utilisateur.
function renderHistory() {
	const reportCount = `${reports.length} demande${reports.length > 1 ? "s" : ""}`;
	const history = reports.length
		? reports.slice().reverse().map(report => reportCard(report, false)).join("")
		: '<div class="empty"><div>⌖</div>Vous n’avez pas encore réalisé de signalement.</div>';

	app.innerHTML = `
		<div class="screen">
			<div class="topbar">
				<button class="icon-btn" data-action="wizard">←</button>
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
			showReportDetails(Number(card.dataset.id));
		});
	});
}


// Affiche l'étape courante du parcours de création d'un signalement.
function renderWizard() {
	if (step === 0) {
		app.innerHTML = `
			<div class="screen launch-screen" aria-labelledby="launch-title">
				<div class="launch-mark">⌖</div>
				<span class="eyebrow">ESPACE CITOYEN</span>
				<h1 id="launch-title">Prêt à agir pour votre ville ?</h1>
				<p>
					Lancez l’application Signaluo pour signaler rapidement un problème
					près de chez vous.
				</p>
				<button class="launch-button" type="button" data-action="launch">
					Lancer l’application
					<span>→</span>
				</button>
			</div>
		`;

		return;
	}

	const titles = [
		"Photo du problème",
		"Type de problème",
		"Détails & localisation",
		"Envoi du signalement"
	];
	const backButton = step > 1
		? '<button class="icon-btn" data-action="back">←</button>'
		: "<span></span>";
	const progressSteps = [1, 2, 3, 4]
		// Cette fonction fléchée génère un indicateur pour chaque étape du parcours.
		.map(number => `
			<span class="step ${number <= step ? "active" : ""}"></span>
		`)
		.join("");

	app.innerHTML = `
		<div class="screen">
			<div class="topbar">
				${backButton}
				<h2>${step}. ${titles[step - 1]}</h2>
				<button class="icon-btn" data-action="history" title="Historique">↻</button>
			</div>
			<div class="steps">${progressSteps}</div>
			${wizardContent()}
		</div>
	`;

	bindWizard();

	if (step === 3) {
		initMap();
	}
}


function wizardContent() {
	if (step === 1) {
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
				: '<div style="font-size:4rem">🖼️<strong>Photo ajoutée</strong></div>'
			: '<div style="font-size:3rem">📷<strong>Aucune photo sélectionnée</strong></div>';
		const photoActions = draft.photo
			? '<button class="primary" data-action="photo">Changer la photo</button>'
			: `
				<button class="primary" data-action="camera">📷 Prendre une photo</button>
				<button class="secondary" data-action="gallery">🖼️ Ajouter depuis la galerie</button>
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

	if (step === 2) {
		const categories = CATEGORIES
			// Cette fonction fléchée génère un bouton pour chaque catégorie disponible.
			.map(category => `
				<button
					class="category ${category[2]} ${draft.category === category[0] ? "selected" : ""}"
					data-category="${category[0]}"
				>
					<span>${category[1]}</span>
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

	if (step === 3) {
		return `
			<p>Décrivez le problème et indiquez où il se trouve.</p>
			<label for="title">Titre court</label>
			<input id="title" value="${esc(draft.title)}" placeholder="Ex. Nid de poule">
			<label for="description">Description détaillée</label>
			<textarea id="description" placeholder="Ajoutez quelques détails...">${esc(draft.description)}</textarea>
			<div id="map" class="map" aria-label="Carte interactive"></div>
			<button class="secondary" data-action="location">◎ Détecter ma position</button>
			<p id="location-status" style="margin:9px 0 0;color:var(--green);font-size:.72rem">
				✓ ${draft.location || "Position non définie"}
			</p>
			<div class="actions">
				<button class="primary" data-action="next" ${draft.title && draft.description && draft.location ? "" : "disabled"}>
					Suivant
				</button>
			</div>
		`;
	}

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

	const galleryInput = app.querySelector("#gallery-input");

	if (galleryInput) {
		// Cette fonction fléchée traite une image choisie depuis la galerie.
		galleryInput.addEventListener("change", () => {
			const file = galleryInput.files?.[0];

			if (!file) {
				return;
			}

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

	const title = app.querySelector("#title");
	const description = app.querySelector("#description");

	// Cette fonction fléchée prépare chaque champ texte du signalement.
	[title, description].forEach(input => {
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


function updateWizardNext() {
	const next = app.querySelector('[data-action="next"]');

	if (next && step === 3) {
		next.disabled = !(draft.title && draft.description && draft.location);
	}
}


// ---------------------------------------------------------------------------
// Carte interactive
// ---------------------------------------------------------------------------

// Enregistre une position et met à jour le repère visible sur la carte.
function setMapLocation(
	latitude,
	longitude,
	message = `Carte: ${latitude.toFixed(4)}° N, ${Math.abs(longitude).toFixed(4)}° W`
) {
	draft.location = message;

	const markerIcon = L.divIcon({
		className: "map-pin",
		html: "📍",
		iconSize: [32, 38],
		iconAnchor: [16, 38]
	});

	if (mapMarker) {
		mapMarker.setLatLng([latitude, longitude]);
		mapMarker.setIcon(markerIcon);
	} else if (mapInstance) {
		mapMarker = L.marker(
			[latitude, longitude],
			{ icon: markerIcon }
		).addTo(mapInstance);
	}

	if (mapInstance) {
		mapInstance.setView([latitude, longitude], 16);
	}

	const status = app.querySelector("#location-status");

	if (status) {
		status.textContent = `✓ ${draft.location}`;
	}

	updateWizardNext();
}


// Initialise la carte interactive de l'étape de localisation.
function initMap() {
	if (!window.L) {
		toast("La carte n’a pas pu être chargée");
		return;
	}

	const mapElement = app.querySelector("#map");

	if (!mapElement) {
		return;
	}

	const center = [47.4712, -0.5513];

	// La carte est recréée à chaque retour sur cette étape. On supprime
	// l'ancienne instance pour éviter les doublons de tuiles et de repères.
	if (mapInstance) {
		mapInstance.remove();
	}

	mapMarker = null;
	mapInstance = L.map(
		mapElement,
		{ attributionControl: false }
	).setView(center, 15);

	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		maxZoom: 19
	}).addTo(mapInstance);

	L.control.attribution({ prefix: false })
		.addAttribution("&copy; OpenStreetMap contributors")
		.addTo(mapInstance);

	// Cette fonction fléchée place un repère après un clic sur la carte.
	mapInstance.on("click", event => {
		setMapLocation(event.latlng.lat, event.latlng.lng);
		toast("Repère placé sur la carte");
	});

	if (draft.location) {
		setMapLocation(center[0], center[1], draft.location);
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

	report.status = report.status === "Envoyé"
		? "En cours"
		: report.status === "En cours"
			? "Traité"
			: "Envoyé";

	save();
	render();
	toast(`Statut mis à jour : ${report.status}`);
}


// Affiche l'écran temporaire de la version professionnelle.
function renderProfessional() {
	app.innerHTML = `
		<div class="screen version-placeholder">
			<div class="placeholder-mark">⚙</div>
			<span class="eyebrow">ESPACE PROFESSIONNEL</span>
			<h2>Version professionnel</h2>
			<p>Cette version est actuellement en développement.</p>
		</div>
	`;
}


// Met à jour l'apparence et l'accessibilité des onglets de version.
function updateVersionTabs() {
	// Cette fonction fléchée synchronise chaque onglet avec la version active.
	versionTabs.forEach(tab => {
		const active = tab.dataset.version === appVersion;

		tab.classList.toggle("active", active);
		tab.setAttribute("aria-selected", String(active));
	});
}


// Choisit et affiche l'écran correspondant à l'état actuel de l'application.
function render() {
	updateVersionTabs();

	if (appVersion === "professional") {
		renderProfessional();
		return;
	}

	if (screen === "dashboard") {
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
	const version = event.target.closest("[data-version]")?.dataset.version;

	if (version && version !== appVersion) {
		appVersion = version;
		render();
		return;
	}

	const adminAction = event.target.closest("[data-admin-action]")?.dataset.adminAction;

	if (adminAction) {
		setAdminView(adminAction);
		return;
	}

	const action = event.target.closest("[data-action]")?.dataset.action;

	if (!action) {
		return;
	}

	if (action === "start") {
		screen = "wizard";
		step = 1;
		draft = {
			photo: false,
			category: "",
			location: "",
			title: "",
			description: "",
			anonymous: true,
			lastName: "",
			firstName: "",
			email: "",
			phone: ""
		};
	}

	if (action === "home") {
		screen = "dashboard";
	}

	if (action === "history") {
		screen = "history";
	}

	if (action === "wizard") {
		screen = "wizard";
		step = 1;
	}

	if (action === "launch") {
		step = 1;
	}

	if (action === "back") {
		if (step > 1) {
			step--;
		} else {
			step = 0;
		}
	}

	if (action === "photo") {
		if (draft.photo) {
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

	if (action === "camera") {
		draft.photo = true;
		draft.photoUrl = CAMERA_PHOTOS[
			Math.floor(Math.random() * CAMERA_PHOTOS.length)
		];
		renderWizard();
		toast("Photo capturée");
		return;
	}

	if (action === "gallery") {
		document.querySelector("#gallery-input")?.click();
		return;
	}

	if (action === "close-details") {
		event.target.closest(".modal-backdrop")?.remove();
		return;
	}

	if (action === "location") {
		setMapLocation(
			47.4712,
			-0.5513,
			"47.4712° N, 0.5513° W (Angers Centre)"
		);
		toast("Position mise à jour");
	}

	if (action === "next" && step < 4) {
		step++;
	}

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

	if (action === "submit") {
		if (
			!draft.anonymous &&
			(!draft.lastName || !draft.firstName || !draft.email || !draft.phone)
		) {
			toast("Veuillez remplir tous les champs de contact");
			return;
		}

		reports.push({
			id: Date.now(),
			title: draft.title,
			description: draft.description,
			category: draft.category,
			location: draft.location,
			date: new Intl.DateTimeFormat("fr-FR").format(new Date()),
			status: "Envoyé",
			photoUrl: draft.photoUrl || "",
			userName: draft.anonymous
				? ""
				: `${draft.firstName} ${draft.lastName}`,
			userEmail: draft.anonymous ? "" : draft.email,
			userPhone: draft.anonymous ? "" : draft.phone
		});

		save();
		if (adminView === "reports") {
			renderAdminReports(reports[reports.length - 1].id);
		}
		screen = "wizard";
		step = 1;
		draft = {
			photo: false,
			category: "",
			location: "",
			title: "",
			description: "",
			anonymous: true,
			lastName: "",
			firstName: "",
			email: "",
			phone: ""
		};
		toast("Merci ! Signalement envoyé à la mairie.");
	}

	render();
});

// Premier rendu : l'application démarre sur la page 0 de lancement.
render();
setAdminView("dashboard");
