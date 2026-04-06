/**
 * NotificationCommandCenter Component
 * Viewer UI (for kuttiavt@gmail.com)
 * Displays real-time notifications from all connected sender devices
 * 
 * Features:
 * - Live notification feed (newest first)
 * - Filter by sender device
 * - Mark notifications as read/dismissed
 * - See sender device info and status
 */

import React, { useState } from "react";
import { useNotifications } from "../services/useNotifications";
import type { InterceptedNotification, NotificationSenderMetadata } from "../types";
import {
  Clock,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  RefreshCw
} from "lucide-react";

export const NotificationCommandCenter: React.FC = () => {
  const {
    notifications,
    senders,
    selectedSenderId,
    isLoading,
    error,
    unreadCount,
    markDismissed,
    selectSender,
    clearAll
  } = useNotifications();

  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Group notifications by sender for UI
  const groupedNotifications = notifications.reduce(
    (acc, notif) => {
      if (!acc[notif.senderUid]) {
        acc[notif.senderUid] = [];
      }
      acc[notif.senderUid].push(notif);
      return acc;
    },
    {} as Record<string, InterceptedNotification[]>
  );

  const handleMarkDismissed = async (senderUid: string, notificationId: string) => {
    try {
      await markDismissed(senderUid, notificationId);
    } catch (err) {
      console.error("Error dismissing notification:", err);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Connecting to notification stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Notification Command Center
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time notifications from {senders.length} connected device
                {senders.length !== 1 ? "s" : ""}
                {unreadCount > 0 && ` • ${unreadCount} unread`}
              </p>
            </div>
            <button
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Clear All
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Sender List Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
              <Filter className="w-4 h-4" />
              Connected Devices
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* "All Devices" option */}
            <button
              onClick={() => selectSender(null)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                selectedSenderId === null
                  ? "bg-blue-50 text-blue-700 border-b-blue-200"
                  : "hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4" />
                <div>
                  <p className="font-medium text-sm">All Devices</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {notifications.length} notifications
                  </p>
                </div>
              </div>
            </button>

            {/* Individual senders */}
            {senders.map((sender) => {
              const senderNotifs = groupedNotifications[sender.senderUid] || [];
              const senderUnread = senderNotifs.filter((n) => !n.dismissed).length;

              return (
                <button
                  key={sender.senderUid}
                  onClick={() => selectSender(sender.senderUid)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                    selectedSenderId === sender.senderUid
                      ? "bg-blue-50 text-blue-700 border-b-blue-200"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {sender.displayName}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {sender.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {senderNotifs.length} notifications
                      </p>
                    </div>
                    {senderUnread > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {senderUnread > 9 ? "9+" : senderUnread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {senders.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                <p>No connected devices yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {notifications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No notifications yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Waiting for notifications from connected devices...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
              {notifications.map((notif) => {
                const sender = senders.find((s) => s.senderUid === notif.senderUid);
                const isExpanded = showDetails === notif.id;

                return (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notif.dismissed ? "opacity-60" : ""
                    }`}
                  >
                    {/* Main notification row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header with app name and sender */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-700">
                            {notif.appName}
                          </span>
                          {sender && (
                            <span className="text-xs text-gray-500">
                              from{" "}
                              <span className="font-medium">{sender.displayName}</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                          {notif.title || "No Title"}
                        </h3>

                        {/* Message preview */}
                        <p className="text-gray-700 text-sm mb-2">
                          {notif.message}
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(notif.timestamp)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {notif.dismissed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}

                        <button
                          onClick={() => handleMarkDismissed(notif.senderUid, notif.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={notif.dismissed ? "Restored" : "Mark as read"}
                        >
                          {notif.dismissed ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setShowDetails(isExpanded ? null : notif.id)
                          }
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 p-3 rounded text-xs">
                        <div className="space-y-2">
                          {notif.bigText && (
                            <div>
                              <p className="text-gray-600 font-medium">Full Message:</p>
                              <p className="text-gray-700 mt-1">{notif.bigText}</p>
                            </div>
                          )}
                          {notif.subText && (
                            <div>
                              <p className="text-gray-600 font-medium">Subtitle:</p>
                              <p className="text-gray-700">{notif.subText}</p>
                            </div>
                          )}
                          {notif.category && (
                            <div>
                              <p className="text-gray-600">
                                Category: <span className="font-mono">{notif.category}</span>
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-600">
                              Device ID: <span className="font-mono text-xs">{notif.deviceId}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
