      const CATEGORIES = [
        ["Voirie", "🛣️", "road"], ["Éclairage", "💡", "light"],
        ["Propreté", "🗑️", "clean"], ["Espaces Verts", "🌿", "nature"], ["Autre", "•••", "other"]
      ];
      const CAMERA_PHOTOS = [
        "image/vreverv.jpeg",
        "image/vsdv.jpeg",
        "image/vsdvs.jpeg",
        "image/images.jpeg"
      ];
      const today = new Intl.DateTimeFormat("fr-FR").format(new Date());
      const seed = [
        { id: 1, title: "Nid de poule", description: "Gros trou sur la chaussée au niveau du 12 rue de la Paix.", category: "Voirie", date: today, status: "En cours", location: "47.4712° N, 0.5513° W" },
        { id: 2, title: "Lampadaire en panne", description: "Le lampadaire ne s’allume plus depuis 3 jours.", category: "Éclairage", date: today, status: "Traité", location: "47.4712° N, 0.5513° W" }
      ];
      let reports = JSON.parse(localStorage.getItem("signaluo-reports") || "null") || seed;
      let manager = false, screen = "wizard", step = 0, mapInstance = null, mapMarker = null, draft = { photo: false, category: "", location: "", title: "", description: "", anonymous: true, lastName: "", firstName: "", email: "", phone: "" };
      const app = document.querySelector("#app");
      const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
      function save() { localStorage.setItem("signaluo-reports", JSON.stringify(reports)); }
      function toast(message) { const node = document.querySelector("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 2600); }
      function statusClass(status) { return status === "Traité" ? "resolved" : status === "En cours" ? "progress" : "sent"; }
      function reportCard(report, showStatus = true) {
        const category = CATEGORIES.find(c => c[0] === report.category) || CATEGORIES[4];
        const status = showStatus ? `<span class="badge ${statusClass(report.status)}">${esc(report.status)}</span>` : "";
        const icon = report.photoUrl
          ? `<img class="report-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
          : category[1];
        return `<article class="report" data-id="${report.id}"><div class="report-icon ${category[2]}">${icon}</div><div><h4>${esc(report.title)}</h4><p>📍 ${esc(report.location)} · ${esc(report.date)}</p>${status}</div></article>`;
      }
      function showReportDetails(id) {
        const report = reports.find(item => item.id === id);
        if (!report) return;
        const category = CATEGORIES.find(c => c[0] === report.category) || CATEGORIES[4];
        const photo = report.photoUrl
          ? `<img class="details-photo" src="${esc(report.photoUrl)}" alt="Photo du signalement">`
          : `<div class="details-placeholder ${category[2]}">${category[1]}</div>`;
        const contact = report.userName || report.userEmail || report.userPhone
          ? `<div class="details-section"><h4>Coordonnées</h4><p>${esc(report.userName || "—")}</p><p>${esc(report.userEmail || "—")}</p><p>${esc(report.userPhone || "—")}</p></div>`
          : "";
        app.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-action="close-details"><section class="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title"><button class="modal-close" data-action="close-details" aria-label="Fermer">×</button>${photo}<h3 id="details-title">${esc(report.title)}</h3><div class="details-section"><p><strong>Catégorie :</strong> ${esc(report.category)}</p><p><strong>Date :</strong> ${esc(report.date)}</p><p><strong>Localisation :</strong> ${esc(report.location)}</p></div><div class="details-section"><h4>Description</h4><p>${esc(report.description || "Aucune description fournie.")}</p></div>${contact}</section></div>`);
      }
      function renderDashboard() {
        const inProgress = reports.filter(r => r.status === "En cours").length, resolved = reports.filter(r => r.status === "Traité").length;
        app.innerHTML = `<div class="screen"><div class="topbar"><button class="icon-btn" data-action="manager" title="Mode gestionnaire">🔒</button><h2>Mes Signalements</h2><button class="icon-btn" data-action="history" title="Historique">↻</button></div>
          ${manager ? '<div class="option selected">🔓 <b>Mode gestionnaire actif</b><small> Cliquez sur une demande pour changer son statut.</small></div>' : ""}
          <div class="hero"><small>Bonjour 👋</small><h3>Améliorons la ville ensemble.</h3><p>Un signalement simple, un impact concret sur votre quotidien.</p></div>
          <div class="stats"><div class="stat"><b>${inProgress}</b><small>EN COURS</small></div><div class="stat"><b>${resolved}</b><small>TRAITÉS</small></div></div>
          <button class="primary" data-action="start">＋ Signaler un problème</button>
          <div class="section-title"><b>Derniers signalements</b><button data-action="history">Voir tout l’historique</button></div>
          ${reports.length ? reports.slice(-3).reverse().map(reportCard).join("") : '<div class="empty"><div>⌖</div>Aucun signalement</div>'}</div>`;
        app.querySelectorAll(".report").forEach(card => card.addEventListener("click", () => showReportDetails(Number(card.dataset.id))));
      }
      function renderHistory() {
        app.innerHTML = `<div class="screen"><div class="topbar"><button class="icon-btn" data-action="wizard">←</button><h2>Mes Signalements</h2><span></span></div><div class="section-title"><b>${reports.length} demande${reports.length > 1 ? "s" : ""}</b><button data-action="start">＋ Nouveau</button></div>${reports.length ? reports.slice().reverse().map(report => reportCard(report, false)).join("") : '<div class="empty"><div>⌖</div>Vous n’avez pas encore réalisé de signalement.</div>'}</div>`;
        app.querySelectorAll(".report").forEach(card => card.addEventListener("click", () => showReportDetails(Number(card.dataset.id))));
      }
      function renderWizard() {
        if (step === 0) {
          app.innerHTML = `<div class="screen launch-screen" aria-labelledby="launch-title"><div class="launch-mark">⌖</div><span class="eyebrow">ESPACE CITOYEN</span><h1 id="launch-title">Prêt à agir pour votre ville ?</h1><p>Lancez l’application Signaluo pour signaler rapidement un problème près de chez vous.</p><button class="launch-button" type="button" data-action="launch">Lancer l’application <span>→</span></button></div>`;
          return;
        }
        const titles = ["Photo du problème", "Type de problème", "Détails & localisation", "Envoi du signalement"];
        app.innerHTML = `<div class="screen"><div class="topbar">${step > 1 ? '<button class="icon-btn" data-action="back">←</button>' : '<span></span>'}<h2>${step}. ${titles[step - 1]}</h2><button class="icon-btn" data-action="history" title="Historique">↻</button></div><div class="steps">${[1,2,3,4].map(n => `<span class="step ${n <= step ? "active" : ""}"></span>`).join("")}</div>${wizardContent()}</div>`;
        bindWizard();
        if (step === 3) initMap();
      }
      function wizardContent() {
        if (step === 1) return `<p>Une image aide les services de la ville à comprendre rapidement la situation.</p><div class="photo-box ${draft.photo ? "has-photo" : ""}">${draft.photo ? (draft.photoUrl ? `<img class="photo-preview" src="${draft.photoUrl}" alt="Photo sélectionnée"><strong>Photo ajoutée</strong>` : '<div style="font-size:4rem">🖼️<strong>Photo ajoutée</strong></div>') : '<div style="font-size:3rem">📷<strong>Aucune photo sélectionnée</strong></div>'}</div><input id="gallery-input" type="file" accept="image/*" hidden><div class="actions">${draft.photo ? '<button class="primary" data-action="photo">Changer la photo</button>' : '<button class="primary" data-action="camera">📷 Prendre une photo</button><button class="secondary" data-action="gallery">🖼️ Ajouter depuis la galerie</button>'}<button class="secondary" data-action="next" ${draft.photo ? "" : "disabled"}>Suivant</button></div>`;
        if (step === 2) return `<p>Quel type de problème souhaitez-vous signaler ?</p><div class="categories">${CATEGORIES.map(c => `<button class="category ${c[2]} ${draft.category === c[0] ? "selected" : ""}" data-category="${c[0]}"><span>${c[1]}</span><small>${c[0]}</small></button>`).join("")}</div><div class="actions"><button class="primary" data-action="next" ${draft.category ? "" : "disabled"}>Suivant</button></div>`;
        if (step === 3) return `<p>Décrivez le problème et indiquez où il se trouve.</p><label for="title">Titre court</label><input id="title" value="${esc(draft.title)}" placeholder="Ex. Nid de poule"><label for="description">Description détaillée</label><textarea id="description" placeholder="Ajoutez quelques détails...">${esc(draft.description)}</textarea><div id="map" class="map" aria-label="Carte interactive"></div><button class="secondary" data-action="location">◎ Détecter ma position</button><p id="location-status" style="margin:9px 0 0;color:var(--green);font-size:.72rem">✓ ${draft.location || "Position non définie"}</p><div class="actions"><button class="primary" data-action="next" ${draft.title && draft.description && draft.location ? "" : "disabled"}>Suivant</button></div>`;
        return `<p>Choisissez comment transmettre votre demande à la mairie.</p><label class="option ${draft.anonymous ? "selected" : ""}"><input type="radio" name="privacy" value="anonymous" ${draft.anonymous ? "checked" : ""}> Envoyer anonymement</label><label class="option ${!draft.anonymous ? "selected" : ""}"><input type="radio" name="privacy" value="contact" ${!draft.anonymous ? "checked" : ""}> Envoyer avec mes coordonnées</label>${draft.anonymous ? "" : '<div class="contact-fields"><label for="lastName">Nom</label><input id="lastName" value="' + esc(draft.lastName) + '" placeholder="Votre nom"><label for="firstName">Prénom</label><input id="firstName" value="' + esc(draft.firstName) + '" placeholder="Votre prénom"><label for="email">Adresse e-mail</label><input id="email" type="email" value="' + esc(draft.email) + '" placeholder="vous@exemple.fr"><label for="phone">Numéro de téléphone</label><input id="phone" type="tel" value="' + esc(draft.phone) + '" placeholder="06 12 34 56 78"></div>'}<div class="actions"><button class="primary" data-action="submit">Envoyer le signalement</button></div>`;
      }
      function bindWizard() {
        app.querySelectorAll("[data-category]").forEach(button => button.onclick = () => { draft.category = button.dataset.category; renderWizard(); });
        ["gallery-input"].forEach(inputId => {
          const input = app.querySelector(`#${inputId}`);
          if (input) input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              toast("Veuillez sélectionner une image");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              draft.photo = true;
              draft.photoUrl = reader.result;
              renderWizard();
              toast("Image ajoutée depuis la galerie");
            };
            reader.readAsDataURL(file);
          });
        });
        app.querySelectorAll('input[name="privacy"]').forEach(input => input.onchange = () => { draft.anonymous = input.value === "anonymous"; renderWizard(); });
        const title = app.querySelector("#title"), description = app.querySelector("#description");
        [title, description].forEach(input => input && input.addEventListener("input", () => {
          draft[input.id] = input.value.trim();
          updateWizardNext();
        }));
        ["lastName", "firstName", "email", "phone"].forEach(field => {
          const input = app.querySelector(`#${field}`);
          if (input) input.addEventListener("input", () => { draft[field] = input.value.trim(); });
        });
      }
      function updateWizardNext() {
        const next = app.querySelector('[data-action="next"]');
        if (next && step === 3) next.disabled = !(draft.title && draft.description && draft.location);
      }
      function setMapLocation(latitude, longitude, message = `Carte: ${latitude.toFixed(4)}° N, ${Math.abs(longitude).toFixed(4)}° W`) {
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
          mapMarker = L.marker([latitude, longitude], { icon: markerIcon }).addTo(mapInstance);
        }
        if (mapInstance) mapInstance.setView([latitude, longitude], 16);
        const status = app.querySelector("#location-status");
        if (status) status.textContent = `✓ ${draft.location}`;
        updateWizardNext();
      }
      function initMap() {
        if (!window.L) {
          toast("La carte n’a pas pu être chargée");
          return;
        }
        const mapElement = app.querySelector("#map");
        if (!mapElement) return;
        const center = [47.4712, -0.5513];
        mapInstance = null;
        mapMarker = null;
        mapInstance = L.map(mapElement, { attributionControl: false }).setView(center, 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19
        }).addTo(mapInstance);
        L.control.attribution({ prefix: false })
          .addAttribution("&copy; OpenStreetMap contributors")
          .addTo(mapInstance);
        mapInstance.on("click", event => {
          setMapLocation(event.latlng.lat, event.latlng.lng);
          toast("Repère placé sur la carte");
        });
        if (draft.location) setMapLocation(center[0], center[1], draft.location);
      }
      function cycleStatus(id) { const report = reports.find(r => r.id === id); if (!report) return; report.status = report.status === "Envoyé" ? "En cours" : report.status === "En cours" ? "Traité" : "Envoyé"; save(); render(); toast(`Statut mis à jour : ${report.status}`); }
      function render() { screen === "dashboard" ? renderDashboard() : screen === "history" ? renderHistory() : renderWizard(); }
      document.addEventListener("click", event => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (!action) return;
        if (action === "start") { screen = "wizard"; step = 1; draft = { photo: false, category: "", location: "", title: "", description: "", anonymous: true, lastName: "", firstName: "", email: "", phone: "" }; }
        if (action === "home") { screen = "dashboard"; }
        if (action === "history") { screen = "history"; }
        if (action === "wizard") { screen = "wizard"; step = 1; }
        if (action === "launch") { step = 1; }
        if (action === "back") { if (step > 1) step--; else step = 0; }
        if (action === "photo") {
          if (draft.photo) {
            if (draft.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.photoUrl);
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
          draft.photoUrl = CAMERA_PHOTOS[Math.floor(Math.random() * CAMERA_PHOTOS.length)];
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
        if (action === "location") { setMapLocation(47.4712, -0.5513, "47.4712° N, 0.5513° W (Angers Centre)"); toast("Position mise à jour"); }
        if (action === "next") { if (step < 4) step++; }
        if (action === "manager") { const password = prompt("Mot de passe gestionnaire"); if (password === "admin") { manager = !manager; toast(manager ? "Mode gestionnaire activé" : "Mode gestionnaire désactivé"); } else if (password !== null) toast("Mot de passe incorrect"); }
        if (action === "submit") {
          if (!draft.anonymous && (!draft.lastName || !draft.firstName || !draft.email || !draft.phone)) {
            toast("Veuillez remplir tous les champs de contact");
            return;
          }
          reports.push({ id: Date.now(), title: draft.title, description: draft.description, category: draft.category, location: draft.location, date: new Intl.DateTimeFormat("fr-FR").format(new Date()), status: "Envoyé", photoUrl: draft.photoUrl || "", userName: draft.anonymous ? "" : `${draft.firstName} ${draft.lastName}`, userEmail: draft.anonymous ? "" : draft.email, userPhone: draft.anonymous ? "" : draft.phone });
          save(); screen = "wizard"; step = 1; draft = { photo: false, category: "", location: "", title: "", description: "", anonymous: true, lastName: "", firstName: "", email: "", phone: "" }; toast("Merci ! Signalement envoyé à la mairie.");
        }
        render();
      });
      render();
