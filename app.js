/* Stacked Biologics — site chrome (mobile nav only; no external deps) */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var mobile = document.querySelector('.mobile-nav');
  if (!toggle) return;

  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('nav-open'));
  });

  if (mobile) {
    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// Quote buttons: prefer live chat, fall back to email
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="mailto:info@stackedbiologics.com?subject=Quote"]');
  if (!a) return;
  if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
    e.preventDefault();
    window.Tawk_API.maximize();
  }
});

// Signup band -> tawk.to Contacts
(function () {
  var form = document.getElementById('signup-form');
  if (!form) return;
  var note = document.getElementById('signup-note');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (form.querySelector('input[name="email"]').value || '').trim();
    if (!email) return;
    function ok() {
      form.style.display = 'none';
      if (note) {
        note.textContent = "You're on the list — thanks for subscribing.";
        note.style.color = '#e0c45a';
        note.style.fontSize = '0.95rem';
      }
    }
    function fallback() {
      window.location.href = 'mailto:info@stackedbiologics.com?subject=Subscribe%20me&body=' + encodeURIComponent(email);
    }
    if (window.Tawk_API && typeof window.Tawk_API.setAttributes === 'function') {
      try {
        window.Tawk_API.setAttributes({ email: email }, function (err) { err ? fallback() : ok(); });
        if (typeof window.Tawk_API.addTags === 'function') window.Tawk_API.addTags(['newsletter-signup'], function () {});
        if (typeof window.Tawk_API.addEvent === 'function') window.Tawk_API.addEvent('newsletter-signup', { email: email }, function () {});
      } catch (ex) { fallback(); }
    } else {
      fallback();
    }
  });
})();
