/**
 * Capacitor Plugin Interface for Notification Interceptor Service
 * 
 * This TypeScript interface defines the contract between React and native Kotlin code.
 * The actual implementation is in NotificationListenerPlugin.kt (native Android layer)
 * 
 * Bridge Flow:
 * React → Capacitor Bridge → NotificationListenerPlugin.kt → NotificationInterceptorService.kt
 */

import { registerPlugin } from "@capacitor/core";
import type { Plugin } from "@capacitor/core";

export interface NotificationListenerPluginInterface extends Plugin {
  /**
   * Request permission to bind to NotificationListenerService
   * 
   * User will need to navigate to:
   * Settings > Accessibility > Services > Enable this app
   * 
   * This is a manual process that the user must complete.
   * The method opens the Accessibility Settings screen to guide them.
   */
  requestPermission(): Promise<{ hasPermission: boolean; message?: string }>;

  /**
   * Check if the app already has NotificationListenerService permission
   * 
   * Returns true only if user has manually enabled in Accessibility Settings
   */
  hasNotificationListenerPermission(): Promise<{ hasPermission: boolean }>;

  /**
   * Request to bypass battery optimization for this app
   * 
   * Shows a system dialog for user to approve.
   * This keeps the NotificationInterceptorService running even in Doze mode.
   * 
   * Recommended for reliable notification interception.
   */
  requestBatteryOptimizationExemption(): Promise<{ exempted: boolean; message: string }>;

  /**
   * Check if the app is already exempted from battery optimization
   */
  isBatteryOptimizationExempted(): Promise<{ exempted: boolean }>;

  /**
   * Start listening for notifications
   * 
   * Service actually starts automatically once permission is granted.
   * This is mainly a status check method.
   */
  startListening(): Promise<{ success: boolean; message: string }>;

  /**
   * Stop listening for notifications
   * 
   * To stop, user must manually disable in Accessibility Settings.
   * There's no programmatic way to disable the service.
   */
  stopListening(): Promise<{ success: boolean; message: string }>;

  /**
   * Check if currently listening to notifications
   * 
   * Returns true if service has active permission grant
   */
  isListening(): Promise<{ isListening: boolean }>;

  /**
   * Get Firebase credentials from native layer
   * 
   * Returns the currently authenticated Firebase user's UID and email.
   * This info is used to tag notifications with the sender's identity.
   */
  getFirebaseUser(): Promise<{ uid: string; email: string; displayName: string }>;

  /**
   * Register a callback for when new notifications are intercepted
   * 
   * React will receive "notificationReceived" events when the native service
   * intercepts notifications from the system.
   */
  addNotificationListener(listener: NotificationListenerCallback): void;

  /**
   * Remove/unregister the notification listener
   */
  removeNotificationListener(): void;
}

/**
 * Notification listener callback
 * Fired when NotificationInterceptorService intercepts a new notification
 */
export interface NotificationListenerCallback {
  (notification: InterceptedNotificationPayload): void;
}

/**
 * Payload structure for intercepted notifications
 * Matches what NotificationInterceptorService.kt sends to Firebase
 */
export interface InterceptedNotificationPayload {
  id: string;                    // Unique per notification
  title: string;                 // Notification title
  appName: string;               // Human-readable app name
  message: string;               // Notification message/body
  bigText?: string;              // Long form text (expandable notifications)
  subText?: string;              // Additional subtitle
  timestamp: number;             // When intercepted (milliseconds since epoch)
  senderUid: string;             // Firebase UID of sender
  senderEmail: string;           // Email of sender device
  deviceId: string;              // Unique device identifier
  dismissed?: boolean;           // If already dismissed
  category?: string;             // Notification category (sms, chat, etc)
}

/**
 * Register the Capacitor plugin
 * This creates a bridge between React and the native implementation
 */
export const NotificationListenerPlugin = registerPlugin<NotificationListenerPluginInterface>(
  "NotificationListenerPlugin",
  {
    // Web implementation (no-op for web platform)
    web: () => import("./web").then(m => new m.NotificationListenerPluginWeb()),
  }
);

/**
 * Helper type guards and utilities
 */

export function isInterceptedNotificationPayload(
  obj: any
): obj is InterceptedNotificationPayload {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.appName === "string" &&
    typeof obj.message === "string" &&
    typeof obj.timestamp === "number"
  );
}

