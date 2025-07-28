// ==UserScript==
// @name         WIPO Taleo MIME Type Fix
// @namespace    http://tampermonkey.net/
// @version      8.7
// @description  Bypass strict MIME type checking on WIPO Taleo job pages with ultra-aggressive interception
// @author       Assistant
// @match        https://wipo.taleo.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';
  
  console.log('[TaleoFix‑v8.7] Ultra-aggressive MIME type bypass starting...');
  
  // Track processed scripts and discovered paths
  const processedScripts = new Set();
  const discoveredPaths = new Set(); 
  const urlMapping = new Map();
  let realBasePath = '';
  
  function discoverBasePath(url) {
    const match = url.match(/(https:\/\/wipo\.taleo\.net\/careersection\/[^\/]+)/);
    if (match && !realBasePath) {
      realBasePath = match[1];
      console.log('[TaleoFix‑v8.7] Discovered base path:', realBasePath);
    }
  }
  
  /* 1 · Aggressive prototype patching */
  const originalSetAttribute = HTMLScriptElement.prototype.setAttribute;
  HTMLScriptElement.prototype.setAttribute = function(name, value) {
    if (name === 'src' && value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
      console.log('[TaleoFix‑v8.7] Intercepting setAttribute src:', value);
      
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
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                console.log('[TaleoFix‑v8.7] Cleaning RequireJS module:', value);
                cleanCode = `(function() {\n${cleanCode}\n})();`;
              }
              
              const blob = new Blob([cleanCode], { type: 'application/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              urlMapping.set(blobUrl, value);
              
              console.log('[TaleoFix‑v8.7] setAttribute conversion:', value, '→', blobUrl);
              originalSetAttribute.call(this, name, blobUrl);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.7] Failed setAttribute conversion:', value, err);
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
          console.log('[TaleoFix‑v8.7] Intercepting src property:', value);
          
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
                if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                  console.log('[TaleoFix‑v8.7] Cleaning RequireJS module:', value);
                  cleanCode = `(function() {\n${cleanCode}\n})();`;
                }
                
                const blob = new Blob([cleanCode], { type: 'application/javascript' });
                const blobUrl = URL.createObjectURL(blob);
                urlMapping.set(blobUrl, value);
                
                console.log('[TaleoFix‑v8.7] Src property conversion:', value, '→', blobUrl);
                originalSrcDescriptor.set.call(this, blobUrl);
              })
              .catch(err => {
                console.warn('[TaleoFix‑v8.7] Failed src property conversion:', value, err);
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
      console.log('[TaleoFix‑v8.7] Intercepting script element creation');
      
      // Override the src setter immediately on creation
      const originalSetter = Object.getOwnPropertyDescriptor(element, 'src') || 
                            Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      
      if (originalSetter) {
        Object.defineProperty(element, 'src', {
          get: originalSetter.get,
          set: function(value) {
            if (value && value.includes('taleo.net') && value.match(/\.js(\?.*)?$/)) {
              console.log('[TaleoFix‑v8.7] Intercepting script src on creation:', value);
              
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
                    if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                      console.log('[TaleoFix‑v8.7] Cleaning RequireJS module on creation:', value);
                      cleanCode = `(function() {\n${cleanCode}\n})();`;
                    }
                    
                    const blob = new Blob([cleanCode], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    urlMapping.set(blobUrl, value);
                    
                    console.log('[TaleoFix‑v8.7] Setting clean blob on created script:', value, '→', blobUrl);
                    originalSetter.set.call(this, blobUrl);
                  })
                  .catch(err => {
                    console.warn('[TaleoFix‑v8.7] Failed to fetch on creation, using original:', value, err);
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
        console.log('[TaleoFix‑v8.7] Intercepting appendChild of Taleo script:', src);
        
        if (!processedScripts.has(src)) {
          console.log('[TaleoFix‑v8.7] Preventing original script appendChild:', src);
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
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                console.log('[TaleoFix‑v8.7] Cleaning RequireJS module in appendChild:', src);
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
              
              console.log('[TaleoFix‑v8.7] Appending clean blob script:', src, '→', blobUrl);
              originalAppendChild.call(this, cleanScript);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.7] Failed appendChild conversion, using original:', src, err);
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
        console.log('[TaleoFix‑v8.7] Intercepting insertBefore of Taleo script:', src);
        if (!processedScripts.has(src)) {
          this.appendChild(newChild); // Use our patched appendChild
          return newChild;
        }
      }
    }
    return originalInsertBefore.call(this, newChild, referenceChild);
  };

  /* 5 · Cleanup and scan function for remaining scripts */
  function processAllScripts() {
    const allScripts = document.querySelectorAll('script');
    console.log('[TaleoFix‑v8.7] Final scan of', allScripts.length, 'total scripts');
    
    allScripts.forEach(script => {
      const src = script.src || script.getAttribute('src');
      if (src && src.includes('taleo.net') && src.match(/\.js(\?.*)?$/) && !src.startsWith('blob:')) {
        if (!processedScripts.has(src)) {
          console.log('[TaleoFix‑v8.7] Found unprocessed script in final scan:', src);
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
              if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                console.log('[TaleoFix‑v8.7] Cleaning RequireJS module in final scan:', src);
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
              
              console.log('[TaleoFix‑v8.7] Final scan replacement:', src, '→', blobUrl);
            })
            .catch(err => {
              console.warn('[TaleoFix‑v8.7] Failed final scan replacement:', src, err);
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
            console.log('[TaleoFix‑v8.7] MutationObserver caught bypassed script:', src);
            if (!processedScripts.has(src)) {
              console.warn('[TaleoFix‑v8.7] Script bypassed all interceptions, emergency processing');
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
                    if (cleanCode.includes('define(') && !cleanCode.trim().startsWith('define(')) {
                      console.log('[TaleoFix‑v8.7] Emergency cleaning RequireJS module:', src);
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
                    console.log('[TaleoFix‑v8.7] Emergency replacement complete:', src, '→', blobUrl);
                  })
                  .catch(err => {
                    console.warn('[TaleoFix‑v8.7] Emergency processing failed:', src, err);
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
  
  /* 7 · RequireJS configuration */
  function configureRequireJS() {
    if (window.requirejs && window.require && realBasePath) {
      console.log('[TaleoFix‑v8.7] Configuring RequireJS...');
      
      const basePath = realBasePath.replace('https://wipo.taleo.net', '') + '/js';
      console.log('[TaleoFix‑v8.7] Using base path:', basePath);
      
      try {
        window.requirejs.config({
          baseUrl: basePath,
          paths: {
            'fs': 'facetedsearch',
            'jquery': 'common/jquery.min',
            'jquery.cookie': 'common/jquery.cookie'
          },
          waitSeconds: 60,
          enforceDefine: false,
          urlArgs: 'bust=' + (new Date()).getTime()
        });
        
        console.log('[TaleoFix‑v8.7] RequireJS configured successfully');
      } catch (err) {
        console.warn('[TaleoFix‑v8.7] Failed to configure RequireJS:', err);
      }
    } else if (!realBasePath) {
      console.log('[TaleoFix‑v8.7] Waiting for base path discovery...');
      setTimeout(configureRequireJS, 500);
    }
  }

  /* 8 · RequireJS error handler */
  window.requirejs = window.requirejs || {};
  window.requirejs.onError = function(err) {
    console.warn('[TaleoFix‑v8.7] RequireJS error:', err.requireType, err.requireModules);
    
    if (err.requireType === 'scripterror' && err.requireModules) {
      err.requireModules.forEach(moduleName => {
        console.log('[TaleoFix‑v8.7] Attempting recovery for module:', moduleName);
        
        Array.from(discoveredPaths).forEach(path => {
          if (path.includes(moduleName)) {
            console.log('[TaleoFix‑v8.7] Found potential match for', moduleName, ':', path);
            
            const correctPath = path.replace(/^.*\/js\//, '').replace(/\.js$/, '');
            
            try {
              window.requirejs.config({
                paths: {
                  [moduleName]: correctPath
                }
              });
              console.log('[TaleoFix‑v8.7] Added path mapping:', moduleName, '→', correctPath);
            } catch (configErr) {
              console.warn('[TaleoFix‑v8.7] Failed to add path mapping:', configErr);
            }
          }
        });
      });
    }
  };

  /* 9 · Multi-stage initialization */
  console.log('[TaleoFix‑v8.7] Immediate processing...');
  processAllScripts();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[TaleoFix‑v8.7] DOMContentLoaded processing...');
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
    console.log('[TaleoFix‑v8.7] Window load processing...');
    setTimeout(() => {
      processAllScripts();
      configureRequireJS();
    }, 500);
  });
  
  console.log('[TaleoFix‑v8.7] Ultra-aggressive MIME type bypass initialized!');
})();