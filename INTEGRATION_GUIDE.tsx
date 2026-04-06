/**
 * HOW TO INTEGRATE NOTIFICATION COMMAND CENTER INTO YOUR APP
 * 
 * Step 1: Add role-based conditional rendering to App.tsx
 * Step 2: Protect routes for Viewer role
 * Step 3: Initialize native service for Sender role
 */

// ========== STEP 1: Update your App.tsx ==========

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebaseService";
import { createNotificationRoleContext, initializeRoleServices, NotificationRole } from "./services/notificationRoleService";
import type { NotificationRoleContext } from "./services/notificationRoleService";
import { NotificationCommandCenter } from "./components/NotificationCommandCenter";

// Your existing imports...
// import YourExistingRoutes from "./components/...";

export function App() {
  const [roleContext, setRoleContext] = useState<NotificationRoleContext | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Listen to auth changes and determine role
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Create role context
        const context = createNotificationRoleContext(user);
        setRoleContext(context);

        // Initialize role-specific services
        try {
          await initializeRoleServices(context);
        } catch (error) {
          console.error("Failed to initialize role services:", error);
        }
      } else {
        setRoleContext(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return <div>Loading...</div>;
  }

  // If not logged in, show login screen
  if (!roleContext) {
    return <YourLoginComponent />;
  }

  // VIEWER ROLE: Exclusively show Notification Command Center
  if (roleContext.role === NotificationRole.VIEWER) {
    return <NotificationCommandCenter />;
  }

  // SENDER ROLE: Show your regular app
  if (roleContext.role === NotificationRole.SENDER) {
    return <YourNormalAppComponent />;
  }

  // UNKNOWN ROLE
  return <div>Error: Could not determine device role</div>;
}

// ========== STEP 2: (For Senders only) Request Notification Permission ==========

/**
 * Add this component somewhere in the Sender's initial setup UI
 * For example, in SettingsView.tsx or a welcome screen
 */

import { requestNotificationListenerPermission, requestBatteryOptimizationExemption } from "./services/notificationRoleService";

export function NotificationPermissionSetup() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isExempted, setIsExempted] = useState(false);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationListenerPermission();
      setHasPermission(granted);
      
      if (granted) {
        alert("Please enable the app in the Accessibility Settings that opens next.");
        // Navigate to Settings automatically
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      alert("Failed to request permission. Please try again.");
    }
  };

  const handleRequestBatteryExemption = async () => {
    try {
      const exempted = await requestBatteryOptimizationExemption();
      setIsExempted(exempted);
      alert("Please approve bypassing battery optimization to keep notifications flowing.");
    } catch (error) {
      console.error("Error requesting battery exemption:", error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Configure Notification Interception</h2>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">
            Step 1: Enable Notification Access
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            This app will securely intercept notifications from your other Android devices and
            forward them to your main phone.
          </p>
          <button
            onClick={handleRequestPermission}
            disabled={hasPermission}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-green-600 disabled:text-white transition-colors"
          >
            {hasPermission ? "✓ Permission Granted" : "Grant Permission"}
          </button>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">
            Step 2: Bypass Battery Optimization (Optional)
          </h3>
          <p className="text-sm text-green-800 mb-3">
            This keeps the notification service running even when the device is in sleep mode
            (Doze). Recommended for reliable notification delivery.
          </p>
          <button
            onClick={handleRequestBatteryExemption}
            disabled={isExempted}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-700 transition-colors"
          >
            {isExempted ? "✓ Exempted" : "Request Exemption"}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-800">
          💡 <strong>Tip:</strong> After granting permissions, this device will start forwarding
          all incoming notifications to your main phone automatically in the background.
        </p>
      </div>
    </div>
  );
}

// ========== STEP 3: Update SettingsView.tsx ==========

/**
 * Add a new section in your SettingsView for the Sender role
 */

export function NotificationSenderSettings() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <h3 className="font-semibold text-indigo-900 mb-2">
          📱 Notification Mirroring (Sender Mode)
        </h3>
        <p className="text-sm text-indigo-800 mb-4">
          This device is forwarding notifications to kuttiavt@gmail.com. The notification
          listener service runs in the background and never interferes with your normal app usage.
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-white rounded border border-indigo-100">
            <span className="text-indigo-900">Background Service Status</span>
            <span className="text-green-600 font-semibold">● Active</span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-white rounded border border-indigo-100">
            <span className="text-indigo-900">Notifications Sent</span>
            <span className="text-gray-600">Today</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-white rounded border border-indigo-100">
            <span className="text-indigo-900">Last Notification</span>
            <span className="text-gray-600">2 minutes ago</span>
          </div>
        </div>
      </div>

      <button className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium">
        View Notification Permissions
      </button>
    </div>
  );
}
