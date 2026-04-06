package com.cheran.tracker.plugins

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.auth.FirebaseAuth
import com.cheran.tracker.services.NotificationInterceptorService

/**
 * Capacitor Plugin Bridge: NotificationListenerPlugin
 * 
 * Connects TypeScript/React layer to native Android NotificationInterceptorService
 * Provides these capabilities:
 * - Request Accessibility Service permission
 * - Battery optimization exemption
 * - Register notification callbacks
 * - Get Firebase user info
 * 
 * The plugin is registered in MainActivity.kt:
 * override fun onCreate() {
 *   registerPlugin(NotificationListenerPlugin::class)
 * }
 */
@CapacitorPlugin(name = "NotificationListenerPlugin")
class NotificationListenerPlugin : Plugin() {

    companion object {
        private const val TAG = "NotificationPlugin"
        private const val METHOD_REQUEST_PERMISSION = "requestPermission"
        private const val METHOD_HAS_PERMISSION = "hasNotificationListenerPermission"
        private const val METHOD_REQUEST_BATTERY = "requestBatteryOptimizationExemption"
        private const val METHOD_IS_BATTERY_EXEMPT = "isBatteryOptimizationExempted"
        private const val METHOD_START_LISTENING = "startListening"
        private const val METHOD_STOP_LISTENING = "stopListening"
        private const val METHOD_IS_LISTENING = "isListening"
        private const val METHOD_GET_USER = "getFirebaseUser"
        private const val METHOD_ADD_LISTENER = "addNotificationListener"
        private const val METHOD_REMOVE_LISTENER = "removeNotificationListener"
    }

    private val firebaseAuth by lazy { FirebaseAuth.getInstance() }

