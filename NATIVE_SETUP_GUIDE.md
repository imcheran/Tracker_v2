/**
 * NATIVE LAYER SETUP GUIDE
 * 
 * This document covers setting up the native Android layer for the
 * Notification Command Center feature.
 */

// ═════════════════════════════════════════════════════════════════════
// STEP 1: Register Plugin in MainActivity.kt
// ═════════════════════════════════════════════════════════════════════

/*
File: android/app/src/main/java/com/cheran/tracker/MainActivity.kt

Add this import at the top:
*/
import com.cheran.tracker.plugins.NotificationListenerPlugin

/*
Then in your MainActivity class, add this to onCreate():
*/
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register the NotificationListenerPlugin
        registerPlugin(NotificationListenerPlugin::class)

        // ... rest of your initialization ...
    }
}


// ═════════════════════════════════════════════════════════════════════
// STEP 2: Update Gradle Dependencies
// ═════════════════════════════════════════════════════════════════════

/*
File: android/app/build.gradle

Check that these dependencies are included (they should already be there
from your Firebase setup):
*/

dependencies {
    // Firebase (should already exist)
    implementation 'com.google.firebase:firebase-auth-ktx:22.3.0'
    implementation 'com.google.firebase:firebase-database-ktx:20.3.0'
    implementation 'com.google.firebase:firebase-common-ktx:20.4.0'

    // Capacitor (should already exist)
    implementation 'com.getcapacitor:capacitor-android:6.0.0'
    implementation 'com.getcapacitor:capacitor-core:6.0.0'

    // AndroidX (should already exist)
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core:1.12.0'

    // ✓ These are all standard - no new dependencies needed!
}


// ═════════════════════════════════════════════════════════════════════
// STEP 3: Create Directory Structure (if missing)
// ═════════════════════════════════════════════════════════════════════

/*
Expected structure in android/app/src/main/java/com/cheran/tracker/:

com/cheran/tracker/
├── MainActivity.kt
├── services/
│   └── NotificationInterceptorService.kt          ← Copy here
├── plugins/
│   └── NotificationListenerPlugin.kt              ← Copy here
└── receivers/
    └── BatteryOptimizationReceiver.kt             ← Optional

Create missing directories:
$ mkdir -p android/app/src/main/java/com/cheran/tracker/services
$ mkdir -p android/app/src/main/java/com/cheran/tracker/plugins
$ mkdir -p android/app/src/main/java/com/cheran/tracker/receivers
*/


// ═════════════════════════════════════════════════════════════════════
// STEP 4: Copy Kotlin Files
// ═════════════════════════════════════════════════════════════════════

/*
Copy these files to the locations above:

From workspace root:
- NotificationInterceptorService.kt
  → android/app/src/main/java/com/cheran/tracker/services/

- NotificationListenerPlugin.kt
  → android/app/src/main/java/com/cheran/tracker/plugins/

Make sure the package declarations match:
  package com.cheran.tracker.services
  package com.cheran.tracker.plugins
*/


// ═════════════════════════════════════════════════════════════════════
// STEP 5: Update AndroidManifest.xml
// ═════════════════════════════════════════════════════════════════════

/*
File: android/app/src/main/AndroidManifest.xml

See ANDROID_MANIFEST_ADDITIONS.xml for:
- Permissions to add before <application>
- Service definitions to add inside <application>
*/


// ═════════════════════════════════════════════════════════════════════
// STEP 6: Build & Test
// ═════════════════════════════════════════════════════════════════════

/*
From android folder:
*/
$ ./gradlew clean build

/*
Expected output:
BUILD SUCCESSFUL in 45s

If errors:
- Check package names match (com.cheran.tracker)
- Check imports in Kotlin files
- Check AndroidManifest.xml syntax with `android:name=".services.NotificationInterceptorService"`
*/


// ═════════════════════════════════════════════════════════════════════
// COMPLETE EXAMPLE MainActivity.kt
// ═════════════════════════════════════════════════════════════════════

