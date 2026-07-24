/* Stacked Biologics — analytics & consent (privacy-first, consent-gated).
   HOW TO ACTIVATE: paste your IDs below and redeploy. Until a real ID is set,
   NOTHING loads and NO banner shows — zero change to the live site. */
(function(){
  var GA4_ID = 'G-G857VWGW80';      // <-- paste GA4 id here, e.g. 'G-XXXXXXXXXX'
  var CLARITY_ID = 'xrj4vtx0eo';  // <-- paste Microsoft Clarity id here, e.g. 'abcd1234ef'
  var CONSENT_KEY = 'sb-analytics-consent';
  var configured = (GA4_ID && GA4_ID.indexOf('G-')===0) || (CLARITY_ID && CLARITY_ID.length>3);
  if(!configured) return;
  var dnt = navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.msDoNotTrack==='1';
  var stored=null; try{stored=localStorage.getItem(CONSENT_KEY);}catch(e){}
  function loadGA(){ if(!GA4_ID) return; var s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+GA4_ID; document.head.appendChild(s); window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments);}; gtag('js',new Date()); gtag('config',GA4_ID,{anonymize_ip:true}); }
  function loadClarity(){ if(!CLARITY_ID) return; (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script',CLARITY_ID); }
  function wire(){ document.addEventListener('click',function(e){ if(!window.gtag) return; var o=e.target.closest&&e.target.closest('.order-btn'); if(o){gtag('event','add_to_cart',{item_name:o.getAttribute('data-product')||''});} var p=e.target.closest&&e.target.closest('.venmo-link,.pay-cta'); if(p){gtag('event','select_payment',{method:'venmo'});} var c=e.target.closest&&e.target.closest('.cart-checkout'); if(c){gtag('event','begin_checkout');} }); }
  function enable(){ loadGA(); loadClarity(); wire(); }
  if(dnt) return;
  if(stored==='granted'){ enable(); return; }
  if(stored==='denied'){ return; }
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.createElement('div'); b.className='consent-banner'; b.setAttribute('role','dialog'); b.setAttribute('aria-label','Cookie consent');
    b.innerHTML='<p>We use privacy-first analytics to improve the site. We never sell your data. See our <a href="cookie-policy.html">Cookie Policy</a>.</p><div class="consent-actions"><button type="button" class="btn btn-ghost btn-sm consent-decline">Decline</button><button type="button" class="btn btn-primary btn-sm consent-accept">Accept</button></div>';
    document.body.appendChild(b); requestAnimationFrame(function(){b.classList.add('show');});
    b.querySelector('.consent-accept').addEventListener('click',function(){try{localStorage.setItem(CONSENT_KEY,'granted');}catch(e){} b.remove(); enable();});
    b.querySelector('.consent-decline').addEventListener('click',function(){try{localStorage.setItem(CONSENT_KEY,'denied');}catch(e){} b.remove();});
  });
})();