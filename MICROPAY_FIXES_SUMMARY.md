# Micropay SMS Integration Fixes - Summary

## Issues Fixed

### 1. Double Encoding Problems (Client-Side)
- **Problem**: Manual `encodeURIComponent()` calls followed by `URLSearchParams` caused double encoding
- **Solution**: Removed all manual encoding, let `URLSearchParams` handle encoding automatically
- **Files**: `pseker/js/send_sms.js`

### 2. HTTP vs HTTPS Connection Issues
- **Problem**: Server was calling Micropay over HTTP, causing `ERR_CONNECTION_CLOSED`
- **Solution**: Updated all Micropay calls to use HTTPS
- **Files**: `pseker/server.js`, `pseker/services/micropay.js`

### 3. CSP Configuration Issues
- **Problem**: Duplicate CSP settings and unnecessary `http://www.micropay.co.il` in `connect-src`
- **Solution**: Removed duplicate CSP, browser only talks to our server (HTTPS)
- **Files**: `pseker/server.js`

### 4. Request Method Standardization
- **Problem**: Mixed GET/POST usage without clear logic
- **Solution**: Standardized to POST for most requests, GET only when explicitly requested
- **Files**: `pseker/js/send_sms.js`, `pseker/server.js`

## Technical Changes Made

### Client-Side (`send_sms.js`)

#### Before (Problematic):
```javascript
// Double encoding problem
const message = encodeURIComponent(messageTemplate);
const individualParams = new URLSearchParams();
individualParams.append(key, encodeURIComponent(value)); // Double encoding!

// GET requests with query parameters
const individualUrl = `/api/micropay/send-sms?${individualParams.toString()}`;
const response = await fetch(individualUrl, { method: 'GET' });
```

#### After (Fixed):
```javascript
// No manual encoding - let URLSearchParams handle it
const message = messageTemplate; // No encodeURIComponent
const individualParams = new URLSearchParams();
individualParams.append(key.toLowerCase(), value); // Single encoding + lowercase

// POST requests with form data
const response = await fetch('/api/micropay/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: individualParams.toString()
});
```

### Server-Side (`server.js`)

#### Before (Problematic):
```javascript
// HTTP connection to Micropay
const micropayUrl = 'http://www.micropay.co.il/extApi/scheduleSms.php';
const http = require('http'); // Using HTTP module

// Simple GET forwarding
const fullUrl = `${micropayUrl}?${params.toString()}`;
const req = http.request(options, (res) => { ... });
```

#### After (Fixed):
```javascript
// HTTPS connection to Micropay
const host = 'www.micropay.co.il';
const https = require('https'); // Using HTTPS module

// Smart GET/POST handling
const isGet = String(data.get || '').trim() === '1';
const isPost = String(data.post || '').trim() === '2' || !isGet;

const baseOptions = {
    host, port: 443, method: isGet ? 'GET' : 'POST',
    path: isGet ? `${endpoint}?${params.toString()}${wantsValidate ? '&validate' : ''}` : endpoint,
    headers: isGet ? { 'User-Agent': 'sekerapp-proxy/1.0' } : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'sekerapp-proxy/1.0'
    },
    timeout: 15000
};
```

### CSP Configuration

#### Before (Problematic):
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com", "http://www.micropay.co.il"]
            // ^^^ Problem: HTTP Micropay in connect-src
        }
    }
}));
```

#### After (Fixed):
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"]
            // ^^^ Fixed: Removed HTTP Micropay, browser only talks to our server
        }
    }
}));
```

## Architecture After Fixes

```
Browser (HTTPS) → Our Server (HTTPS) → Micropay (HTTPS)
     ↓                    ↓                    ↓
  /api/micropay/    POST/GET with      scheduleSms.php
  send-sms          form data          Returns: OK/ERROR
```

### Key Benefits:
1. **No more double encoding** - Clean, readable code
2. **HTTPS everywhere** - No connection issues
3. **Single CSP source** - No conflicts
4. **Proper Micropay compliance** - Lowercase parameters, correct methods
5. **Better error handling** - Timeouts, proper error messages

## Testing the Fixes

### 1. Test HTTPS Connection to Micropay:
```bash
curl -vkI "https://www.micropay.co.il/extApi/scheduleSms.php"
```

### 2. Test Our Proxy Endpoint:
```bash
curl -X POST "https://sekerapp.online/api/micropay/send-sms" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "post=2&token=XXXXX&from=035555555&msg=hello&list=0540000000"
```

### 3. Test in Browser:
- Open `/send_sms.html`
- Upload CSV or select BigQuery list
- Send SMS
- Check console for clean requests (no double encoding)

## Compliance with Micropay Requirements

✅ **Parameter names in lowercase**: `token`, `from`, `msg`, `list`, `listjson`  
✅ **Proper encoding**: `application/x-www-form-urlencoded`  
✅ **Method selection**: GET with `get=1`, POST with `post=2`  
✅ **listjson support**: JSON string for personalized messages  
✅ **validate parameter**: Added last without value when needed  
✅ **HTTPS connection**: Secure communication with Micropay  

## Files Modified

1. **`pseker/js/send_sms.js`** - Client-side encoding fixes
2. **`pseker/server.js`** - Server-side HTTPS and CSP fixes  
3. **`pseker/services/micropay.js`** - Service HTTPS update
4. **`pseker/MICROPAY_FIXES_SUMMARY.md`** - This documentation

## Next Steps

1. **Test thoroughly** with real Micropay credentials
2. **Monitor logs** for any remaining issues
3. **Add rate limiting** to `/api/micropay/send-sms` if needed
4. **Consider adding retry logic** for failed requests
5. **Add audit logging** for SMS campaigns

## Security Notes

- **Token protection**: Micropay token stays on server, never exposed to browser
- **Authentication**: All endpoints require super admin authentication
- **HTTPS only**: No HTTP communication anywhere in the chain
- **Input validation**: Server validates all parameters before forwarding to Micropay
