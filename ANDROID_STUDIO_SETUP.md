# Android Studio Setup - Receiver/Viewer (kuttiavt@gmail.com)

## 🎯 What Goes Into Android Studio

You need to add **3 Kotlin files** and **modify 2 existing files** in your Android Studio project.

---

## File 1: NotificationInterceptorService.kt

**Location:** `android/app/src/main/java/com/cheran/tracker/services/NotificationInterceptorService.kt`

**Steps:**
1. Open Android Studio
2. Go to `app/src/main/java/com/cheran/tracker/`
3. Right-click → New → Package → Name: `services`
4. Right-click `services` folder → New → Kotlin File/Class → Name: `NotificationInterceptorService`
5. Copy the entire content from `NotificationInterceptorService.kt` file into this new file
6. Save

**What it does:**
- Intercepts ALL system notifications
- Sends them to Firebase database
- Runs in background on the receiver phone

---

## File 2: NotificationListenerPlugin.kt

**Location:** `android/app/src/main/java/com/cheran/tracker/plugins/NotificationListenerPlugin.kt`

**Steps:**
1. In Android Studio, go to `app/src/main/java/com/cheran/tracker/`
2. Right-click → New → Package → Name: `plugins`
3. Right-click `plugins` folder → New → Kotlin File/Class → Name: `NotificationListenerPlugin`
4. Copy the entire content from `NotificationListenerPlugin.kt` file into this new file
5. Save

**What it does:**
- Bridges React/TypeScript code to Kotlin
- Handles permission requests
- Communicates with the NotificationInterceptorService

---

## File 3: Update AndroidManifest.xml

**Location:** `android/app/src/main/AndroidManifest.xml`

**Steps:**

1. Open `AndroidManifest.xml` in Android Studio (usually in `app/src/main/`)

2. **Add permissions BEFORE `<application>` tag:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.cheran.tracker">

    <!-- ADD THESE 4 PERMISSIONS HERE -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        ...
```

3. **Add service INSIDE `<application>` tag:** (before `</application>`)

```xml
    <application
        ...>

        <!-- ADD THIS SERVICE HERE -->
        <service
            android:name=".services.NotificationInterceptorService"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <!-- Rest of your app config -->
        <activity ...>
            ...
        </activity>

    </application>

</manifest>
```

**What this does:**
- Grants notification access permission
- Registers the background service with Android system

---

## File 4: Update MainActivity.kt

**Location:** `android/app/src/main/java/com/cheran/tracker/MainActivity.kt`

**Steps:**

1. Open `MainActivity.kt` in Android Studio

2. **Add import at the top:**

```kotlin
package com.cheran.tracker

import android.os.Bundle
import com.capacitor.BridgeActivity
import com.cheran.tracker.plugins.NotificationListenerPlugin  // ADD THIS

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize the web view with assets
        webViewClient = CapacitorWebViewClient(this)
    }
}
```

3. **Register the plugin in `onCreate()`:**

```kotlin
package com.cheran.tracker

import android.os.Bundle
import com.capacitor.BridgeActivity
import com.cheran.tracker.plugins.NotificationListenerPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // ADD THIS LINE
        registerPlugin(NotificationListenerPlugin::class)
        
        webViewClient = CapacitorWebViewClient(this)
    }
}
```

**What this does:**
- Tells the app to load the Kotlin plugin when it starts

---

## File 5: Gradle Dependencies

**Location:** `android/app/build.gradle` or `android/app/build.gradle.kts`

**Check if these are already there:**

```gradle
dependencies {
    // Firebase (should already exist)
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-database")
    
    // Capacitor (should already exist)
    implementation("com.capacitorjs:core")
    
    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
}
```

If anything is missing, ask and I'll add it. Usually everything is already there.

---

## Summary: What Goes Where

| File | Destination | Action |
|------|-------------|--------|
| `NotificationInterceptorService.kt` | `android/app/src/main/java/com/cheran/tracker/services/` | Create new file, copy content |
| `NotificationListenerPlugin.kt` | `android/app/src/main/java/com/cheran/tracker/plugins/` | Create new file, copy content |
| `AndroidManifest.xml` | `android/app/src/main/AndroidManifest.xml` | Add 4 permissions + 1 service |
| `MainActivity.kt` | `android/app/src/main/java/com/cheran/tracker/MainActivity.kt` | Add 1 import + 1 register call |

---

## Once Everything Is Added

1. ✅ In Android Studio: **Build → Rebuild Project**
   - Wait for build to complete (check "Build" tab at bottom)
   
2. ✅ Check for errors:
   - If you see red underlines, check package names match: `com.cheran.tracker`
   - If you see "Firebase not found", check Gradle sync
   
3. ✅ Run on device:
   - Connect your Android phone (kuttiavt@gmail.com signed in)
   - Click "Run" or press Shift+F10
   - Wait for app to install

---

## Testing After Setup

1. **Log in with kuttiavt@gmail.com** on your main phone
2. **You should see:**
   - Notification Command Center dashboard appear
   - No permission dialogs (receiver side)
   
3. **Open another phone/emulator**
   - Log in with a DIFFERENT email (e.g., test@gmail.com)
   - You'll see permission dialogs to grant
   - Grant Accessibility access

4. **Send an SMS to the second phone**
   - Check main phone in <2 seconds
   - Notification should appear in the command center dashboard

---

## Troubleshooting During Setup

| Error | Solution |
|-------|----------|
| "Package com.cheran.tracker not found" | Make sure package names in files match your project |
| "NotificationListenerPlugin not found" | Check file is in `plugins/` folder, not `services/` |
| "Cannot resolve symbol Capacitor" | Do Gradle sync: File → Sync Now |
| Build fails | Check if Kotlin plugin is installed in Android Studio |
| App crashes on startup | Check package name in AndroidManifest matches files |

---

## Key Points for Receiver (kuttiavt@gmail.com)

✅ **The receiver phone DOES need:**
- NotificationInterceptorService.kt (runs in background)
- NotificationListenerPlugin.kt (bridges to React)
- AndroidManifest.xml updates (permissions)
- MainActivity.kt update (register plugin)

✅ **The receiver phone shows:**
- Notification Command Center dashboard
- All notifications from ALL connected senders
- Real-time updates

✅ **The receiver phone does NOT:**
- Show permission dialogs (you already have full access)
- Need to grant accessibility settings
- Need to manage battery optimization

---

## Next Step

1. Add these 2 Kotlin files to Android Studio
2. Update AndroidManifest.xml with 4 permissions + 1 service
3. Update MainActivity.kt with 1 import + 1 registerPlugin call
4. Build & Run

That's it! The app will automatically show the Notification Command Center when you sign in as kuttiavt@gmail.com 🚀
