import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LogBox, NativeModules } from 'react-native';

const IGNORE =
  /Auto refresh tick failed|getValueWithKeyAsync|required entitlement|Calling the 'getValueWithKeyAsync' function has failed/i;

LogBox.ignoreLogs([
  'Auto refresh tick failed',
  'getValueWithKeyAsync',
  'required entitlement',
  "Calling the 'getValueWithKeyAsync' function has failed",
]);

function silence(args: unknown[]): boolean {
  return IGNORE.test(args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' '));
}

function wrapConsole(): void {
  const error = console.error.bind(console);
  const warn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    if (silence(args)) return;
    error(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (silence(args)) return;
    warn(...args);
  };
}

function patchNativeSecureStore(): void {
  for (const name of ['ExpoSecureStore', 'SecureStore']) {
    const native = (NativeModules as Record<string, Record<string, unknown> | undefined>)[name];
    if (!native) continue;
    for (const method of ['getValueWithKeyAsync', 'setValueWithKeyAsync', 'deleteValueWithKeyAsync']) {
      const orig = native[method];
      if (typeof orig !== 'function') continue;
      native[method] = (...args: unknown[]) => {
        try {
          const result = (orig as (...next: unknown[]) => unknown).apply(native, args);
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            return (result as Promise<unknown>).catch(() => (method.startsWith('get') ? null : undefined));
          }
          return result;
        } catch {
          return method.startsWith('get') ? null : undefined;
        }
      };
    }
  }
}

function patchLogBox(): void {
  try {
    // RN's overlay installer can ignore LogBox.ignoreLogs if it loads later.
    // Swallow the entitlement tick at the log sink so it never becomes a redbox.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LogBoxData = require('react-native/Libraries/LogBox/Data/LogBoxData') as {
      addLog?: (log: { message?: { content?: string } }) => void;
      addException?: (error: { message?: string }) => void;
    };
    if (LogBoxData.addLog && !('__hey100Patched' in LogBoxData)) {
      Object.defineProperty(LogBoxData, '__hey100Patched', { value: true });
      const addLog = LogBoxData.addLog.bind(LogBoxData);
      LogBoxData.addLog = (log) => {
        if (IGNORE.test(log?.message?.content ?? '')) return;
        addLog(log);
      };
    }
    if (LogBoxData.addException) {
      const addException = LogBoxData.addException.bind(LogBoxData);
      LogBoxData.addException = (error) => {
        if (IGNORE.test(error?.message ?? '')) return;
        addException(error);
      };
    }
  } catch {
    // Bundled production builds do not ship LogBoxData.
  }

  const errorUtils = (globalThis as { ErrorUtils?: { reportError: (error: Error) => void } }).ErrorUtils;
  if (errorUtils?.reportError && !('__hey100Patched' in errorUtils)) {
    Object.defineProperty(errorUtils, '__hey100Patched', { value: true });
    const report = errorUtils.reportError.bind(errorUtils);
    errorUtils.reportError = (error) => {
      if (IGNORE.test(error?.message ?? '')) return;
      report(error);
    };
  }
}

wrapConsole();
patchNativeSecureStore();
patchLogBox();
setTimeout(() => {
  wrapConsole();
  patchLogBox();
}, 0);
setTimeout(() => {
  wrapConsole();
  patchLogBox();
}, 500);

/**
 * This simulator build has no Keychain entitlement. SecureStore then throws
 * "A required entitlement isn't present", which a leftover auth refresh timer
 * surfaces as a redbox on every tick. Swallow that and use AsyncStorage.
 */
export function guardSecureStore(): void {
  const store = SecureStore as typeof SecureStore & {
    getItemAsync: typeof SecureStore.getItemAsync;
    setItemAsync: typeof SecureStore.setItemAsync;
    deleteItemAsync: typeof SecureStore.deleteItemAsync;
  };

  if ('__hey100Guarded' in store) return;
  Object.defineProperty(store, '__hey100Guarded', { value: true });

  const getItem = store.getItemAsync.bind(store);
  const setItem = store.setItemAsync.bind(store);
  const delItem = store.deleteItemAsync.bind(store);

  store.getItemAsync = async (key, options) => {
    try {
      return await getItem(key, options);
    } catch {
      return AsyncStorage.getItem(key);
    }
  };

  store.setItemAsync = async (key, value, options) => {
    try {
      await setItem(key, value, options);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  };

  store.deleteItemAsync = async (key, options) => {
    try {
      await delItem(key, options);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  };
}

guardSecureStore();
