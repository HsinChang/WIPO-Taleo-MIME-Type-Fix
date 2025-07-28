// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Bypass (v8.3)
// @namespace    https://github.com/HsinChang
// @version      8.3
// @description  Bypasses strict MIME type checking for Taleo scripts with RequireJS path fix
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  console.log('[TaleoFix‑v8.3] Starting MIME type bypass with RequireJS fix...');

  // Store original URLs for RequireJS path mapping
  const urlMapping = new Map();

  /* 1 · Immediately override HTMLScriptElement.prototype.src to catch ALL script assignments */
  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (originalSrcDescriptor) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      get: originalSrcDescriptor.get,
      set: function(value) {
        if (value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
          console.log('[TaleoFix‑v8.3] Intercepting script src assignment:', value);
          
          // Don't set the original URL, fetch and create blob instead
          fetch(value)
            .then(response => response.text())
            .then(code => {
              const blob = new Blob([code], { type: 'application/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              console.log('[TaleoFix‑v8.3] Setting blob URL for:', value);
              
              // Store mapping for RequireJS
              urlMapping.set(blobUrl, value);
              
              originalSrcDescriptor.set.call(this, blobUrl);
              this.type = 'text/javascript';
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.3] Failed to fetch script, using original:', value, err);
              originalSrcDescriptor.set.call(this, value);
            });
          return;
        }
        // For non-Taleo scripts, use original behavior
        originalSrcDescriptor.set.call(this, value);
      },
      configurable: true,
      enumerable: true
    });
  }

  /* 2 · Override setAttribute to catch script src being set via setAttribute */
  const originalSetAttribute = HTMLScriptElement.prototype.setAttribute;
  HTMLScriptElement.prototype.setAttribute = function(name, value) {
    if (name === 'src' && value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
      console.log('[TaleoFix‑v8.3] Intercepting setAttribute src:', value);
      
      fetch(value)
        .then(response => response.text())
        .then(code => {
          const blob = new Blob([code], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          console.log('[TaleoFix‑v8.3] Setting blob URL via setAttribute for:', value);
          
          // Store mapping for RequireJS
          urlMapping.set(blobUrl, value);
          
          originalSetAttribute.call(this, 'src', blobUrl);
          originalSetAttribute.call(this, 'type', 'text/javascript');
        })
        .catch(err => {
          console.warn('[TaleoFix‑v8.3] Failed to fetch script via setAttribute, using original:', value, err);
          originalSetAttribute.call(this, name, value);
        });
      return;
    }
    return originalSetAttribute.call(this, name, value);
  };

  /* 3 · Override document.createElement to patch new script elements immediately */
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      // The script element is already patched by the prototype changes above
      console.log('[TaleoFix‑v8.3] Created new script element with patches');
    }
    
    return element;
  };

  /* 4 · Aggressive script processing function */
  function processAllScripts() {
    // Find all script tags, including those that might not have been caught yet
    const allScripts = document.querySelectorAll('script');
    console.log('[TaleoFix‑v8.3] Scanning', allScripts.length, 'total scripts');
    
    allScripts.forEach(script => {
      const src = script.src || script.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/)) {
        console.log('[TaleoFix‑v8.3] Found Taleo script to process:', src);
        
        // Check if it's already a blob URL (already processed)
        if (src.startsWith('blob:')) {
          console.log('[TaleoFix‑v8.3] Script already processed as blob:', src);
          return;
        }
        
        // Remove the problematic script
        const parent = script.parentNode;
        script.remove();
        
        // Fetch and recreate as blob
        fetch(src)
          .then(response => response.text())
          .then(code => {
            const blob = new Blob([code], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            
            // Store mapping for RequireJS
            urlMapping.set(blobUrl, src);
            
            const newScript = document.createElement('script');
            newScript.src = blobUrl;
            newScript.type = 'text/javascript';
            
            // Copy other attributes except src and type
            Array.from(script.attributes).forEach(attr => {
              if (attr.name !== 'src' && attr.name !== 'type') {
                newScript.setAttribute(attr.name, attr.value);
              }
            });
            
            // Add to same location or head if parent was removed
            if (parent && parent.isConnected) {
              parent.appendChild(newScript);
            } else {
              document.head.appendChild(newScript);
            }
            
            console.log('[TaleoFix‑v8.3] Replaced script with blob:', src, '→', blobUrl);
          })
          .catch(err => {
            console.warn('[TaleoFix‑v8.3] Failed to process script:', src, err);
          });
      }
    });
  }

  /* 5 · Configure RequireJS when it becomes available */
  function configureRequireJS() {
    if (window.requirejs && window.require) {
      console.log('[TaleoFix‑v8.3] Configuring RequireJS...');
      
      // Get the base path from the current page
      const currentPath = window.location.pathname;
      const basePath = currentPath.match(/^(\/careersection\/[^\/]+)/)?.[1] || '/careersection';
      
      try {
        window.requirejs.config({
          baseUrl: basePath + '/js',
          paths: {
            'fs': 'facetedsearch',
            'jquery': 'common/jquery.min',
            'jquery.cookie': 'common/jquery.cookie'
          },
          map: {
            '*': {
              // Map common module aliases
              'json2': 'common/json2',
              'require': 'common/require'
            }
          },
          waitSeconds: 30, // Increase timeout
          enforceDefine: false,
          catchError: true
        });
        console.log('[TaleoFix‑v8.3] RequireJS configured successfully');
      } catch (err) {
        console.warn('[TaleoFix‑v8.3] Failed to configure RequireJS:', err);
      }
    } else {
      // Try again in a bit
      setTimeout(configureRequireJS, 100);
    }
  }

  /* 6 · Run processing at multiple stages */
  // Process immediately
  processAllScripts();
  
  // Process when DOM content loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[TaleoFix‑v8.3] DOMContentLoaded - processing scripts');
      processAllScripts();
      setTimeout(configureRequireJS, 500); // Configure RequireJS after scripts load
    });
  } else {
    setTimeout(configureRequireJS, 500);
  }
  
  // Process on window load as backup
  window.addEventListener('load', () => {
    console.log('[TaleoFix‑v8.3] Window load - processing scripts');
    setTimeout(processAllScripts, 50);
    setTimeout(configureRequireJS, 1000);
  });

  /* 7 · MutationObserver for dynamic content */
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Check if it's a script element
          if (node.tagName === 'SCRIPT') {
            const src = node.src || node.getAttribute('src');
            if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
              console.log('[TaleoFix‑v8.3] Intercepting dynamically added script:', src);
              // The script will be automatically handled by our prototype patches
            }
          }
          
          // Check for script children
          if (node.querySelectorAll) {
            const scripts = node.querySelectorAll('script[src*="taleo.net"]');
            if (scripts.length > 0) {
              console.log('[TaleoFix‑v8.3] Found', scripts.length, 'Taleo scripts in added content');
              setTimeout(() => processAllScripts(), 10); // Small delay to let them settle
            }
          }
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('[TaleoFix‑v8.3] MIME type bypass with RequireJS fix applied');
})();
