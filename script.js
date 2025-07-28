// ==UserScript==
// @name         WIPO‑Taleo MIME‑Type Bypass (v8.6)
// @namespace    https://github.com/HsinChang
// @version      8.6
// @description  Ultimate MIME type bypass with aggressive early interception and module cleaning
// @match        https://wipo.taleo.net/careersection/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  console.log('[TaleoFix‑v8.6] Starting ultimate MIME type bypass...');

  // Store discovered paths and URL mappings
  const urlMapping = new Map();
  const discoveredPaths = new Set();
  const processedScripts = new Set();
  let realBasePath = null;
  
  // Clear any existing RequireJS state to prevent conflicts
  if (window.requirejs) {
    console.log('[TaleoFix‑v8.6] Clearing existing RequireJS state...');
    delete window.requirejs;
    delete window.require;
    delete window.define;
  }

  /* 1 · Discover the real base path from first Taleo script */
  function discoverBasePath(url) {
    if (!realBasePath && url.includes('taleo.net') && url.includes('/js/')) {
      const match = url.match(/^(https:\/\/[^\/]+\/careersection\/[^\/]+)/);
      if (match) {
        realBasePath = match[1];
        console.log('[TaleoFix‑v8.6] Discovered real base path:', realBasePath);
      }
    }
  }

  /* 2 · Enhanced script interception with immediate blob conversion */
  function interceptScript(url, setScriptSrc) {
    if (url && url.includes('taleo.net') && url.match(/\.js(\?.*)?$/)) {
      // Skip if already processed
      if (processedScripts.has(url)) {
        console.log('[TaleoFix‑v8.6] Script already processed, skipping:', url);
        return false;
      }
      
      console.log('[TaleoFix‑v8.6] Intercepting script:', url);
      processedScripts.add(url);
      
      // Discover base path from this URL
      discoverBasePath(url);
      discoveredPaths.add(url);
      
      // Immediately fetch and create blob instead of setting original URL
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.text();
        })
        .then(code => {
          // Clean up the code to prevent RequireJS conflicts
          let cleanCode = code;
          
          // If this is a RequireJS module, ensure it's properly isolated
          if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
            console.log('[TaleoFix‑v8.6] Cleaning RequireJS module:', url);
            // Wrap in immediate function to prevent global conflicts
            cleanCode = `(function() {\n${cleanCode}\n})();`;
          }
          
          const blob = new Blob([cleanCode], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          console.log('[TaleoFix‑v8.6] Created clean blob for:', url, '→', blobUrl);
          
          // Store mapping for RequireJS
          urlMapping.set(blobUrl, url);
          
          setScriptSrc(blobUrl);
        })
        .catch(err => {
          console.warn('[TaleoFix‑v8.6] Failed to fetch script, using original:', url, err);
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
      console.log('[TaleoFix‑v8.6] Created new script element with patches');
    }
    
    return element;
  };

  /* 4 · More aggressive script processing function */
  function processAllScripts() {
    // Find all script tags, including those that might not have been caught yet
    const allScripts = document.querySelectorAll('script');
    console.log('[TaleoFix‑v8.6] Scanning', allScripts.length, 'total scripts');
    
    allScripts.forEach(script => {
      const src = script.src || script.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/)) {
        // Skip if already processed
        if (processedScripts.has(src)) {
          console.log('[TaleoFix‑v8.6] Script already processed, skipping:', src);
          return;
        }
        
        console.log('[TaleoFix‑v8.6] Found Taleo script to process:', src);
        
        // Mark as processed and discover base path
        processedScripts.add(src);
        discoverBasePath(src);
        discoveredPaths.add(src);
        
        // Check if it's already a blob URL (already processed)
        if (src.startsWith('blob:')) {
          console.log('[TaleoFix‑v8.6] Script already processed as blob:', src);
          return;
        }
        
        // Remove the problematic script
        const parent = script.parentNode;
        script.remove();
        
        // Fetch and recreate as blob with cleaning
        fetch(src)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.text();
          })
          .then(code => {
            // Clean up the code to prevent RequireJS conflicts
            let cleanCode = code;
            
            // If this is a RequireJS module, ensure it's properly isolated
            if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
              console.log('[TaleoFix‑v8.6] Cleaning RequireJS module:', src);
              // Wrap in immediate function to prevent global conflicts
              cleanCode = `(function() {\n${cleanCode}\n})();`;
            }
            
            const blob = new Blob([cleanCode], { type: 'application/javascript' });
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
            
            console.log('[TaleoFix‑v8.6] Replaced script with clean blob:', src, '→', blobUrl);
          })
          .catch(err => {
            console.warn('[TaleoFix‑v8.6] Failed to process script:', src, err);
          });
      }
    });
  }

  /* 5 · Simplified RequireJS configuration - only after all scripts are clean */
  function configureRequireJS() {
    // Wait for RequireJS to be available and all initial scripts processed
    if (window.requirejs && window.require && realBasePath) {
      console.log('[TaleoFix‑v8.6] Configuring RequireJS...');
      
      const basePath = realBasePath.replace('https://wipo.taleo.net', '') + '/js';
      console.log('[TaleoFix‑v8.6] Using base path:', basePath);
      
      try {
        // Simple configuration to avoid conflicts
        window.requirejs.config({
          baseUrl: basePath,
          paths: {
            'fs': 'facetedsearch',
            'jquery': 'common/jquery.min',
            'jquery.cookie': 'common/jquery.cookie'
          },
          waitSeconds: 60,
          enforceDefine: false,
          // Prevent caching issues
          urlArgs: 'bust=' + (new Date()).getTime()
        });
        
        console.log('[TaleoFix‑v8.6] RequireJS configured successfully');
      } catch (err) {
        console.warn('[TaleoFix‑v8.6] Failed to configure RequireJS:', err);
      }
    } else if (!realBasePath) {
      // Try again if base path not discovered yet
      setTimeout(configureRequireJS, 500);
    }
  }

  /* 6 · Streamlined multi-stage processing */
  // Process immediately and aggressively
  processAllScripts();
  
  // Process when DOM content loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[TaleoFix‑v8.6] DOMContentLoaded - processing scripts');
      processAllScripts();
      // Configure RequireJS after a delay to let scripts settle
      setTimeout(configureRequireJS, 1000);
    });
  } else {
    setTimeout(configureRequireJS, 1000);
  }
  
  // Process on window load as backup
  window.addEventListener('load', () => {
    console.log('[TaleoFix‑v8.6] Window load - final script processing');
    processAllScripts();
    setTimeout(configureRequireJS, 1500);
    
    // Log discovered information
    console.log('[TaleoFix‑v8.6] Discovery summary:');
    console.log('  Real base path:', realBasePath);
    console.log('  Discovered paths:', Array.from(discoveredPaths));
    console.log('  Processed scripts:', Array.from(processedScripts));
    console.log('  URL mappings:', urlMapping.size, 'entries');
  });

  /* 7 · Optimized MutationObserver for dynamic content */
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Check if it's a script element
          if (node.tagName === 'SCRIPT') {
            const src = node.src || node.getAttribute('src');
            if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
              console.log('[TaleoFix‑v8.6] Intercepting dynamically added script:', src);
              // The script will be automatically handled by our prototype patches
              discoverBasePath(src);
              discoveredPaths.add(src);
            }
          }
          
          // Check for script children
          if (node.querySelectorAll) {
            const scripts = node.querySelectorAll('script[src*="taleo.net"]');
            if (scripts.length > 0) {
              console.log('[TaleoFix‑v8.6] Found', scripts.length, 'Taleo scripts in added content');
              scripts.forEach(script => {
                const src = script.src || script.getAttribute('src');
                if (src && !src.startsWith('blob:')) {
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

  console.log('[TaleoFix‑v8.6] Ultimate MIME type bypass with module cleaning applied');
})();
