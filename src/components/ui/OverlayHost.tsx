import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type Slot = { id: string; node: React.ReactNode };
type Publish = (id: string, node: React.ReactNode | null) => void;

const OverlayContext = createContext<Publish | null>(null);

/** Draws above native screens without presenting a modal view controller. */
function AboveScreens({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'ios') {
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {children}
      </View>
    );
  }
  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {children}
      </View>
    </FullWindowOverlay>
  );
}

/** Full-screen layer above the app. Sheets draw here instead of in a native modal.
 * A React Native modal is its own window. Removing it on iOS can leave that
 * window in place, and then no tap reaches the app until it is force-quit. */
export function OverlayHost({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const publish = useCallback<Publish>((id, node) => {
    setSlots((prev) => {
      const index = prev.findIndex((slot) => slot.id === id);
      if (!node) {
        if (index === -1) return prev;
        return prev.filter((slot) => slot.id !== id);
      }
      if (index === -1) return [...prev, { id, node }];
      if (prev[index].node === node) return prev;
      const next = prev.slice();
      next[index] = { id, node };
      return next;
    });
  }, []);

  return (
    <OverlayContext.Provider value={publish}>
      <View style={{ flex: 1 }}>
        {children}
        {slots.length ? (
          <AboveScreens>
            {slots.map((slot) => (
              <View key={slot.id} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                {slot.node}
              </View>
            ))}
          </AboveScreens>
        ) : null}
      </View>
    </OverlayContext.Provider>
  );
}

/** Puts `children` on the overlay while `visible`. A normal view, not a modal. */
export function FullOverlay({
  visible,
  onDismiss,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onDismiss?: () => void;
  onRequestClose?: () => void;
  children: React.ReactNode;
}) {
  const publish = useContext(OverlayContext);
  const id = useId();
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const shown = useRef(false);

  useLayoutEffect(() => {
    if (!publish) return;
    if (visible) {
      shown.current = true;
      publish(id, children);
      return;
    }
    publish(id, null);
    if (!shown.current) return;
    shown.current = false;
    onDismissRef.current?.();
  });

  useEffect(() => {
    return () => publish?.(id, null);
  }, [publish, id]);

  useEffect(() => {
    if (!visible || !onRequestClose) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onRequestClose]);

  if (publish || !visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {children}
    </View>
  );
}
