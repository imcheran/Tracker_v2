# Remote Notification Command Center - Architecture & Data Flow

## 🎯 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE CLOUD                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   Realtime Database: /notificationCommands/{uid}/notifications   │  │
│  │   Storage: title, appName, message, timestamp, deviceId, etc     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   Firebase Auth (Google): kuttiavt@gmail.com vs other emails     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
      ▲                                            ▲
      │                                            │
      │ 1. LISTENER (subscribe & listen)           │ 2. SENDER (write notifications)
      │                                            │
      │                                            │
┌─────┴─────────────────────────────────────┐  ┌─┴────────────────────────┐
│                                           │  │                          │
│   📱 MAIN PHONE (Viewer Role)             │  │  📱 SENDER PHONE #1      │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │  │  ━━━━━━━━━━━━━━━━━━      │
│                                           │  │                          │
│   Email: kuttiavt@gmail.com               │  │  Email: user1@gmail.com  │
│   Role: VIEWER                            │  │  Role: SENDER            │
│                                           │  │                          │
│   ┌─────────────────────────────────────┐ │  │  ┌────────────────────┐ │
│   │ React App                           │ │  │  │ React App          │ │
│   │                                     │ │  │  │ (Normal UI)        │ │
│   │ ┌─────────────────────────────────┐ │ │  │  │                    │ │
│   │ │ NotificationCommandCenter       │ │ │  │  └────────────────────┘ │
│   │ │ (Shows all notifications)       │ │ │  │         ▲                │
│   │ └─────────────────────────────────┘ │ │  │         │ (React-bridge) │
│   │         ▲                            │ │  │         │                │
│   │         │ (useNotifications hook)    │ │  │         │                │
│   │         │                            │ │  │  ┌──────┴─────────────┐ │
│   │ ┌───────┴┬───────────────────────┐  │ │  │  │ Permission Setup  │ │
│   │ │notificationRepository          │  │ │  │  │ dialogs           │ │
│   │ │ (Firebase listeners)           │  │ │  │  └────────────────────┘ │
│   │ │ - onChildAdded                │ │ │  │                          │
│   │ │ - onChildChanged └────────────┐  │ │  │                          │
│   │ └─────────┬───────────────────────┘  │ │  │  ┌────────────────────┐ │
│   │           │                          │ │  │  │ NotificationList   │ │
│   │           │ (Firebase SDK)           │ │  │  │ enerService        │ │
│   └───────────┼──────────────────────────┘ │  │  │ (Kotlin Service)   │ │
│               │                            │  │  │                    │ │
│   ┌───────────▼──────────────────────────┐ │  │  │ - Intercepts all   │ │
│   │ Firebase Auth                        │ │  │  │   notifications    │ │
│   │ (onAuthStateChanged listener)        │ │  │  │ - Formats payload  │ │
│   └─────────────────────────────────────┘ │  │  │ - Pushes to DB     │ │
│                                           │  │  └────────────────────┘ │
└───────────────────────────────────────────┘  │           ▲              │
                                               │           │ (Native API) │
                                               │  ┌────────┴────────────┐ │
                                               │  │ Android Service     │ │
                                               │  │ Notification API    │ │
                                               │  └─────────────────────┘ │
                                               │                          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  📱 SENDER PHONE #2, #3, ... (Same as Sender Phone #1)          │
│  Email: user2@gmail.com, user3@gmail.com, etc.                  │
│  All follow same pattern as Sender Phone #1                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow - Sender to Viewer

### **Step 1: Notification Intercepted on Sender Phone**
```
┌────────────────────────────────────────────────────────────┐
│ User receives SMS, Chat, or App Notification on Sender     │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          │ Android broadcasts notification
                          │ to all NotificationListenerServices
                          ▼
┌────────────────────────────────────────────────────────────┐
│ NotificationListenerService.onNotificationPosted()         │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ - Receives StatusBarNotification object             │  │
│ │ - Extracts: title, appName, message, timestamp      │  │
│ │ - Gets Firebase user (UID, email)                   │  │
│ │ - Creates minimal JSON payload                      │  │
│ └──────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Payload Example:                                           │
│ {                                                          │
│   "id": "uuid-timestamp",                                 │
│   "title": "Mom",                                         │
│   "appName": "Messages",                                  │
│   "message": "Are you coming home?",                      │
│   "timestamp": 1712428800000,                             │
│   "dismissed": false,                                     │
│   "senderUid": "user1_firebase_uid",                      │
│   "senderEmail": "user1@gmail.com",                       │
│   "deviceId": "android_device_hash"                       │
│ }                                                          │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Firebase Realtime Database WRITE                           │
│ Path: /notificationCommands/{userUID}/notifications/{id}  │
│                                                             │
│ Using Firebase Realtime DB SDK:                           │
│ db.child("notificationCommands")                          │
│   .child(userUid)                                         │
│   .child("notifications")                                 │
│   .child(notificationId)                                  │
│   .setValue(payload)                                      │
└─────────────────────────────┬──────────────────────────────┘
```

