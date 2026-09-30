const navigationEntry = performance.getEntriesByType("navigation")[0];
const isReload = navigationEntry?.type === "reload";

if (isReload) {
  window.location.replace("index.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector("#application-page");
  const launchButton = document.querySelector("#launch-app");
  const phone = document.querySelector(".phone");
  const app = document.querySelector("#app");

  launchButton?.addEventListener("click", () => {
    page?.classList.add("app-started");
    phone?.removeAttribute("aria-hidden");
    app?.removeAttribute("aria-hidden");

    window.setTimeout(() => {
      document.querySelector(".launch-screen")?.setAttribute("hidden", "");
    }, 500);
  });
});
