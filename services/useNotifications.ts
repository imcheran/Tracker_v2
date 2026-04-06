/**
 * useNotifications Hook
 * Manages real-time notification state for the Viewer role
 * Handles subscribing/unsubscribing from Firebase and state updates
 */

import { useEffect, useState, useCallback } from "react";
import type { InterceptedNotification, NotificationSenderMetadata } from "../types";
import {
  notificationRepository,
  type NotificationRepositoryListener
} from "./notificationRepository";

export interface UseNotificationsState {
  notifications: InterceptedNotification[];
  senders: NotificationSenderMetadata[];
  selectedSenderId: string | null;
  isLoading: boolean;
  error: Error | null;
  unreadCount: number;
}

export interface UseNotificationsActions {
  markDismissed: (senderUid: string, notificationId: string) => Promise<void>;
  selectSender: (senderUid: string | null) => void;
  clearAll: () => void;
}

export function useNotifications(): UseNotificationsState & UseNotificationsActions {
  const [state, setState] = useState<UseNotificationsState>({
    notifications: [],
    senders: [],
    selectedSenderId: null,
    isLoading: true,
    error: null,
    unreadCount: 0
  });

  // Set up real-time listener when component mounts
  useEffect(() => {
    const listener: NotificationRepositoryListener = {
      onNotificationAdded: (notification) => {
        setState((prev) => {
          // Insert in chronological order (newest first)
          const sorted = [notification, ...prev.notifications].sort(
            (a, b) => b.timestamp - a.timestamp
          );
          return {
            ...prev,
            notifications: sorted,
            unreadCount: prev.unreadCount + (notification.dismissed ? 0 : 1),
            isLoading: false
          };
        });
      },

      onNotificationChanged: (notification) => {
        setState((prev) => {
          const updated = prev.notifications.map((n) =>
            n.id === notification.id ? notification : n
          );
          const wasDismissed = prev.notifications.find(n => n.id === notification.id)?.dismissed;
          const nowDismissed = notification.dismissed;
          const dismissedStateChanged = wasDismissed !== nowDismissed;

          return {
            ...prev,
            notifications: updated,
            unreadCount: dismissedStateChanged
              ? prev.unreadCount + (nowDismissed ? -1 : 1)
              : prev.unreadCount
          };
        });
      },

      onNotificationRemoved: (notificationId) => {
        setState((prev) => {
          const removedNotif = prev.notifications.find(n => n.id === notificationId);
          return {
            ...prev,
            notifications: prev.notifications.filter((n) => n.id !== notificationId),
            unreadCount: removedNotif?.dismissed
              ? prev.unreadCount
              : Math.max(0, prev.unreadCount - 1)
          };
        });
      },

      onSenderAdded: (sender) => {
        setState((prev) => ({
          ...prev,
          senders: [sender, ...prev.senders],
          isLoading: false
        }));
      },

      onError: (error) => {
        setState((prev) => ({
          ...prev,
          error,
          isLoading: false
        }));
      }
    };

    // Subscribe to all notifications
    const listenerId = notificationRepository.subscribeToAllNotifications(listener);

    // Cleanup
    return () => {
      notificationRepository.unsubscribe(listenerId);
    };
  }, []);

  // Filter notifications by selected sender
  const filteredNotifications = state.selectedSenderId
    ? state.notifications.filter((n) => n.senderUid === state.selectedSenderId)
    : state.notifications;

  // Actions
  const markDismissed = useCallback(async (senderUid: string, notificationId: string) => {
    try {
      await notificationRepository.markNotificationDismissed(senderUid, notificationId);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error))
      }));
    }
  }, []);

  const selectSender = useCallback((senderUid: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedSenderId: senderUid
    }));
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: [],
      unreadCount: 0
    }));
  }, []);

  return {
    notifications: filteredNotifications,
    senders: state.senders,
    selectedSenderId: state.selectedSenderId,
    isLoading: state.isLoading,
    error: state.error,
    unreadCount: state.unreadCount,
    markDismissed,
    selectSender,
    clearAll
  };
}
