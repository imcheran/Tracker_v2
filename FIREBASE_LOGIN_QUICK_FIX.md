# 🔐 Firebase Login Fix - Quick Start

## Your Firebase Project
- **Project ID**: `tracker-8fefe`
- **Console URL**: https://console.firebase.google.com/project/tracker-8fefe

## ✅ To Fix Login in 5 Minutes

### Step 1: Go to Authorized Domains
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select project **tracker-8fefe**
3. Click **Authentication** (left sidebar)
4. Click **Settings** tab (top)
5. Scroll to **Authorized Domains**

### Step 2: Add Your Domain
Add these domains (if they're not already there):

| Domain | Purpose |
|--------|---------|
| `localhost` | Local development |
| `127.0.0.1` | Local development alternative |
| `localhost:5173` | Vite dev server port |
| `localhost:3000` | Alternative dev port |
| Your production domain | Production deployment |

**Example**: If you see "tracker-8fefe.firebaseapp.com" in the list, that's Firebase Hosting.

### Step 3: Verify Google OAuth Setup
1. In Firebase Console, go to **Authentication** → **Sign-in providers**
2. Verify **Google** shows as "Enabled" (blue toggle)
3. If disabled, click it and enable it

### Step 4: Check API Key Restrictions
1. Go to **Project Settings** → **API Keys**
2. Click on your Web API key (shows "AIzaSyB...")
3. Under **Key restrictions** → **API restrictions**
4. Select **"Restrict key and set specific APIs"**
5. Add **"Identity Toolkit API"** to the list
6. Click **Save**

### Step 5: Test the Fix
1. **Clear browser cache**: Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. **Hard refresh**: Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
3. Click **"Sign in with Google"** button
4. Try logging in

## 🐛 If Still Not Working

### Check Browser Console
Press `F12` to open DevTools and look for errors. Common errors:

| Error | Fix |
|-------|-----|
| `Unauthorized domain` | Add your domain to Authorized Domains (Step 2) |
| `CORS error` | Check API key restrictions include "Identity Toolkit API" (Step 4) |
| `Popup blocked` | Your browser blocked the popup - allow it |
| `User cancelled` | You clicked "Cancel" - just try again |
| `Network request failed` | Check internet connection or network/firewall blocking Google APIs |

### Nuclear Option: Test with New Project
If nothing works, create a test Firebase project to verify setup:
1. [Create new Firebase project](https://console.firebase.google.com)
2. Enable Google Auth
3. Add localhost to authorized domains
4. Replace config in code temporarily to test

## 📝 What These Improvements Do

Your app now provides better error messages:
- ✓ Tells you exactly which domain is blocked
- ✓ Direct link to Firebase settings needed
- ✓ Specific API issues identified
- ✓ Console logs show initialization progress

## 🚀 If You're Deploying

Before deploying to production:
1. Add your production domain to **Authorized Domains**
2. Create OAuth 2.0 credentials for the production domain in Google Cloud Console
3. Ensure Firestore rules allow your users to read/write their data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /partnerInvites/{code} {
      allow read, write: if request.auth != null;
    }
    match /couples/{coupleId} {
      allow read, write: if request.auth.uid in resource.data.userIds;
    }
  }
}
```

## 💡 Pro Tips

- **Development**: Keep `localhost` and `127.0.0.1` in authorized domains for faster iteration
- **Testing**: Use incognito window to clear all cache/cookies
- **Debugging**: Check `FIREBASE_LOGIN_TROUBLESHOOTING.md` for advanced debugging
- **Logs**: Open browser console to see Firebase initialization progress

## 🆘 Still Stuck?

1. Check `FIREBASE_LOGIN_TROUBLESHOOTING.md` for detailed debugging
2. Open browser console (F12) and copy any Firebase error codes
3. Check [Firebase Auth Docs](https://firebase.google.com/docs/auth/troubleshooting)
4. Verify your Firebase project isn't on the free tier (unlikely but possible)

---

**Last Updated**: May 6, 2026
**Firebase SDK Version**: 10.8.0
**App Version**: Tracker v2
