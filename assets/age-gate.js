/* =============================================================================
   Stacked Biologics — Age / RUO acknowledgment gate + brand intro
   -----------------------------------------------------------------------------
   Drop-in, self-contained. Injects its own styles + markup.

   1) Gate: blocks the site behind a full-screen acknowledgment until the visitor
      accepts. Acceptance is remembered in localStorage (once per browser).
   2) Intro: after acceptance — and once per browser SESSION thereafter — plays a
      short muted brand video, then fades to reveal the site. Poster frame,
      tap-to-skip, reduced-motion aware, and a fail-safe so it can never trap
      anyone if the video is slow or fails to load.

   INSTALL:  <script src="assets/age-gate.js" defer></script>  in each page <head>
   ========================================================================== */

(function () {
  "use strict";

  var CONFIG = {
    exitUrl: "https://www.google.com",
    termsUrl: "disclaimer.html",
    storageKey: "sb-ruo-gate",
    version: "2026-07",
    persist: true,
    introSrc: "grok_video_2026-07-10-20-01-11.mp4",
    introPoster: "sb-intro-poster.jpg",
    introKey: "sb-intro-2026-07",
    introMaxMs: 8000
  };

  if (window.__sbGateLoaded) return;
  window.__sbGateLoaded = true;

  var store = CONFIG.persist ? window.localStorage : window.sessionStorage;
  var gateAccepted = false;
  try {
    if (store && store.getItem(CONFIG.storageKey) === CONFIG.version) gateAccepted = true;
  } catch (e) { /* storage blocked — show the gate */ }

  var css = "" +
    ".sb-gate-lock{overflow:hidden!important;}" +
    ".sb-gate-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;" +
      "align-items:center;justify-content:center;padding:24px;" +
      "background:rgba(4,9,17,.86);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);" +
      "font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
      "color:#e8ecf3;-webkit-font-smoothing:antialiased;animation:sbFade .25s ease both;}" +
    ".sb-gate-card{width:100%;max-width:560px;max-height:calc(100vh - 48px);display:flex;" +
      "flex-direction:column;background:#0a1421;border:1px solid rgba(201,162,39,.35);" +
      "border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden;" +
      "animation:sbRise .3s cubic-bezier(.2,.8,.2,1) both;}" +
    ".sb-gate-head{padding:22px 28px 16px;border-bottom:1px solid rgba(201,162,39,.22);}" +
    ".sb-gate-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#c9a227;font-weight:600;margin:0 0 6px;}" +
    ".sb-gate-title{font-size:20px;line-height:1.25;font-weight:700;margin:0;color:#fff;}" +
    ".sb-gate-body{padding:18px 28px 4px;overflow-y:auto;overscroll-behavior:contain;}" +
    ".sb-gate-lede{font-size:14px;line-height:1.55;margin:0 0 10px;color:#cdd5e1;}" +
    ".sb-gate-sub{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#c9a227;font-weight:600;margin:18px 0 8px;}" +
    ".sb-gate-list{list-style:none;margin:0 0 6px;padding:0;}" +
    ".sb-gate-list li{position:relative;padding:0 0 10px 22px;font-size:13.5px;line-height:1.5;color:#c3ccd9;}" +
    ".sb-gate-list li::before{content:'';position:absolute;left:2px;top:8px;width:6px;height:6px;border-radius:50%;background:#c9a227;}" +
    ".sb-gate-list strong{color:#e8ecf3;font-weight:600;}" +
    ".sb-gate a{color:#e0be4e;text-decoration:underline;text-underline-offset:2px;}" +
    ".sb-gate a:hover{color:#f0d574;}" +
    ".sb-gate-fine{font-size:13px;line-height:1.5;color:#aeb7c4;margin:14px 0 4px;}" +
    ".sb-gate-foot{padding:16px 28px 24px;display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid rgba(201,162,39,.22);}" +
    ".sb-gate-btn{flex:1 1 160px;appearance:none;cursor:pointer;font:inherit;font-weight:600;font-size:15px;" +
      "padding:13px 18px;border-radius:9px;border:1px solid transparent;transition:transform .05s ease,filter .15s ease;}" +
    ".sb-gate-btn:active{transform:translateY(1px);}" +
    ".sb-gate-btn:focus-visible{outline:3px solid #7fa8ff;outline-offset:2px;}" +
    ".sb-gate-accept{background:#c9a227;color:#0a1421;}" +
    ".sb-gate-accept:hover{filter:brightness(1.07);}" +
    ".sb-gate-exit{background:transparent;color:#cdd5e1;border-color:rgba(201,162,39,.4);}" +
    ".sb-gate-exit:hover{background:rgba(201,162,39,.08);color:#fff;}" +
    ".sb-intro-overlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;" +
      "justify-content:center;background:#040911;opacity:1;transition:opacity .4s ease;}" +
    ".sb-intro-overlay.sb-intro-out{opacity:0;}" +
    ".sb-intro-video{max-height:86vh;max-width:92vw;width:auto;height:auto;border-radius:14px;}" +
    ".sb-intro-skip{position:fixed;bottom:24px;right:24px;background:rgba(10,20,33,.72);color:#cdd5e1;" +
      "border:1px solid rgba(201,162,39,.4);border-radius:8px;padding:8px 16px;" +
      "font:600 14px/1 'Inter',system-ui,sans-serif;cursor:pointer;}" +
    ".sb-intro-skip:hover{color:#fff;background:rgba(201,162,39,.15);}" +
    "@keyframes sbFade{from{opacity:0}to{opacity:1}}" +
    "@keyframes sbRise{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}" +
    "@media (max-width:420px){.sb-gate-head,.sb-gate-body,.sb-gate-foot{padding-left:20px;padding-right:20px;}.sb-gate-title{font-size:18px;}}" +
    "@media (prefers-reduced-motion:reduce){.sb-gate-overlay,.sb-gate-card{animation:none;}.sb-gate-btn{transition:none;}.sb-intro-overlay{transition:none;}}";

  var styleEl = null;
  function ensureStyle() {
    if (styleEl) return;
    styleEl = document.createElement("style");
    styleEl.id = "sb-gate-style";
    styleEl.appendChild(document.createTextNode(css));
    document.head.appendChild(styleEl);
  }
  function lock() { document.documentElement.classList.add("sb-gate-lock"); document.body.classList.add("sb-gate-lock"); }
  function unlock() { document.documentElement.classList.remove("sb-gate-lock"); document.body.classList.remove("sb-gate-lock"); }

  function showIntro() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (sessionStorage.getItem(CONFIG.introKey)) return;
      sessionStorage.setItem(CONFIG.introKey, "1");
    } catch (e) { return; }

    ensureStyle();
    var overlay = document.createElement("div");
    overlay.className = "sb-intro-overlay";
    overlay.setAttribute("role", "presentation");

    var video = document.createElement("video");
    video.className = "sb-intro-video";
    video.src = CONFIG.introSrc;
    video.poster = CONFIG.introPoster;
    video.muted = true; video.setAttribute("muted", "");
    video.playsInline = true; video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.autoplay = true; video.setAttribute("autoplay", "");
    video.controls = false;

    var skip = document.createElement("button");
    skip.type = "button";
    skip.className = "sb-intro-skip";
    skip.textContent = "Skip";

    overlay.appendChild(video);
    overlay.appendChild(skip);
    document.body.appendChild(overlay);
    lock();

    var done = false;
    function end() {
      if (done) return; done = true;
      overlay.classList.add("sb-intro-out");
      unlock();
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 450);
    }
    video.addEventListener("ended", end);
    video.addEventListener("error", end);
    overlay.addEventListener("click", end);
    skip.addEventListener("click", function (e) { e.stopPropagation(); end(); });

    var started = false;
    video.addEventListener("playing", function () { started = true; });
    setTimeout(function () { if (!started) end(); }, 1500);
    setTimeout(end, CONFIG.introMaxMs);
    var p = video.play();
    if (p && p.catch) p.catch(function () { end(); });
  }

  function mountGate() {
    ensureStyle();
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

    document.body.appendChild(overlay);
    lock();

    var acceptBtn = overlay.querySelector("#sb-gate-accept");
    var exitBtn = overlay.querySelector("#sb-gate-exit");
    var lastFocused = document.activeElement;
    acceptBtn.focus();

    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        var f = overlay.querySelectorAll("a[href],button");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === "Escape") e.preventDefault();
    });

    acceptBtn.addEventListener("click", function () {
      try { store && store.setItem(CONFIG.storageKey, CONFIG.version); } catch (e) {}
      unlock();
      overlay.remove();
      if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
      showIntro();
    });
    exitBtn.addEventListener("click", function () { window.location.href = CONFIG.exitUrl; });
  }

  function boot() {
    if (gateAccepted) { showIntro(); return; }
    mountGate();
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
