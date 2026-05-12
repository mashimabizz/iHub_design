import { StyleSheet, Text, View } from "react-native";
import { ihubColors } from "../theme/tokens";

export function IHubLogo({ size = 38 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.37 }]}>
      <Text style={[styles.text, { fontSize: size * 0.42 }]}>iH</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ihubColors.lavender,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
});