    /**
     * Request permission to access NotificationListenerService
     * User must manually enable in Settings > Accessibility > Services
     */
    @PluginMethod
    fun requestPermission(call: PluginCall) {
        try {
            Log.d(TAG, "→ requestPermission() called")
            
            val service = NotificationInterceptorService.getInstance()
            if (service?.hasNotificationListenerPermission() == true) {
                Log.d(TAG, "✓ Permission already granted")
                val result = JSObject()
                result.put("hasPermission", true)
                result.put("message", "Notification listener permission already granted")
                call.resolve(result)
            } else {
                Log.d(TAG, "⚠ Opening Accessibility Settings for user to enable")
                openAccessibilitySettings()
                
                val result = JSObject()
                result.put("hasPermission", false)
                result.put("message", "Please enable the app in Accessibility Settings > Services")
                call.resolve(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error in requestPermission: ${e.message}", e)
            call.reject("Failed to request permission: ${e.message}")
        }
    }

    /**
     * Check if NotificationListenerService permission is already granted
     */
    @PluginMethod
    fun hasNotificationListenerPermission(call: PluginCall) {
        try {
            val service = NotificationInterceptorService.getInstance()
            val hasPermission = service?.hasNotificationListenerPermission() ?: false
            
            Log.d(TAG, "→ hasNotificationListenerPermission: $hasPermission")
            
            val result = JSObject()
            result.put("hasPermission", hasPermission)
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error checking permission: ${e.message}", e)
            call.reject("Failed to check permission: ${e.message}")
        }
    }

    /**
     * Request to bypass battery optimization
     * Shows system settings dialog for user approval
     * This keeps the notification service running in Doze mode
     */
    @PluginMethod
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        try {
            Log.d(TAG, "→ requestBatteryOptimizationExemption() called")
            
            val service = NotificationInterceptorService.getInstance()
            if (service != null) {
                service.requestBatteryOptimizationExemption()
                
                val result = JSObject()
                result.put("exempted", false)
                result.put("message", "Battery optimization settings opened. User approval required.")
                call.resolve(result)
            } else {
                call.reject("NotificationInterceptorService is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error requesting battery exemption: ${e.message}", e)
            call.reject("Failed: ${e.message}")
        }
    }

    /**
     * Check if app is already exempted from battery optimization
     */
    @PluginMethod
    fun isBatteryOptimizationExempted(call: PluginCall) {
        try {
            val service = NotificationInterceptorService.getInstance()
            val exempted = service?.isBatteryOptimizationExempted() ?: false
            
            Log.d(TAG, "→ isBatteryOptimizationExempted: $exempted")
            
            val result = JSObject()
            result.put("exempted", exempted)
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error checking battery exemption: ${e.message}", e)
            call.reject("Failed to check battery exemption: ${e.message}")
        }
    }

    /**
     * Start listening for notifications
     * Service actually starts automatically on app init
     * This is mainly a status check method
     */
    @PluginMethod
    fun startListening(call: PluginCall) {
        try {
            Log.d(TAG, "→ startListening() called")
            
            val service = NotificationInterceptorService.getInstance()
            val hasPermission = service?.hasNotificationListenerPermission() ?: false
            
            if (!hasPermission) {
                Log.w(TAG, "✗ Permission not granted")
                call.reject("NotificationListenerService permission not granted. User must enable in Accessibility Settings.")
                return
            }

            Log.d(TAG, "✓ Already listening for notifications")
            val result = JSObject()
            result.put("success", true)
            result.put("message", "Listening for notifications")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error starting listener: ${e.message}", e)
            call.reject("Failed to start listening: ${e.message}")
        }
    }

    /**
     * Stop listening for notifications
     * Requires user to manually disable in Accessibility Settings
     */
    @PluginMethod
    fun stopListening(call: PluginCall) {
        try {
            Log.d(TAG, "→ stopListening() called")
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "To stop listening, disable the app in Accessibility Settings")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error stopping listener: ${e.message}", e)
            call.reject("Failed to stop listening: ${e.message}")
        }
    }

    /**
     * Check if currently listening to notifications
     */
    @PluginMethod
    fun isListening(call: PluginCall) {
        try {
            val service = NotificationInterceptorService.getInstance()
            val isListening = service?.hasNotificationListenerPermission() ?: false
            
            Log.d(TAG, "→ isListening: $isListening")
            
            val result = JSObject()
            result.put("isListening", isListening)
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error checking listening status: ${e.message}", e)
            call.reject("Failed to check listening status: ${e.message}")
        }
    }

    /**
     * Get Firebase user information
     * Used to tag notifications with sender's UID and email
     */
    @PluginMethod
    fun getFirebaseUser(call: PluginCall) {
        try {
            Log.d(TAG, "→ getFirebaseUser() called")
            
            val user = firebaseAuth.currentUser

            if (user == null) {
                Log.w(TAG, "✗ No authenticated user")
                call.reject("No authenticated user found")
                return
            }

            Log.d(TAG, "✓ Firebase user found: ${user.email}")
            
            val result = JSObject()
            result.put("uid", user.uid)
            result.put("email", user.email ?: "")
            result.put("displayName", user.displayName ?: "")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error getting Firebase user: ${e.message}", e)
            call.reject("Failed to get Firebase user: ${e.message}")
        }
    }

    /**
     * Register a listener for notifications
     * Receives callbacks when new notifications are intercepted
     */
    @PluginMethod
    fun addNotificationListener(call: PluginCall) {
        try {
            Log.d(TAG, "→ addNotificationListener() registered")
            
            // Register the callback with the service
            NotificationInterceptorService.notificationCallback = { notificationData ->
                // Send back to React via Capacitor event bridge
                val jsEvent = JSObject()
                notificationData.forEach { (key, value) ->
                    jsEvent.put(key, value)
                }
                notifyListeners("notificationReceived", jsEvent)
                Log.d(TAG, "↠ Notification event sent to React: ${notificationData["title"]}")
            }

            val result = JSObject()
            result.put("success", true)
            result.put("message", "Notification listener registered. Waiting for notifications...")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error adding listener: ${e.message}", e)
            call.reject("Failed to add listener: ${e.message}")
        }
    }

    /**
     * Remove/unregister notification listener
     */
    @PluginMethod
    fun removeNotificationListener(call: PluginCall) {
        try {
            Log.d(TAG, "→ removeNotificationListener()")
            
            NotificationInterceptorService.notificationCallback = null

            val result = JSObject()
            result.put("success", true)
            result.put("message", "Notification listener removed")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error removing listener: ${e.message}", e)
            call.reject("Failed to remove listener: ${e.message}")
        }
    }

    // ========== HELPER METHODS ==========

    /**
     * Open Android Accessibility Settings
     * This is where users manually enable the app for NotificationListenerService
     */
    private fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            bridge?.context?.startActivity(intent)
            Log.d(TAG, "⚙ Opened Accessibility Settings")
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error opening accessibility settings: ${e.message}", e)
        }
    }
}
