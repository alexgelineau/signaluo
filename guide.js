// Génère le guide PDF : schéma de fonctionnement et explication
// des écrans et boutons.
// Le document est imprimé dans un cadre caché : le navigateur propose « Enregistrer
// au format PDF ».

// Étapes de référence pour le cycle de vie d’un signalement.
const GUIDE_FLOW = [
	{
		title: "Cycle de vie d'un signalement",
		steps: [
			["Reçu",
				"Le citoyen envoie son signalement depuis l'application citoyenne.", "#f59e0b"],
			["Envoyé", "Le gestionnaire l'envoie à un ou plusieurs services depuis le " +
					"logiciel.", "#7c3aed"],
			["Pris en charge",
				"Un agent du service concerné le prend en charge dans l'application " +
					"pro.", "#2563eb"],
			["Traité", "L'agent (ou le gestionnaire) le clôture, avec un compte rendu " +
					"facultatif.", "#10b981"]
		]
	}
];

// Contenu explicatif organisé par application et par écran.
const GUIDE_SECTIONS = [
	{
		title: "1. Application citoyenne",
		intro: "Elle s'utilise dans le faux téléphone. Elle permet à un habitant de " +
				"signaler un problème en quatre étapes et de suivre ses demandes.",
		pages: [
			{
				name: "Page de présentation",
				items: [
					["Lancer l'application",
						"Ouvre l'application et démarre directement la création d'un " +
							"signalement (étape 1)."]
				]
			},
			{
				name: "Sélecteur de version (au-dessus du téléphone)",
				items: [
					["Utilisateur / Professionnel",
						"Change le téléphone affiché (version citoyenne ou version pro)."],
					["Bouton ↻ (à droite)",
						"Réinitialise le téléphone actif : brouillon effacé et retour à " +
							"l'écran de lancement ; en version pro, déconnexion de l'agent. " +
							"Les signalements déjà envoyés ne sont pas supprimés."],
					["Interrupteur (à droite du ↻)",
						"Activé, saute l'écran d'accueil animé du téléphone (faux doigt) : " +
							"« Lancer l'application » ouvre directement le formulaire, ou la " +
							"connexion en version pro. Le choix est mémorisé."]
				]
			},
			{
				name: "Barre du haut (pendant le signalement)",
				items: [
					["←", "Revient à l'étape précédente ; à l'étape 1, retourne à la page de " +
							"présentation."],
					["Icône historique", "Ouvre l'historique des signalements."]
				]
			},
			{
				name: "Étape 1 : Photo",
				items: [
					["Prendre une photo",
						"Simule une prise de photo (une image de démonstration est choisie)."],
					["Ajouter depuis la galerie",
						"Ouvre le sélecteur de fichiers de l'appareil pour choisir une image."],
					["Changer la photo",
						"Apparaît quand une photo est ajoutée : la retire pour en choisir " +
							"une autre."],
					["Suivant", "Désactivé tant qu'aucune photo n'est ajoutée."]
				]
			},
			{
				name: "Étape 2 : Catégorie",
				items: [
					["Boutons de catégorie",
						"Voirie, Éclairage, Propreté, Espaces verts, les catégories créées " +
							"dans les Paramètres du logiciel, puis toujours « Autre » en " +
							"dernier. Un seul choix possible, la catégorie est mise en évidence."],
					["Suivant", "Désactivé tant qu'aucune catégorie n'est choisie."]
				]
			},
			{
				name: "Étape 3 : Description et lieu",
				items: [
					["Description détaillée (obligatoire)",
						"Texte libre décrivant le problème. Il n'y a plus de titre : les " +
							"premiers mots de la description en tiennent lieu."],
					["Carte", "Carte interactive : un clic place le repère, le bouton 2D/3D bascule entre vue à plat et vue inclinée. L'adresse est " +
							"recherchée automatiquement (« Recherche de l'adresse… » puis " +
							"l'adresse). Si la recherche échoue, les coordonnées GPS sont " +
							"conservées."],
					["Détecter ma position",
						"Utilise la géolocalisation de l'appareil pour placer le repère."],
					["Suivant", "Désactivé tant que la description et la position ne sont pas " +
							"renseignées."]
				]
			},
			{
				name: "Étape 4 : Envoi",
				items: [
					["Envoyer anonymement", "Aucune coordonnée n'est transmise."],
					["Envoyer avec mes coordonnées",
						"Affiche les champs nom, prénom, e-mail et téléphone, tous " +
							"obligatoires. Un message d'erreur apparaît s'il en manque un ou si " +
							"l'e-mail est invalide."],
					["Envoyer le signalement",
						"Enregistre le signalement avec le statut « Reçu » : il apparaît " +
							"aussitôt dans le logiciel de gestion, puis ouvre la page de " +
							"confirmation."]
				]
			},
			{
				name: "Page de confirmation",
				items: [
					["＋ Faire un nouveau signalement",
						"Retourne à l'étape 1 avec un formulaire vierge."],
					["Voir mon historique",
						"Ouvre l'historique, où le nouveau signalement apparaît en premier."]
				]
			},
			{
				name: "Historique",
				items: [
					["Cartes de signalements",
						"Chacune affiche catégorie, description, adresse, date et statut " +
							"(Reçu, Envoyé ou Traité). Le statut change tout seul quand le " +
							"logiciel ou un agent fait avancer la demande. « Traité » n'apparaît " +
							"que pour les signalements réellement traités."],
					["Clic sur une carte",
						"Ouvre le détail : photo ou icône, description, adresse, date, " +
							"statut et coordonnées si le citoyen en a donné. × ou un clic à côté " +
							"le ferme."],
					["＋ Nouveau", "Démarre un nouveau signalement à l'étape 1."],
					["←", "Démarre aussi un signalement à l'étape 1."]
				]
			}
		]
	},
	{
		title: "2. Logiciel de gestion (Signaluo Manager)",
		intro: "Fenêtre réservée aux équipes municipales. Un menu à gauche donne " +
				"accès à cinq pages. Une cloche en haut à droite de la fenêtre ouvre le centre de notifications. Les barres de défilement sont masquées.",
		pages: [
			{
				name: "Centre de notifications (cloche)",
				items: [
					["Cloche", "Une pastille rouge indique le nombre de notifications non lues " +
							"(nouveau signalement, signalement traité)."],
					["Panneau", "Au clic, liste des 30 dernières notifications avec l'heure. " +
							"Boutons : tout marquer comme lu, tout effacer. Un clic ailleurs " +
							"ferme le panneau."]
				]
			},
			{
				name: "Carte (vue des signalements)",
				items: [
					["Repères", "Chaque signalement géolocalisé est un repère coloré selon son " +
							"statut : orange à traiter, violet envoyé, vert traité. La carte est la " +
							"même que dans l'application citoyenne (bâtiments 3D, boutons +/− et 3D/2D)."],
					["Fiche", "Un clic sur un repère affiche statut, titre, description et " +
							"adresse. « Ouvrir la liste » mène à la page Signalements."]
				]
			},
			{
				name: "Tableau de bord",
				items: [
					["Anneau « résolus »", "Pourcentage de signalements au statut Traité."],
					["4 cartes chiffrées", "Total, à traiter (Reçu), envoyés, traités."],
					["Par catégorie",
						"Barres colorées avec le nombre de signalements de chaque catégorie."],
					["7 derniers jours", "Histogramme du nombre de signalements reçus chaque jour."],
					["Activité", "Envoyés non pris en charge, interventions en cours, signalements " +
							"similaires, signalements avec photo, nombre d'employés et de " +
							"services."],
					["Agents les plus actifs",
						"Classement des agents selon le nombre de signalements traités."]
				]
			},
			{
				name: "Signalements (centre de suivi)",
				items: [
					["Compteur", "Nombre de signalements, ou « x sur N » quand un filtre est actif."],
					["Recherche et listes",
						"Recherche libre, filtre par catégorie, par service, et tri (plus " +
							"récents, plus anciens, catégorie, plus de similaires). La liste se " +
							"met à jour en direct."],
					["À traiter / Envoyés / Traités",
						"Filtrent par statut. Un second clic sur le même bouton retire le " +
							"filtre."],
					["Réinitialiser", "Remet tous les filtres à zéro."],
					["Ligne de signalement",
						"Façon boîte mail : point de statut, catégorie colorée, aperçu de la " +
							"description, date, badge de statut. Un clic la déplie : description " +
							"complète, adresse, services, agent en charge et compte rendu."],
					["Groupe de similaires",
						"Les signalements de même catégorie à 100 m ou moins sont regroupés " +
							": le premier est affiché normalement, les suivants sont dans un " +
							"menu déroulant en dessous. Une autre catégorie au même endroit " +
							"n'est jamais regroupée."],
					["Envoyer", "Ouvre un pop-up pour choisir les services destinataires. À la " +
							"validation, le statut passe à « Envoyé » et les agents de ces " +
							"services voient le signalement."],
					["Marquer comme traité",
						"Disponible pour un signalement « Envoyé ». Un pop-up demande " +
							"confirmation puis le statut passe à « Traité »."],
					["Supprimer",
						"Pop-up de confirmation. Le signalement est supprimé définitivement, " +
							"y compris de l'historique du citoyen."],
					["Déclarer comme signalement unique",
						"Sort un signalement de son groupe pour qu'il soit affiché seul."]
				]
			},
			{
				name: "Employés",
				items: [
					["Bouton +", "Ouvre un pop-up pour créer un employé : nom, e-mail facultatif et " +
							"au moins un service. Un identifiant du type EMP-0001 est attribué " +
							"automatiquement."],
					["Recherche et service",
						"Filtrent la liste par nom, identifiant, e-mail ou service. Un " +
							"message s'affiche s'il n'y a aucun résultat."],
					["Infos", "Pop-up en lecture seule : identifiant, nom, e-mail, services."],
					["Modifier", "Pop-up pour changer le nom, l'e-mail et les services."],
					["Supprimer", "Pop-up de confirmation. L'employé ne pourra plus se connecter à " +
							"l'application pro."],
					["Rattachement",
						"Un employé peut appartenir à plusieurs services et apparaît dans " +
							"chacun."]
				]
			},
			{
				name: "Paramètres",
				items: [
					["Collectivité",
						"Nom de la structure, e-mail de contact, langue. Chaque modification " +
							"est enregistrée et signalée par « Paramètre enregistré »."],
					["Notifications",
						"Interrupteurs : nouveau signalement, signalement traité, résumé " +
							"quotidien. Activer le résumé quotidien fait apparaître un champ " +
							"pour saisir l'e-mail qui recevra le résumé. Les deux premiers " +
							"affichent une petite notification en haut à droite du logiciel " +
							"(visible 3 secondes) quand un citoyen envoie un signalement ou " +
							"qu'un agent en clôture un."],
					["Signalements", "Distance de regroupement (50, 100, 200 ou 500 m) : les " +
							"signalements de même catégorie plus proches que cette distance sont " +
							"empilés. Affichage de la liste : « Confortable » (lignes aérées) ou " +
							"« Compact » (lignes serrées), appliqué immédiatement."],
					["Transitions fluides",
						"Interrupteur dans Apparence : active ou désactive l'animation douce " +
							"lors du changement de page (logiciel et application citoyenne)."],
					["Apparence",
						"Cinq thèmes de couleurs : Océan (d'origine), Forêt, Coucher de " +
							"soleil, Lavande et Nuit (mode sombre). Un clic applique le thème " +
							"immédiatement et il est mémorisé."],
					["Catégories et services",
						"Créer une catégorie (nom + couleur) : elle devient aussi un service " +
							"et est proposée aux citoyens. Dans la liste déroulante « Catégories " +
							"créées » : pastille de couleur (changer la couleur), crayon (renommer, " +
							"mise à jour partout : signalements, employés, services) et × " +
							"(supprimer, refusé si des employés y sont rattachés)."],
					["Exporter mes données",
						"Télécharge un fichier JSON avec signalements, employés et " +
							"paramètres."],
					["Réinitialiser la démo",
						"Après confirmation, efface toutes les données de la démo " +
							"enregistrées dans le navigateur et retourne à l'accueil."],
					["Télécharger le guide PDF", "Génère ce document."]
				]
			}
		],
		note: "La distance de regroupement et l'affichage de la liste agissent " +
				"réellement sur le logiciel. Les autres paramètres (collectivité, " +
				"résumé quotidien) sont pour l'instant des préférences enregistrées."
	},
	{
		title: "3. Application professionnelle (agents de terrain)",
		intro: "Elle s'utilise dans le faux téléphone, onglet « Version " +
				"Professionnel ». Chaque agent ne voit que les signalements envoyés " +
				"à ses services.",
		pages: [
			{
				name: "Page de présentation et connexion",
				items: [
					["Lancer l'application", "Ouvre l'application et affiche l'écran de connexion."],
					["Identifiant", "Identifiant employé du logiciel de gestion (EMP-0001…). Un " +
							"identifiant inconnu affiche « Identifiant inconnu »."],
					["Se connecter",
						"Ouvre l'écran d'accueil de l'agent. La session est conservée tant " +
							"que l'onglet reste ouvert."]
				]
			},
			{
				name: "Accueil de l'agent",
				items: [
					["En-tête", "Initiale, nom, identifiant et services de l'agent."],
					["Déconnexion (icône de sortie)", "Ferme la session et revient à la page de présentation."],
					["3 compteurs", "À prendre, En cours, Terminés."],
					["Onglet À prendre",
						"Signalements « Envoyé » de ses services que personne n'a pris en " +
							"charge."],
					["Onglet Mes missions",
						"Signalements qu'il a pris en charge et qui ne sont pas encore " +
							"traités."],
					["Onglet Terminés", "Signalements au statut Traité pour ses services."]
				]
			},
			{
				name: "Détail d'un signalement",
				items: [
					["Contenu", "Photo, catégorie colorée, description, adresse avec lien " +
							"OpenStreetMap, coordonnées du citoyen si fournies."],
					["Itinéraire",
						"Bouton bleu qui ouvre la carte de l'application avec le trajet " +
							"en voiture (tracé bleu, durée et distance) depuis le centre " +
							"technique jusqu'au signalement. Même carte que l'application citoyenne (boutons +/− et 3D/2D). Croix en haut à gauche pour fermer."],
					["Prendre en charge",
						"Le signalement est attribué à l'agent et passe dans « Mes missions " +
							"». Le logiciel affiche « Pris en charge par… »."],
					["Compte rendu (facultatif)",
						"Zone de texte conservée avec le signalement et visible dans le " +
							"logiciel."],
					["Marquer comme traité",
						"Le statut devient « Traité » (avec l'agent et la date). Il apparaît " +
							"alors comme traité dans l'historique du citoyen et le logiciel."],
					["Rendre le signalement",
						"Retire l'attribution : le signalement retourne dans « À prendre » " +
							"pour toute l'équipe."],
					["Retour", "Revient à la liste."]
				]
			}
		]
	}
];