package com.cheran.tracker

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.cheran.tracker.plugins.NotificationListenerPlugin

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Capacitor
        super.setContentView(R.layout.activity_main)

        // Register the notification plugin
        registerPlugin(NotificationListenerPlugin::class)

        // Verify service can start (optional logging)
        Log.d("MainActivity", "NotificationListenerPlugin registered successfully")
    }
}


// ═════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING: Common Build Errors
// ═════════════════════════════════════════════════════════════════════

/*
ERROR: "Unresolved reference: NotificationListenerPlugin"
→ Check that NotificationListenerPlugin.kt is in the correct package
→ Verify the import statement: import com.cheran.tracker.plugins.NotificationListenerPlugin

ERROR: "Cannot access NotificationInterceptorService: it is not public in its package"
→ Check that service is public class in NotificationInterceptorService.kt

ERROR: "Service class does not exist at runtime"
→ Check AndroidManifest.xml android:name matches exactly:
  <service android:name=".services.NotificationInterceptorService"...>

ERROR: "Manifest must be declared in AndroidManifest.xml"
→ Make sure service declaration is inside <application> tag
→ Make sure permissions are before <application> tag

BUILD FAILED: "No main manifest attribute found"
→ Run: ./gradlew clean build
→ Delete build folder: rm -rf build/
*/


// ═════════════════════════════════════════════════════════════════════
// VERIFY INSTALLATION
// ═════════════════════════════════════════════════════════════════════

/*
After building and installing on device, verify the service:

$ adb shell dumpsys package com.cheran.tracker | grep Service

Should show:
  android.service.notification.NotificationListenerService

Check Accessibility Settings:
$ adb shell settings get secure enabled_notification_listeners

Should eventually include:
  com.cheran.tracker/.services.NotificationInterceptorService
  (after user manually enables it)

Check Firebase permission:
$ adb logcat | grep "NotificationInterceptor"

Should show logs like:
  [NotificationInterceptor] ✓ NotificationInterceptorService created and ready
*/


// ═════════════════════════════════════════════════════════════════════
// PUBLISH OPTIONS FOR INTERNET & PERMISSIONS
// ═════════════════════════════════════════════════════════════════════

/*
When publishing to Google Play, you'll need to:

1. Declare Permissions Use:
   In Play Console > App Content > Permissions
   
   - BIND_NOTIFICATION_LISTENER_SERVICE: Declare this as:
     Purpose: "To relay notifications from your phone to your main device"

   - REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: Declare as:
     Purpose: "To keep the notification service running in sleep mode (Doze)"

2. Privacy Policy:
   Your privacy policy should mention:
   - What notifications are captured (only text metadata)
   - Where they're sent (Firebase Realtime Database)
   - How they're encrypted (Firebase handles HTTPS)
   - That users can disable at any time (Settings > Accessibility)

3. Testing:
   Use internal test track first to verify:
   - Service starts correctly
   - Permissions dialog shows
   - Battery optimization works
   - Firebase writes are successful
*/


// ═════════════════════════════════════════════════════════════════════
// SUMMARY CHECKLIST
// ═════════════════════════════════════════════════════════════════════

/*
✅ BEFORE BUILDING:
  - [ ] Copy NotificationInterceptorService.kt to ./services/
  - [ ] Copy NotificationListenerPlugin.kt to ./plugins/
  - [ ] Update AndroidManifest.xml with permissions
  - [ ] Update AndroidManifest.xml with service declaration
  - [ ] Add registerPlugin() to MainActivity.kt
  - [ ] Check all files have correct package: com.cheran.tracker.*

✅ BUILD:
  - [ ] ./gradlew clean build → BUILD SUCCESSFUL
  - [ ] No compilation errors
  - [ ] Check build duration (~30-60 seconds)

✅ INSTALL:
  - [ ] adb install app-debug.apk
  - [ ] App launches without crash

✅ VERIFY:
  - [ ] Verify service shows in Accessibility Settings
  - [ ] User can manually enable
  - [ ] Battery optimization prompt works
  - [ ] Notifications appear in Firebase console

✅ TEST:
  - [ ] Send SMS on device with sender account
  - [ ] Check main phone's Viewer UI
  - [ ] Notification appears in <2 seconds
  - [ ] Sender info displays correctly
*/
