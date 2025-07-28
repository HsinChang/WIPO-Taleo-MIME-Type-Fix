// ==UserScript==
// @name         WIPO Taleo MIME Type Fix
// @namespace    http://tampermo            .then(code => {
              let cleanCode = code;
              
              // Mark RequireJS as ready when it loads
              if (value.includes('require.js')) {
                requireJSReady = true;
                console.log('[TaleoFix‑v8.10] RequireJS detected, marking as ready');
                setTimeout(executeDelayedScripts, 100);
              }
              
              // Check if this script needs RequireJS
              if (needsRequireJS(cleanCode, value) && !requireJSReady) {
                console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script:', value);
                delayedScripts.set(value, { code: cleanCode, element: this, parent: this.parentNode });
                // Don't set src to prevent immediate execution
                return;
              }
              
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(') && !value.includes('require.js')) {
                console.log('[TaleoFix‑v8.10] Cleaning RequireJS module in setAttribute:', value);
                cleanCode = `(function() {\n${cleanCode}\n})();`;
              }et/
// @version      8.10
// @description  Bypass strict MIME type checking on WIPO Taleo job pages with ultra-aggressive interception and execution sequencing
// @author       Assistant
// @match        https://wipo.taleo.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';
  
  console.log('[TaleoFix‑v8.10] Ultra-aggressive MIME type bypass starting...');
  
  // Track processed scripts and discovered paths
  const processedScripts = new Set();
  const discoveredPaths = new Set(); 
  const urlMapping = new Map();
  const delayedScripts = new Map(); // Store scripts that need RequireJS
  let realBasePath = '';
  let requireJSReady = false;
  
  function discoverBasePath(url) {
    const match = url.match(/(https:\/\/wipo\.taleo\.net\/careersection\/[^\/]+)/);
    if (match && !realBasePath) {
      realBasePath = match[1];
      console.log('[TaleoFix‑v8.10] Discovered base path:', realBasePath);
    }
  }
  
  // Check if script needs RequireJS
  function needsRequireJS(code, url) {
    return code.includes('requirejs.config') || 
           code.includes('require(') || 
           (code.includes('define(') && !url.includes('require.js'));
  }
  
  // Execute delayed scripts when RequireJS is ready
  function executeDelayedScripts() {
    if (!requireJSReady) return;
    
    console.log('[TaleoFix‑v8.10] Executing', delayedScripts.size, 'delayed scripts...');
    
    for (const [src, { code, element, parent }] of delayedScripts) {
      try {
        const blob = new Blob([code], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        urlMapping.set(blobUrl, src);
        
        const newScript = document.createElement('script');
        newScript.src = blobUrl;
        newScript.type = 'text/javascript';
        
        if (element) {
          Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'src' && attr.name !== 'type') {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
        }
        
        if (parent) {
          parent.appendChild(newScript);
          console.log('[TaleoFix‑v8.10] Delayed script executed:', src, '→', blobUrl);
        }
      } catch (err) {
        console.warn('[TaleoFix‑v8.10] Failed to execute delayed script:', src, err);
      }
    }
    
    delayedScripts.clear();
  }
  
  /* 1 · Aggressive prototype patching */
  const originalSetAttribute = HTMLScriptElement.prototype.setAttribute;
  HTMLScriptElement.prototype.setAttribute = function(name, value) {
    if (name === 'src' && value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
      console.log('[TaleoFix‑v8.10] Intercepting setAttribute src:', value);
      
      if (!processedScripts.has(value)) {
        processedScripts.add(value);
        discoverBasePath(value);
        discoveredPaths.add(value);
        
        if (!value.startsWith('blob:')) {
          fetch(value)
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.text();
            })
            .then(code => {
              let cleanCode = code;
              
              // Mark RequireJS as ready when it loads
              if (value.includes('require.js')) {
                requireJSReady = true;
                console.log('[TaleoFix‑v8.10] RequireJS detected, marking as ready');
                setTimeout(executeDelayedScripts, 100);
              }
              
              // Check if this script needs RequireJS
              if (needsRequireJS(cleanCode, value) && !requireJSReady) {
                console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script:', value);
                delayedScripts.set(value, { code: cleanCode, element: this, parent: this.parentNode });
                // Don't set src to prevent immediate execution
                return;
              }
              
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(') && !value.includes('require.js')) {
                console.log('[TaleoFix‑v8.10] Cleaning RequireJS module:', value);
                cleanCode = `(function() {\n${cleanCode}\n})();`;
              }
              
              const blob = new Blob([cleanCode], { type: 'application/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              urlMapping.set(blobUrl, value);
              
              console.log('[TaleoFix‑v8.10] setAttribute conversion:', value, '→', blobUrl);
              originalSetAttribute.call(this, name, blobUrl);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.10] Failed setAttribute conversion:', value, err);
              originalSetAttribute.call(this, name, value);
            });
          return;
        }
      }
    }
    originalSetAttribute.call(this, name, value);
  };

  /* 2 · Src property descriptor patching */
  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (originalSrcDescriptor) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      get: originalSrcDescriptor.get,
      set: function(value) {
        if (value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
          console.log('[TaleoFix‑v8.10] Intercepting src property:', value);
          
          if (!processedScripts.has(value) && !value.startsWith('blob:')) {
            processedScripts.add(value);
            discoverBasePath(value);
            discoveredPaths.add(value);
            
            fetch(value)
              .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
              })
              .then(code => {
                let cleanCode = code;
                
                // Mark RequireJS as ready when it loads
                if (value.includes('require.js')) {
                  requireJSReady = true;
                  console.log('[TaleoFix‑v8.10] RequireJS detected, marking as ready');
                  setTimeout(executeDelayedScripts, 100);
                }
                
                // Check if this script needs RequireJS
                if (needsRequireJS(cleanCode, value) && !requireJSReady) {
                  console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script:', value);
                  delayedScripts.set(value, { code: cleanCode, element: this, parent: this.parentNode });
                  // Don't set src to prevent immediate execution
                  return;
                }
                
                if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(') && !value.includes('require.js')) {
                  console.log('[TaleoFix‑v8.10] Cleaning RequireJS module:', value);
                  cleanCode = `(function() {\n${cleanCode}\n})();`;
                }
                
                const blob = new Blob([cleanCode], { type: 'application/javascript' });
                const blobUrl = URL.createObjectURL(blob);
                urlMapping.set(blobUrl, value);
                
                console.log('[TaleoFix‑v8.10] Src property conversion:', value, '→', blobUrl);
                originalSrcDescriptor.set.call(this, blobUrl);
              })
              .catch(err => {
                console.warn('[TaleoFix‑v8.10] Failed src property conversion:', value, err);
                originalSrcDescriptor.set.call(this, value);
              });
            return;
          }
        }
        originalSrcDescriptor.set.call(this, value);
      },
      configurable: true,
      enumerable: true
    });
  }

  /* 3 · Document.createElement interception */
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      console.log('[TaleoFix‑v8.10] Intercepting script element creation');
      
      // Override the src setter immediately on creation
      const originalSetter = Object.getOwnPropertyDescriptor(element, 'src') || 
                            Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      
      if (originalSetter) {
        Object.defineProperty(element, 'src', {
          get: originalSetter.get,
          set: function(value) {
            if (value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
              console.log('[TaleoFix‑v8.10] Intercepting script src on creation:', value);
              
              if (!processedScripts.has(value) && !value.startsWith('blob:')) {
                processedScripts.add(value);
                discoverBasePath(value);
                discoveredPaths.add(value);
                
                fetch(value)
                  .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.text();
                  })
                  .then(code => {
                    let cleanCode = code;
                    
                    // Mark RequireJS as ready when it loads
                    if (value.includes('require.js')) {
                      requireJSReady = true;
                      console.log('[TaleoFix‑v8.10] RequireJS detected, marking as ready');
                      setTimeout(executeDelayedScripts, 100);
                    }
                    
                    // Check if this script needs RequireJS
                    if (needsRequireJS(cleanCode, value) && !requireJSReady) {
                      console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script:', value);
                      delayedScripts.set(value, { code: cleanCode, element: this, parent: this.parentNode });
                      // Don't set src to prevent immediate execution
                      return;
                    }
                    
                    if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(') && !value.includes('require.js')) {
                      console.log('[TaleoFix‑v8.10] Cleaning RequireJS module on creation:', value);
                      cleanCode = `(function() {\n${cleanCode}\n})();`;
                    }
                    
                    const blob = new Blob([cleanCode], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    urlMapping.set(blobUrl, value);
                    
                    console.log('[TaleoFix‑v8.10] Setting clean blob on created script:', value, '→', blobUrl);
                    originalSetter.set.call(this, blobUrl);
                  })
                  .catch(err => {
                    console.warn('[TaleoFix‑v8.10] Failed to fetch on creation, using original:', value, err);
                    originalSetter.set.call(this, value);
                  });
                return;
              }
            }
            originalSetter.set.call(this, value);
          },
          configurable: true,
          enumerable: true
        });
      }
    }
    
    return element;
  };

  /* 4 · Ultra-aggressive appendChild/insertBefore interception */
  const originalAppendChild = Node.prototype.appendChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  
  Node.prototype.appendChild = function(newChild) {
    if (newChild.tagName === 'SCRIPT') {
      const src = newChild.src || newChild.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
        console.log('[TaleoFix‑v8.10] Intercepting appendChild of Taleo script:', src);
        
        if (!processedScripts.has(src)) {
          console.log('[TaleoFix‑v8.10] Preventing original script appendChild:', src);
          processedScripts.add(src);
          discoverBasePath(src);
          discoveredPaths.add(src);
          
          fetch(src)
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.text();
            })
            .then(code => {
              let cleanCode = code;
              
              // Mark RequireJS as ready when it loads
              if (src.includes('require.js')) {
                requireJSReady = true;
                console.log('[TaleoFix‑v8.10] RequireJS detected, marking as ready');
                setTimeout(executeDelayedScripts, 100);
              }
              
              // Check if this script needs RequireJS
              if (needsRequireJS(cleanCode, src) && !requireJSReady) {
                console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script:', src);
                delayedScripts.set(src, { code: cleanCode, element: newChild, parent: this });
                // Don't append, just return
                return;
              }
              
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                console.log('[TaleoFix‑v8.10] Cleaning RequireJS module in appendChild:', src);
                cleanCode = `(function() {\n${cleanCode}\n})();`;
              }
              
              const blob = new Blob([cleanCode], { type: 'application/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              urlMapping.set(blobUrl, src);
              
              const cleanScript = document.createElement('script');
              cleanScript.src = blobUrl;
              cleanScript.type = 'text/javascript';
              
              Array.from(newChild.attributes).forEach(attr => {
                if (attr.name !== 'src' && attr.name !== 'type') {
                  cleanScript.setAttribute(attr.name, attr.value);
                }
              });
              
              console.log('[TaleoFix‑v8.10] Appending clean blob script:', src, '→', blobUrl);
              originalAppendChild.call(this, cleanScript);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.10] Failed appendChild conversion, using original:', src, err);
              originalAppendChild.call(this, newChild);
            });
          return newChild;
        }
      }
    }
    return originalAppendChild.call(this, newChild);
  };
  
  Node.prototype.insertBefore = function(newChild, referenceChild) {
    if (newChild.tagName === 'SCRIPT') {
      const src = newChild.src || newChild.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
        console.log('[TaleoFix‑v8.10] Intercepting insertBefore of Taleo script:', src);
        if (!processedScripts.has(src)) {
          this.appendChild(newChild); // Use our patched appendChild
          return newChild;
        }
      }
    }
    return originalInsertBefore.call(this, newChild, referenceChild);
  };

  /* 4.5 · Nuclear option: innerHTML and document.write interception */
  const originalSetInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (originalSetInnerHTML) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      get: originalSetInnerHTML.get,
      set: function(value) {
        if (typeof value === 'string' && value.includes('taleo.net') && value.includes('<script')) {
          console.log('[TaleoFix‑v8.10] Intercepting innerHTML with Taleo scripts');
          
          // Replace script tags with data-src to prevent immediate execution
          value = value.replace(/<script([^>]*?)src=(["'])(.*?taleo\.net.*?\.js[^"']*)\2([^>]*?)>/gi, 
            '<script$1data-src=$2$3$2$4>');
          
          const result = originalSetInnerHTML.set.call(this, value);
          
          // Process the deferred scripts
          setTimeout(() => {
            const deferredScripts = this.querySelectorAll('script[data-src*="taleo.net"]');
            deferredScripts.forEach(script => {
              const src = script.getAttribute('data-src');
              if (src && !processedScripts.has(src)) {
                console.log('[TaleoFix‑v8.10] Processing deferred script from innerHTML:', src);
                processedScripts.add(src);
                discoverBasePath(src);
                discoveredPaths.add(src);
                
                fetch(src)
                  .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.text();
                  })
                  .then(code => {
                    let cleanCode = code;
                    
                    // Mark RequireJS as ready when it loads
                    if (src.includes('require.js')) {
                      requireJSReady = true;
                      console.log('[TaleoFix‑v8.10] RequireJS detected in innerHTML, marking as ready');
                      setTimeout(executeDelayedScripts, 100);
                    }
                    
                    // Check if this script needs RequireJS
                    if (needsRequireJS(cleanCode, src) && !requireJSReady) {
                      console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script from innerHTML:', src);
                      delayedScripts.set(src, { code: cleanCode, element: script, parent: script.parentNode });
                      return;
                    }
                    
                    if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(') && !src.includes('require.js')) {
                      console.log('[TaleoFix‑v8.10] Cleaning RequireJS module from innerHTML:', src);
                      cleanCode = `(function() {\n${cleanCode}\n})();`;
                    }
                    
                    const blob = new Blob([cleanCode], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    urlMapping.set(blobUrl, src);
                    
                    const newScript = document.createElement('script');
                    newScript.src = blobUrl;
                    newScript.type = 'text/javascript';
                    
                    Array.from(script.attributes).forEach(attr => {
                      if (attr.name !== 'data-src' && attr.name !== 'type') {
                        newScript.setAttribute(attr.name, attr.value);
                      }
                    });
                    
                    script.parentNode.replaceChild(newScript, script);
                    console.log('[TaleoFix‑v8.10] innerHTML script replacement:', src, '→', blobUrl);
                  })
                  .catch(err => {
                    console.warn('[TaleoFix‑v8.10] Failed innerHTML script processing:', src, err);
                  });
              }
            });
          }, 10);
          
          return result;
        }
        return originalSetInnerHTML.set.call(this, value);
      },
      configurable: true,
      enumerable: true
    });
  }

  /* 5 · Cleanup and scan function for remaining scripts */
  function processAllScripts() {
    const allScripts = document.querySelectorAll('script');
    console.log('[TaleoFix‑v8.10] Final scan of', allScripts.length, 'total scripts');
    
    allScripts.forEach(script => {
      const src = script.src || script.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
        if (!processedScripts.has(src)) {
          console.log('[TaleoFix‑v8.10] Found unprocessed script in final scan:', src);
          processedScripts.add(src);
          discoverBasePath(src);
          discoveredPaths.add(src);
          
          const parent = script.parentNode;
          script.remove();
          
          fetch(src)
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.text();
            })
            .then(code => {
              let cleanCode = code;
              
              // Mark RequireJS as ready when it loads
              if (src.includes('require.js')) {
                requireJSReady = true;
                console.log('[TaleoFix‑v8.10] RequireJS detected in final scan, marking as ready');
                setTimeout(executeDelayedScripts, 100);
              }
              
              // Check if this script needs RequireJS
              if (needsRequireJS(cleanCode, src) && !requireJSReady) {
                console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script from final scan:', src);
                delayedScripts.set(src, { code: cleanCode, element: script, parent: parent });
                return;
              }
              
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                console.log('[TaleoFix‑v8.10] Cleaning RequireJS module in final scan:', src);
                cleanCode = `(function() {\n${cleanCode}\n})();`;
              }
              
              const blob = new Blob([cleanCode], { type: 'application/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              urlMapping.set(blobUrl, src);
              
              const newScript = document.createElement('script');
              newScript.src = blobUrl;
              newScript.type = 'text/javascript';
              
              Array.from(script.attributes).forEach(attr => {
                if (attr.name !== 'src' && attr.name !== 'type') {
                  newScript.setAttribute(attr.name, attr.value);
                }
              });
              
              if (parent && parent.isConnected) {
                parent.appendChild(newScript);
              } else {
                document.head.appendChild(newScript);
              }
              
              console.log('[TaleoFix‑v8.10] Final scan replacement:', src, '→', blobUrl);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.10] Failed final scan replacement:', src, err);
            });
        }
      }
    });
  }

  /* 6 · MutationObserver for emergency fallback */
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'SCRIPT') {
          const src = node.src || node.getAttribute('src');
          if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
            console.log('[TaleoFix‑v8.10] MutationObserver caught bypassed script:', src);
            if (!processedScripts.has(src)) {
              console.warn('[TaleoFix‑v8.10] Script bypassed all interceptions, emergency processing');
              processedScripts.add(src);
              
              const parent = node.parentNode;
              if (parent) {
                node.remove();
                
                fetch(src)
                  .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.text();
                  })
                  .then(code => {
                    let cleanCode = code;
                    
                    // Mark RequireJS as ready when it loads
                    if (src.includes('require.js')) {
                      requireJSReady = true;
                      console.log('[TaleoFix‑v8.10] RequireJS detected in emergency processing, marking as ready');
                      setTimeout(executeDelayedScripts, 100);
                    }
                    
                    // Check if this script needs RequireJS
                    if (needsRequireJS(cleanCode, src) && !requireJSReady) {
                      console.log('[TaleoFix‑v8.10] Delaying RequireJS-dependent script from emergency processing:', src);
                      delayedScripts.set(src, { code: cleanCode, element: node, parent: parent });
                      return;
                    }
                    
                    if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                      console.log('[TaleoFix‑v8.10] Emergency cleaning RequireJS module:', src);
                      cleanCode = `(function() {\n${cleanCode}\n})();`;
                    }
                    
                    const blob = new Blob([cleanCode], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    urlMapping.set(blobUrl, src);
                    
                    const newScript = document.createElement('script');
                    newScript.src = blobUrl;
                    newScript.type = 'text/javascript';
                    
                    Array.from(node.attributes).forEach(attr => {
                      if (attr.name !== 'src' && attr.name !== 'type') {
                        newScript.setAttribute(attr.name, attr.value);
                      }
                    });
                    
                    parent.appendChild(newScript);
                    console.log('[TaleoFix‑v8.10] Emergency replacement complete:', src, '→', blobUrl);
                  })
                  .catch(err => {
                    console.warn('[TaleoFix‑v8.10] Emergency processing failed:', src, err);
                  });
              }
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
  
  /* 7 · Enhanced RequireJS configuration */
  function configureRequireJS() {
    // Wait for RequireJS to be properly loaded
    if (typeof window.requirejs === 'function' && window.requirejs.config && realBasePath) {
      console.log('[TaleoFix‑v8.10] Configuring RequireJS...');
      
      const basePath = realBasePath.replace('https://wipo.taleo.net', '') + '/js';
      console.log('[TaleoFix‑v8.10] Using base path:', basePath);
      
      try {
        window.requirejs.config({
          baseUrl: basePath,
          paths: {
            'fs': 'facetedsearch',
            'FacetedSearchPage': 'facetedsearch/FacetedSearchPage',
            'jquery': 'common/jquery.min',
            'jquery.cookie': 'common/jquery.cookie'
          },
          waitSeconds: 60,
          enforceDefine: false,
          urlArgs: 'bust=' + (new Date()).getTime()
        });
        
        console.log('[TaleoFix‑v8.10] RequireJS configured successfully');
        
        // Mark as ready and execute delayed scripts
        if (!requireJSReady) {
          requireJSReady = true;
          setTimeout(executeDelayedScripts, 100);
        }
        
      } catch (err) {
        console.warn('[TaleoFix‑v8.10] Failed to configure RequireJS:', err);
      }
    } else if (!realBasePath) {
      console.log('[TaleoFix‑v8.10] Waiting for base path discovery...');
      setTimeout(configureRequireJS, 500);
    } else if (!window.requirejs || !window.requirejs.config) {
      console.log('[TaleoFix‑v8.10] Waiting for RequireJS to load...');
      setTimeout(configureRequireJS, 1000);
    }
  }

  /* 8 · Enhanced RequireJS error handler */
  window.requirejs = window.requirejs || {};
  window.requirejs.onError = function(err) {
    console.warn('[TaleoFix‑v8.10] RequireJS error:', err.requireType, err.requireModules);
    
    if (err.requireType === 'scripterror' && err.requireModules) {
      err.requireModules.forEach(moduleName => {
        console.log('[TaleoFix‑v8.10] Attempting recovery for module:', moduleName);
        
        Array.from(discoveredPaths).forEach(path => {
          if (path.includes(moduleName)) {
            console.log('[TaleoFix‑v8.10] Found potential match for', moduleName, ':', path);
            
            const correctPath = path.replace(/^.*\/js\//, '').replace(/\.js$/, '');
            
            try {
              if (window.requirejs && window.requirejs.config) {
                window.requirejs.config({
                  paths: {
                    [moduleName]: correctPath
                  }
                });
                console.log('[TaleoFix‑v8.10] Added path mapping:', moduleName, '→', correctPath);
              }
            } catch (configErr) {
              console.warn('[TaleoFix‑v8.10] Failed to add path mapping:', configErr);
            }
          }
        });
      });
    } else if (err.requireType === 'timeout' && err.requireModules) {
      console.log('[TaleoFix‑v8.10] Timeout error, attempting to reload modules:', err.requireModules);
      // Try reconfiguring RequireJS with longer timeout
      if (window.requirejs && window.requirejs.config) {
        try {
          window.requirejs.config({
            waitSeconds: 120
          });
        } catch (e) {
          console.warn('[TaleoFix‑v8.10] Failed to extend timeout:', e);
        }
      }
    }
  };

  /* 9 · Enhanced multi-stage initialization */
  console.log('[TaleoFix‑v8.10] Immediate processing...');
  
  // Immediate aggressive scan
  processAllScripts();
  
  // Also scan for any scripts already in the document
  if (document.querySelectorAll) {
    const existingScripts = document.querySelectorAll('script[src*="taleo.net"]');
    existingScripts.forEach(script => {
      const src = script.src || script.getAttribute('src');
      if (src && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:') && !processedScripts.has(src)) {
        console.log('[TaleoFix‑v8.10] Found existing unprocessed script:', src);
        processedScripts.add(src);
        discoverBasePath(src);
        discoveredPaths.add(src);
        
        // Force immediate replacement
        const parent = script.parentNode;
        if (parent) {
          script.remove();
          
          fetch(src)
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.text();
            })
            .then(code => {
              let cleanCode = code;
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                console.log('[TaleoFix‑v8.10] Cleaning RequireJS module (immediate):', src);
                cleanCode = `(function() {\n${cleanCode}\n})();`;
              }
              
              const blob = new Blob([cleanCode], { type: 'application/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              urlMapping.set(blobUrl, src);
              
              const newScript = document.createElement('script');
              newScript.src = blobUrl;
              newScript.type = 'text/javascript';
              
              Array.from(script.attributes).forEach(attr => {
                if (attr.name !== 'src' && attr.name !== 'type') {
                  newScript.setAttribute(attr.name, attr.value);
                }
              });
              
              parent.appendChild(newScript);
              console.log('[TaleoFix‑v8.10] Immediate replacement:', src, '→', blobUrl);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.10] Failed immediate replacement:', src, err);
            });
        }
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[TaleoFix‑v8.10] DOMContentLoaded processing...');
      setTimeout(() => {
        processAllScripts();
        configureRequireJS();
      }, 100);
    });
  } else {
    setTimeout(() => {
      processAllScripts();
      configureRequireJS();
    }, 100);
  }
  
  window.addEventListener('load', () => {
    console.log('[TaleoFix‑v8.10] Window load processing...');
    setTimeout(() => {
      processAllScripts();
      configureRequireJS();
    }, 500);
  });
  
  console.log('[TaleoFix‑v8.10] Ultra-aggressive MIME type bypass initialized!');
})();