// Effets visibles des principales actions dans les trois applications.
const GUIDE_ACTIONS = [
	["Le citoyen envoie un signalement",
		"Statut Reçu. Apparaît dans le centre de suivi, dans les compteurs " +
			"et le tableau de bord, et en haut de l'historique du citoyen. " +
			"Regroupé avec les signalements similaires s'il y en a."],
	["Le gestionnaire clique sur Envoyer",
		"Choix des services, statut Envoyé. Le signalement apparaît dans " +
			"l'onglet « À prendre » des agents de ces services et dans " +
			"l'historique du citoyen (« Envoyé »)."],
	["Un agent prend en charge",
		"Le signalement quitte « À prendre » pour tous les autres agents du " +
			"service et entre dans « Mes missions ». Le logiciel affiche le nom " +
			"de l'agent."],
	["Un agent rend le signalement",
		"L'attribution est retirée, le signalement revient dans « À prendre " +
			"»."],
	["Un agent ou le gestionnaire traite le signalement",
		"Statut Traité, compteurs et statistiques mis à jour, historique du " +
			"citoyen mis à jour (« Traité »)."],
	["Le gestionnaire supprime un signalement",
		"Il disparaît partout : logiciel, application pro, historique du " +
			"citoyen."],
	["Le gestionnaire supprime un employé",
		"L'identifiant ne permet plus de se connecter. Les signalements déjà " +
			"traités gardent leur historique."],
	["Le gestionnaire renomme une catégorie",
		"Le nom est mis à jour dans les signalements, les employés, les " +
			"services et l'application citoyenne."],
	["Le gestionnaire supprime une catégorie",
		"Refusé si des employés y sont rattachés ; sinon elle n'est plus " +
			"proposée aux citoyens."],
	["Le navigateur est rechargé",
		"Les données restent (stockées dans le navigateur) ; le rechargement " +
			"d'une page de l'application ramène à la page d'accueil du site."]
];

