import { Redirect } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors } from "../../src/theme/tokens";

const TAB_CONFIG = {
  index: {
    label: "ホーム",
    sf: { default: "house", selected: "house.fill" },
  },
  inventory: {
    label: "在庫",
    sf: { default: "shippingbox", selected: "shippingbox.fill" },
  },
  wishes: {
    label: "Wish",
    sf: { default: "heart", selected: "heart.fill" },
  },
  transactions: {
    label: "取引",
    sf: {
      default: "arrow.left.arrow.right",
      selected: "arrow.left.arrow.right",
    },
  },
  profile: {
    label: "プロフ",
    sf: { default: "person.crop.circle", selected: "person.crop.circle.fill" },
  },
} as const;

export default function TabLayout() {
  const { configured, loading, needsOnboarding, previewMode, profileLoading, session } =
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

  if ((!configured && !previewMode) || (configured && !session)) {
    return <Redirect href="/welcome" />;
  }

  if (configured && session && needsOnboarding) {
    return <Redirect href="/auth/email-confirmed" />;
  }

  return (
    <NativeTabs
      backgroundColor={null}
      blurEffect="systemDefault"
      iconColor={{
        default: "rgba(58,50,74,0.46)",
        selected: ihubColors.lavender,
      }}
      labelStyle={{
        default: {
          color: "rgba(58,50,74,0.56)",
          fontSize: 11,
          fontWeight: "700",
        },
        selected: {
          color: ihubColors.lavender,
          fontSize: 11,
          fontWeight: "800",
        },
      }}
      minimizeBehavior="onScrollDown"
      tintColor={ihubColors.lavender}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={TAB_CONFIG.index.sf} />
        <Label>{TAB_CONFIG.index.label}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <Icon sf={TAB_CONFIG.inventory.sf} />
        <Label>{TAB_CONFIG.inventory.label}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wishes">
        <Icon sf={TAB_CONFIG.wishes.sf} />
        <Label>{TAB_CONFIG.wishes.label}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <Icon sf={TAB_CONFIG.transactions.sf} />
        <Label>{TAB_CONFIG.transactions.label}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={TAB_CONFIG.profile.sf} />
        <Label>{TAB_CONFIG.profile.label}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
