/**
 * Live OS notification-permission status.
 *
 * Any screen that renders the STATE of a notification (a toggle, a "next
 * reminder" caption) needs this. The stored preference is what the user wants;
 * the OS permission is what the user gets. When they disagree the UI must show
 * the OS's answer, or it advertises reminders that cannot fire.
 *
 * Re-reads on foreground because permission can be revoked out-of-band in system
 * settings while the app is backgrounded — nothing notifies us.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getPermissionAsync, type PermissionStatus } from '@/services/notificationScheduler';

export function useNotificationPermission(): PermissionStatus {
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const isMounted = useRef(true);

  const sync = useCallback(async () => {
    const status = await getPermissionAsync();
    if (isMounted.current) setPermission(status);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void sync();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') void sync();
    });
    return () => {
      isMounted.current = false;
      sub.remove();
    };
  }, [sync]);

  return permission;
}
