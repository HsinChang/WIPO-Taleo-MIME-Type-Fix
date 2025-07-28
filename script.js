// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Bypass (v8.5)
// @namespace    https://github.com/HsinChang
// @version      8.5
// @description  Bypasses strict MIME type checking with smart path resolution for RequireJS
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  console.log('[TaleoFix‑v8.5] Starting comprehensive MIME type bypass...');

  // Store discovered paths and URL mappings
  const urlMapping = new Map();
  const discoveredPaths = new Set();
  let realBasePath = null;

  /* 1 · Discover the real base path from first Taleo script */
  function discoverBasePath(url) {
    if (!realBasePath && url.includes('taleo.net') && url.includes('/js/')) {
      const match = url.match(/^(https:\/\/[^\/]+\/careersection\/[^\/]+)/);
      if (match) {
        realBasePath = match[1];
        console.log('[TaleoFix‑v8.5] Discovered real base path:', realBasePath);
      }
    }
  }

  /* 2 · Enhanced script interception with path discovery */
  function interceptScript(url, setScriptSrc) {
    if (url && url.includes('taleo.net') && url.match(/\.js(\?.*)?$/)) {
      console.log('[TaleoFix‑v8.4] Intercepting script:', url);
      
      // Discover base path from this URL
      discoverBasePath(url);
      
      // Store discovered path
      discoveredPaths.add(url);
      
      // Don't set the original URL, fetch and create blob instead
      fetch(url)
        .then(response => response.text())
        .then(code => {
          const blob = new Blob([code], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          console.log('[TaleoFix‑v8.4] Setting blob URL for:', url);
          
          // Store mapping for RequireJS
          urlMapping.set(blobUrl, url);
          
          setScriptSrc(blobUrl);
        })
        .catch(err => {
          console.warn('[TaleoFix‑v8.4] Failed to fetch script, using original:', url, err);
          setScriptSrc(url);
        });
      return true;
    }
    return false;
  }

  /* 3 · Override HTMLScriptElement.prototype.src to catch ALL script assignments */
  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (originalSrcDescriptor) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      get: originalSrcDescriptor.get,
      set: function(value) {
        if (!interceptScript(value, (newUrl) => originalSrcDescriptor.set.call(this, newUrl))) {
          originalSrcDescriptor.set.call(this, value);
        }
      },
      configurable: true,
      enumerable: true
    });
  }

  /* 2 · Override setAttribute to catch script src being set via setAttribute */
  const originalSetAttribute = HTMLScriptElement.prototype.setAttribute;
  HTMLScriptElement.prototype.setAttribute = function(name, value) {
    if (name === 'src') {
      if (!interceptScript(value, (newUrl) => originalSetAttribute.call(this, 'src', newUrl))) {
        originalSetAttribute.call(this, name, value);
      }
      return;
    }
    originalSetAttribute.call(this, name, value);
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
    console.log('[TaleoFix‑v8.4] Scanning', allScripts.length, 'total scripts');
    
    allScripts.forEach(script => {
      const src = script.src || script.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/)) {
        console.log('[TaleoFix‑v8.4] Found Taleo script to process:', src);
        
        // Discover base path and store discovered path
        discoverBasePath(src);
        discoveredPaths.add(src);
        
        // Check if it's already a blob URL (already processed)
        if (src.startsWith('blob:')) {
          console.log('[TaleoFix‑v8.4] Script already processed as blob:', src);
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
      console.log('[TaleoFix‑v8.4] Configuring RequireJS...');
      
      // Use the discovered real base path, or fall back to current path
      const basePath = realBasePath ? realBasePath.replace('https://wipo.taleo.net', '') : 
                      window.location.pathname.match(/^(\/careersection\/[^\/]+)/)?.[1] || '/careersection';
      
      console.log('[TaleoFix‑v8.4] Using base path:', basePath);
      
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
          waitSeconds: 60,
          enforceDefine: false
        });
        
        // Enhanced error handling with path resolution
        const originalOnError = window.requirejs.onError;
        window.requirejs.onError = function(error) {
          console.warn('[TaleoFix‑v8.4] RequireJS Error:', error);
          
          // Try to resolve 404s by reconstructing the URL with discovered base path
          if (error.requireType === 'scripterror' || error.requireType === 'timeout' || 
              (error.message && (error.message.includes('404') || error.message.includes('Script error')))) {
            const failedModule = error.requireModules?.[0];
            if (failedModule && realBasePath) {
              // Convert module path to actual file path
              let modulePath = failedModule;
              if (modulePath.startsWith('fs/')) {
                modulePath = modulePath.replace('fs/', 'facetedsearch/');
              }
              
              const newUrl = realBasePath + '/js/' + modulePath + '.js';
              console.log('[TaleoFix‑v8.4] Attempting to resolve failed module:', failedModule, '→', newUrl);
              
              // Try to preload the module
              fetch(newUrl)
                .then(response => {
                  if (!response.ok) throw new Error(`HTTP ${response.status}`);
                  return response.text();
                })
                .then(code => {
                  const blob = new Blob([code], { type: 'application/javascript' });
                  const blobUrl = URL.createObjectURL(blob);
                  urlMapping.set(blobUrl, newUrl);
                  
                  // Create and append script
                  const script = document.createElement('script');
                  script.src = blobUrl;
                  script.type = 'text/javascript';
                  script.setAttribute('data-requiremodule', failedModule);
                  document.head.appendChild(script);
                  
                  console.log('[TaleoFix‑v8.4] Preloaded failed module as blob:', newUrl);
                })
                .catch(err => {
                  console.warn('[TaleoFix‑v8.4] Failed to preload module:', newUrl, err);
                  // Call original error handler if preload fails
                  if (originalOnError) {
                    originalOnError.call(this, error);
                  }
                });
              return; // Don't call original error handler yet
            }
          }
          
          // Call original error handler if it exists
          if (originalOnError) {
            originalOnError.call(this, error);
          }
        };
        
        console.log('[TaleoFix‑v8.4] RequireJS configured successfully with base:', basePath);
      } catch (err) {
        console.warn('[TaleoFix‑v8.4] Failed to configure RequireJS:', err);
      }
    } else {
      // Try again in a bit
      setTimeout(configureRequireJS, 100);
    }
  }

  /* 6 · Enhanced multi-stage processing with path discovery */
  // Process immediately
  processAllScripts();
  
  // Process when DOM content loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[TaleoFix‑v8.4] DOMContentLoaded - processing scripts');
      processAllScripts();
      setTimeout(configureRequireJS, 500); // Configure RequireJS after scripts load
    });
  } else {
    setTimeout(configureRequireJS, 500);
  }
  
  // Process on window load as backup
  window.addEventListener('load', () => {
    console.log('[TaleoFix‑v8.4] Window load - processing scripts');
    setTimeout(processAllScripts, 50);
    setTimeout(configureRequireJS, 1000);
    
    // Log discovered information
    console.log('[TaleoFix‑v8.4] Discovery summary:');
    console.log('  Real base path:', realBasePath);
    console.log('  Discovered paths:', Array.from(discoveredPaths));
    console.log('  URL mappings:', urlMapping.size, 'entries');
  });

  /* 7 · Enhanced MutationObserver for dynamic content */
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Check if it's a script element
          if (node.tagName === 'SCRIPT') {
            const src = node.src || node.getAttribute('src');
            if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
              console.log('[TaleoFix‑v8.4] Intercepting dynamically added script:', src);
              // Discover path and store
              discoverBasePath(src);
              discoveredPaths.add(src);
              // The script will be automatically handled by our prototype patches
            }
          }
          
          // Check for script children
          if (node.querySelectorAll) {
            const scripts = node.querySelectorAll('script[src*="taleo.net"]');
            if (scripts.length > 0) {
              console.log('[TaleoFix‑v8.4] Found', scripts.length, 'Taleo scripts in added content');
              scripts.forEach(script => {
                const src = script.src || script.getAttribute('src');
                if (src) {
                  discoverBasePath(src);
                  discoveredPaths.add(src);
                }
              });
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

  console.log('[TaleoFix‑v8.4] MIME type bypass with enhanced path discovery applied');
})();
