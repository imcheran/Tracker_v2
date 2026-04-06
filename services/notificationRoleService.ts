/**
 * Notification Role Service
 * 
 * Determines device role based on logged-in email and initializes accordingly:
 * 
 * VIEWER (Main Phone):
 *   - Email: kuttiavt@gmail.com (EXACTLY)
 *   - Pulls all notifications from Firebase
 *   - Shows NotificationCommandCenter UI
 *   - Never sends its own notifications
 * 
 * SENDER (Secondary Phones):
 *   - Email: anything other than kuttiavt@gmail.com
 *   - Runs NotificationInterceptorService in background
 *   - Silently intercepts ALL incoming notifications
 *   - Pushes them to Firebase under user's UID
 *   - User sees normal app UI (no special dashboard)
 */

import type { User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";

export enum NotificationRole {
  VIEWER = "viewer",
  SENDER = "sender",
  UNKNOWN = "unknown"
}

export interface NotificationRoleContext {
  role: NotificationRole;
  user: User;
  email: string;
  deviceId: string;
  isNative: boolean;
}

const VIEWER_EMAIL = "kuttiavt@gmail.com";

/**
 * Determine the device role based on authenticated email
 * 
 * @param user Firebase Auth user object
 * @returns NotificationRole.VIEWER if email === kuttiavt@gmail.com, else SENDER
 */
export const determineDeviceRole = (user: User | null): NotificationRole => {
  if (!user?.email) return NotificationRole.UNKNOWN;
  return user.email === VIEWER_EMAIL ? NotificationRole.VIEWER : NotificationRole.SENDER;
};

/**
 * Create role context for the entire app
 * This context is passed around and used to initialize role-specific services
 */
export const createNotificationRoleContext = (user: User): NotificationRoleContext => {
  const role = determineDeviceRole(user);
  const isNative = Capacitor.isNativePlatform();

  // Generate a unique device ID for senders
  const deviceId = generateDeviceId(user.uid, isNative);

  return {
    role,
    user,
    email: user.email || "unknown",
    deviceId,
    isNative
  };
};

/**
 * Generate a unique device identifier
 * Format: {uid}_{platform}_{timestamp}
 */
const generateDeviceId = (uid: string, isNative: boolean): string => {
  const platform = isNative ? Capacitor.getPlatform() : "web";
  const timestamp = Date.now();
  return `${uid}_${platform}_${timestamp}`;
};

/**
 * Initialize role-specific services
 * 
 * For SENDER devices:
 *   - Request NotificationListenerService permission
 *   - Initialize NotificationInterceptorService
 * 
 * For VIEWER devices:
 *   - Set up Firebase listeners (handled by useNotifications hook)
 * 
 * @param context NotificationRoleContext from createNotificationRoleContext()
 */
export const initializeRoleServices = async (context: NotificationRoleContext): Promise<void> => {
  if (context.role === NotificationRole.SENDER && context.isNative) {
    try {
      // Request permission to intercept notifications
      // This opens Accessibility Settings for user to enable manually
      const hasPermission = await requestNotificationListenerPermission();

      if (hasPermission) {
        console.log("✓ Notification Listener Permission granted");
        console.log(`→ Service initialized for sender on device: ${context.deviceId}`);
      } else {
        console.warn("⚠ Notification Listener Permission not yet granted");
        console.warn("→ User must manually enable in Settings > Accessibility > Services");
      }
    } catch (error) {
      console.error("✗ Failed to initialize sender services:", error);
      // Don't throw - allow app to continue even if permission setup fails
    }
  } else if (context.role === NotificationRole.VIEWER) {
    console.log(`✓ Viewer role initialized for: ${context.email}`);
    console.log("→ Notification Command Center UI will be displayed");
  }
};

/**
 * Request NotificationListenerService permission from the user
 * 
 * This method:
 * 1. Checks if permission is already granted
 * 2. If not, opens Accessibility Settings
 * 3. User must manually enable the app
 * 
 * Only called for SENDER devices on native platforms
 * 
 * @returns Promise<boolean> - true if permission already granted
 */
export const requestNotificationListenerPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn("⚠ Notification Listener Permission is Android-only");
    return false;
  }

  try {
    // Dynamically import the plugin to avoid issues on web
    const { NotificationListenerPlugin } = await import("./notificationListenerPlugin");

    const result = await NotificationListenerPlugin.requestPermission();
    console.log(`→ requestPermission result: ${result.hasPermission}`);
    console.log(`   ${result.message || "User must enable in Accessibility Settings"}`);

    return result.hasPermission;
  } catch (error) {
    console.error("✗ Failed to request notification listener permission:", error);
    return false;
  }
};

/**
 * Ask user to disable battery optimization for SENDER role
 * 
 * This keeps the NotificationInterceptorService alive even in Doze mode,
 * ensuring notifications continue to be captured and forwarded.
 * 
 * Shows a system dialog for user approval.
 * 
 * Only called for SENDER devices on native platforms
 * 
 * @returns Promise<boolean> - true if already exempted
 */
export const requestBatteryOptimizationExemption = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn("⚠ Battery Optimization Exemption is Android-only");
    return false;
  }

  try {
    const { NotificationListenerPlugin } = await import("./notificationListenerPlugin");

    const result = await NotificationListenerPlugin.requestBatteryOptimizationExemption();
    console.log(`→ Battery exemption requested: ${result.exempted}`);
    console.log(`   ${result.message}`);

    return result.exempted;
  } catch (error) {
    console.error("✗ Failed to request battery optimization exemption:", error);
    return false;
  }
};

/**
 * Check if battery optimization is already disabled
 */
export const checkBatteryOptimizationExemption = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const { NotificationListenerPlugin } = await import("./notificationListenerPlugin");
    const result = await NotificationListenerPlugin.isBatteryOptimizationExempted();
    return result.exempted;
  } catch (error) {
    console.error("✗ Failed to check battery exemption:", error);
    return false;
  }
};

/**
 * Check if notification listener permission is currently granted
 */
export const checkNotificationListenerPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const { NotificationListenerPlugin } = await import("./notificationListenerPlugin");
    const result = await NotificationListenerPlugin.hasNotificationListenerPermission();
    return result.hasPermission;
  } catch (error) {
    console.error("✗ Failed to check notification listener permission:", error);
    return false;
  }
};

/**
 * Helper: Check if current user is in VIEWER role
 */
export const isViewerRole = (user: User | null): boolean => {
  return determineDeviceRole(user) === NotificationRole.VIEWER;
};

/**
 * Helper: Check if current user is in SENDER role
 */
export const isSenderRole = (user: User | null): boolean => {
  return determineDeviceRole(user) === NotificationRole.SENDER;
};

/**
 * Helper: Get role description for UI/logging
 */
export const getRoleDescription = (role: NotificationRole): string => {
  switch (role) {
    case NotificationRole.VIEWER:
      return "Main Phone (Viewer) - Receives all notifications";
    case NotificationRole.SENDER:
      return "Secondary Phone (Sender) - Forwards notifications";
    case NotificationRole.UNKNOWN:
      return "Unknown role - Not authenticated";
    default:
      return "Unknown";
  }
};

