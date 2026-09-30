const loader = document.querySelector("#loader");
const landing = document.querySelector("#landing");
const solutionLink = document.querySelector(".landing-cta");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

window.setTimeout(() => {
  loader?.classList.add("loaded");
}, 1100);

solutionLink?.addEventListener("click", (event) => {
  if (prefersReducedMotion) return;

  event.preventDefault();
  landing?.classList.add("leaving");
  solutionLink.setAttribute("aria-disabled", "true");

  window.setTimeout(() => {
    window.location.href = solutionLink.href;
  }, 520);
});
