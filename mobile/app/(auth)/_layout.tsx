import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors } from "../../src/theme/tokens";

export default function AuthLayout() {
  const { configured, loading, session } = useAuth();

  if (loading) {
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
