/**
 * QueueSense Vibration & Browser Notification API Service
 * Handles real hardware haptic feedback and notification permissions with robust fallbacks.
 */

export const VIBRATION_PATTERNS = {
  REPORT_SUBMITTED: [150, 75, 150],
  TEST_VIBRATION: [200, 100, 300],
  BETTER_COUNTER_FOUND: [80],
  HIGH_CONGESTION_ALERT: [200, 100, 200, 100, 300],
  TILT_TICK: [30]
};

export function isVibrationSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Synchronous direct vibration call.
 * MUST be invoked directly within a user-activation click event handler (not after an await/fetch).
 */
export function triggerVibrationDirect(pattern) {
  if (!isVibrationSupported()) {
    return {
      supported: false,
      success: false,
      status: 'unsupported',
      message: 'navigator.vibrate is unsupported on this browser/device.'
    };
  }

  try {
    const result = navigator.vibrate(pattern);
    if (result === true) {
      return {
        supported: true,
        success: true,
        status: 'success',
        message: `Vibration pattern [${Array.isArray(pattern) ? pattern.join(', ') : pattern}] ms dispatched successfully.`
      };
    } else {
      return {
        supported: true,
        success: false,
        status: 'rejected',
        message: 'navigator.vibrate() returned false (blocked by browser user-activation policy or system silent mode).'
      };
    }
  } catch (e) {
    return {
      supported: true,
      success: false,
      status: 'error',
      message: `Vibration execution error: ${e?.message || 'Unknown exception'}`
    };
  }
}

// Backwards-compatible boolean helper
export function triggerVibration(pattern) {
  const res = triggerVibrationDirect(pattern);
  return res.success;
}

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (e) {
    console.warn('Notification permission error:', e);
    return 'denied';
  }
}

export function sendBrowserNotification(title, options = {}) {
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      return true;
    } catch (e) {
      console.warn('Notification send failed:', e);
    }
  }
  return false;
}
export function testHardwareVibration() {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    return navigator.vibrate([200, 100, 300]);
  }

  return false;
}