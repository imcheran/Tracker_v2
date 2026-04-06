# File Placement & Import Guide

## 📂 File Organization Reference

### **React/TypeScript Files** (Already in workspace)
```
tracker_v2/
├── services/
│   ├── notificationRoleService.ts          ✅ CREATED
│   ├── notificationListenerPlugin.ts       ✅ CREATED
│   ├── notificationRepository.ts           ✅ CREATED
│   ├── useNotifications.ts                 ✅ CREATED
│   ├── firebaseService.ts                  (existing)
│   └── ...other services
│
├── components/
│   ├── NotificationCommandCenter.tsx       ✅ CREATED
│   └── ...other components
│
├── types.ts                                ✅ EXTENDED with notification types
├── App.tsx                                 ⚠️ NEEDS UPDATE (see INTEGRATION_GUIDE.tsx)
│
└── INTEGRATION_GUIDE.tsx                   📖 Reference implementation
```

### **Native Android Files** (Copy to your android/ folder)
```
android/app/src/main/java/com/cheran/tracker/
├── services/
│   └── NotificationListenerService.kt      📋 Copy from workspace root
│
├── plugins/
│   └── NotificationListenerPlugin.kt       📋 Copy from workspace root
│
└── MainActivity.kt                         ⚠️ ADD plugin registration

android/app/src/main/
└── AndroidManifest.xml                     ⚠️ ADD permissions & service
```

---

## 📚 Import Statements

### In App.tsx (Viewer Role Check)
```typescript
import { 
  NotificationRole, 
  createNotificationRoleContext, 
  initializeRoleServices 
} from "./services/notificationRoleService";

import { NotificationCommandCenter } from "./components/NotificationCommandCenter";
```

### In Sender Settings Component
```typescript
import {
  requestNotificationListenerPermission,
  requestBatteryOptimizationExemption
} from "./services/notificationRoleService";
```

### Using the Notification Hook
```typescript
import { useNotifications } from "./services/useNotifications";

// Inside a React component:
export function MyComponent() {
  const {
    notifications,
    senders,
    selectedSenderId,
    isLoading,
    error,
    unreadCount,
    markDismissed,
    selectSender,
    clearAll
  } = useNotifications();
  
  // Use the values...
}
```

### Notification Types
```typescript
import type {
  InterceptedNotification,
  NotificationAction,
  NotificationSenderMetadata,
  NotificationViewerState
} from "./types";
```

---

## 🔧 Configuration Files to Update

### 1. AndroidManifest.xml
**Path:** `android/app/src/main/AndroidManifest.xml`

**Add permissions** (before `<application>`):
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

**Add service** (inside `<application>`):
```xml
<service
    android:name=".services.NotificationListenerService"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

### 2. MainActivity.kt
**Path:** `android/app/src/main/java/com/cheran/tracker/MainActivity.kt`

**Add import:**
```kotlin
import com.cheran.tracker.plugins.NotificationListenerPlugin
```

**Add in onCreate():**
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    registerPlugin(NotificationListenerPlugin::class)
    
    // ... rest of initialization
}
```

### 3. Firebase Console Settings
**Realtime Database Rules:**
Go to: https://console.firebase.google.com → Select `tracker-8fefe` → Realtime Database → Rules

Replace with:
```json
{
  "rules": {
    "notificationCommands": {
      "$senderUID": {
        ".read": "root.child('notificationCommands').child(auth.uid).exists() || auth.token.email == 'kuttiavt@gmail.com'",
        ".write": "auth.uid == $senderUID",
        "notifications": {
          "$notifId": {
            ".validate": "newData.hasChildren(['title', 'appName', 'message', 'timestamp'])"
          }
        }
      }
    }
  }
}
```

---

## ✅ Checklist Before Testing

- [ ] **Kotlin files copied** to `android/app/src/main/java/com/cheran/tracker/`
- [ ] **AndroidManifest.xml updated** with permissions and service
- [ ] **MainActivity.kt updated** with plugin registration
- [ ] **Firebase Realtime Database rules updated**
- [ ] **App.tsx updated** with role routing logic
- [ ] **Two test Android devices** available (one for Viewer, one for Sender)
- [ ] **Different email accounts** ready for each device
- [ ] **Main phone email** set to `kuttiavt@gmail.com`

---

## 🧪 First Test Run

### Device 1: Main Phone (Viewer)
1. Log in as `kuttiavt@gmail.com`
2. You should see **Notification Command Center** UI
3. Keep this phone running

### Device 2: Secondary Phone (Sender)
1. Log in as different email (e.g., `sender@gmail.com`)
2. You should see permission request dialogs
3. Grant Accessibility Service permission
4. Grant Battery Optimization exemption
5. Continue using the app normally

### Trigger a Test Notification
1. On Device 2: Open settings and send an SMS or notification to yourself
2. Check **Device 1**: Notification should appear in Command Center within 2 seconds

### Check Firebase Console
1. Go to Firebase Console → Realtime Database
2. Expand `/notificationCommands` → You should see the sender's UID
3. This confirms data is being written

---

## 🔍 Debugging Commands

### Android Studio Logcat
```bash
# Filter for NotificationListener logs
adb logcat | grep "NotificationListener"

# Filter for Firebase logs
adb logcat | grep "Firebase"

# Full logs for the app
adb logcat | grep "com.cheran.tracker"
```

### Check Accessibility Settings (adb)
```bash
# See enabled notification listeners
adb shell settings get secure enabled_notification_listeners

# Should show: com.cheran.tracker/.services.NotificationListenerService
```

---

## 🚀 Sample Component Usage

### In App.tsx
```tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebaseService";
import {
  createNotificationRoleContext,
  initializeRoleServices,
  NotificationRole
} from "./services/notificationRoleService";
import { NotificationCommandCenter } from "./components/NotificationCommandCenter";

export function App() {
  const [roleContext, setRoleContext] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const context = createNotificationRoleContext(user);
        setRoleContext(context);
        await initializeRoleServices(context);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (isInitializing) return <LoadingScreen />;
  if (!roleContext) return <LoginScreen />;

  if (roleContext.role === NotificationRole.VIEWER) {
    return <NotificationCommandCenter />;
  }

  return <YourNormalApp />;
}
```

---

## 📋 Document References

| Document | Purpose | Location |
|----------|---------|----------|
| Implementation Summary | Full setup guide | `IMPLEMENTATION_SUMMARY.md` |
| Integration Guide | Code examples | `INTEGRATION_GUIDE.tsx` |
| Manifest Additions | XML snippets | `ANDROID_MANIFEST_ADDITIONS.xml` |
| This File | Quick reference | `FILE_PLACEMENT.md` |

---

## 💡 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| NotificationListenerService not intercepting | Verify in Accessibility Settings that it's enabled |
| Notifications not reaching Firebase | Check Firebase Realtime DB rules are deployed |
| Type errors in TypeScript | Run `npm install` to update types |
| Plugin not found error | Verify `registerPlugin()` is called in MainActivity.kt |
| "No authenticated user" error | Check Firebase Auth user exists before initializing |

---

All files are ready! Start with the checklist above. 🚀
