/* =============================================================================
   Stacked Biologics — Age / RUO acknowledgment gate
   -----------------------------------------------------------------------------
   Drop-in, self-contained. Injects its own styles + markup, blocks the site
   behind a full-screen modal until the visitor accepts, and remembers the
   choice in localStorage so it only appears once per browser.

   INSTALL
     Save this file as:  assets/age-gate.js
     Add ONE line to the <head> of every page you want gated (index.html,
     the compound pages, etc.), as early as possible so it shows before paint:

       <script src="assets/age-gate.js" defer></script>

     (Root pages use "assets/age-gate.js". If you ever nest a page in a
     subfolder, adjust the path accordingly.)

   CONFIGURE
     Edit the CONFIG block below — where "Exit" sends people, the terms link,
     and whether acceptance persists or resets each session.
   ========================================================================== */

(function () {
  "use strict";

  var CONFIG = {
    // Where the "Exit" button sends someone who does NOT accept.
    exitUrl: "https://www.google.com",

    // Link target for "Terms of Service and Privacy Policy".
    // Your site currently consolidates legal text on disclaimer.html — point
    // this at dedicated pages instead if/when you add them.
    termsUrl: "disclaimer.html",

    // Storage key + version. Bump the version to force everyone to re-accept
    // (e.g. after you change the terms). Set persist:false to ask every visit.
    storageKey: "sb-ruo-gate",
    version: "2026-07",
    persist: true
  };

  // --- Don't re-run, and skip if already accepted this version ---------------
  if (window.__sbGateLoaded) return;
  window.__sbGateLoaded = true;

  var store = CONFIG.persist ? window.localStorage : window.sessionStorage;
  try {
    if (store && store.getItem(CONFIG.storageKey) === CONFIG.version) return;
  } catch (e) {
    /* storage blocked (private mode / cookies off) — show the gate anyway */
  }

  // --- Styles (scoped under .sb-gate*) ---------------------------------------
  var css = "" +
    ".sb-gate-lock{overflow:hidden!important;}" +
    ".sb-gate-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;" +
      "align-items:center;justify-content:center;padding:24px;" +
      "background:rgba(4,9,17,.86);backdrop-filter:blur(3px);" +
      "-webkit-backdrop-filter:blur(3px);" +
      "font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
      "color:#e8ecf3;-webkit-font-smoothing:antialiased;" +
      "animation:sbFade .25s ease both;}" +
    ".sb-gate-card{width:100%;max-width:560px;max-height:calc(100vh - 48px);" +
      "display:flex;flex-direction:column;background:#0a1421;" +
      "border:1px solid rgba(201,162,39,.35);border-radius:14px;" +
      "box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden;" +
      "animation:sbRise .3s cubic-bezier(.2,.8,.2,1) both;}" +
    ".sb-gate-head{padding:22px 28px 16px;border-bottom:1px solid rgba(201,162,39,.22);}" +
    ".sb-gate-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;" +
      "color:#c9a227;font-weight:600;margin:0 0 6px;}" +
    ".sb-gate-title{font-size:20px;line-height:1.25;font-weight:700;margin:0;color:#fff;}" +
    ".sb-gate-body{padding:18px 28px 4px;overflow-y:auto;overscroll-behavior:contain;}" +
    ".sb-gate-lede{font-size:14px;line-height:1.55;margin:0 0 10px;color:#cdd5e1;}" +
    ".sb-gate-sub{font-size:12px;letter-spacing:.06em;text-transform:uppercase;" +
      "color:#c9a227;font-weight:600;margin:18px 0 8px;}" +
    ".sb-gate-list{list-style:none;margin:0 0 6px;padding:0;}" +
    ".sb-gate-list li{position:relative;padding:0 0 10px 22px;font-size:13.5px;" +
      "line-height:1.5;color:#c3ccd9;}" +
    ".sb-gate-list li::before{content:'';position:absolute;left:2px;top:8px;" +
      "width:6px;height:6px;border-radius:50%;background:#c9a227;}" +
    ".sb-gate-list strong{color:#e8ecf3;font-weight:600;}" +
    ".sb-gate a{color:#e0be4e;text-decoration:underline;text-underline-offset:2px;}" +
    ".sb-gate a:hover{color:#f0d574;}" +
    ".sb-gate-fine{font-size:13px;line-height:1.5;color:#aeb7c4;margin:14px 0 4px;}" +
    ".sb-gate-foot{padding:16px 28px 24px;display:flex;gap:12px;flex-wrap:wrap;" +
      "border-top:1px solid rgba(201,162,39,.22);}" +
    ".sb-gate-btn{flex:1 1 160px;appearance:none;cursor:pointer;font:inherit;" +
      "font-weight:600;font-size:15px;padding:13px 18px;border-radius:9px;" +
      "border:1px solid transparent;transition:transform .05s ease,filter .15s ease;}" +
    ".sb-gate-btn:active{transform:translateY(1px);}" +
    ".sb-gate-btn:focus-visible{outline:3px solid #7fa8ff;outline-offset:2px;}" +
    ".sb-gate-accept{background:#c9a227;color:#0a1421;}" +
    ".sb-gate-accept:hover{filter:brightness(1.07);}" +
    ".sb-gate-exit{background:transparent;color:#cdd5e1;border-color:rgba(201,162,39,.4);}" +
    ".sb-gate-exit:hover{background:rgba(201,162,39,.08);color:#fff;}" +
    "@keyframes sbFade{from{opacity:0}to{opacity:1}}" +
    "@keyframes sbRise{from{opacity:0;transform:translateY(14px) scale(.98)}" +
      "to{opacity:1;transform:none}}" +
    "@media (max-width:420px){.sb-gate-head,.sb-gate-body,.sb-gate-foot" +
      "{padding-left:20px;padding-right:20px;}.sb-gate-title{font-size:18px;}}" +
    "@media (prefers-reduced-motion:reduce){.sb-gate-overlay,.sb-gate-card" +
      "{animation:none;}.sb-gate-btn{transition:none;}}";

  var style = document.createElement("style");
  style.id = "sb-gate-style";
  style.appendChild(document.createTextNode(css));

  // --- Markup ----------------------------------------------------------------
  var overlay = document.createElement("div");
  overlay.className = "sb-gate sb-gate-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sb-gate-title");
  overlay.setAttribute("aria-describedby", "sb-gate-lede");

  overlay.innerHTML =
    '<div class="sb-gate-card" tabindex="-1">' +
      '<div class="sb-gate-head">' +
        '<p class="sb-gate-eyebrow">Research Use Only</p>' +
        '<h2 class="sb-gate-title" id="sb-gate-title">Confirm before entering</h2>' +
      '</div>' +
      '<div class="sb-gate-body">' +
        '<p class="sb-gate-lede" id="sb-gate-lede">By clicking &ldquo;I Accept&rdquo; or continuing to use this website, you confirm that:</p>' +
        '<ul class="sb-gate-list">' +
          '<li>You are at least <strong>21 years of age</strong>.</li>' +
          '<li>You understand that all products sold on Stacked Biologics are strictly for <strong>research and laboratory use only</strong>.</li>' +
          '<li>These products are <strong>not</strong> intended for human consumption, therapeutic use, medical treatment, or any other non-research purpose.</li>' +
          '<li>You have read, understood, and agree to our full <a href="' + CONFIG.termsUrl + '">Terms of Service and Privacy Policy</a>.</li>' +
        '</ul>' +
        '<p class="sb-gate-sub">Important Warnings</p>' +
        '<ul class="sb-gate-list">' +
          '<li>No statements on this website are intended to diagnose, treat, cure, or prevent any disease.</li>' +
          '<li>Stacked Biologics makes no claims regarding the safety or efficacy of any product for human use.</li>' +
          '<li>Any use outside of controlled laboratory research is at the sole risk and responsibility of the user.</li>' +
          '<li>Always comply with all applicable local, state, and federal laws and regulations.</li>' +
        '</ul>' +
        '<p class="sb-gate-fine">By proceeding, you acknowledge that you have read and agree to these terms.</p>' +
      '</div>' +
      '<div class="sb-gate-foot">' +
        '<button type="button" class="sb-gate-btn sb-gate-accept" id="sb-gate-accept">I Accept</button>' +
        '<button type="button" class="sb-gate-btn sb-gate-exit" id="sb-gate-exit">Exit</button>' +
      '</div>' +
    '</div>';

  // --- Mount -----------------------------------------------------------------
  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("sb-gate-lock");
    document.body.classList.add("sb-gate-lock");

    var card = overlay.querySelector(".sb-gate-card");
    var acceptBtn = overlay.querySelector("#sb-gate-accept");
    var exitBtn = overlay.querySelector("#sb-gate-exit");

    acceptBtn.addEventListener("click", accept);
    exitBtn.addEventListener("click", exit);

    // Focus management + trap so keyboard/screen-reader users stay in the dialog.
    var lastFocused = document.activeElement;
    acceptBtn.focus();

    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        var focusables = overlay.querySelectorAll("a[href],button");
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
      // ESC is intentionally NOT a dismiss — a choice is required.
      if (e.key === "Escape") e.preventDefault();
    });

    function accept() {
      try { store && store.setItem(CONFIG.storageKey, CONFIG.version); } catch (e) {}
      document.documentElement.classList.remove("sb-gate-lock");
      document.body.classList.remove("sb-gate-lock");
      overlay.remove();
      style.remove();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function exit() {
      window.location.href = CONFIG.exitUrl;
    }
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
