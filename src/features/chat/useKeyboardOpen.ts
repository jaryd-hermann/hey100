import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** True while the software keyboard is on screen. */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setOpen(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return open;
}
