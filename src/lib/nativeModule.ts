import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * True when this binary actually registered the native module. JS packages
 * that call TurboModuleRegistry.getEnforcing on import will redbox a stale
 * dev client, so we check first and skip the require.
 */
export function hasNativeModule(...names: string[]): boolean {
  for (const name of names) {
    try {
      if ((NativeModules as Record<string, unknown>)[name]) return true;
      if (TurboModuleRegistry.get(name)) return true;
    } catch {
      // get() is not supposed to throw. Treat a throw as missing.
    }
  }
  return false;
}
