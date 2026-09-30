// Retourner à la landing page lorsqu'une page d'application est rechargée.
const navigationEntry = performance.getEntriesByType("navigation")[0];
const isReload = navigationEntry?.type === "reload";

if (isReload) {
	window.location.replace("index.html");
}
