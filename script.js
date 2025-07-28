// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Loader (v6)
// @namespace    https://github.com/HsinChang
// @version      6.0
// @description  Fetch Taleo JS files as Blobs, preload clean RequireJS, and silence strict‑MIME warnings.
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @inject-into  page              /* makes Instant mode possible */
// @grant        GM_xmlhttpRequest
// @connect      wipo.taleo.net
// ==/UserScript==

(() => {
  'use strict';

  /* -------------------------------------------------------------
     0.  If we’re *not* in Instant mode, add a CSP to block remote
         scripts until our patcher has run (prevents first error).
  ----------------------------------------------------------------*/
  if (!document.currentScript.dataset.instant) {
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "script-src 'self' blob: 'unsafe-inline'";
    document.head.appendChild(csp);
  }

  const taleoJs     = /\/careersection\/[^/]+\/js\/.+\.js(\?.*)?$/i;
  const requirePath = /\/js\/common\/require\.js(\?.*)?$/i;

  const toId = url => url.replace(location.origin + '/', '').replace(/\.js(\?.*)?$/, '');

  function stub(id) {                 // empty: module for RequireJS
    if (window.define && window.define.amd) {
      try { window.define(id, [], () => ({})); } catch (_) {}
    }
  }

  function loadCleanRequire(originalUrl) {
    if (!window._cleanRequireLoaded) {
      window._cleanRequireLoaded = true;
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js';
      document.head.appendChild(s);
    }
    stub(toId(originalUrl));
  }

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

  function intercept(node) {
    const src = node.src || '';
    if (!taleoJs.test(src)) return;
    node.type = 'javascript/blocked';   // neuter
    node.remove();

    if (requirePath.test(src)) { loadCleanRequire(src); }
    else                       { fetchAsBlob(src); }
  }

  /* Firefox early hook */
  document.addEventListener('beforescriptexecute', e => intercept(e.target));

  /* Chromium/Edge dynamic hook */
  new MutationObserver(list =>
    list.forEach(m => m.addedNodes.forEach(n =>
      n.nodeType === 1 && n.tagName === 'SCRIPT' && intercept(n))))
    .observe(document.documentElement, { childList: true, subtree: true });

  /* Scan any <script> tags already in the HTML */
  Array.from(document.getElementsByTagName('script')).forEach(intercept);

  /* Fix the favicon 404 */
  const fav = document.createElement('link');
  fav.rel = 'icon';
  fav.href =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACoWZ0kAAAAPElEQVQYV2NkQAP/GZgYGBgY/gMxgImB4T8DxP8nMDIwYGBg+H8GxIAGDI0GkRigGQayAYBMh0j4P///w8DAwMDABrmCiEFcfyPAAAAAElFTkSuQmCC';
  document.head.appendChild(fav);
})();
