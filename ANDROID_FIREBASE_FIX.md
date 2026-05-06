# Android Native Authentication Fix Guide

## Issue Summary
Firebase authentication on Android was failing because of two misconfigurations:
1. Using **Android Client ID** instead of **Web Client ID** in Capacitor
2. Missing or incorrect `server_client_id` in Android `strings.xml`
3. Potential SHA-1 hash mismatch

## What Was Fixed in Code ✅

In `firebaseService.ts`, the Capacitor Google Auth initialization now uses:

```typescript
// Web Client ID (correct)
clientId: '965709257556-9mjjqb4rjp6uc60j66cct9d692t7jl5q.apps.googleusercontent.com'

// NOT Android Client ID (incorrect)
// clientId: '965709257556-mrjfaagv12o82bf5hmekc5h5t62r1ma8.apps.googleusercontent.com'
```

## What YOU Need to Fix - Android strings.xml

Your Android app reads the Google OAuth configuration from `android/app/src/main/res/values/strings.xml`.

### Step 1: Locate the file
```
android/
  └─ app/
     └─ src/
        └─ main/
           └─ res/
              └─ values/
                 └─ strings.xml
```

### Step 2: Add or Update server_client_id
Open `strings.xml` and ensure it contains:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Tracker</string>
    <string name="title_activity_main">Tracker</string>
    <string name="package_name">com.cheran.tracker</string>
    <string name="custom_url_scheme">com.cheran.tracker</string>
    
    <!-- IMPORTANT: Use Web Client ID here, NOT Android Client ID -->
    <string name="server_client_id">965709257556-9mjjqb4rjp6uc60j66cct9d692t7jl5q.apps.googleusercontent.com</string>
</resources>
```

### Step 3: Verify Your SHA-1 Hash

Your Android app must be signed with a keystore that produces the SHA-1 hash: **`a28b29a9e1d82fe1b4dc4b9be1f80c93bc3b487c`**

#### For Debug Builds (local testing):
If your debug SHA-1 doesn't match, you need to regenerate the debug keystore:

```bash
# Windows (PowerShell)
Remove-Item "$env:USERPROFILE\.android\debug.keystore" -Force -ErrorAction SilentlyContinue
```

```bash
# macOS/Linux
rm ~/.android/debug.keystore
```

Then rebuild - Android Studio will generate a new debug keystore and output the SHA-1.

#### For Release Builds:
You need the release keystore SHA-1 to match. If you don't have it, you must use the same keystore that generated `a28b29a9e1d82fe1b4dc4b9be1f80c93bc3b487c`.

### Step 4: Verify SHA-1 (All Platforms)

Get your current app's SHA-1:

**Windows (PowerShell):**
```powershell
cd $env:USERPROFILE\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the line that shows:
```
SHA1: A2:8B:29:A9:E1:D8:2F:E1:B4:DC:4B:9B:E1:F8:0C:93:BC:3B:48:7C
```

Remove the colons to get: `a28b29a9e1d82fe1b4dc4b9be1f80c93bc3b487c`

### Step 5: Rebuild and Test

After making these changes:

```bash
# Clean build
npm run build

# On Android Device/Emulator
npx cap run android

# OR with Android Studio
npx cap open android
# Then Build → Clean Build Folder
# Then Run on emulator/device
```

## Troubleshooting Native Login

### Error: "10" (Google Play Services error)
**Cause:** SHA-1 hash doesn't match Firebase configuration
**Fix:** Verify SHA-1 matches `a28b29a9e1d82fe1b4dc4b9be1f80c93bc3b487c`

### Error: "DEVELOPER_ERROR"
**Cause:** Usually API key restrictions or client ID mismatch
**Fix:** 
1. Check `strings.xml` has correct Web Client ID
2. Go to Firebase Console → Project Settings → API Keys
3. Verify "Identity Toolkit API" is in the allowed APIs

### Error: "WEB_CONTEXT_CANCELED"
**Cause:** User cancelled the login flow
**Fix:** This is normal - user just needs to try again

### Auth works on web but not on Android
**Cause:** Likely the `strings.xml` mismatch
**Fix:** Verify `server_client_id` in `strings.xml` matches the Web Client ID

## Client ID Reference

From your `google-services.json`:

| ID Type | Value | Used For |
|---------|-------|----------|
| **Web Client ID** | `965709257556-9mjjqb4rjp6uc60j66cct9d692t7jl5q.apps.googleusercontent.com` | Capacitor, strings.xml, Token exchange |
| **Android Client ID** | `965709257556-mrjfaagv12o82bf5hmekc5h5t62r1ma8.apps.googleusercontent.com` | Android manifest signing (not used for auth config) |
| **SHA-1 Hash** | `a28b29a9e1d82fe1b4dc4b9be1f80c93bc3b487c` | APK signing verification |

## Side-Effect Imports Fix ✅

In `firebaseService.ts`, I've removed:
```typescript
// REMOVED - these are Firebase v8 (compat) and cause circular dependencies in Vite production builds
import "firebase/auth";
import "firebase/firestore";
```

These were causing initialization to crash on the Vercel deployment. The modern Firebase v9 modular API doesn't need them.

## Complete Fix Checklist

- [x] Code: Updated Capacitor clientId to Web Client ID
- [x] Code: Removed side-effect imports
- [ ] **YOU DO THIS:** Update `android/app/src/main/res/values/strings.xml`
- [ ] **YOU DO THIS:** Verify SHA-1 hash matches
- [ ] **YOU DO THIS:** Rebuild Android app
- [ ] Test login on Android device/emulator

## References

- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Capacitor Google Auth Plugin](https://github.com/CodetrixStudio/CapacitorGoogleAuth)
- [Google OAuth 2.0 Configuration](https://developers.google.com/identity/protocols/oauth2)

## Need Help?

If login still fails after these changes:
1. Open Android Logcat and search for "GoogleAuth" or "Firebase"
2. Run `adb logcat | grep -i firebase` to see Firebase errors
3. Check that all strings in `strings.xml` exactly match the values provided
4. Verify SHA-1 one more time - typos here are common
