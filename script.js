// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Fix (v3)
// @namespace    https://github.com/your‑name
// @version      3.0
// @description  Blocks all Taleo scripts served as HTML, injects RequireJS, then maps those paths to "empty:" so RequireJS never re‑requests them.
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  /* --- 1. Identify any Taleo script under /careersection/.../js/**.js --- */
  const taleoJs = /\/careersection\/[^/]+\/js\/.+\.js(\?.*)?$/i;

  /* Containers for every URL we block so we can alias them later */
  const blockedUrls = new Set();

  /* ---- 2.  Early‑blockers: Firefox & Chromium paths ---- */
  document.addEventListener('beforescriptexecute', e => {
    if (e.target.src && taleoJs.test(e.target.src)) {
      e.preventDefault();               // stop FF
      e.stopPropagation();
      blockedUrls.add(e.target.src);
      e.target.remove();
      console.info('[TaleoFix‑v3] blocked (FF):', e.target.src);
    }
  });

  const mo = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.tagName === 'SCRIPT' && taleoJs.test(n.src || '')) {
        blockedUrls.add(n.src);
        n.type = 'javascript/blocked';
        n.remove();
        console.info('[TaleoFix‑v3] blocked (MO):', n.src);
      }
    }));
  });
  mo.observe(document.documentElement, {childList: true, subtree: true});

  /* ---- 3.  After DOM ready: inject RequireJS + JSON2, then alias paths ---- */
  window.addEventListener('DOMContentLoaded', () => {
    const inject = url => new Promise(res => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = res;
      document.head.appendChild(s);
    });

    /* 3‑A  Bring in a clean RequireJS loader from CDN */
    inject('https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js')
      .then(() => {
        /* 3‑B  Build a paths map: full URL (sans .js)  ->  "empty:"       */
        const paths = {};
        blockedUrls.forEach(u => {
          const noJs = u.replace(/\.js(\?.*)?$/, '');
          /* RequireJS wants module IDs *relative* to location.origin */
          const id    = noJs.replace(location.origin + '/', '');
          paths[id] = 'empty:';         // official stub token
          console.info('[TaleoFix‑v3] alias', id, '→ empty:');
        });

        /* 3‑C  Tell RequireJS to treat them as empty */
        window.requirejs.config({ paths });

        /* 3‑D  Optional: global onError echos but doesn’t crash the page */
        window.requirejs.onError = err => {
          console.warn('[TaleoFix‑v3] RequireJS error (suppressed):', err);
        };
      })
      /* 3‑E  Add JSON2 polyfill for legacy code */
      .then(() => inject('https://cdnjs.cloudflare.com/ajax/libs/json2/20160511/json2.min.js'))
      /* 3‑F  Minimal stub for Taleo’s iframe helper */
      .then(() => {
        const stub = document.createElement('script');
        stub.textContent = `
          window.IFrameCommunication = window.IFrameCommunication || {
            registerListener: () => {}, postMessage: () => {}
          };`;
        document.head.appendChild(stub);
      })
      /* 3‑G  Quiet the favicon 404 */
      .then(() => {
        const fav = document.createElement('link');
        fav.rel = 'icon';
        fav.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACoWZ0kAAAAPElEQVQYV2NkQAP/GZgYGBgY/gMxgImB4T8DxP8nMDIwYGBg+H8GxIAGDI0GkRigGQayAYBMh0j4P///w8DAwMDABrmCiEFcfyPAAAAAElFTkSuQmCC';
        document.head.appendChild(fav);
      });
  });
})();