### **Step 2: Viewer Receives Real-time Update**
```
┌────────────────────────────────────────────────────────────┐
│ Firebase Realtime Database (Cloud)                         │
│ - Stores notification under sender's UID                   │
│ - Triggers "onChildAdded" event for listeners              │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              │ Firebase SDK pushes update
                              │ to all registered listeners
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Viewer Phone React App                                     │
│                                                             │
│ useNotifications() hook receives update:                   │
│ notificationRepository.subscribeToAllNotifications()      │
│   └─► onChildAdded() callback triggered ────────────────┐ │
│                                                           │ │
│ setState() updates with new notification                 │ │
│   ↓                                                        │ │
│ NotificationCommandCenter.tsx re-renders                 │ │
│   ↓                                                        │ │
│ New notification appears in list (newest first)          │ │
│                                                           │ │
└────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ UI Display:                                                 │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [Messages from user1@gmail.com]                      │  │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                        │  │
│ │                                                       │  │
│ │ 🔴 • Mom                                              │  │
│ │      Are you coming home?                            │  │
│ │      from John's Phone                               │  │
│ │      Just now                                         │  │
│ │      [Details] [✓ Read]                              │  │
│ │                                                       │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ ✅ Notification is now visible to Viewer!                 │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 Role-Based Routing Flow

```
Login with Google ───────────────┐
                                 │
                    ┌────────────▼────────────┐
                    │ Firebase Auth           │
                    │ Check user.email        │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
     ┌───────────▼──────────────┐   ┌───────────▼──────────────┐
     │ email ==                 │   │ email !=                 │
     │ kuttiavt@gmail.com       │   │ kuttiavt@gmail.com       │
     │                          │   │                          │
     │ ✅ VIEWER Role           │   │ ✅ SENDER Role           │
     └───────────┬──────────────┘   └───────────┬──────────────┘
                 │                              │
                 │                         ┌────┴─────────────┐
                 │                         │                  │
                 │              ┌──────────▼──┐       ┌──────┴──────┐
                 │              │ Request      │       │ Request     │
                 │              │ Accessibility│       │ Battery     │
                 │              │ Permission   │       │ Optimization│
                 │              └──────┬───────┘       │ Exemption   │
                 │                     │                └──────┬──────┘
                 │                     └────────┬─────────────┘
                 │                              │
     ┌───────────▼──────────────┐   ┌──────────▼─────────────────┐
     │ Show Command Center      │   │ Initialize Notification    │
     │ - Listen to Firebase DB  │   │ Listener Service           │
     │ - Download all notifs    │   │ - Start background svc     │
     │ - Real-time updates      │   │ - Intercept notifications  │
     │ - Filter by sender       │   │ - Push to Firebase         │
     │ - Mark as read/dismiss   │   │ - Continue normal usage    │
     └──────────────────────────┘   └────────────────────────────┘
```

---

## 📡 Real-Time Sync Architecture

### **Listener Setup (Viewer)**
```typescript
useNotifications() hook
    │
    ├─► Call notificationRepository.subscribeToAllNotifications(listener)
    │       │
    │       └─► Get reference to /notificationCommands
    │           │
    │           ├─► onChildAdded("/notificationCommands")
    │           │   └─► For each new sender, subscribe to their notifications
    │           │
    │           └─► onChildAdded("/notificationCommands/{uid}/notifications")
    │               └─► Fire listener.onNotificationAdded() for each new notif
    │
    ┌──────────────────────────────────────────────────┐
    │ React Component (NotificationCommandCenter)      │
    │                                                  │
    │ onNotificationAdded?.(notification) ────┐       │
    │       │                                 │       │
    │       ├─► setState() - add to list     │       │
    │       ├─► Sort by timestamp (newest)   │       │
    │       ├─► Re-render with new notif    │       │
    │       └─► User sees notification      │       │
    │                                         │       │
    │ Total Latency: ~500-2000ms from        │       │
    └─────────────────────────────────────────┘
      notification sent to visible
```

---

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Firebase Authentication (Google Sign-In)                    │
│                                                             │
│ User clicks "Sign in with Google"                          │
│         │                                                   │
│         ├─► Capacitor GoogleAuth plugin                    │
│         │       │                                           │
│         │       ├─► Native Android: Google Sign-In API      │
│         │       └─► Web: Firebase signInWithPopup()         │
│         │                                                   │
│         ├─► FirebaseAuth.signInWithCredential()             │
│         │       │                                           │
│         │       └─► AWS Cognito backend validates token    │
│         │                                                   │
│         └─► User object created: {uid, email, ...}         │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
        ┌─────────────▼─────────────┐
        │ Check user.email:         │
        │ === "kuttiavt@gmail.com"? │
        └─────────────┬─────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        YES ◄────────────────────────► NO
        │                           │
        │                           │
  [VIEWER]            ┌────────────────────────────┐
        │             │ [SENDER]                   │
        │             │ - Normal app access ✅     │
        │             │ - Request permissions ✅   │
        │             │ - Background service ✅    │
        │             └────────────────────────────┘
        │
  - Read /notificationCommands/* ✅
  - Write own notifications only ❌
        │
        │ NOTE: Firestore/Realtime DB rules
        │ enforce this at the backend level
        │ (no hacks possible)
```

