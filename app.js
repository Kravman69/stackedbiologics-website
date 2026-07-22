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

// Cart + checkout — order details go straight to info@stackedbiologics.com
(function () {
  var CONTACT = 'info@stackedbiologics.com';
  var KEY = 'sb-cart';
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { cart = []; }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function isUnlocked() { try { return !!localStorage.getItem('sb-unlocked'); } catch (e) { return false; } }
  function count() { return cart.reduce(function (n, i) { return n + i.qty; }, 0); }
  function lineTotal(it) {
    if (it.tiers && it.tiers.length && isUnlocked()) {
      var best = null;
      for (var i = 0; i < it.tiers.length; i++) if (it.qty >= it.tiers[i].q) best = it.tiers[i];
      if (best) return best.t + (it.qty - best.q) * (it.over || it.price);
    }
    return it.price * it.qty;
  }
  function subtotal() { return cart.reduce(function (s, i) { return s + lineTotal(i); }, 0); }
  function parseTiers(str) {
    if (!str) return null;
    var out = str.split(',').map(function (p) { var a = p.split(':'); return { q: parseInt(a[0], 10), t: parseFloat(a[1]) }; })
      .filter(function (x) { return x.q && !isNaN(x.t); }).sort(function (a, b) { return a.q - b.q; });
    return out.length ? out : null;
  }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, ''); }
  function find(id) { for (var i = 0; i < cart.length; i++) if (cart[i].id === id) return cart[i]; return null; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function add(id, name, price, unit, tiers, over) {
    var it = find(id);
    if (it) it.qty++;
    else cart.push({ id: id, name: name, price: price, unit: unit || '', qty: 1, tiers: tiers || null, over: over || 0 });
    save(); showCartView(); render(); openDrawer();
  }
  function setQty(id, q) {
    var it = find(id); if (!it) return;
    it.qty = q;
    if (it.qty <= 0) cart = cart.filter(function (x) { return x.id !== id; });
    save(); render();
  }

  /* ---- chrome ---- */
  var drawer, badge, listEl, emptyEl, subEl, cartView, coView, coForm, sent;

  function buildBtn() {
    var actions = document.querySelector('.nav-actions');
    if (!actions) return;
    var b = document.createElement('button');
    b.className = 'cart-btn';
    b.type = 'button';
    b.setAttribute('aria-label', 'Open cart');
    b.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
      '<span class="cart-count" hidden>0</span>';
    var tog = actions.querySelector('.nav-toggle');
    actions.insertBefore(b, tog || null);
    b.addEventListener('click', openDrawer);
    badge = b.querySelector('.cart-count');
  }

  function buildDrawer() {
    drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.innerHTML =
      '<div class="cart-backdrop" data-cart-close></div>' +
      '<aside class="cart-panel" role="dialog" aria-modal="true" aria-label="Your cart">' +
        '<header class="cart-head">' +
          '<h2 class="cart-title">Your cart</h2>' +
          '<button class="cart-x" type="button" data-cart-close aria-label="Close cart">&times;</button>' +
        '</header>' +
        '<div class="cart-scroll">' +
          '<div class="cart-view">' +
            '<div class="cart-list"></div>' +
            '<p class="cart-empty">Your cart is empty.</p>' +
          '</div>' +
          '<form class="checkout-view" hidden novalidate>' +
            '<p class="co-eyebrow">Shipping details</p>' +
            '<label class="co-field"><span>Full name</span><input name="name" autocomplete="name" required></label>' +
            '<label class="co-field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>' +
            '<label class="co-field"><span>Shipping address</span><textarea name="address" rows="4" autocomplete="street-address" placeholder="Street, city, state, ZIP" required></textarea></label>' +
            '<p class="co-note">All products are for laboratory research use only. By ordering you confirm you are 21+ and a qualified researcher.</p>' +
          '</form>' +
          '<div class="cart-sent" hidden>' +
            '<div class="cart-sent-ic">&#10003;</div>' +
            '<h3>Almost there</h3>' +
            '<p>We\u2019ve opened the live chat and copied your full order \u2014 paste it into the chat and send.</p>' +
            '<p class="cart-sent-fallback">The live chat is in the bottom-right corner. We reply within one business day.</p>' +
          '</div>' +
        '</div>' +
        '<footer class="cart-foot">' +
          '<div class="cart-subtotal"><span>Subtotal</span><b class="cart-sub-amt">$0</b></div>' +
          '<button class="btn btn-primary cart-checkout" type="button">Checkout</button>' +
          '<button class="btn btn-ghost cart-back" type="button" hidden>Back to cart</button>' +
          '<button class="btn btn-primary cart-send" type="button" hidden>Send order via chat</button>' +
          '<p class="cart-foot-note">You confirm stock, total &amp; payment by reply \u2014 within one business day.</p>' +
        '</footer>' +
      '</aside>';
    document.body.appendChild(drawer);
    listEl = drawer.querySelector('.cart-list');
    emptyEl = drawer.querySelector('.cart-empty');
    subEl = drawer.querySelector('.cart-sub-amt');
    cartView = drawer.querySelector('.cart-view');
    coView = drawer.querySelector('.checkout-view');
    coForm = coView;
    sent = drawer.querySelector('.cart-sent');

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-cart-close]')) { closeDrawer(); return; }
      var line = e.target.closest('.cart-line');
      if (line) {
        var id = line.getAttribute('data-id');
        var it = find(id);
        if (e.target.closest('[data-inc]')) { setQty(id, (it ? it.qty : 0) + 1); return; }
        if (e.target.closest('[data-dec]')) { setQty(id, (it ? it.qty : 0) - 1); return; }
        if (e.target.closest('[data-remove]')) { setQty(id, 0); return; }
      }
      if (e.target.closest('.cart-checkout')) { goCheckout(); return; }
      if (e.target.closest('.cart-back')) { showCartView(); return; }
      if (e.target.closest('.cart-send')) { sendOrder(); return; }
    });
  }

  function lineHTML(it) {
    var bundle = it.tiers && it.tiers.length && isUnlocked()
      ? '<span class="cl-bundle">Bundle: ' + it.tiers.map(function (t) { return t.q + ' = ' + money(t.t); }).join(' \u00b7 ') + '</span>'
      : '';
    return '<div class="cart-line" data-id="' + esc(it.id) + '">' +
      '<div class="cl-info"><span class="cl-name">' + esc(it.name) + '</span>' +
      '<span class="cl-unit">' + money(it.price) + (it.unit ? ' \u00b7 ' + esc(it.unit) : '') + '</span>' + bundle + '</div>' +
      '<div class="cl-qty"><button type="button" data-dec aria-label="Decrease quantity">\u2212</button>' +
      '<span>' + it.qty + '</span><button type="button" data-inc aria-label="Increase quantity">+</button></div>' +
      '<span class="cl-total">' + money(lineTotal(it)) + '</span>' +
      '<button class="cl-remove" type="button" data-remove aria-label="Remove ' + esc(it.name) + '">&times;</button>' +
      '</div>';
  }

  function render() {
    var n = count();
    if (badge) { badge.textContent = n; badge.hidden = n === 0; }
    if (!drawer) return;
    listEl.innerHTML = cart.map(lineHTML).join('');
    emptyEl.hidden = cart.length > 0;
    subEl.textContent = money(subtotal());
    var checkoutBtn = drawer.querySelector('.cart-checkout');
    if (checkoutBtn && !coViewOpen() && !sentOpen()) checkoutBtn.disabled = cart.length === 0;
  }

  function coViewOpen() { return coView && !coView.hidden; }
  function sentOpen() { return sent && !sent.hidden; }

  function showCartView() {
    if (!drawer) return;
    cartView.hidden = false; coView.hidden = true; sent.hidden = true;
    drawer.querySelector('.cart-title').textContent = 'Your cart';
    drawer.querySelector('.cart-subtotal').hidden = false;
    drawer.querySelector('.cart-checkout').hidden = false;
    drawer.querySelector('.cart-back').hidden = true;
    drawer.querySelector('.cart-send').hidden = true;
    drawer.querySelector('.cart-foot-note').hidden = false;
    render();
  }

  function goCheckout() {
    if (cart.length === 0) return;
    cartView.hidden = true; coView.hidden = false; sent.hidden = true;
    drawer.querySelector('.cart-title').textContent = 'Checkout';
    drawer.querySelector('.cart-subtotal').hidden = false;
    drawer.querySelector('.cart-checkout').hidden = true;
    drawer.querySelector('.cart-back').hidden = false;
    drawer.querySelector('.cart-send').hidden = false;
    drawer.querySelector('.cart-foot-note').hidden = false;
  }

  function sendOrder() {
    var name = (coForm.querySelector('[name=name]').value || '').trim();
    var email = (coForm.querySelector('[name=email]').value || '').trim();
    var addr = (coForm.querySelector('[name=address]').value || '').trim();
    var bad = false;
    [['name', name], ['email', email], ['address', addr]].forEach(function (f) {
      var el = coForm.querySelector('[name=' + f[0] + ']');
      var ok = f[0] === 'email' ? /.+@.+\..+/.test(f[1]) : !!f[1];
      el.classList.toggle('co-invalid', !ok);
      if (!ok) bad = true;
    });
    if (bad) return;

    var lines = cart.map(function (i) {
      return '  \u2022 ' + i.name + '  \u00d7 ' + i.qty + '   = ' + money(lineTotal(i));
    }).join('\n');
    var rule = '----------------------------------------';
    var body =
      'NEW ORDER \u2014 Stacked Biologics\n' + rule + '\n' + lines + '\n' + rule +
      '\nSubtotal: ' + money(subtotal()) + '\n\n' +
      'CUSTOMER\nName: ' + name + '\nEmail: ' + email + '\nShip to:\n' + addr + '\n\n' +
      'Research use only. Buyer confirms they are 21+ and a qualified researcher.';

    if (window.Tawk_API) {
      try {
        if (typeof window.Tawk_API.setAttributes === 'function') window.Tawk_API.setAttributes({ name: name, email: email }, function () {});
        if (typeof window.Tawk_API.addEvent === 'function') window.Tawk_API.addEvent('order-submitted', {
          items: String(count()), subtotal: money(subtotal()), name: name, email: email,
          summary: cart.map(function (i) { return i.name + ' x' + i.qty; }).join('; '), address: addr
        }, function () {});
      } catch (ex) {}
    }
    var copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(body); copied = true; } } catch (ex) {}
    var chatOpened = false;
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') { try { window.Tawk_API.maximize(); chatOpened = true; } catch (ex) {} }

    cart = []; save();
    cartView.hidden = true; coView.hidden = true; sent.hidden = false;
    var msg = drawer.querySelector('.cart-sent p');
    if (msg) {
      msg.textContent = chatOpened
        ? (copied
            ? 'We\u2019ve opened the live chat and copied your full order to the clipboard \u2014 paste it into the chat and send. We\u2019ll confirm stock, total, and payment right there.'
            : 'We\u2019ve opened the live chat \u2014 send us your order and we\u2019ll confirm stock, total, and payment right there.')
        : 'Message us through the live chat in the bottom-right corner with your order and we\u2019ll confirm stock, total, and payment.';
    }
    drawer.querySelector('.cart-title').textContent = 'Thank you';
    drawer.querySelector('.cart-subtotal').hidden = true;
    drawer.querySelector('.cart-checkout').hidden = true;
    drawer.querySelector('.cart-back').hidden = true;
    drawer.querySelector('.cart-send').hidden = true;
    drawer.querySelector('.cart-foot-note').hidden = true;
    render();
  }

  function openDrawer() {
    if (!drawer) buildDrawer();
    if (!sentOpen()) showCartView();
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { if (!drawer.classList.contains('open')) showCartView(); }, 250);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.order-btn');
    if (!b) return;
    e.preventDefault();
    var name = b.getAttribute('data-product') || 'Research compound';
    var id = b.getAttribute('data-id') || name;
    var priceStr = b.getAttribute('data-price') || '';
    var m = priceStr.match(/[\d.]+/);
    var price = m ? parseFloat(m[0]) : 0;
    add(id, name, price, b.getAttribute('data-unit') || '', parseTiers(b.getAttribute('data-tiers')), parseFloat(b.getAttribute('data-over')) || 0);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  buildBtn();
  render();
  window.addEventListener('sb-unlocked', render);
})();

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

