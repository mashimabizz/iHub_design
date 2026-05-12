import { useEffect } from "react";
import { router, useRootNavigationState, useSegments } from "expo-router";
import { useAuth } from "./AuthProvider";

export function RouteGuard() {
  const { configured, loading, previewMode, session } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!configured && !previewMode && !inAuthGroup) {
      router.replace("/login");
      return;
    }
    if (configured && !session && !inAuthGroup) {
      router.replace("/login");
      return;
    }
    if ((previewMode || (configured && session)) && inAuthGroup) {
      router.replace("/");
    }
  }, [
    configured,
    loading,
    previewMode,
    rootNavigationState?.key,
    segments,
    session,
  ]);

  return null;
}
