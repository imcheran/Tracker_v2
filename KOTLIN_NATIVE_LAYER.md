# Kotlin Native Layer - Complete Documentation

## Overview

The Notification Command Center uses **three key Kotlin components** to intercept Android notifications and forward them to Firebase for your main phone to view.

---

## 1. NotificationInterceptorService.kt

**Purpose:** Main background service that intercepts ALL system notifications

**Location:** `android/app/src/main/java/com/cheran/tracker/services/NotificationInterceptorService.kt`

**Extends:** `NotificationListenerService` (Android Framework)

**Key Responsibilities:**
- Listens for all incoming notifications via `onNotificationPosted()`
- Extracts minimal data: title, app name, message, timestamp
- Formats payload into JSON
- Pushes to Firebase Realtime Database
- Updates sender metadata (last seen, device ID, battery status)
- Provides callback to React bridge for real-time updates

**How It Works:**

```
┌─────────────────────────────────────────────────────┐
│  Android System receives notification from app      │
│  (e.g., SMS, Chat, Reminder)                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  onNotificationPosted(StatusBarNotification)        │
│  NotificationInterceptorService.kt                  │
│                                                     │
│  1. Check user is authenticated (Firebase)         │
│  2. Extract fields from notification               │
│  3. Create minimal JSON payload                    │
│  4. Add metadata (sender UID, email, device)       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  pushNotificationToFirebase()                       │
│                                                     │
│  Write to path:                                     │
│  /notificationCommands/{senderUID}/                │
│    notifications/{notificationId}                   │
│                                                     │
│  Payload:                                           │
│  {                                                  │
│    "title": "...",                                  │
│    "appName": "...",                               │
│    "message": "...",                               │
│    "timestamp": ServerValue.TIMESTAMP,             │
│    "deviceId": "...",                              │
│    "senderUid": "...",                             │
│    "senderEmail": "..."                            │
│  }                                                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Firebase Realtime Database                        │
│  (Cloud)                                           │
│                                                     │
│  Stores notification for viewer access             │
│  Triggers listeners on all connected devices       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Main Phone (Viewer)                              │
│  React Component receives update via Firebase SDK  │
│  NotificationCommandCenter displays notification   │
└─────────────────────────────────────────────────────┘
```

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `onCreate()` | Service starts - sets up logging |
| `onNotificationPosted(sbn)` | **Main:** Intercepts notification → Extract → Firebase write |
| `onNotificationRemoved(sbn)` | Logs when notification is dismissed |
| `pushNotificationToFirebase()` | Writes payload to `/notificationCommands/{uid}/notifications/` |
| `updateSenderMetadata()` | Updates `/notificationCommands/{uid}/metadata` with device info |
| `extractTitle/Message/BigText()` | Parse Android Notification object for text |
| `hasNotificationListenerPermission()` | Check if user enabled in Accessibility Settings |
| `requestBatteryOptimizationExemption()` | Open system dialog to disable Doze |
| `isBatteryOptimizationExempted()` | Check if Doze mode disabled |

**Firebase Integration:**

```kotlin
// Path where notifications are written
val notificationRef = firebaseDb
  .child("notificationCommands")      // Root
  .child(userUid)                     // Sender's UID
  .child("notifications")             // All notifications
  .child(notificationId)              // Individual notification ID

// With server timestamp for consistency
val dataToWrite = mapOf(
  "id" to notificationId,
  "title" to title,
  "appName" to appName,
  "message" to message,
  "timestamp" to ServerValue.TIMESTAMP,  // Server time
  "senderUid" to user.uid,
  "senderEmail" to user.email,
  "deviceId" to deviceId
)

notificationRef.setValue(dataToWrite)
  .addOnSuccessListener { Log.d(TAG, "✓ Pushed") }
  .addOnFailureListener { e -> Log.e(TAG, "✗ Failed: ${e.message}") }
```

---

## 2. NotificationListenerPlugin.kt

