// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Loader (v4)
// @namespace    https://github.com/HsinChang
// @version      4.0
// @description  Fetch every Taleo JS file as a Blob with the right MIME type and let Chrome run it.
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      wipo.taleo.net
// ==/UserScript==

(() => {
  'use strict';

  const taleoJs = /\/careersection\/[^/]+\/js\/.+\.js(\?.*)?$/i;

  /** Block <script> tags the moment they appear */
  function blockAndFetch(node) {
    const src = node.src;
    if (!taleoJs.test(src)) return;

    node.type = 'javascript/blocked';
    node.remove();
    console.info('[TaleoFix‑v4] fetching as Blob:', src);

    GM_xmlhttpRequest({
      method: 'GET',
      url: src,
      responseType: 'text',
      onload: res => {
        /** 1️⃣ If the body looks like HTML, don’t eval it – stub it for RequireJS */
        if (/<!DOCTYPE|<html/i.test(res.responseText)) {
          console.warn('[TaleoFix‑v4] got HTML, stubbing:', src);
          stubRequire(src);
          return;
        }
        /** 2️⃣ Package JS bytes in a Blob + inject */
        const blobURL = URL.createObjectURL(
          new Blob([res.responseText], { type: 'application/javascript' })
        );
        const s = document.createElement('script');
        s.src = blobURL;
        document.head.appendChild(s);
      },
      onerror: e => {
        console.error('[TaleoFix‑v4] fetch failed, stubbing:', src, e);
        stubRequire(src);
      },
    });
  }

  /** Create an “empty:” shim for RequireJS so it never throws */
  function stubRequire(url) {
    const id = url.replace(location.origin + '/', '').replace(/\.js(\?.*)?$/, '');
    if (window.define && !window.define.amd) return;       // define not ready
    try { window.define(id, [], () => ({})); }
    catch (e) { /* define may not be available yet; ignore */ }
  }

  /** Firefox path */
  document.addEventListener('beforescriptexecute', e => blockAndFetch(e.target));

  /** Chromium / Edge path */
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.tagName === 'SCRIPT' && n.src) blockAndFetch(n);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
