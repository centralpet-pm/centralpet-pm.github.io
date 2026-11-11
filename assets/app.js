/* Central Pet — scripts do site
   ------------------------------------------------------------------
   CONFIGURAÇÃO: edite só este bloco.
   - gaMeasurementId: deixe vazio ("") para NÃO usar Google Analytics.
     Se preencher (ex.: "G-ABC123XYZ"), o GA4 só é carregado DEPOIS que o
     visitante aceitar a categoria "Estatísticas" no aviso de cookies.
   - consentVersion: aumente o número quando mudar a política de cookies;
     isso faz o aviso aparecer de novo para todos.
   ------------------------------------------------------------------ */
const SITE_CONFIG = {
  gaMeasurementId: "",
  whatsapp: "5537991402626",
  consentVersion: 1,
  consentMaxAgeDays: 180
};

(function () {
  "use strict";

  /* ---------- Utilidades de armazenamento (podem falhar em navegadores restritos) ---------- */
  const STORE_KEY = "cp_consent";
  function readConsent() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const ageDays = (Date.now() - data.timestamp) / 86400000;
      if (data.version !== SITE_CONFIG.consentVersion || ageDays > SITE_CONFIG.consentMaxAgeDays) return null;
      return data;
    } catch (e) { return null; }
  }
  function saveConsent(stats) {
    const data = { version: SITE_CONFIG.consentVersion, timestamp: Date.now(), necessary: true, statistics: !!stats };
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* segue sem salvar */ }
    window.__cpConsent = data;
    return data;
  }
  function currentConsent() { return window.__cpConsent || readConsent(); }

  /* ---------- Google Analytics 4 com Consent Mode v2 ---------- */
  const gaId = (SITE_CONFIG.gaMeasurementId || "").trim();
  const gaConfigured = /^G-[A-Z0-9]{6,}$/.test(gaId);
  let gaLoaded = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  // Tudo negado por padrão. Publicidade fica sempre negada: este site não faz anúncios.
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted"
  });

  function loadAnalytics() {
    if (!gaConfigured || gaLoaded) return;
    gaLoaded = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", gaId, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }

  function removeAnalyticsCookies() {
    const host = location.hostname;
    const domains = ["", host, "." + host.replace(/^www\./, "")];
    document.cookie.split(";").forEach(function (c) {
      const name = c.split("=")[0].trim();
      if (/^_ga/.test(name) || /^_gid/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
  }

  function applyConsent(data) {
    if (data && data.statistics) {
      loadAnalytics();
    } else {
      gtag("consent", "update", { analytics_storage: "denied" });
      removeAnalyticsCookies();
      if (gaLoaded) { location.reload(); }
    }
  }

  /* ---------- Banner e painel ---------- */
  const banner = document.getElementById("cookie-banner");
  const modalBackdrop = document.getElementById("cookie-modal");
  const modal = modalBackdrop ? modalBackdrop.querySelector(".modal") : null;
  const statsToggle = document.getElementById("pref-statistics");
  const gaStatus = document.getElementById("ga-status");
  let lastFocus = null;

  if (gaStatus) {
    gaStatus.textContent = gaConfigured
      ? "Ferramenta: Google Analytics 4 (Google LLC). Coleta páginas visitadas, tempo na página, tipo de dispositivo e cidade aproximada. Sem sinais de publicidade."
      : "No momento este site não usa nenhuma ferramenta de estatística. Se passar a usar, ela só funcionará com a sua autorização.";
  }

  function showBanner() { if (banner) banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
  }
  function openModal() {
    if (!modalBackdrop) return;
    lastFocus = document.activeElement;
    const c = currentConsent();
    if (statsToggle) statsToggle.checked = !!(c && c.statistics);
    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    const title = document.getElementById("cookie-modal-title");
    if (title) title.focus();
  }
  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
      if (e.key === "Tab") {
        const f = focusables(modal);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    modalBackdrop.addEventListener("click", function (e) { if (e.target === modalBackdrop) closeModal(); });
  }

  document.addEventListener("click", function (e) {
    const t = e.target.closest("[data-cookie]");
    if (!t) return;
    const action = t.getAttribute("data-cookie");
    if (action === "accept") { applyConsent(saveConsent(true)); hideBanner(); closeModal(); announce("Preferências salvas: estatísticas permitidas."); }
    if (action === "reject") { applyConsent(saveConsent(false)); hideBanner(); closeModal(); announce("Preferências salvas: apenas cookies necessários."); }
    if (action === "customize" || action === "open") { openModal(); }
    if (action === "save") { applyConsent(saveConsent(statsToggle && statsToggle.checked)); hideBanner(); closeModal(); announce("Preferências de cookies salvas."); }
    if (action === "close") { closeModal(); }
  });

  const live = document.getElementById("live-region");
  function announce(msg) { if (live) { live.textContent = ""; setTimeout(function () { live.textContent = msg; }, 50); } }

  const existing = readConsent();
  if (existing) { window.__cpConsent = existing; applyConsent(existing); }
  else { showBanner(); }

  /* ---------- Menu móvel ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && window.matchMedia("(max-width: 860px)").matches) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  /* ---------- Formulário de contato → WhatsApp (nada é gravado pelo site) ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const msg = form.querySelector("#msg");
      const err = document.getElementById("msg-error");
      const status = document.getElementById("form-status");
      if (!msg.value.trim()) {
        msg.setAttribute("aria-invalid", "true");
        err.hidden = false;
        msg.focus();
        return;
      }
      msg.removeAttribute("aria-invalid");
      err.hidden = true;
      const name = form.querySelector("#name").value.trim();
      const topic = form.querySelector("#topic").value;
      let text = "Olá, Central Pet! Vim pelo site.";
      if (name) text += " Meu nome é " + name + ".";
      text += "\nAssunto: " + topic + "\n" + msg.value.trim();
      const url = "https://wa.me/" + SITE_CONFIG.whatsapp + "?text=" + encodeURIComponent(text);
      const link = document.getElementById("wa-result");
      link.href = url;
      link.hidden = false;
      status.textContent = "Sua mensagem está pronta. Toque em “Abrir no WhatsApp” para enviar. Nada foi enviado ainda.";
      link.focus();
    });
  }


  /* ---------- Movimento (Emil Kowalski): entrada do hero uma vez, fotos que "revelam" uma vez ---------- */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector("[data-enter]");
  if (hero) { requestAnimationFrame(function () { hero.classList.add("is-in"); }); }
  const moments = document.querySelectorAll("[data-moment]");
  if (moments.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      moments.forEach(function (m) { m.classList.add("is-in"); });
    } else {
      const mo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); mo.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -15% 0px" });
      moments.forEach(function (m) { mo.observe(m); });
    }
  }

  /* ---------- Barra de atalhos no celular: aparece quando o botão do hero sai da tela ---------- */
  const bar = document.getElementById("actionbar");
  const heroCta = document.getElementById("hero-cta");
  const contato = document.getElementById("contato");
  if (bar && heroCta && "IntersectionObserver" in window) {
    let heroVisible = true, contatoVisible = false;
    const update = function () { bar.classList.toggle("is-shown", !heroVisible && !contatoVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }).observe(heroCta);
    if (contato) new IntersectionObserver(function (e) { contatoVisible = e[0].isIntersecting; update(); }).observe(contato);
  }

  /* ---------- Ano no rodapé ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Aviso para quem administra: dados pendentes ---------- */
  const pend = document.querySelectorAll(".pending");
  if (pend.length && window.console) {
    console.warn("[Central Pet] Existem " + pend.length + " campos marcados como PREENCHER. Complete antes de publicar.");
  }
})();
