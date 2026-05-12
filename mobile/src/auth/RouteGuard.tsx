import { useEffect } from "react";
import { router, useSegments } from "expo-router";
import { useAuth } from "./AuthProvider";

export function RouteGuard() {
  const { configured, loading, previewMode, session } = useAuth();
  const segments = useSegments();

  useEffect(() => {
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
  }, [configured, loading, previewMode, segments, session]);

  return null;
}
