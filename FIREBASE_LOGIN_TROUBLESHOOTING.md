# Firebase Login Troubleshooting Guide

## Issue: "Login failed. Please try again"

This error typically occurs due to misconfiguration in Firebase or domain/CORS issues.

## Quick Diagnosis Checklist

### 1. **Authorized Domains** ⚠️ MOST COMMON
The domain where your app runs must be added to Firebase authorized domains.

**Fix:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **tracker-8fefe**
3. Go to **Authentication** → **Settings** → **Authorized Domains**
4. Add these domains:
   - `localhost`
   - `localhost:5173` (Vite default dev port)
   - `localhost:3000` (if using different port)
   - Your actual production domain (e.g., `yourapp.com`)
   - `127.0.0.1`

### 2. **Google OAuth Configuration**
Check that your Google OAuth consent screen is set up correctly.

**Fix:**
1. Firebase Console → **Authentication** → **Sign-in providers**
2. Click **Google** and verify:
   - Provider is **enabled**
   - Web Client ID matches your app
3. Go to **Google Cloud Console** → **APIs & Services** → **OAuth 2.0 Consent Screen**
4. Verify your app is in **Testing** or **Production** mode
5. If testing, add your test email as a test user

### 3. **API Keys Restrictions**
Your API key might have restrictions blocking Sign-In.

**Fix:**
1. Firebase Console → **Project Settings** → **API Keys**
2. Click your Web API key
3. Go to **Key restrictions** → **API restrictions**
4. Select **"Restrict key and set specific APIs"**
5. Add: **Identity Toolkit API** (for Firebase Auth)
6. Save

### 4. **Content Security Policy (CSP)**
Strict CSP might block auth popups.

**Fix for Vite:**
Add/verify in `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com;
  connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com https://www.googleapis.com;
  frame-src https://www.google.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
">
```

### 5. **Browser Console Errors**
Check the actual error message in browser DevTools (F12).

**Common errors:**
- **"Unauthorized domain"** → Add domain to Firebase
- **"CORS error"** → Check API key restrictions
- **"Popup blocked"** → Browser popup blocker issue
- **"User cancelled"** → User closed popup

### 6. **Firebase Project ID Mismatch**
Verify your `firebaseConfig` matches your actual Firebase project.

**Fix:**
1. Firebase Console → Project Settings
2. Verify these match in `firebaseService.ts`:
   - `projectId`: "tracker-8fefe"
   - `apiKey`: Should start with "AIzaSyB..."
   - `authDomain`: "tracker-8fefe.firebaseapp.com"

## Debug Steps

### Step 1: Enable Debug Logging
Add this to your `App.tsx` or `firebaseService.ts`:

```typescript
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// After Firebase initialization:
const auth = getAuth();
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('Firebase Debug: Auth Emulator enabled');
}
```

### Step 2: Test in Browser Console
Run this in DevTools console:

```javascript
// Check if Firebase is loaded
console.log('Firebase:', typeof firebase !== 'undefined');

// Check auth status
firebase.auth().onAuthStateChanged(user => {
  console.log('Auth state:', user);
});

// Try manual sign-in (requires popup)
const provider = new firebase.auth.GoogleAuthProvider();
firebase.auth().signInWithPopup(provider)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error.code, error.message));
```

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Try logging in
3. Look for requests to:
   - `identitytoolkit.googleapis.com` (should be 200)
   - `securetoken.googleapis.com` (should be 200)
4. If these return 403/4xx, your API key is restricted too much

## Enhanced Error Handling

The error handling has been improved in `firebaseService.ts` to provide more specific error messages. Check browser console for detailed error information.

## Testing on Different Environments

### Development (Localhost)
- Add `localhost` to authorized domains
- Test on `http://localhost:5173`

### Staging
- Add your staging domain to authorized domains

### Production
- Add your production domain to authorized domains
- Use production Firebase project (or create separate config)

## Still Not Working?

Try these additional steps:
1. **Clear browser cache** and local storage (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5 or Cmd+Shift+R)
3. **Try incognito/private window** (bypasses extensions and cache)
4. **Check firewall/proxy** blocking Google APIs
5. **Disable browser extensions** (ad blockers, security extensions)
6. **Create new Firebase project** as test (verify it's not project-specific issue)

## Verify Configuration

Current Firebase Config:
- **Project ID**: tracker-8fefe
- **Auth Domain**: tracker-8fefe.firebaseapp.com
- **API Key**: AIzaSyBliJyouiIZ0opeozDFvjUkcFBzVruOBzI
- **Capacitor Google Auth**: Uses separate clientId for Android

## References
- [Firebase Auth Troubleshooting](https://firebase.google.com/docs/auth/troubleshooting)
- [Firebase Authorized Domains](https://firebase.google.com/docs/hosting/manage-hosting-resources)
- [Google OAuth Configuration](https://developers.google.com/identity/protocols/oauth2)
