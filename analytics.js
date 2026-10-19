/* Platino Cube: cookie banner + Google Analytics 4.
 *
 * Nothing is sent to Google until the visitor presses Accept.
 * Usage on every page, just before </body>:
 *   <script src="/Platinocube-test/analytics.js" data-ga-id="G-XXXXXXXXXX" defer></script>
 *
 * Events (only after consent):
 *   click_whatsapp  any link to wa.me or api.whatsapp.com
 *   click_call      any tel: link
 *   click_email     any mailto: link
 *   generate_lead   the quote form (id="quote-form") was sent successfully
 * Footer link <a href="#" data-cookie-settings> reopens the banner.
 */
(function () {
  'use strict';

  var script = document.currentScript || document.querySelector('script[data-ga-id]');
  var GA_ID = script && script.getAttribute('data-ga-id');
  var KEY = 'pc_consent';
  var lang = (document.documentElement.lang || 'en').slice(0, 2) === 'ar' ? 'ar' : 'en';

  var TEXT = {
    en: { msg: 'We use cookies to understand how the site is used.', more: 'Privacy Policy', href: '/Platinocube-test/privacy/', accept: 'Accept', decline: 'Decline', label: 'Cookie notice' },
    ar: { msg: 'نستخدم ملفات تعريف الارتباط لفهم كيفية استخدام الموقع.', more: 'سياسة الخصوصية', href: '/Platinocube-test/ar/privacy/', accept: 'موافق', decline: 'رفض', label: 'إشعار ملفات تعريف الارتباط' }
  }[lang];

  // Consent Mode v2: everything denied by default.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted'
  });

  function getChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function loadGA() {
    if (loaded || !GA_ID) return;
    loaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function track(name, params) {
    if (getChoice() !== 'granted' || !loaded) return;
    gtag('event', name, params || {});
  }
  window.pcTrack = track;

  var banner = null;
  function closeBanner() { if (banner) { banner.remove(); banner = null; } }
  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'pc-cookie';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', TEXT.label);
    banner.innerHTML = '<p>' + TEXT.msg + ' <a href="' + TEXT.href + '">' + TEXT.more + '</a></p>' +
      '<div class="pc-cookie-btns"><button type="button" data-accept>' + TEXT.accept + '</button>' +
      '<button type="button" data-decline>' + TEXT.decline + '</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('[data-accept]').addEventListener('click', function () {
      setChoice('granted'); closeBanner(); loadGA();
    });
    banner.querySelector('[data-decline]').addEventListener('click', function () {
      setChoice('denied'); closeBanner();
      if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    });
  }

  function init() {
    var choice = getChoice();
    if (choice === 'granted') loadGA();
    else if (choice !== 'denied') showBanner();

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a, [data-cookie-settings]');
      if (!a) return;
      if (a.hasAttribute('data-cookie-settings')) { e.preventDefault(); showBanner(); return; }
      var href = a.getAttribute('href') || '';
      var page = location.pathname;
      if (/wa\.me|api\.whatsapp\.com/i.test(href)) track('click_whatsapp', { link_url: href, page_path: page });
      else if (/^tel:/i.test(href)) track('click_call', { link_url: href, page_path: page });
      else if (/^mailto:/i.test(href)) track('click_email', { link_url: href, page_path: page });
    }, true);

    window.addEventListener('pc:lead', function (e) {
      track('generate_lead', { form_id: (e.detail && e.detail.form_id) || 'quote-form', page_path: location.pathname });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
