import type { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ihubColors } from "../theme/tokens";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 18) + 14;
  const paddingBottom = Math.max(insets.bottom, 12) + 96;

  if (scroll) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop, paddingBottom },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.root,
        styles.content,
        { paddingTop, paddingBottom },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ihubColors.background,
  },
  content: {
    paddingHorizontal: 18,
  },
});
