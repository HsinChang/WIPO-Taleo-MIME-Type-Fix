// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Loader (v5)
// @namespace    https://github.com/HsinChang
// @version      5.0
// @description  Fetch Taleo JS files as Blobs with the right MIME type and preload a clean RequireJS.
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      wipo.taleo.net
// ==/UserScript==

(() => {
  'use strict';

  const taleoJs = /\/careersection\/[^/]+\/js\/.+\.js(\?.*)?$/i;
  const requirePath = /\/js\/common\/require\.js(\?.*)?$/i;

  /* -- 0. helper: stub a module ID for RequireJS ------------------------- */
  function stub(id) {
    if (window.define && window.define.amd) {
      try { window.define(id, [], () => ({})); } catch (_) {}
    }
  }

  /* -- 1. For *any* Taleo script tag, block & fetch ---------------------- */
  function blockAndFetch(node) {
    const src = node.src;
    if (!taleoJs.test(src)) return;

    node.type = 'javascript/blocked';   // Neutralise execution
    node.remove();

    /* 1‑A: If this is the built‑in require.js, skip fetch and load cdnjs. */
    if (requirePath.test(src)) {
      console.info('[TaleoFix‑v5] replacing Taleo require.js with cdnjs copy');
      loadCDNRequire(src);   // also stubs the original path
      return;
    }

    /* 1‑B: All other Taleo files – fetch, MIME‑patch, inject. */
    console.info('[TaleoFix‑v5] fetching as Blob:', src);

    GM_xmlhttpRequest({
      method: 'GET',
      url: src,
      responseType: 'text',
      onload: res => {
        if (/<!DOCTYPE|<html/i.test(res.responseText)) {
          console.warn('[TaleoFix‑v5] got HTML; stubbing:', src);
          stub(toId(src));
          return;
        }
        const blobURL = URL.createObjectURL(
          new Blob([res.responseText], { type: 'application/javascript' })
        );
        const s = document.createElement('script');
        s.src = blobURL;
        document.head.appendChild(s);
      },
      onerror: e => {
        console.error('[TaleoFix‑v5] fetch failed; stubbing:', src, e);
        stub(toId(src));
      },
    });
  }

  /* -- 2. Utility: convert full URL → module id used by RequireJS -------- */
  const toId = url =>
    url.replace(location.origin + '/', '').replace(/\.js(\?.*)?$/, '');

  /* -- 3. Load RequireJS from cdnjs, then stub original path ------------- */
  function loadCDNRequire(originalUrl) {
    // Inject clean RequireJS (only once)
    if (!window._cleanRequireInjected) {
      window._cleanRequireInjected = true;
      const cdn = document.createElement('script');
      cdn.src = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js';
      document.head.appendChild(cdn);
    }
    // Tell RequireJS “if you ever ask for that old path, treat it as empty”
    const id = toId(originalUrl);
    stub(id);
  }

  /* -- 4. Early scanners ------------------------------------------------- */
  // 4‑A: Firefox – catch scripts before they run
  document.addEventListener('beforescriptexecute', e => blockAndFetch(e.target));

  // 4‑B: Chromium – MutationObserver for scripts added dynamically
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.tagName === 'SCRIPT' && n.src) blockAndFetch(n);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });

  // 4‑C: Static script tags that already exist in the parsed HTML head
  //      (important for the very first require.js)
  Array.from(document.getElementsByTagName('script')).forEach(blockAndFetch);

  /* -- 5. Quick favicon patch to silence 404 ----------------------------- */
  const fav = document.createElement('link');
  fav.rel = 'icon';
  fav.href =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACoWZ0kAAAAPElEQVQYV2NkQAP/GZgYGBgY/gMxgImB4T8DxP8nMDIwYGBg+H8GxIAGDI0GkRigGQayAYBMh0j4P///w8DAwMDABrmCiEFcfyPAAAAAElFTkSuQmCC';
  document.head.appendChild(fav);
})();
