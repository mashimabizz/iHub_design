import { Stack } from "expo-router";
import { ihubColors } from "../../src/theme/tokens";

export default function AuthLayout() {
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