---

## 🔌 Plugin Bridge Communication

```
React/TypeScript Layer              Capacitor Bridge              Native Kotlin Layer
─────────────────────────────────────────────────────────────────────────────────────

useNotifications.ts
requestNotificationListenerPermission()
              │
              ├─► NotificationListenerPlugin.requestPermission()
              │                    │
              │                    ├─► Capacitor Bridge
              │                    │    (serializes to native)
              │                    │
              │                    └─► Native: NotificationListenerPlugin.kt
              │                         requestPermission() method
              │
              ├─► Reads native result
              │   {hasPermission: true}
              │
              └─► setState() in React

Firebase Auth (Native)
              │
              ├─► FirebaseAuth.getInstance()
              │    in NotificationListenerService.kt
              │
              ├─► currentUser?.uid, email
              │
              └─► Tagged to notification payload
                  before Firebase write
```

---

## ⏱️ Expected Latency Timeline

```
Notification arrives on Sender Phone
             │
             ├─ 10-50ms: Android processes notification
             │
             ├─ 50-200ms: NotificationListenerService.onNotificationPosted()
             │            called and extracts data
             │
             ├─ 100-500ms: Firebase Realtime DB WRITE
             │             From Sender to Cloud
             │
             ├─ 0-100ms: Firebase Cloud processes write
             │
             ├─ 50-200ms: Firebase SDK on Viewer
             │            receives onChildAdded() event
             │
             ├─ 50-100ms: React setState() triggers
             │
             ├─ 10-50ms: React component re-renders
             │
             └─ TOTAL: ~400-1300ms (typically 500-800ms)

User sees notification on Main Phone ✅
```

---

## Files & Their Roles

```
Entry Point:
  App.tsx (updated with role routing)

Role Detection:
  notificationRoleService.ts (determines VIEWER vs SENDER)

React Layer:
  ├─ useNotifications.ts (React hook for state)
  ├─ notificationRepository.ts (Firebase listener)
  ├─ notificationListenerPlugin.ts (Capacitor bridge)
  └─ NotificationCommandCenter.tsx (Viewer UI)

Native Android Layer:
  ├─ NotificationListenerService.kt (intercepts)
  ├─ NotificationListenerPlugin.kt (bridge)
  └─ AndroidManifest.xml (configuration)

Firebase:
  ├─ Realtime Database (/notificationCommands)
  ├─ Firebase Auth (Google Sign-In)
  └─ Security Rules (Viewer-only read access)
```

---

## 🎯 State Flow Example

```
User opens app on Viewer phone (main phone)
             │
             ├─► Firebase Auth: onAuthStateChanged()
             │    └─► currentUser.email = "kuttiavt@gmail.com"
             │        └─► createNotificationRoleContext()
             │            └─► role = NotificationRole.VIEWER
             │
             ├─► Render NotificationCommandCenter component
             │    └─► useNotifications() hook runs
             │        └─► Subscribe to Firebase listeners
             │
             └─► Component mounts:
                 state = {
                   notifications: [],
                   senders: [],
                   isLoading: true,
                   selectedSenderId: null,
                   unreadCount: 0
                 }


User sends SMS on Sender phone
             │
             ├─► NotificationListenerService intercepts
             │    └─► Extracts: "Mom", "Messages", "Hey!"
             │
             ├─► Firebase Realtime DB WRITE
             │    Path: /notificationCommands/uid_user1/notifications/notif_123
             │    Data: {title: "Mom", appName: "Messages", ...}
             │
             └─► Firebase notifies all listeners


On Viewer side:
             │
             ├─► notificationRepository listener fires:
             │    onChildAdded(snapshot) ─────────────┐
             │                                        │
             │                         ┌──────────────┘
             │                         │
             │    listener.onNotificationAdded(notification)
             │         │
             │         └─► setState() in useNotifications()
             │
             ├─► React re-renders NotificationCommandCenter
             │    └─► New notification appears in list
             │        with: sender name, app name, message, timestamp
             │
             └─► User sees: 
                 "Mom - Messages - Hey! - from @user1 - just now"
```

---

This architecture ensures:
- ✅ Real-time notification delivery (<1 second typically)
- ✅ Scalable to many sender devices
- ✅ Secure (rules enforce Viewer-only access)
- ✅ Battery-efficient (service runs in background)
- ✅ Privacy-preserving (no heavy data, minimal text only)
