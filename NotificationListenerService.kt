package com.cheran.tracker.services

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ServerValue
import java.util.UUID

/**
 * NotificationInterceptorService - Extends NotificationListenerService
 * 
 * Core responsibility: Intercept ALL incoming system notifications and forward to Firebase
 * 
 * Device Role: SENDER (any device NOT logged in as kuttiavt@gmail.com)
 * 
 * Setup Requirements:
 * 1. User must manually enable in Settings > Accessibility > Services
 * 2. Service runs continuously in background
 * 3. Automatically captures and forwards all notifications to Firebase
 * 4. Respects Doze mode with battery optimization exemption
 * 
 * Payload sent to Firebase:
 * - title, appName, message, timestamp, deviceId
 * - Minimal text only (no bitmaps or heavy data)
 * - Tagged with sender's Firebase UID for authorization
 */
class NotificationInterceptorService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationInterceptor"
        private const val BATCH_SIZE = 100  // Max notifications to send in one batch
        
        // Singleton instance for plugin bridge
        private var instance: NotificationInterceptorService? = null
        
        @Synchronized
        fun getInstance(): NotificationInterceptorService? = instance
        
        // Callback for Capacitor plugin when new notification arrives
        var notificationCallback: ((Map<String, Any>) -> Unit)? = null
    }

    private val firebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val firebaseDb by lazy { FirebaseDatabase.getInstance().reference }
    private val powerManager by lazy { getSystemService(Context.POWER_SERVICE) as PowerManager }

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.d(TAG, "✓ NotificationInterceptorService created and ready")
        updateSenderMetadata()
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.w(TAG, "✗ NotificationInterceptorService destroyed")
    }

    /**
     * Main entry point: Called whenever a notification is posted to the system
     * This is the core interception logic
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        try {
            // Guard: Check if user is authenticated
            val user = firebaseAuth.currentUser
            if (user?.uid == null || user.email == null) {
                Log.w(TAG, "⚠ Skipping notification: User not authenticated")
                return
            }

            val notification = sbn.notification ?: return

            // Extract all available notification fields
            val appName = getApplicationName(sbn.packageName)
            val title = extractTitle(notification)
            val message = extractMessage(notification)
            val bigText = extractBigText(notification)
            val subText = extractSubText(notification)
            val category = extractCategory(notification)

            // Skip if no meaningful content
            if (title.isNullOrBlank() && message.isNullOrBlank()) {
                Log.d(TAG, "↷ Skipping empty notification from $appName")
                return
            }

            // Create notification payload
            val notificationId = UUID.randomUUID().toString()
            val timestamp = System.currentTimeMillis()

            val payload = mapOf(
                "id" to notificationId,
                "title" to (title ?: ""),
                "appName" to appName,
                "message" to (message ?: ""),
                "bigText" to (bigText ?: ""),
                "subText" to (subText ?: ""),
                "timestamp" to timestamp,
                "dismissed" to false,
                "senderUid" to user.uid,
                "senderEmail" to user.email,
                "deviceId" to getDeviceId(),
                "category" to (category ?: "")
            )

            Log.d(TAG, "⬆ Intercepted: $appName → ${payload["title"] ?: "..."}  from ${user.email}")

            // Send to Firebase asynchronously
            pushNotificationToFirebase(user.uid, payload)

            // Notify React bridge
            notificationCallback?.invoke(payload)

        } catch (e: Exception) {
            Log.e(TAG, "✗ Error processing notification: ${e.message}", e)
        }
    }

    /**
     * Called when a notification is removed/dismissed
     * Currently logged for debugging, not forwarded
     */
    override fun onNotificationRemoved(sbn: StatusBarNotification?, rankingMap: RankingMap?, reason: Int) {
        super.onNotificationRemoved(sbn, rankingMap, reason)
        if (sbn == null) return
        try {
            Log.d(TAG, "↧ Notification removed from: ${sbn.packageName} (reason: $reason)")
        } catch (e: Exception) {
            Log.e(TAG, "Error handling removed notification: ${e.message}")
        }
    }

    // ========== FIREBASE OPERATIONS ==========

    /**
     * Push notification to Firebase Realtime Database
     * Path: /notificationCommands/{userUID}/notifications/{notificationId}
     */
    private fun pushNotificationToFirebase(userUid: String, payload: Map<String, Any>) {
        try {
            val notificationId = payload["id"] as? String ?: return

            val notificationRef = firebaseDb
                .child("notificationCommands")
                .child(userUid)
                .child("notifications")
                .child(notificationId)

            // Prepare data with server-side timestamp for consistency
            val dataToWrite = payload.toMutableMap()
            dataToWrite["timestamp"] = ServerValue.TIMESTAMP

            notificationRef.setValue(dataToWrite)
                .addOnSuccessListener {
                    Log.d(TAG, "✓ Pushed to Firebase: $notificationId")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "✗ Firebase write failed: ${e.message}")
                }
        } catch (e: Exception) {
            Log.e(TAG, "✗ Exception pushing to Firebase: ${e.message}", e)
        }
    }

    /**
     * Update sender metadata in Firebase
     * Called on service startup and periodically
     */
    private fun updateSenderMetadata() {
        val user = firebaseAuth.currentUser ?: return

        try {
            val metadataRef = firebaseDb
                .child("notificationCommands")
                .child(user.uid)
                .child("metadata")

            val metadata = mapOf(
                "email" to (user.email ?: "unknown"),
                "displayName" to (user.displayName ?: "Unknown Device"),
                "deviceId" to getDeviceId(),
                "lastSeen" to ServerValue.TIMESTAMP,
                "platform" to "android",
                "batteryOptimizationExempted" to isBatteryOptimizationExempted()
            )

            metadataRef.setValue(metadata)
                .addOnSuccessListener {
                    Log.d(TAG, "✓ Metadata updated: ${user.email}")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "✗ Metadata update failed: ${e.message}")
                }
        } catch (e: Exception) {
            Log.e(TAG, "✗ Exception updating metadata: ${e.message}", e)
        }
    }

    // ========== NOTIFICATION EXTRACTION ==========

    private fun extractTitle(notification: android.app.Notification): String? {
        return try {
            notification.extras?.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString()
        } catch (e: Exception) {
            null
        }
    }

    private fun extractMessage(notification: android.app.Notification): String? {
        return try {
            val extras = notification.extras ?: return null
            extras.getCharSequence(android.app.Notification.EXTRA_TEXT)?.toString()
                ?: extras.getCharSequence("android.text")?.toString()
        } catch (e: Exception) {
            null
        }
    }

    private fun extractBigText(notification: android.app.Notification): String? {
        return try {
            notification.extras?.getCharSequence(android.app.Notification.EXTRA_BIG_TEXT)?.toString()
        } catch (e: Exception) {
            null
        }
    }

    private fun extractSubText(notification: android.app.Notification): String? {
        return try {
            notification.extras?.getCharSequence(android.app.Notification.EXTRA_SUB_TEXT)?.toString()
        } catch (e: Exception) {
            null
        }
    }

    private fun extractCategory(notification: android.app.Notification): String? {
        return try {
            notification.category
        } catch (e: Exception) {
            null
        }
    }

    // ========== SYSTEM HELPERS ==========

    /**
     * Get human-readable app name from package name
     */
    private fun getApplicationName(packageName: String): String {
        return try {
            val pm = packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(ai).toString()
        } catch (e: Exception) {
            packageName
        }
    }

    /**
     * Generate unique device identifier
     * Persists across app sessions
     */
    private fun getDeviceId(): String {
        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
        return "android_${androidId}_${packageName.hashCode()}"
    }

    /**
     * Check if NotificationListenerService permission is granted
     * User must enable in Settings manually
     */
    fun hasNotificationListenerPermission(): Boolean {
        return try {
            val enabledServices = Settings.Secure.getString(
                contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            enabledServices.contains(packageName)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permission: ${e.message}")
            false
        }
    }

    /**
     * Request battery optimization exemption
     * Shows system dialog for user to approve
     */
    fun requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    startActivity(intent)
                    Log.d(TAG, "Battery optimization dialog launched")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting battery exemption: ${e.message}", e)
        }
    }

    /**
     * Check if already exempted from battery optimization
     */
    fun isBatteryOptimizationExempted(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                powerManager.isIgnoringBatteryOptimizations(packageName)
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking battery exemption: ${e.message}")
            false
        }
    }
}
