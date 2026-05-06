# Firebase Initialization Debugging Guide

## Error: "Authentication service not available. Firebase may not be properly configured"

This error means Firebase failed to initialize when your app started.

## How to Debug

### Step 1: Check Browser Console
1. Open your app
2. Press `F12` to open DevTools
3. Click the **Console** tab
4. Look for **red error messages** about Firebase

### Step 2: Check Firebase Status
The app now logs Firebase status on startup. Look for one of these messages:

**✅ Good (You should see this):**
```
✅ Firebase ready
```

**❌ Bad (This means Firebase initialization failed):**
```
⚠️  Firebase not fully initialized on app startup
This may cause login to fail
Details: {
  appInitialized: false,
  authInitialized: false,
  firestoreInitialized: false,
  ...
}
```

### Step 3: Run Firebase Diagnostic in Console
Open browser console (F12) and type:

```javascript
// If running in dev environment
import { checkFirebaseStatus } from './services/firebaseService';
checkFirebaseStatus();

// OR just look at console output - app already called this
```

## Common Causes & Fixes

### Cause 1: Network Cannot Reach Firebase
**Symptoms:**
- Console shows "Failed to fetch" or "ERR_NAME_NOT_RESOLVED"
- Network requests to `firebase.googleapis.com` are blocked
- Red error about `firebase/app` or similar

**Fix:**
1. Check if `firebase.googleapis.com` is accessible from your network
2. Check if you have a proxy/firewall blocking Google services
3. Try opening https://firebase.google.com in your browser
4. If at work/school, ask IT to whitelist Google APIs

### Cause 2: Corrupted Dependencies
**Symptoms:**
- Console shows `firebase.initializeApp is not a function`
- Missing module errors for Firebase imports

**Fix:**
1. Delete `node_modules` folder
2. Delete `package-lock.json` (if exists)
3. Run: `npm install`
4. Clear browser cache: `Ctrl+Shift+Delete`
5. Hard refresh: `Ctrl+F5`
6. Restart dev server if running

### Cause 3: Invalid Firebase Configuration
**Symptoms:**
- Error mentions invalid API key
- `projectId` or other config fields are undefined

**Fix:**
1. Open [Firebase Console](https://console.firebase.google.com/project/tracker-8fefe)
2. Go to **Project Settings** (gear icon)
3. Copy the config values
4. Update `firebaseConfig` in `services/firebaseService.ts`:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY_HERE",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```
5. Save and reload page

### Cause 4: Stale Browser Cache
**Symptoms:**
- Used to work, suddenly stopped
- Error message is vague

**Fix:**
1. **Clear everything:** `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select **All time** and **Cookies and other site data** + **Cached images and files**
3. Click **Delete**
4. **Hard refresh:** `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Cause 5: Firebase SDK Version Mismatch
**Symptoms:**
- Console shows version compatibility errors
- Some Firebase features return undefined

**Fix:**
1. Check Firebase SDK version in `package.json`
2. Update to latest stable:
   ```bash
   npm install firebase@latest
   ```
3. If that breaks things, revert to working version:
   ```bash
   npm install firebase@10.8.0
   ```

## Advanced Debugging

### Enable Full Diagnostic Output
Add this to your app startup (temporarily for debugging):

```javascript
// In browser console or add to App.tsx
window.debugFirebase = () => {
  const status = checkFirebaseStatus();
  console.group("🔍 Full Firebase Diagnostics");
  console.log("Status:", status);
  console.log("Firebase config present:", {
    apiKey: !!window.firebaseConfig?.apiKey,
    projectId: !!window.firebaseConfig?.projectId,
  });
  console.log("All logs above this message are Firebase related");
  console.groupEnd();
};

// Then call:
window.debugFirebase();
```

### Check Network Requests
1. Open DevTools → **Network** tab
2. Reload page
3. Look for requests to:
   - `firebase.googleapis.com` - should be **200** (success)
   - `identitytoolkit.googleapis.com` - used for auth
   - `securetoken.googleapis.com` - used for tokens
4. If any show **403** or **4xx errors**, your API key is restricted too much

### Check Service Worker Issues
1. Open DevTools → **Application** → **Service Workers**
2. Unregister all service workers
3. Hard refresh (`Ctrl+F5`)
4. Try logging in again

## Still Having Issues?

### Verify Installation
Run in terminal from project folder:
```bash
npm list firebase
```

Should show: `firebase@10.8.0` (or similar)

### Check Node Version
```bash
node --version
```

Should be 16+ (ideally 18+)

### Restart Everything
1. Stop dev server (`Ctrl+C`)
2. Clear cache: `Ctrl+Shift+Delete`
3. Delete `.next` or `.vite` folders (build cache)
4. Run: `npm install`
5. Start server: `npm run dev`
6. Hard refresh: `Ctrl+F5`

### Last Resort: Fresh Clone
If absolutely nothing works:
1. Back up your local data
2. Delete entire project folder
3. Clone fresh from GitHub
4. Run `npm install`
5. Check if it works in fresh instance

## Getting Help

When reporting issues, include:
1. Console output (F12 → Console tab, paste red errors)
2. Firebase status (see Step 2 above)
3. Your Node version (`node --version`)
4. Your npm version (`npm --version`)
5. When did it last work?
6. What changed since then?

## References
- [Firebase Installation Guide](https://firebase.google.com/docs/web/setup)
- [Firebase Auth Troubleshooting](https://firebase.google.com/docs/auth/troubleshooting)
- [Firebase Console](https://console.firebase.google.com)
