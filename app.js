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

  function add(id, name, price, unit, tiers, over, qty) {
    var it = find(id);
    if (it) it.qty += (qty || 1);
    else cart.push({ id: id, name: name, price: price, unit: unit || '', qty: qty || 1, tiers: tiers || null, over: over || 0 });
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
            '<label class="co-field"><span>Full name *</span><input name="name" autocomplete="name" required></label>' +
            '<label class="co-field"><span>Email *</span><input name="email" type="email" autocomplete="email" required></label>' +
            '<label class="co-field"><span>Phone (optional)</span><input name="phone" type="tel" autocomplete="tel" placeholder="For delivery questions only"></label>' +
            '<label class="co-field"><span>Street address *</span><input name="street" autocomplete="address-line1" placeholder="123 Main St, Apt 4" required></label>' +
            '<div class="co-row">' +
              '<label class="co-field"><span>City *</span><input name="city" autocomplete="address-level2" required></label>' +
              '<label class="co-field co-state"><span>State *</span><input name="state" autocomplete="address-level1" maxlength="2" placeholder="TX" required></label>' +
              '<label class="co-field co-zip"><span>ZIP *</span><input name="zip" autocomplete="postal-code" inputmode="numeric" maxlength="10" required></label>' +
            '</div>' +
            '<p class="co-note">All products are for laboratory research use only. By ordering you confirm you are 21+ and a qualified researcher.</p>' +
          '</form>' +
          '<div class="cart-sent" hidden>' +
            '<div class="cart-sent-ic">&#10003;</div>' +
            '<h3>Sending\u2026</h3>' +
            '<p>Sending your order\u2026</p>' +
            '<p class="cart-sent-fallback">We reply within one business day with your total and payment instructions.</p>' +
          '</div>' +
        '</div>' +
        '<footer class="cart-foot">' +
          '<div class="cart-subtotal"><span>Subtotal</span><b class="cart-sub-amt">$0</b></div>' +
          '<button class="btn btn-primary cart-checkout" type="button">Checkout</button>' +
          '<button class="btn btn-ghost cart-back" type="button" hidden>Back to cart</button>' +
          '<button class="btn btn-primary cart-send" type="button" hidden>Send order</button>' +
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
    var phone = (coForm.querySelector('[name=phone]').value || '').trim();
    var street = (coForm.querySelector('[name=street]').value || '').trim();
    var city = (coForm.querySelector('[name=city]').value || '').trim();
    var state = (coForm.querySelector('[name=state]').value || '').trim();
    var zip = (coForm.querySelector('[name=zip]').value || '').trim();
    var bad = false;
    var checks = {
      name: !!name,
      email: /.+@.+\..+/.test(email),
      street: !!street,
      city: !!city,
      state: /^[A-Za-z]{2}$/.test(state),
      zip: /^\d{5}(-\d{4})?$/.test(zip)
    };
    Object.keys(checks).forEach(function (k) {
      var el = coForm.querySelector('[name=' + k + ']');
      el.classList.toggle('co-invalid', !checks[k]);
      if (!checks[k]) bad = true;
    });
    if (bad) return;
    var addr = street + ', ' + city + ', ' + state.toUpperCase() + ' ' + zip + (phone ? '\nPhone: ' + phone : '');
    var geoAddr = street + ', ' + city + ', ' + state.toUpperCase() + ' ' + zip;
    var addrEl = coForm.querySelector('[name=zip]');
    var noteEl = coForm.querySelector('.co-addr-note');
    if (!noteEl) { noteEl = document.createElement('p'); noteEl.className = 'co-addr-note'; coForm.querySelector('.co-row').insertAdjacentElement('afterend', noteEl); }
    if (window.__sbAddrPass !== geoAddr) {
      noteEl.className = 'co-addr-note'; noteEl.textContent = 'Checking address\u2026';
      var sendBtn = drawer.querySelector('.cart-send'); if (sendBtn) sendBtn.disabled = true;
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(geoAddr))
        .then(function (r) { return r.json(); })
        .then(function (results) {
          if (sendBtn) sendBtn.disabled = false;
          if (results && results.length) {
            window.__sbAddrPass = geoAddr;
            noteEl.className = 'co-addr-note ok';
            noteEl.textContent = '\u2713 Address found: ' + results[0].display_name.slice(0, 90);
            reallySend(name, email, addr);
          } else {
            noteEl.className = 'co-addr-note warn';
            noteEl.textContent = 'Address not verified.';
            showAddrPopup(geoAddr, function () { reallySend(name, email, addr); });
          }
        })
        .catch(function () {
          if (sendBtn) sendBtn.disabled = false;
          window.__sbAddrPass = geoAddr;
          reallySend(name, email, addr);
        });
      return;
    }
    reallySend(name, email, addr);
  }

  function showAddrPopup(addrText, onUseAnyway) {
    var pop = document.createElement('div');
    pop.className = 'addr-pop';
    pop.innerHTML =
      '<div class="addr-pop-card" role="alertdialog" aria-labelledby="addr-pop-title">' +
        '<h3 id="addr-pop-title">We couldn\u2019t verify this address</h3>' +
        '<p class="addr-pop-addr">' + esc(addrText) + '</p>' +
        '<p class="addr-pop-sub">It may still be correct \u2014 but a typo here means your package can\u2019t be delivered. Please double-check the street, city, state, and ZIP.</p>' +
        '<div class="addr-pop-btns">' +
          '<button type="button" class="btn btn-primary addr-pop-edit">Let me fix it</button>' +
          '<button type="button" class="btn btn-ghost addr-pop-use">It\u2019s correct \u2014 use as written</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(pop);
    pop.querySelector('.addr-pop-edit').addEventListener('click', function () { pop.remove(); });
    pop.querySelector('.addr-pop-use').addEventListener('click', function () { pop.remove(); onUseAnyway(); });
    pop.addEventListener('click', function (e) { if (e.target === pop) pop.remove(); });
  }

  function reallySend(name, email, addr) {
    var orderNo = 'SB-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 36).toString(36).toUpperCase();
    var total = money(subtotal());

    var lines = cart.map(function (i) {
      return '  \u2022 ' + i.name + '  \u00d7 ' + i.qty + '   = ' + money(lineTotal(i));
    }).join('\n');
    var rule = '----------------------------------------';
    var body =
      'NEW ORDER ' + orderNo + ' \u2014 Stacked Biologics\n' + rule + '\n' + lines + '\n' + rule +
      '\nSubtotal: ' + money(subtotal()) + '\n\n' +
      'CUSTOMER\nName: ' + name + '\nEmail: ' + email + '\nShip to:\n' + addr + '\n\n' +
      'PAYMENT: Venmo @ProjectStacked \u2014 notes must include: ' + name + ' / ' + orderNo + '\n\n' +
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
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(body).then(function(){ copied = true; }).catch(function(){}); } } catch (ex) {}
    var subject = 'New order ' + orderNo + ' \u2014 ' + name + ' (' + count() + ' item' + (count() === 1 ? '' : 's') + ', ' + money(subtotal()) + ')';

    // Order to info@ via Web3Forms (reliable); receipt to customer via FormSubmit autoresponse (best-effort).
    var sentOk = false;
    var payload = {
      access_key: 'faaef774-7050-4340-a58c-805562ce6867',
      subject: subject,
      from_name: 'Stacked Biologics Orders',
      name: name,
      email: email,
      order_number: orderNo,
      shipping_address: addr,
      message: body
    };
    try {
      fetch('https://formsubmit.co/ajax/cf1eadf38a23f20c76285c47d72a1ce1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ _subject: subject + ' (receipt copy)', _captcha: 'false',
          _autoresponse: 'Thanks for your order with Stacked Biologics!\n\nYOUR ORDER NUMBER: ' + orderNo + '\n\nTO PAY: Venmo @ProjectStacked \u2014 put your name (' + name + ') and order number (' + orderNo + ') in the Venmo payment notes.\nPay here: https://www.paypal.com/qrcodes/venmocs/f33c0f30-84b1-42a4-8f05-6f88e7670e8b\n\nWe confirm payment and ship within 1 business day (2-day tracked delivery).\n\n' + body,
          _replyto: email, email: email, order: body })
      });
    } catch (ex) {}
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (d) {
      sentOk = d && d.success === true;
      showSentMsg(sentOk);
    }).catch(function () { showSentMsg(false); });

    function showSentMsg(ok) {
      var msg = drawer.querySelector('.cart-sent p');
      var h = drawer.querySelector('.cart-sent h3');
      if (h) h.textContent = ok ? 'Order received — now submit payment' : 'Almost there';
      if (!msg) return;
      if (ok) {
        msg.innerHTML = 'A receipt has been emailed to <b>' + esc(email) + '</b>.';
        var pay = document.createElement('div');
        pay.className = 'venmo-pay';
        pay.innerHTML =
          '<div class="pay-banner">\u26A0 Your order ships after payment \u2014 pay now</div>' +
          '<p class="venmo-amt">Amount due<br><b>' + total + '</b></p>' +
          '<p class="venmo-order">Order <b>' + orderNo + '</b></p>' +
          '<a class="btn btn-primary pay-cta" href="https://www.paypal.com/qrcodes/venmocs/f33c0f30-84b1-42a4-8f05-6f88e7670e8b" target="_blank" rel="noopener">Pay ' + total + ' with Venmo \u2192 @ProjectStacked</a>' +
          '<p class="venmo-hint">or scan the code:</p>' +
          '<a href="https://www.paypal.com/qrcodes/venmocs/f33c0f30-84b1-42a4-8f05-6f88e7670e8b" target="_blank" rel="noopener"><img src="venmo-qr.png" alt="Venmo QR code for @ProjectStacked" class="venmo-qr"></a>' +
          '<a class="venmo-link" href="https://venmo.com/u/ProjectStacked" target="_blank" rel="noopener">Open @ProjectStacked in the Venmo app \u2192</a>' +
          '<div class="pay-note-box"><b>In the Venmo notes, send this exactly as written:</b><br>' + esc(name) + ' \u2014 ' + orderNo + '<br><span>This is how we match your payment to your order.</span></div>' +
          '<p class="venmo-hint">Prefer <b>Zelle</b> or <b>Cash App</b>? Message us in the live chat or reply to your receipt email and we\u2019ll send the details.</p>';
        msg.insertAdjacentElement('afterend', pay);
      } else {
        var subj = encodeURIComponent(subject), bd = encodeURIComponent(body);
        msg.textContent = 'We couldn\u2019t reach the order service \u2014 your email app should open with the full order instead; just hit send.' + (copied ? ' (It\u2019s also copied to your clipboard.)' : '');
        window.location.href = 'mailto:info@stackedbiologics.com?subject=' + subj + '&body=' + bd;
      }
    }

    cart = []; save();
    cartView.hidden = true; coView.hidden = true; sent.hidden = false;
    var msg = drawer.querySelector('.cart-sent p');
    if (msg) msg.textContent = 'Sending your order\u2026';
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
    setTimeout(function () { if (!drawer.classList.contains('open')) { var vp = drawer.querySelector('.venmo-pay'); if (vp) vp.remove(); showCartView(); } }, 250);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.price-tiers .tier');
    if (t) {
      var src = document.querySelector('.order-btn');
      if (src) {
        e.preventDefault();
        var tname = src.getAttribute('data-product') || 'Research compound';
        var tid = src.getAttribute('data-id') || tname;
        var tm = (src.getAttribute('data-price') || '').match(/[\d.]+/);
        var siblings = Array.prototype.slice.call(t.parentNode.querySelectorAll('.tier'));
        var qty = siblings.indexOf(t) + 1;
        var cur = find(tid);
        var target = qty;
        add(tid, tname, tm ? parseFloat(tm[0]) : 0, src.getAttribute('data-unit') || '', parseTiers(src.getAttribute('data-tiers')), parseFloat(src.getAttribute('data-over')) || 0, cur ? Math.max(1, target - cur.qty) : target);
        return;
      }
    }
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

  // Address autosuggest on the street field (Nominatim, debounced)
  var US_ST = {'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY','district of columbia':'DC'};
  var sugTimer, sugBox;
  document.addEventListener('input', function (e) {
    var st = e.target;
    if (!st.name || st.name !== 'street' || !st.closest('.checkout-view')) return;
    clearTimeout(sugTimer);
    var q = st.value.trim();
    if (q.length < 5) { if (sugBox) sugBox.hidden = true; return; }
    sugTimer = setTimeout(function () {
      fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=4&countrycodes=us&q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (results) {
          if (!sugBox) {
            sugBox = document.createElement('div');
            sugBox.className = 'addr-suggest';
            st.parentNode.style.position = 'relative';
            st.parentNode.appendChild(sugBox);
          }
          if (!results || !results.length) { sugBox.hidden = true; return; }
          sugBox.innerHTML = '';
          results.forEach(function (res) {
            var a = res.address || {};
            var road = ((a.house_number ? a.house_number + ' ' : '') + (a.road || '')).trim();
            if (!road) return;
            var cityV = a.city || a.town || a.village || a.hamlet || '';
            var stAbbr = US_ST[String(a.state || '').toLowerCase()] || '';
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'addr-suggest-item';
            item.textContent = res.display_name.length > 72 ? res.display_name.slice(0, 72) + '\u2026' : res.display_name;
            item.addEventListener('click', function () {
              var form = st.closest('.checkout-view');
              st.value = road;
              if (cityV) form.querySelector('[name=city]').value = cityV;
              if (stAbbr) form.querySelector('[name=state]').value = stAbbr;
              if (a.postcode) form.querySelector('[name=zip]').value = a.postcode.slice(0, 10);
              sugBox.hidden = true;
            });
            sugBox.appendChild(item);
          });
          sugBox.hidden = sugBox.children.length === 0;
        }).catch(function () { if (sugBox) sugBox.hidden = true; });
    }, 450);
  });
  document.addEventListener('click', function (e) {
    if (sugBox && !e.target.closest('.addr-suggest') && !(e.target.name === 'street')) sugBox.hidden = true;
  });

  buildBtn();
  render();
  window.addEventListener('sb-unlocked', render);
})();

