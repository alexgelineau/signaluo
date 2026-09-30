# Maquette Signaluo (Style Signaleo)

Transformation du projet en une maquette interactive d'application de signalement de voirie, utilisant les XML (Views) et le Material Design 3.

## User Review Required

> [!IMPORTANT]
> L'application utilisera des données fictives stockées en mémoire. Aucun serveur réel n'est requis. Toutes les interactions simuleront des appels réseau.

## Proposed Changes

### Configuration du Projet
#### [MODIFY] [libs.versions.toml](file:///Users/alexgelineau/Développement Mobile/Signaluo/gradle/libs.versions.toml)
Ajout des dépendances pour la navigation Jetpack.

#### [MODIFY] [build.gradle.kts](file:///Users/alexgelineau/Développement Mobile/Signaluo/app/build.gradle.kts)
Activation de `viewBinding` et ajout des bibliothèques de navigation.

### Architecture des Données
#### [NEW] `Report.kt`
Modèle de données pour un signalement (Titre, Description, Statut, Date).
#### [NEW] `ReportRepository.kt`
Simulateur de base de données avec des données de test et des méthodes d'ajout.

### Interface Utilisateur (Layouts)
#### [MODIFY] [activity_main.xml](file:///Users/alexgelineau/Développement Mobile/Signaluo/app/src/main/res/layout/activity_main.xml)
Mise en place du `FragmentContainerView` pour la navigation.
#### [NEW] `fragment_home.xml`
Liste des signalements avec un bouton flottant (FAB).
#### [NEW] `fragment_report.xml`
Formulaire de création de signalement.
#### [NEW] `item_report.xml`
Design d'une ligne dans la liste des signalements.
#### [NEW] `nav_graph.xml`
Définition des transitions entre les écrans.

### Logique (Fragments & Activity)
#### [MODIFY] [MainActivity.kt](file:///Users/alexgelineau/Développement Mobile/Signaluo/app/src/main/java/fr/univ/angers/ageline/signaluo/MainActivity.kt)
Initialisation de la navigation.
#### [NEW] `HomeFragment.kt`
Gestion de l'affichage de la liste.
#### [NEW] `ReportFragment.kt`
Gestion de la saisie et simulation d'envoi.

## Verification Plan

### Manual Verification
1.  Lancer l'application.
2.  Vérifier que la liste initiale de signalements s'affiche.
3.  Cliquer sur le bouton "+" pour ouvrir le formulaire.
4.  Remplir les champs et cliquer sur "Envoyer".
5.  Vérifier le retour automatique à l'accueil avec le nouveau signalement ajouté à la liste.
