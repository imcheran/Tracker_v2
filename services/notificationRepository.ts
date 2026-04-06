/**
 * Notification Repository
 * Handles real-time Firebase Realtime Database sync for the Viewer
 * Watches /notificationCommands/{senderUID}/notifications for all incoming notifications
 * 
 * Used only by VIEWER role (kuttiavt@gmail.com)
 */

import {
  ref,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  query,
  limitToLast,
  off,
  Database,
  update,
  set
} from "firebase/database";
import type { Unsubscribe } from "firebase/database";
import { getDatabase } from "firebase/database";
import type { InterceptedNotification, NotificationSenderMetadata } from "../types";

export interface NotificationRepositoryListener {
  onNotificationAdded?: (notification: InterceptedNotification) => void;
  onNotificationChanged?: (notification: InterceptedNotification) => void;
  onNotificationRemoved?: (notificationId: string) => void;
  onSenderAdded?: (sender: NotificationSenderMetadata) => void;
  onError?: (error: Error) => void;
}

export class NotificationRepository {
  private db: Database;
  private unsubscribers: Map<string, Unsubscribe> = new Map();
  private listeners: Map<string, NotificationRepositoryListener> = new Map();

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Start listening to all senders' notifications
   * This watches /notificationCommands/{senderUID}/notifications
   * Returns a unique listener ID for management
   */
  public subscribeToAllNotifications(
    listener: NotificationRepositoryListener
  ): string {
    const listenerId = this.generateListenerId();
    this.listeners.set(listenerId, listener);

    try {
      // Watch all senders under /notificationCommands
      const commandsRef = ref(this.db, "notificationCommands");

      // Listen for new senders and their notifications
      const unsubscribe = onChildAdded(commandsRef, (senderSnapshot) => {
        const senderUid = senderSnapshot.key || "";
        const senderData = senderSnapshot.val();

        // Extract sender metadata
        const metadata = senderData?.metadata as any;
        if (metadata) {
          const sender: NotificationSenderMetadata = {
            senderUid,
            email: metadata.email || "unknown",
            displayName: metadata.displayName || "Unknown Device",
            deviceId: metadata.deviceId || "",
            lastNotificationTime: metadata.lastSeen || 0,
            isActive: true,
            notificationCount: 0
          };
          listener.onSenderAdded?.(sender);
        }

        // Watch this sender's notifications
        this.subscribeToSenderNotifications(senderUid, listener);
      });

      this.unsubscribers.set(listenerId, unsubscribe);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      listener.onError?.(err);
    }

    return listenerId;
  }

  /**
   * Subscribe to a specific sender's notifications
   * Path: /notificationCommands/{senderUID}/notifications
   */
  private subscribeToSenderNotifications(
    senderUid: string,
    listener: NotificationRepositoryListener
  ): void {
    try {
      const notificationsRef = ref(
        this.db,
        `notificationCommands/${senderUid}/notifications`
      );

      // New notifications
      const unsubAddedKey = `added_${senderUid}`;
      const unsubAdded = onChildAdded(notificationsRef, (snapshot) => {
        const notifId = snapshot.key || "";
        const notifData = snapshot.val();

        const notification: InterceptedNotification = {
          id: notifId,
          title: notifData.title || "",
          appName: notifData.appName || "Unknown App",
          message: notifData.message || "",
          bigText: notifData.bigText,
          subText: notifData.subText,
          timestamp: notifData.timestamp || 0,
          senderUid,
          senderEmail: notifData.senderEmail || "unknown",
          deviceId: notifData.deviceId || "",
          dismissed: notifData.dismissed || false,
          category: notifData.category,
          actions: notifData.actions || []
        };

        listener.onNotificationAdded?.(notification);
      });

      this.unsubscribers.set(unsubAddedKey, unsubAdded);

      // Changed notifications (dismissed, etc)
      const unsubChangedKey = `changed_${senderUid}`;
      const unsubChanged = onChildChanged(notificationsRef, (snapshot) => {
        const notifId = snapshot.key || "";
        const notifData = snapshot.val();

        const notification: InterceptedNotification = {
          id: notifId,
          title: notifData.title || "",
          appName: notifData.appName || "Unknown App",
          message: notifData.message || "",
          bigText: notifData.bigText,
          subText: notifData.subText,
          timestamp: notifData.timestamp || 0,
          senderUid,
          senderEmail: notifData.senderEmail || "unknown",
          deviceId: notifData.deviceId || "",
          dismissed: notifData.dismissed || false,
          category: notifData.category,
          actions: notifData.actions || []
        };

        listener.onNotificationChanged?.(notification);
      });

      this.unsubscribers.set(unsubChangedKey, unsubChanged);

      // Removed notifications
      const unsubRemovedKey = `removed_${senderUid}`;
      const unsubRemoved = onChildRemoved(notificationsRef, (snapshot) => {
        const notifId = snapshot.key || "";
        listener.onNotificationRemoved?.(notifId);
      });

      this.unsubscribers.set(unsubRemovedKey, unsubRemoved);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      listener.onError?.(err);
    }
  }

  /**
   * Mark a notification as dismissed/read
   */
  public async markNotificationDismissed(
    senderUid: string,
    notificationId: string
  ): Promise<void> {
    try {
      const notifRef = ref(
        this.db,
        `notificationCommands/${senderUid}/notifications/${notificationId}/dismissed`
      );
      await set(notifRef, true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw err;
    }
  }

  /**
   * Get latest N notifications from a specific sender
   */
  public subscribeToSenderNotificationsLimit(
    senderUid: string,
    limit: number,
    listener: NotificationRepositoryListener
  ): string {
    const listenerId = this.generateListenerId();
    this.listeners.set(listenerId, listener);

    try {
      const notificationsRef = query(
        ref(this.db, `notificationCommands/${senderUid}/notifications`),
        limitToLast(limit)
      );

      const unsubscribe = onChildAdded(notificationsRef, (snapshot) => {
        const notifId = snapshot.key || "";
        const notifData = snapshot.val();

        const notification: InterceptedNotification = {
          id: notifId,
          title: notifData.title || "",
          appName: notifData.appName || "Unknown App",
          message: notifData.message || "",
          timestamp: notifData.timestamp || 0,
          senderUid,
          senderEmail: notifData.senderEmail || "unknown",
          deviceId: notifData.deviceId || "",
          dismissed: notifData.dismissed || false,
          category: notifData.category
        };

        listener.onNotificationAdded?.(notification);
      });

      this.unsubscribers.set(listenerId, unsubscribe);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      listener.onError?.(err);
    }

    return listenerId;
  }

  /**
   * Unsubscribe from a listener by ID
   */
  public unsubscribe(listenerId: string): void {
    const unsubscribe = this.unsubscribers.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(listenerId);
    }
    this.listeners.delete(listenerId);
  }

  /**
   * Unsubscribe from all listeners
   */
  public unsubscribeAll(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers.clear();
    this.listeners.clear();
  }

  /**
   * Helper to generate unique listener IDs
   */
  private generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random()}`;
  }
}

// Export singleton instance
export const notificationRepository = new NotificationRepository();
