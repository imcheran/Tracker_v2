/**
 * Web implementation stub for NotificationListenerPlugin
 * 
 * The notification listener service is Android-only (requires native Kotlin code).
 * This web implementation provides no-op stubs for browser builds.
 */

import { WebPlugin } from "@capacitor/core";
import type { NotificationListenerPluginInterface } from "./notificationListenerPlugin";

export class NotificationListenerPluginWeb
  extends WebPlugin
  implements NotificationListenerPluginInterface {
  async requestPermission(): Promise<{ hasPermission: boolean; message?: string }> {
    console.warn(
      "NotificationListenerPlugin: requestPermission() is not available on web platform. " +
        "This feature requires native Android implementation."
    );
    return { hasPermission: false, message: "Not available on web" };
  }

  async hasNotificationListenerPermission(): Promise<{ hasPermission: boolean }> {
    return { hasPermission: false };
  }

  async requestBatteryOptimizationExemption(): Promise<{ exempted: boolean; message: string }> {
    console.warn(
      "NotificationListenerPlugin: Battery optimization exemption is not available on web. " +
        "This feature requires native Android implementation."
    );
    return { exempted: false, message: "Not available on web" };
  }

  async isBatteryOptimizationExempted(): Promise<{ exempted: boolean }> {
    return { exempted: false };
  }

  async startListening(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Not available on web platform" };
  }

  async stopListening(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Not available on web platform" };
  }

  async isListening(): Promise<{ isListening: boolean }> {
    return { isListening: false };
  }

  async getFirebaseUser(): Promise<{ uid: string; email: string; displayName: string }> {
    return { uid: "", email: "", displayName: "" };
  }

  async onNotificationIntercepted(callback: (data: any) => void): Promise<void> {
    console.warn("NotificationListenerPlugin: Web platform does not support notification interception");
  }

  async getInterceptedNotifications(): Promise<{ notifications: any[] }> {
    return { notifications: [] };
  }
}
