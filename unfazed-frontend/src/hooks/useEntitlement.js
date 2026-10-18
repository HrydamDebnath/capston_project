import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function useEntitlement() {
  const { entitlements, refreshEntitlements } = useAuth();

  const get = useCallback((featureKey) => (entitlements && entitlements.features ? entitlements.features[featureKey] || null : null), [entitlements]);
  const can = useCallback((featureKey) => Boolean(get(featureKey) && get(featureKey).allowed), [get]);

  return {
    can,
    get,
    plan: entitlements ? entitlements.tier : null,
    ready: Boolean(entitlements),
    refresh: refreshEntitlements,
  };
}
