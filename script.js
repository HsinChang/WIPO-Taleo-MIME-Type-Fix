// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Fix
// @namespace    https://github.com/HsinChang
// @version      1.0
// @description  Replace missing Taleo scripts that are served with the wrong MIME type
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // Regex for the three broken files
  const badSrc = /\/js\/(?:common\/(?:require|json2)|integration\/iframes_communication)\.js/i;

  /** 1️⃣  Cancel the bad scripts *before* the browser evaluates them **/
  // Works in Firefox
  document.addEventListener('beforescriptexecute', e => {
    if (e.target.src && badSrc.test(e.target.src)) {
      e.preventDefault();           // stop execution
      e.target.remove();            // remove from DOM
      console.info('Blocked MIME‑mismatch script:', e.target.src);
    }
  });

  // Fallback for Chromium – watch the DOM and remove after insertion
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.tagName === 'SCRIPT' && badSrc.test(n.src || '')) {
          n.remove();
          console.info('Blocked MIME‑mismatch script (MO):', n.src);
        }
      }
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true });

  /** 2️⃣  When DOM is ready, inject working substitutes **/
  window.addEventListener('DOMContentLoaded', () => {
    // Helper to inject external JS
    const inject = url => new Promise(res => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = res;
      document.head.appendChild(s);
    });

    // 2‑A RequireJS (real replacement)
    inject('https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js');

    // 2‑B JSON polyfill (only needed for very old code, but silences json2.js ref)
    inject('https://cdnjs.cloudflare.com/ajax/libs/json2/20160511/json2.min.js');

    // 2‑C Stub for Taleo’s iframe helper
    const stub = document.createElement('script');
    stub.textContent = `
      window.IFrameCommunication = window.IFrameCommunication || {
        registerListener: () => {},
        postMessage    : () => {}
      };
    `;
    document.head.appendChild(stub);

    // 2‑D Provide a favicon so the 404 disappears
    const fav = document.createElement('link');
    fav.rel = 'icon';
    fav.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACoWZ0kAAAAPElEQVQYV2NkQAP/GZgYGBgY/gMxgImB4T8DxP8nMDIwYGBg+H8GxIAGDI0GkRigGQayAYBMh0j4P///w8DAwMDABrmCiEFcfyPAAAAAElFTkSuQmCC';
    document.head.appendChild(fav);
  });
})();