**Purpose:** Capacitor plugin that bridges React/TypeScript to the Kotlin service

**Location:** `android/app/src/main/java/com/cheran/tracker/plugins/NotificationListenerPlugin.kt`

**Extends:** Capacitor `Plugin`

**Key Responsibilities:**
- Provides methods callable from React (via TypeScript interface)
- Manages permission requests
- Gets/checks notification listener permission
- Handles battery optimization exemption
- Passes Firebase user info to the service
- Registers/unregisters notification callbacks

**How It Works - Method Mapping:**

```
React TypeScript                    Capacitor Bridge              Kotlin Plugin
─────────────────────────────────────────────────────────────────────────────────

notificationRoleService.ts
  requestNotificationListenerPermission()
           │                                                          │
           ├──────────► NotificationListenerPlugin.requestPermission() ◄──┤
           │                                                               │
           │            NotificationListenerPlugin.kt                     │
           │            @PluginMethod fun requestPermission(call)         │
           │              ├─ Opens Accessibility Settings                 │
           │              └─ result.put("hasPermission", hasPermission)   │
           │                                                               │
           └───────────── Returns: {hasPermission: true/false}  ◄─────────┘

useNotifications.ts
  addNotificationListener()
           │
           ├──────────► NotificationListenerPlugin.addNotificationListener() ◄──┤
           │                                                                    │
           │            Registers callback:                                     │
           │            NotificationInterceptorService.                         │
           │              notificationCallback = { data →                       │
           │                notifyListeners("notificationReceived", data)       │
           │              }                                                     │
           │                                                                    │
           └───────────── Waits for Capacitor event ◄─────────────────────────┘
```

**All Available Methods:**

| Method | Calls | Returns | Purpose |
|--------|-------|---------|---------|
| `requestPermission()` | Opens Settings | `{hasPermission: bool}` | Request Accessibility perm |
| `hasNotificationListenerPermission()` | Checks Settings | `{hasPermission: bool}` | Check if already granted |
| `requestBatteryOptimizationExemption()` | Opens Settings | `{exempted: bool}` | Request Doze bypass |
| `isBatteryOptimizationExempted()` | Checks OS | `{exempted: bool}` | Check Doze status |
| `startListening()` | Checks perm | `{success: bool}` | Start service (status check) |
| `stopListening()` | Returns msg | `{success: bool}` | User must disable manually |
| `isListening()` | Checks perm | `{isListening: bool}` | Is service active |
| `getFirebaseUser()` | Gets from Auth | `{uid, email, name}` | Get sender identity |
| `addNotificationListener()` | Registers cb | - | Enable notifications |
| `removeNotificationListener()` | Unregisters | - | Disable notifications |

**React → TypeScript → Capacitor → Kotlin Flow Example:**

```typescript
// React component calls:
const result = await NotificationListenerPlugin.requestPermission();

// Behind the scenes:
// 1. TypeScript interface method signature
interface NotificationListenerPluginInterface extends Plugin {
  requestPermission(): Promise<{ hasPermission: boolean }>;
}

// 2. Capacitor serializes the call to native layer
// 3. Native plugin method receives it:
@PluginMethod
fun requestPermission(call: PluginCall) {
  val service = NotificationInterceptorService.getInstance()
  if (service?.hasNotificationListenerPermission() == true) {
    call.resolve(JSObject().apply {
      put("hasPermission", true)
    })
  } else {
    openAccessibilitySettings()
    call.resolve(JSObject().apply {
      put("hasPermission", false)
      put("message", "Please enable in Accessibility Settings")
    })
  }
}

// 4. Result serialized back to React
// 5. Promise resolves with: { hasPermission: true/false }
```

---

## 3. MainActivity.kt

**Purpose:** Register the Capacitor plugin with the app

**Location:** `android/app/src/main/java/com/cheran/tracker/MainActivity.kt`

**Required Addition:**

