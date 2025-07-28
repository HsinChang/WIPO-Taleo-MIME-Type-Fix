# WIPO Taleo MIME Type Fix

A TamperMonkey userscript that bypasses strict MIME type checking issues on WIPO Taleo job application pages, allowing proper loading and execution of JavaScript resources.

## 🚨 For WIPO Technical Team: Server-Side Solutions Recommended

**This client-side workaround exists because of server-side MIME type configuration issues that should be addressed at the source.**

### Recommended Server-Side Fixes

#### 1. **Fix MIME Type Configuration** (Preferred Solution)
```apache
# Apache .htaccess or server config
<Files "*.js">
    ForceType application/javascript
</Files>

# Or using AddType
AddType application/javascript .js
```

```nginx
# Nginx configuration
location ~* \.js$ {
    add_header Content-Type application/javascript;
}
```

#### 2. **CDN/Reverse Proxy Headers**
If using a CDN or reverse proxy, ensure proper MIME type headers:
```
Content-Type: application/javascript
```

#### 3. **Application Server Configuration**
- **IIS**: Configure `web.config` to set proper MIME types
- **Tomcat**: Update `web.xml` with correct MIME mappings
- **Node.js/Express**: Use `express.static` with proper MIME type configuration

#### 4. **Taleo Configuration Review**
- Review Taleo platform configuration for static resource serving
- Ensure JavaScript resources are served with correct Content-Type headers
- Consider upgrading Taleo platform if using an outdated version

### Why This Matters
- **User Experience**: Job applicants face broken functionality and cannot complete applications
- **Accessibility**: Users with strict browser security settings cannot access your services
- **SEO/Performance**: Improper MIME types can affect search engine indexing and caching
- **Security**: Client-side workarounds introduce unnecessary complexity and potential vulnerabilities

### Testing Server-Side Fix
After implementing server-side changes, verify with:
```bash
curl -I https://wipo.taleo.net/careersection/*/js/common/require.js
# Should return: Content-Type: application/javascript
```

---

## 🔧 Client-Side Workaround (TamperMonkey)

**Use this only if WIPO has not yet implemented the server-side fix.**

### What This Script Does

This script intercepts and fixes JavaScript loading issues on WIPO Taleo pages by:

1. **MIME Type Bypass**: Converts scripts with incorrect MIME types to proper blob URLs
2. **Execution Sequencing**: Ensures RequireJS loads before dependent scripts execute
3. **Ultra-Aggressive Interception**: Catches scripts at multiple DOM manipulation points
4. **RequireJS Configuration**: Automatically configures module paths and timeouts

### Installation Tutorial

#### Step 1: Install TamperMonkey
1. **Chrome**: Install from [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. **Firefox**: Install from [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
3. **Safari**: Install from [App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)
4. **Edge**: Install from [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

#### Step 2: Install the Script
1. **Click the TamperMonkey icon** in your browser toolbar
2. **Select "Create a new script..."**
3. **Delete the default template** and paste the entire contents of [`script.js`](script.js)
4. **Save the script** (Ctrl+S or Cmd+S)

#### Step 3: Alternative Installation (Direct)
1. **Copy the raw script URL**: `https://raw.githubusercontent.com/HsinChang/WIPO-Taleo-MIME-Type-Fix/main/script.js`
2. **Click TamperMonkey icon** → **"Dashboard"**
3. **Click "Utilities" tab**
4. **Paste the URL** in "Install from URL" field
5. **Click "Install"**

#### Step 4: Verify Installation
1. **Navigate to** any WIPO Taleo job page (e.g., `https://wipo.taleo.net/careersection/...`)
2. **Open browser console** (F12 → Console tab)
3. **Look for log messages** starting with `[TaleoFix‑v8.11]`
4. **Verify functionality**: Job search, filtering, and application forms should work properly

### Script Configuration

The script automatically detects and handles:
- All `*.js` files served from `wipo.taleo.net`
- RequireJS module dependencies
- Dynamic script loading

#### Manual Configuration (if needed)
The script includes sensible defaults, but you can modify:

```javascript
// In the script, around line 620-630
window.requirejs.config({
  baseUrl: basePath,
  paths: {
    'fs': 'facetedsearch',
    'FacetedSearchPage': 'facetedsearch/FacetedSearchPage',
    'jquery': 'common/jquery.min',
    'jquery.cookie': 'common/jquery.cookie'
  },
  waitSeconds: 60, // Increase if experiencing timeouts
  enforceDefine: false,
  urlArgs: 'bust=' + (new Date()).getTime()
});
```

### Troubleshooting

#### Common Issues

**1. Script Not Loading**
- Verify TamperMonkey is enabled for the site
- Check that the script is enabled in TamperMonkey dashboard
- Ensure you're on a matching domain (`wipo.taleo.net`)

**2. Still Seeing MIME Type Errors**
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache for the site
- Check console for script execution logs

**3. RequireJS Timeout Errors**
- The script automatically extends timeouts to 60-120 seconds
- Check network connectivity
- Try refreshing the page

**4. Script Updates**
- The script auto-updates through TamperMonkey
- Check for updates manually in TamperMonkey dashboard
- Current version: **v8.11**

#### Debug Mode
To enable verbose logging, open browser console and run:
```javascript
// This will show detailed interception logs
localStorage.setItem('taleofix-debug', 'true');
```

### Technical Details

#### How It Works
1. **Document Start Execution**: Runs before any page scripts load
2. **Prototype Patching**: Intercepts `setAttribute`, `src` property, and `createElement`
3. **DOM Manipulation Interception**: Hooks `appendChild` and `insertBefore`
4. **Blob Conversion**: Fetches problematic scripts and creates blob URLs with correct MIME type
5. **Execution Sequencing**: Delays RequireJS-dependent scripts until RequireJS is ready
6. **Emergency Fallback**: MutationObserver catches any scripts that bypass other methods

#### Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Works with all TamperMonkey versions

### Security Considerations

This script:
- ✅ Only processes scripts from `wipo.taleo.net` domain
- ✅ Does not modify script content beyond MIME type fixes
- ✅ Uses browser's built-in fetch API for security
- ✅ Runs in isolated TamperMonkey context
- ❌ Cannot be used maliciously on other sites due to domain restrictions

### Contributing

Found an issue? Please report it with:
1. Browser version and type
2. TamperMonkey version
3. Console error messages
4. Steps to reproduce

### Version History

- **v8.11** (Current): Enhanced RequireJS timing and execution sequencing
- **v8.10**: Ultra-aggressive interception and proper execution sequencing  
- **v8.9**: Enhanced RequireJS detection and error handling
- **v8.8**: Improved RequireJS configuration and module loading
- **v8.7**: Added ultra-aggressive DOM interception methods
- Earlier versions: Progressive improvements to script interception

---

## 📞 Contact WIPO

**Please encourage WIPO to implement the server-side fix by contacting:**
- **Technical Support**: Through their official support channels
- **Career Portal Feedback**: Use feedback forms on their job portal
- **IT Department**: Request proper MIME type configuration

A simple server-side configuration change would eliminate the need for this workaround entirely and provide a better experience for all job applicants.

---

## License

MIT License - Feel free to use, modify, and distribute.

## Disclaimer

This is an unofficial workaround for technical issues on WIPO's Taleo platform. It is not affiliated with or endorsed by WIPO or Taleo. Use at your own discretion.
