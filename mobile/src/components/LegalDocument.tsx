import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RouteHeader } from "./RouteHeader";
import { Screen } from "./Screen";
import { ihubColors, ihubRadii } from "../theme/tokens";

type Article = {
  num: string;
  title: string;
  body: string;
};

type DataRow = {
  label: string;
  value: string;
};

export function LegalDocument({
  title,
  subtitle,
  info,
  articles,
  dataRows,
  footer,
  warning,
}: {
  title: string;
  subtitle?: string;
  info: string;
  articles?: Article[];
  dataRows?: DataRow[];
  footer: string;
  warning?: string;
}) {
  return (
    <Screen contentStyle={styles.screen}>
      <RouteHeader title={title} subtitle={subtitle} />
      <InfoBox>{info}</InfoBox>
      {dataRows ? (
        <View style={styles.dataCard}>
          {dataRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.dataRow,
                index === dataRows.length - 1 ? styles.dataRowLast : null,
              ]}
            >
              <Text style={styles.dataLabel}>{row.label}</Text>
              <Text style={styles.dataValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {warning ? <InfoBox tone="warn">{warning}</InfoBox> : null}
      {articles?.map((article) => (
        <View key={`${article.num}-${article.title}`} style={styles.article}>
          <View style={styles.articleHeading}>
            <Text style={styles.articleNum}>{article.num}</Text>
            <Text style={styles.articleTitle}>{article.title}</Text>
          </View>
          <Text style={styles.articleBody}>{article.body}</Text>
        </View>
      ))}
      <Text style={styles.footer}>{footer}{"\n"}iHub 運営者</Text>
    </Screen>
  );
}

function InfoBox({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <View style={[styles.infoBox, tone === "warn" ? styles.warnBox : null]}>
      <Text style={styles.infoText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
  },
  infoBox: {
    backgroundColor: "rgba(166,149,216,0.05)",
    borderColor: "rgba(166,149,216,0.34)",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  warnBox: {
    backgroundColor: "#fff5f0",
    borderColor: "rgba(217,130,107,0.25)",
  },
  infoText: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 21,
  },
  article: {
    gap: 6,
  },
  articleHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8,
  },
  articleNum: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
  },
  articleTitle: {
    color: ihubColors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  articleBody: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 23,
  },
  dataCard: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  dataRow: {
    borderBottomColor: "rgba(58,50,74,0.05)",
    borderBottomWidth: 1,
    gap: 5,
    paddingVertical: 12,
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataLabel: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
  },
  dataValue: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 21,
  },
  footer: {
    borderTopColor: "rgba(58,50,74,0.08)",
    borderTopWidth: 1,
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 19,
    paddingBottom: 28,
    paddingTop: 14,
    textAlign: "right",
  },
});
