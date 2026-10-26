import { Platform } from 'react-native';

import { config } from './config';
import { hasNativeModule } from './nativeModule';

export const PRO_ENTITLEMENT = 'pro';
export const PRO_PRODUCT_ID = 'hey100_pro_monthly';

export type CustomerInfoLike = {
  entitlements: { active: Record<string, unknown> };
};

type PurchaseError = Error & { userCancelled?: boolean; code?: number | string };

type PurchasesModule = {
  default: {
    setLogLevel: (level: unknown) => void;
    configure: (options: { apiKey: string }) => void;
    isConfigured: () => Promise<boolean>;
    logIn: (userId: string) => Promise<{ customerInfo: CustomerInfoLike }>;
    logOut: () => Promise<{ customerInfo: CustomerInfoLike }>;
    getCustomerInfo: () => Promise<CustomerInfoLike>;
    getOfferings: () => Promise<{
      current: {
        monthly?: { product: { priceString: string } };
        availablePackages: { product: { identifier: string; priceString: string } }[];
      } | null;
    }>;
    purchasePackage: (pkg: unknown) => Promise<{ customerInfo: CustomerInfoLike }>;
    restorePurchases: () => Promise<CustomerInfoLike>;
    showManageSubscriptions: () => Promise<void>;
    addCustomerInfoUpdateListener: (listener: (info: CustomerInfoLike) => void) => void;
    removeCustomerInfoUpdateListener: (listener: (info: CustomerInfoLike) => void) => boolean;
  };
  LOG_LEVEL: { VERBOSE: unknown; WARN: unknown };
};

let booted = false;

function native(): PurchasesModule | null {
  if (Platform.OS === 'web') return null;
  if (!config.revenueCatAppleKey?.startsWith('appl_')) return null;
  if (!hasNativeModule('RNPurchases')) return null;
  try {
    return require('react-native-purchases') as PurchasesModule;
  } catch {
    return null;
  }
}

function sdk() {
  return native()?.default ?? null;
}

export function isPurchasesConfigured(): boolean {
  return booted;
}

export function hasPro(info: CustomerInfoLike | null | undefined): boolean {
  return !!info?.entitlements.active[PRO_ENTITLEMENT];
}

/** Safe in Expo Go and before a native rebuild: missing binaries become a no-op. */
export function initPurchases(): void {
  if (booted) return;
  const mod = native();
  const apiKey = config.revenueCatAppleKey;
  const purchases = mod?.default;
  if (!mod || !purchases || !apiKey) return;

  try {
    purchases.setLogLevel(__DEV__ ? mod.LOG_LEVEL.VERBOSE : mod.LOG_LEVEL.WARN);
    purchases.configure({ apiKey });
    booted = true;
  } catch {
    // Native module is in the JS bundle but not in this binary yet.
  }
}

export async function loginPurchases(userId: string): Promise<CustomerInfoLike | null> {
  const purchases = sdk();
  if (!purchases || !booted) return null;
  try {
    const { customerInfo } = await purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.warn('[purchases] login failed:', error);
    return null;
  }
}

export async function logoutPurchases(): Promise<void> {
  const purchases = sdk();
  if (!purchases || !booted) return;
  try {
    await purchases.logOut();
  } catch {
    // Ignore — a stale binary or already-anonymous user should not block sign-out.
  }
}

export async function getCustomerInfo(): Promise<CustomerInfoLike | null> {
  const purchases = sdk();
  if (!purchases || !booted) return null;
  try {
    return await purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getMonthlyPrice(): Promise<string | null> {
  const purchases = sdk();
  if (!purchases || !booted) return null;
  try {
    const offerings = await purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    if (current.monthly?.product.priceString) return current.monthly.product.priceString;
    const match = current.availablePackages.find((pkg) => pkg.product.identifier === PRO_PRODUCT_ID);
    return match?.product.priceString ?? current.availablePackages[0]?.product.priceString ?? null;
  } catch {
    return null;
  }
}

export async function purchaseMonthly(): Promise<
  { status: 'purchased'; pro: boolean } | { status: 'cancelled' } | { status: 'unavailable'; message: string }
> {
  const purchases = sdk();
  if (!purchases || !booted) {
    return { status: 'unavailable', message: 'Billing needs a device build with the App Store.' };
  }

  try {
    const offerings = await purchases.getOfferings();
    const current = offerings.current;
    const pkg =
      current?.monthly ??
      current?.availablePackages.find((item) => item.product.identifier === PRO_PRODUCT_ID) ??
      current?.availablePackages[0];
    if (!pkg) {
      return {
        status: 'unavailable',
        message: 'Hey100 Pro is not in the store yet. Finish the RevenueCat product setup.',
      };
    }

    const { customerInfo } = await purchases.purchasePackage(pkg);
    return { status: 'purchased', pro: hasPro(customerInfo) };
  } catch (error) {
    const next = error as PurchaseError;
    if (next.userCancelled) return { status: 'cancelled' };
    return { status: 'unavailable', message: next.message || 'Purchase did not finish.' };
  }
}

export async function restorePurchases(): Promise<{ pro: boolean } | { message: string }> {
  const purchases = sdk();
  if (!purchases || !booted) {
    return { message: 'Billing needs a device build with the App Store.' };
  }
  try {
    const info = await purchases.restorePurchases();
    return { pro: hasPro(info) };
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Restore did not finish.' };
  }
}

export async function manageSubscriptions(): Promise<void> {
  const purchases = sdk();
  if (!purchases || !booted) return;
  await purchases.showManageSubscriptions();
}

export function onCustomerInfo(listener: (info: CustomerInfoLike) => void): () => void {
  const purchases = sdk();
  if (!purchases || !booted) return () => {};
  purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    purchases.removeCustomerInfoUpdateListener(listener);
  };
}
