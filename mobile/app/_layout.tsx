import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth/AuthProvider";
import { RouteGuard } from "../src/auth/RouteGuard";
import { ihubColors } from "../src/theme/tokens";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RouteGuard />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: ihubColors.background },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