// Live stock from Google Sheet (read-only; fails silent -> site shows baked-in state)
(function () {
  var SHEET = 'https://docs.google.com/spreadsheets/d/1x-R4Hz-FSXOfbepuhZ862iFHHJFiEJs6RziRlnw4-BM/gviz/tq?tqx=out:csv';
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  fetch(SHEET).then(function (r) { return r.text(); }).then(function (csv) {
    var rows = csv.trim().split('\n').map(function (line) {
      var f = []; var m; var re = /"([^"]*)"/g;
      while ((m = re.exec(line))) f.push(m[1].trim());
      return f;
    });
    var head = rows.shift().map(norm);
    var iId = head.indexOf('id'), iStock = head.indexOf('instock'), iQty = head.indexOf('quantity');
    if (iId < 0 || iStock < 0) return;
    var stock = {};
    rows.forEach(function (r) {
      if (!r[iId]) return;
      stock[norm(r[iId])] = { ok: norm(r[iStock]) === 'yes', qty: iQty >= 0 ? parseInt(r[iQty], 10) : NaN };
    });
    function lookup(id) { return stock[norm(id)]; }

    document.querySelectorAll('.order-btn').forEach(function (b) {
      var s = lookup(b.getAttribute('data-id') || b.getAttribute('data-product'));
      if (!s) return;
      if (!s.ok || s.qty === 0) {
        b.disabled = true; b.classList.add('oos-btn'); b.textContent = 'Out of stock';
      } else if (s.qty > 0 && s.qty <= 5 && !document.querySelector('.low-stock-note')) {
        var n = document.createElement('p');
        n.className = 'low-stock-note';
        n.textContent = 'Low stock \u2014 only ' + s.qty + ' left';
        var strip = document.querySelector('.price-tiers');
        if (strip) strip.insertAdjacentElement('beforebegin', n);
      }
    });

    document.querySelectorAll('a.product-card[href]').forEach(function (card) {
      var s = lookup((card.getAttribute('href') || '').replace('.html', ''));
      if (!s) return;
      if (!s.ok || s.qty === 0) {
        card.classList.add('is-soon');
        var more = card.querySelector('.pc-more'); if (more) { more.classList.add('muted'); more.textContent = 'Out of stock'; }
        var top = card.querySelector('.pc-top > div');
        if (top && !top.querySelector('.tag.soon')) {
          var t = document.createElement('span'); t.className = 'tag soon'; t.textContent = 'Out of stock';
          top.appendChild(t);
        }
      }
    });
  }).catch(function () {});
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
    try {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ access_key: 'faaef774-7050-4340-a58c-805562ce6867', subject: 'Discount signup \u2014 ' + email, from_name: 'Stacked Biologics Site', signup_email: email, message: 'Discount signup: ' + email + ' (page: ' + location.pathname + ')' })
      });
    } catch (ex) {}
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