// Protège les caractères réservés avant leur insertion dans le HTML généré.
function guideEscape(value) {
	return String(value).replace(/[&<>"]/g, char => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;"
	}[char]));
}

// Schéma général : citoyen → données partagées → gestionnaire → agent.
function guideDiagram() {
	// Décrit le cadre et les libellés de chaque acteur.
	const box = (x, y, w, h, color, title, lines) => `
		<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#fff" stroke="${color}" stroke-width="2.5"/>
		<rect x="${x}" y="${y}" width="${w}" height="30" rx="14" fill="${color}"/>
		<rect x="${x}" y="${y + 16}" width="${w}" height="14" fill="${color}"/>
		<text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${title}</text>
		${lines.map((line, index) => `<text x="${x + w / 2}" y="${y + 52 + index * 17}" text-anchor="middle" font-size="12.5" fill="#334155">${line}</text>`).join("")}
	`;
	// Relie les acteurs et précise le sens des échanges.
	const arrow = (x1, y1, x2, y2, label, labelY) => `
		<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
		<text x="${(x1 + x2) / 2}" y="${labelY}" text-anchor="middle" font-size="11.5" fill="#475569">${label}</text>
	`;

	return `
		<svg viewBox="0 0 800 335" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">
			<defs>
				<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker>
			</defs>
			${box(10, 20, 190, 120, "#2563eb", "Application citoyenne", ["Photo, catégorie,", "description, lieu", "Suivi dans l'historique"])}
			${box(305, 20, 190, 120, "#0f172a", "Données partagées", ["Signalements, employés,", "catégories, paramètres", "(stockage du navigateur)"])}
			${box(600, 20, 190, 120, "#7c3aed", "Logiciel de gestion", ["Tableau de bord, suivi,", "envoi aux services,", "employés, paramètres"])}
			${box(600, 210, 190, 110, "#10b981", "Application pro (agent)", ["Connexion par identifiant,", "prise en charge,", "traitement"])}
			${arrow(200, 70, 305, 70, "envoie", 62)}
			${arrow(305, 110, 200, 110, "statut visible", 126)}
			${arrow(495, 70, 600, 70, "lit et modifie", 62)}
			${arrow(695, 140, 695, 210, "", 0)}
			<text x="705" y="179" font-size="11.5" fill="#475569">envoie aux services</text>
			${arrow(600, 265, 400, 265, "met à jour le statut", 257)}
			<line x1="400" y1="265" x2="400" y2="142" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
		</svg>
	`;
}

