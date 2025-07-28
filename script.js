// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Loader (v7)
// @namespace    https://github.com/HsinChang
// @version      7.0
// @description  Patches Taleo MIME issues under a strict CSP – no external <script> tags needed.
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @inject-into  page
// @grant        GM_xmlhttpRequest
// @connect      wipo.taleo.net
// @connect      cdnjs.cloudflare.com
// ==/UserScript==

(() => {
  'use strict';

  /* 0 · Strict temporary CSP to block *all* remote scripts        */
  const csp = document.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = "script-src 'self' blob: 'unsafe-inline'";
  document.head.appendChild(csp);

  const taleoJs = /\/careersection\/[^/]+\/js\/.+\.js(\?.*)?$/i;
  const requirePath = /\/js\/common\/require\.js(\?.*)?$/i;
  const toId = url => url.replace(location.origin + '/', '').replace(/\.js(\?.*)?$/, '');

  /* 1 · Utility – empty stub for RequireJS                        */
  function stub(id) {
    if (window.define && window.define.amd && !window.requirejs.defined?.(id)) {
      window.define(id, [], () => ({}));
    }
  }

  /* 2 · Download RequireJS (cdnjs) via GM_xmlhttpRequest → Blob   */
  async function loadCleanRequire(originalUrl) {
    if (window._cleanRequireLoaded) { stub(toId(originalUrl)); return; }
    window._cleanRequireLoaded = true;

    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js',
      responseType: 'text',
      onload: res => {
        const blobURL = URL.createObjectURL(
          new Blob([res.responseText], { type: 'application/javascript' })
        );
        const s = document.createElement('script');
        s.src = blobURL;
        s.onload = () => stub(toId(originalUrl));   // stub old path after loader ready
        document.head.appendChild(s);
      },
      onerror: () => { console.error('[TaleoFix‑v7] Could not download RequireJS'); }
    });
  }

  /* 3 · Fetch any other Taleo JS as Blob, or stub if HTML          */
  function fetchAsBlob(src) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: src,
      responseType: 'text',
      onload: res => {
        if (/<!DOCTYPE|<html/i.test(res.responseText)) { stub(toId(src)); return; }
        const blobURL = URL.createObjectURL(
          new Blob([res.responseText], { type: 'application/javascript' })
        );
        const s = document.createElement('script');
        s.src = blobURL;
        document.head.appendChild(s);
      },
      onerror: () => stub(toId(src))
    });
  }

  /* 4 · Main intercept function                                   */
  function intercept(node) {
    const src = node.src || '';
    if (!taleoJs.test(src)) return;

    node.type = 'javascript/blocked';
    node.remove();

    if (requirePath.test(src))  loadCleanRequire(src);
    else                        fetchAsBlob(src);
  }

  /* 5 · Hook into every path browsers use to load <script>        */
  document.addEventListener('beforescriptexecute', e => intercept(e.target));   // Firefox
  new MutationObserver(m => m.forEach(rec =>
    rec.addedNodes.forEach(n =>
      n.nodeType === 1 && n.tagName === 'SCRIPT' && intercept(n))))
    .observe(document.documentElement, { childList: true, subtree: true });      // Chromium
  Array.from(document.getElementsByTagName('script')).forEach(intercept);        // static tags

  /* 6 · Tiny favicon to stop 404 noise                             */
  const fav = document.createElement('link');
  fav.rel = 'icon';
  fav.href =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACoWZ0kAAAAPElEQVQYV2NkQAP/GZgYGBgY/gMxgImB4T8DxP8nMDIwYGBg+H8GxIAGDI0GkRigGQayAYBMh0j4P///w8DAwMDABrmCiEFcfyPAAAAAElFTkSuQmCC';
  document.head.appendChild(fav);
})();