```kotlin
import com.cheran.tracker.plugins.NotificationListenerPlugin

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ★ ADD THIS LINE:
        registerPlugin(NotificationListenerPlugin::class)

        // ... rest of initialization
    }
}
```

**Why It's Needed:**
Capacitor needs to know about your custom plugin so it can route method calls from TypeScript to the Kotlin implementation.

---

## Communication Flow (Complete Example)

### Scenario: Send SMS on Sender Phone

```
┌─ User receives SMS ──────────────────────────────────────────────────┐
│                                                                       │
├─ Android System triggers notification ──────────────────────────────┤
│                                                                       │
├─ NotificationInterceptorService.onNotificationPosted() ──────────────┤
│   • Receives: StatusBarNotification object                           │
│   • Extracts: "Mom", "Messages", "Are you coming home?"             │
│   • Gets Firebase user: uid=abc123, email=sender@gmail.com          │
│   • Checks: User is authenticated ✓                                 │
│                                                                       │
├─ Build JSON payload ─────────────────────────────────────────────────┤
│   {                                                                   │
│     id: "uuid-1234",                                                │
│     title: "Mom",                                                   │
│     appName: "Messages",                                            │
│     message: "Are you coming home?",                                │
│     timestamp: 1712428800000,                                       │
│     senderUid: "abc123",                                            │
│     senderEmail: "sender@gmail.com",                                │
│     deviceId: "android_...",                                        │
│     dismissed: false                                                │
│   }                                                                   │
│                                                                       │
├─ Firebase WRITE ──────────────────────────────────────────────────────┤
│   Path: /notificationCommands/abc123/notifications/uuid-1234        │
│   Status: SUCCESS                                                    │
│   Log: "✓ Pushed to Firebase: uuid-1234"                            │
│                                                                       │
├─ Notify React callback ───────────────────────────────────────────────┤
│   NotificationInterceptorService.notificationCallback?.invoke(       │
│     payload                                                          │
│   )                                                                   │
│   → Calls NotificationListenerPlugin.notifyListeners(                │
│       "notificationReceived",                                        │
│       payload                                                        │
│     )                                                                │
│                                                                       │
├─ Firebase Cloud stores notification ──────────────────────────────────┤
│   ✓ Available at: /notificationCommands/abc123/notifications/...    │
│                                                                       │
├─ Listeners triggered on all connected React apps ─────────────────────┤
│   useNotifications().notificationRepository.onChildAdded()          │
│   → setState() with new notification                                │
│   → React re-renders NotificationCommandCenter                      │
│                                                                       │
└─ Main Phone (Viewer) displays new notification ────────────────────────┘
   [Messages from sender@gmail.com]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   🔴 • Mom
        Are you coming home?
        from Sender's Phone
        Just now
        [Details] [✓ Mark as read]
```

---

## Error Handling

### Service Lifecycle Errors

```kotlin
// In NotificationInterceptorService.kt

// Guard: Check Firebase user
val user = firebaseAuth.currentUser
if (user?.uid == null) {
  Log.w(TAG, "⚠ Skipping notification: User not authenticated")
  return  // ← Exit silently, don't crash
}

// Guard: Skip empty notifications
if (title.isNullOrBlank() && message.isNullOrBlank()) {
  Log.d(TAG, "↷ Skipping empty notification")
  return  // ← Don't waste bandwidth
}

// Firebase write failures (async)
.addOnFailureListener { e ->
  Log.e(TAG, "✗ Firebase write failed: ${e.message}")
  // ← Log but don't crash - try next notification
}
```

### Plugin Method Errors

```kotlin
// In NotificationListenerPlugin.kt

@PluginMethod
fun requestPermission(call: PluginCall) {
  try {
    val service = NotificationInterceptorService.getInstance()
    // ... logic ...
    call.resolve(result)  // ← Success
  } catch (e: Exception) {
    Log.e(TAG, "✗ Error in requestPermission: ${e.message}", e)
    call.reject("Failed to request permission: ${e.message}")  // ← Error
  }
}
```

---