// Transforme les étapes du cycle de vie en cartes reliées.
function guideFlow() {
	return GUIDE_FLOW[0].steps.map(([name, text, color], index) => `
		<div class="flow-step" style="--c:${color}">
			<b>${index + 1}. ${guideEscape(name)}</b>
			<span>${guideEscape(text)}</span>
		</div>
	`).join('<div class="flow-arrow">→</div>');
}

// Assemble le document complet, ses styles d’impression et son contenu dynamique.
function guideHtml() {
	// La date affichée suit le format français, indépendamment de la langue
	// du navigateur.
	const today = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(new Date());

	// Génère les tableaux de chaque écran à partir des données descriptives.
	const sections = GUIDE_SECTIONS.map(section => `
		<section>
			<h2>${guideEscape(section.title)}</h2>
			<p class="intro">${guideEscape(section.intro)}</p>
			${section.pages.map(page => `
				<div class="page-block">
					<h3>${guideEscape(page.name)}</h3>
					<table>
						${page.items.map(([label, text]) => `<tr><th>${guideEscape(label)}</th><td>${guideEscape(text)}</td></tr>`).join("")}
					</table>
				</div>
			`).join("")}
			${section.note ? `<p class="note">${guideEscape(section.note)}</p>` : ""}
		</section>
	`).join("");

	return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Signaluo - Guide de fonctionnement</title>
<style>
	@page { size: A4; margin: 16mm 14mm; }
	* { box-sizing: border-box; }
	body { margin: 0; color: #0f172a; font: 11px/1.5 Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.cover { padding: 26px; border-radius: 18px; background: linear-gradient(135deg, #1e293b, #2563eb); color: #fff; }
	.cover small { letter-spacing: .15em; font-weight: 700; opacity: .8; }
	.cover h1 { margin: 6px 0; font-size: 30px; letter-spacing: -.03em; }
	.cover p { margin: 0; opacity: .85; }
	h2 { margin: 26px 0 4px; padding-bottom: 5px; border-bottom: 2px solid #2563eb; font-size: 17px; }
	h3 { margin: 14px 0 6px; font-size: 12.5px; color: #1d4ed8; }
	.intro, .note { color: #475569; }
	.note { padding: 8px 10px; border-radius: 8px; background: #fef9c3; color: #713f12; }
	.diagram { margin: 10px 0; padding: 8px; border: 1px solid #e2e8f0; border-radius: 14px; }
	.diagram svg { width: 100%; height: auto; }
	.flow { display: flex; align-items: stretch; gap: 6px; margin: 10px 0; }
	.flow-step { flex: 1; padding: 9px; border-top: 4px solid var(--c); border-radius: 8px; background: #f8fafc; }
	.flow-step b { display: block; margin-bottom: 3px; color: var(--c); font-size: 12px; }
	.flow-arrow { align-self: center; color: #94a3b8; font-size: 18px; }
	table { width: 100%; border-collapse: collapse; }
	tr { break-inside: avoid; }
	th, td { padding: 5px 8px; border: 1px solid #e2e8f0; vertical-align: top; text-align: left; }
	th { width: 28%; background: #f1f5f9; font-weight: 700; }
	.page-block { break-inside: auto; }
	h3, h2 { break-after: avoid; }
	section.break { break-before: page; }
	footer { margin-top: 24px; color: #94a3b8; font-size: 9.5px; text-align: center; }
</style>
</head>
<body>
	<div class="cover">
		<small>SIGNALUO</small>
		<h1>Guide de fonctionnement</h1>
		<p>Logiciel de gestion, application citoyenne et application professionnelle. Document généré le ${today}.</p>
	</div>

	<h2>Schéma général</h2>
	<p class="intro">Les trois parties partagent les mêmes données : ce que fait l'une est immédiatement visible dans les autres.</p>
	<div class="diagram">${guideDiagram()}</div>
	<h3>${guideEscape(GUIDE_FLOW[0].title)}</h3>
	<div class="flow">${guideFlow()}</div>

	${sections}

	<section class="break">
		<h2>4. Que se passe-t-il quand on fait une action ?</h2>
		<table>
			${GUIDE_ACTIONS.map(([action, effect]) => `<tr><th>${guideEscape(action)}</th><td>${guideEscape(effect)}</td></tr>`).join("")}
		</table>
	</section>
	<footer>Signaluo · maquette de démonstration</footer>
</body>
</html>`;
}

// Prépare le document dans un cadre invisible puis ouvre la boîte d’impression.
function downloadGuide() {
	// Isole le document PDF du contenu visible de la page.
	const frame = document.createElement("iframe");

	// Le cadre reste accessible à l’impression sans interférer avec l’interface.
	frame.setAttribute("aria-hidden", "true");
	frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
	document.body.appendChild(frame);

	// Écrit le HTML du guide dans le document dédié au cadre.
	const doc = frame.contentDocument;

	doc.open();
	doc.write(guideHtml());
	doc.close();

	// Nettoie le cadre après l’impression, ou au terme du délai de secours.
	frame.contentWindow.addEventListener("afterprint", () => frame.remove());
	window.setTimeout(() => {
		frame.contentWindow.focus();
		frame.contentWindow.print();
	}, 300);
	window.setTimeout(() => frame.remove(), 120000);
}

window.downloadGuide = downloadGuide;