// Email discount gate — unlock multi-buy tiers by submitting an email (stored in tawk.to)
(function () {
  var KEY = 'sb-unlocked';
  function unlocked() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  var modal, input, errEl;

  function build() {
    modal = document.createElement('div');
    modal.className = 'gate-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="gate-backdrop" data-gate-close></div>' +
      '<div class="gate-card" role="dialog" aria-modal="true" aria-labelledby="gate-title">' +
        '<button class="gate-x" type="button" data-gate-close aria-label="Close">&times;</button>' +
        '<p class="gate-eyebrow">Member pricing</p>' +
        '<h2 id="gate-title">Enter your email to receive up to 20% off your order</h2>' +
        '<p class="gate-sub">Unlock multi-buy discounts on every research compound \u2014 up to 20% off when you order more.</p>' +
        '<form class="gate-form" novalidate>' +
          '<input name="email" type="email" placeholder="you@lab.com" autocomplete="email" aria-label="Email address" required>' +
          '<button class="btn btn-primary" type="submit">Unlock my discount</button>' +
        '</form>' +
        '<button class="gate-skip" type="button" data-gate-close>No thanks, show full price</button>' +
        '<p class="gate-note">Research use only. We\u2019ll only email catalog &amp; testing updates \u2014 unsubscribe anytime.</p>' +
      '</div>';
    document.body.appendChild(modal);
    input = modal.querySelector('input[name=email]');
    modal.querySelector('.gate-form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    modal.addEventListener('click', function (e) { if (e.target.closest('[data-gate-close]')) close(); });
  }
  function open() { if (!modal) build(); modal.hidden = false; setTimeout(function () { try { input.focus(); } catch (e) {} }, 60); }
  function close() { if (modal) modal.hidden = true; }

  function submit() {
    var email = (input.value || '').trim();
    if (!/.+@.+\..+/.test(email)) { input.classList.add('co-invalid'); return; }
    if (window.Tawk_API) {
      try {
        if (typeof window.Tawk_API.setAttributes === 'function') window.Tawk_API.setAttributes({ email: email }, function () {});
        if (typeof window.Tawk_API.addTags === 'function') window.Tawk_API.addTags(['discount-unlock'], function () {});
        if (typeof window.Tawk_API.addEvent === 'function') window.Tawk_API.addEvent('discount-unlock', { email: email }, function () {});
      } catch (ex) {}
    }
    try { localStorage.setItem(KEY, email); } catch (e) {}
    document.body.classList.remove('discounts-locked');
    document.querySelectorAll('.unlock-btn').forEach(function (b) {
      var d = document.createElement('p');
      d.className = 'unlock-done';
      d.textContent = '\u2713 Up to 20% off unlocked \u2014 applied in your cart.';
      b.replaceWith(d);
    });
    window.dispatchEvent(new Event('sb-unlocked'));
    close();
  }

  function init() {
    var strip = document.querySelector('.price-tiers');
    if (unlocked()) return;
    document.body.classList.add('discounts-locked');
    if (strip) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'unlock-btn';
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        'Unlock up to 20% off';
      btn.addEventListener('click', open);
      strip.insertAdjacentElement('afterend', btn);
    }
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('discounts-locked') && e.target.closest('.price-tiers .tier')) { open(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    try {
      if (!sessionStorage.getItem('sb-gate-seen')) {
        sessionStorage.setItem('sb-gate-seen', '1');
        setTimeout(open, 60000);
      }
    } catch (e) { setTimeout(open, 60000); }
  }
  init();
})();