## Logging for Debugging

### Check Service Startup
```bash
adb logcat | grep "NotificationInterceptor"

# Expected output (first run):
# [NotificationInterceptor] ✓ NotificationInterceptorService created and ready
# [NotificationInterceptor] ✓ Metadata updated: sender@gmail.com
```

### Check Permission Status
```bash
adb shell settings get secure enabled_notification_listeners

# Should show (after user enables):
# com.cheran.tracker/.services.NotificationInterceptorService
```

### Check Firebase Writes
```bash
adb logcat | grep "NotificationInterceptor" | grep "Pushed"

# Expected:
# [NotificationInterceptor] ✓ Pushed to Firebase: uuid-1234
```

### Check Errors
```bash
adb logcat | grep "NotificationInterceptor" | grep "✗"

# Shows any failures
```

---

## Permission Flow

### Notification Listener Permission

```
User opens Sender app
    ↓
React calls: requestNotificationListenerPermission()
    ↓
TypeScript: NotificationListenerPlugin.requestPermission()
    ↓
Plugin method opens Accessibility Settings intent
    ↓
User sees: Settings > Accessibility > Services
    ↓
User manually enables the app in the list
    ↓
Plugin check returns: hasPermission = true
    ↓
Service: NotificationInterceptorService starts receiving notifications
```

**In Code:**
```kotlin
// Check if already enabled
fun hasNotificationListenerPermission(): Boolean {
  val enabledServices = Settings.Secure.getString(
    contentResolver,
    "enabled_notification_listeners"
  )
  return enabledServices?.contains(packageName) ?: false
}

// Open settings
private fun openAccessibilitySettings() {
  val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
  intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
  startActivity(intent)
}
```

### Battery Optimization Exemption

```
Plugin: requestBatteryOptimizationExemption()
    ↓
Opens: Settings > Battery > Battery Saver / Adaptive Battery
    ↓
User adds app to exceptions
    ↓
Device: PowerManager.isIgnoringBatteryOptimizations() = true
    ↓
Service keeps running in Doze mode
```

---

## Testing Checklist

```
✅ Native Layer Tests

Before Running:
  - [ ] NotificationInterceptorService.kt in ./services/
  - [ ] NotificationListenerPlugin.kt in ./plugins/
  - [ ] Both files correct package: com.cheran.tracker.*
  - [ ] MainActivity.kt has: registerPlugin(NotificationListenerPlugin::class)
  - [ ] AndroidManifest.xml has permissions & service
  - [ ] Firebase user authenticated

Build:
  - [ ] ./gradlew clean build → SUCCESS
  - [ ] No compilation errors

Runtime:
  - [ ] App installs without crash
  - [ ] Go to Settings > Accessibility
  - [ ] App appears in list
  - [ ] User enables app
  - [ ] App doesn't crash when enabled

Functionality:
  - [ ] Send SMS on sender phone
  - [ ] Check logcat: should see "✓ Pushed to Firebase"
  - [ ] Check Firebase console: notification appears
  - [ ] Main phone viewer displays it within 2 seconds
  - [ ] Put phone in Doze mode (adb shell dumpsys deviceidle force-idle)
  - [ ] Send another SMS
  - [ ] Notification still forwarded (battery exemption working)
```

---

## Performance Considerations

### Notification Processing
- **Extraction:** ~10-50ms per notification
- **Firebase write:** ~100-500ms (includes network)
- **Total latency:** ~400-1300ms (typically 500-800ms)

### Battery Usage
- **With battery exemption:** ~1-2% extra per hour (depends on notification volume)
- **Without exemption:** Service killed in Doze, no forwarding
- **Recommended:** Always request battery exemption for best UX

### Firebase Bandwidth
- **Per notification:** ~200-500 bytes (minimal text only)
- **1000 notifications/day:** ~500KB ≈ negligible

---

That's the complete native layer! The system is designed to be lightweight, reliable, and battery-conscious while maintaining real-time notification forwarding.
