/**
 * useNotifications Hook
 *
 * Handles all notification-related functionality:
 * - Playing sound notifications on new messages
 * - Showing desktop (browser) notifications
 * - Updating document title with unread count
 *
 * This hook should be used once at the app level (e.g., in AppShell).
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import {
  selectSoundEnabled,
  selectCanShowDesktopNotifications,
  setDesktopPermission,
} from '@/features/notificationSettingsSlice';
import { selectUnreadRoomCount } from '@/features/unifiedChatSlice';
import { useWebSocketEvent } from '@/hooks/useUnifiedWebSocket';
import type { GlobalNewMessageNotificationEvent } from '@/utils/unifiedWebSocket';
import {
  playNotificationSound,
  preloadNotificationSound,
} from '@/utils/notificationSound';

// App name for title and notifications
const APP_NAME = 'MNK Chat';
const APP_ICON = '/apple-touch-icon.png';

/**
 * Main notifications hook - call this once in AppShell or App component.
 * Handles sound, desktop notifications, and title updates.
 */
export function useNotifications(activeChatId?: number) {
  const soundEnabled = useAppSelector(selectSoundEnabled);
  const canShowDesktop = useAppSelector(selectCanShowDesktopNotifications);
  const unreadCount = useAppSelector(selectUnreadRoomCount);
  const currentUserId = useAppSelector(state => state.auth.user?.id);

  // Track the original title
  const originalTitleRef = useRef<string>(APP_NAME);

  // Preload audio context on mount
  useEffect(() => {
    preloadNotificationSound();
  }, []);

  // Update document title based on unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitleRef.current}`;
    } else {
      document.title = originalTitleRef.current;
    }

    // Cleanup: restore original title when component unmounts
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [unreadCount]);

  // Show desktop notification
  const showDesktopNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      if (!canShowDesktop) return;

      try {
        const notification = new Notification(title, {
          body,
          icon: APP_ICON,
          badge: APP_ICON,
          tag: 'mnk-chat-message', // Replaces existing notification with same tag
          silent: true, // We handle sound separately
        });

        if (onClick) {
          notification.onclick = () => {
            window.focus();
            onClick();
            notification.close();
          };
        }

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      } catch (e) {
        console.warn('Failed to show desktop notification:', e);
      }
    },
    [canShowDesktop]
  );

  // Handle new message notifications
  const handleNewMessage = useCallback(
    (event: GlobalNewMessageNotificationEvent) => {
      // Don't notify for messages from the current user
      if (event.sender_id === currentUserId) return;

      // Don't notify for the currently active chat
      if (event.chat_room_id === activeChatId) return;

      // Play sound if enabled
      if (soundEnabled) {
        playNotificationSound();
      }

      // Show desktop notification if enabled
      if (canShowDesktop) {
        const senderName = event.sender_name || 'Someone';
        const messagePreview = event.has_attachment
          ? '📎 Sent an attachment'
          : event.message_content?.substring(0, 50) ||
            'Sent you a message';

        showDesktopNotification(
          senderName,
          messagePreview,
          () => {
            // Navigate to the chat when notification is clicked
            window.location.href = `/chat/${event.chat_room_id}`;
          }
        );
      }
    },
    [currentUserId, activeChatId, soundEnabled, canShowDesktop, showDesktopNotification]
  );

  // Subscribe to new message notifications via WebSocket
  useWebSocketEvent('global.new_message_notification', handleNewMessage);

  return {
    unreadCount,
    showDesktopNotification,
  };
}

/**
 * Request desktop notification permission.
 * Returns the new permission status.
 */
export async function requestNotificationPermission(
  dispatch: ReturnType<typeof useAppDispatch>
): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    dispatch(setDesktopPermission(permission));
    return permission;
  } catch (e) {
    console.error('Failed to request notification permission:', e);
    return Notification.permission;
  }
}

/**
 * Hook to get notification permission utilities.
 */
export function useNotificationPermission() {
  const dispatch = useAppDispatch();
  const permission = useAppSelector(
    state => state.notificationSettings.desktopPermission
  );

  const requestPermission = useCallback(async () => {
    return requestNotificationPermission(dispatch);
  }, [dispatch]);

  return {
    permission,
    requestPermission,
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
  };
}

export default useNotifications;
