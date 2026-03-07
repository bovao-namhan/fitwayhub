import { getApiBase } from "@/lib/api";
/**
 * In-App Purchase (IAP) helper for Capacitor-based mobile apps.
 *
 * Detects the platform (iOS / Android / Web) and provides a unified API
 * for purchasing and verifying in-app products.
 *
 * Product IDs follow the convention:
 *   fitway_premium_monthly   → 50 EGP monthly premium
 *   fitway_premium_annual    → 450 EGP annual premium
 *   fitway_coach_monthly     → 50 EGP monthly coach membership
 *   fitway_coach_annual      → 450 EGP annual coach membership
 *   fitway_coach_sub_*       → dynamic coach subscription (uses coach pricing)
 */

export type IAPPlatform = 'ios' | 'android' | 'web';

export function detectPlatform(): IAPPlatform {
  const ua = navigator.userAgent || '';
  // Capacitor native check
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    return (window as any).Capacitor.getPlatform?.() === 'ios' ? 'ios' : 'android';
  }
  // Fallback to user-agent sniffing
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'web';
}

export function isNativeApp(): boolean {
  return detectPlatform() !== 'web';
}

export function supportsIAP(): boolean {
  return isNativeApp();
}

// Product ID mapping
export function getProductId(type: 'premium' | 'coach', plan: 'monthly' | 'annual' | 'yearly'): string {
  const cycle = plan === 'yearly' ? 'annual' : plan;
  return `fitway_${type}_${cycle}`;
}

/**
 * Verify an Apple receipt with the backend
 */
export async function verifyApplePurchase(params: {
  receiptData: string;
  productId: string;
  plan: string;
  type: string;
  token: string;
  coachId?: number;
}): Promise<{ success: boolean; message: string; transactionId?: string }> {
  try {
    const res = await fetch(getApiBase() + '/api/iap/verify-apple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.token}` },
      body: JSON.stringify({
        receiptData: params.receiptData,
        productId: params.productId,
        plan: params.plan,
        type: params.type,
        coachId: params.coachId,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message || 'Verification failed' };
    return { success: true, message: data.message, transactionId: data.transactionId };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}

/**
 * Verify a Google Play purchase with the backend
 */
export async function verifyGooglePurchase(params: {
  purchaseToken: string;
  productId: string;
  plan: string;
  type: string;
  token: string;
  coachId?: number;
}): Promise<{ success: boolean; message: string; transactionId?: string }> {
  try {
    const res = await fetch(getApiBase() + '/api/iap/verify-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.token}` },
      body: JSON.stringify({
        purchaseToken: params.purchaseToken,
        productId: params.productId,
        plan: params.plan,
        type: params.type,
        coachId: params.coachId,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message || 'Verification failed' };
    return { success: true, message: data.message, transactionId: data.transactionId };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}
