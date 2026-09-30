// Références aux éléments utilisés par les transitions de la landing page.
const loader = document.querySelector("#loader");
const landing = document.querySelector("#landing");
const solutionLink = document.querySelector(".landing-cta");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


// Réinitialise l'état visuel lorsque la page revient depuis l'historique.
function resetLandingState() {
	landing?.classList.remove("leaving");
	solutionLink?.removeAttribute("aria-disabled");
}


// Laisse le temps à l'animation du loader de se terminer.
window.setTimeout(() => {
	loader?.classList.add("loaded");
}, 1100);


// Le navigateur peut restaurer la landing depuis son cache.
window.addEventListener("pageshow", resetLandingState);


// Anime la sortie avant d'ouvrir l'application.
solutionLink?.addEventListener("click", (event) => {
	if (prefersReducedMotion) return;

	event.preventDefault();
	landing?.classList.add("leaving");
	solutionLink.setAttribute("aria-disabled", "true");

	window.setTimeout(() => {
		window.location.href = solutionLink.href;
	}, 520);
});
