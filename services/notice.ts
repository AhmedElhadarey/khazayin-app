import { Alert } from 'react-native';

/** The one button of a notice: the label contact.tsx already used. */
export const ALERT_OK_LABEL = 'حسناً';

/**
 * A one-button alert. `Alert.alert(title, message)` with no buttons draws the
 * platform's own «OK», in English on an English-locale phone, so every notice
 * names its button here (guarded by `__tests__/alertButtonsGuard.test.ts`).
 */
export function showNotice(title: string, message?: string, onOk?: () => void): void {
  Alert.alert(title, message, [{ text: ALERT_OK_LABEL, onPress: onOk }]);
}
