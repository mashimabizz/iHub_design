import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors } from "../../src/theme/tokens";

export default function AuthLayout() {
  const { configured, loading, needsOnboarding, profileLoading, session } =
    useAuth();

  if (loading || profileLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ihubColors.background,
        }}
      >
        <ActivityIndicator color={ihubColors.lavender} />
      </View>
    );
  }

  if (configured && session) {
    if (needsOnboarding) {
      return <Redirect href="/auth/email-confirmed" />;
    }
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: ihubColors.background },
      }}
    />
  );
}
