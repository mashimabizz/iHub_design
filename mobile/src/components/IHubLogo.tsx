import { StyleSheet, Text, View } from "react-native";
import { ihubColors, ihubRadii } from "../theme/tokens";

export function IHubLogo() {
  return (
    <View style={styles.mark}>
      <Text style={styles.text}>iH</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: ihubRadii.md,
    backgroundColor: ihubColors.lavender,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
});
