// screens/ImpactScreen.js
// Shows how much food and CO2 we saved. The numbers come from the
// "deliveries" collection, so they grow with every verified delivery.

import React from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { Card, ScreenTitle, AppButton } from "../components";
import { colors, radius } from "../theme";
import { summarizeDeliveries } from "../helpers";

export default function ImpactScreen({ deliveries }) {
  const totals = summarizeDeliveries(deliveries);

  function showCertificate() {
    Alert.alert(
      "Impact certificate (preview)",
      `Deliveries: ${totals.totalDeliveries}\n` +
        `Meals saved: ${totals.totalMeals}\n` +
        `Waste diverted: ${totals.totalWasteKg} kg\n` +
        `CO2e avoided: ${totals.totalCo2Tons} tons\n\n` +
        `PDF export is not built yet.`
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <ScreenTitle title="Impact report" subtitle="Live totals from verified deliveries" badge="ESG" />

      <View style={styles.grid}>
        <Stat label="Meals saved" value={totals.totalMeals} color={colors.greenLight} />
        <Stat label="Waste diverted" value={`${totals.totalWasteKg} kg`} color={colors.amber} />
        <Stat label="CO₂e avoided" value={`${totals.totalCo2Tons} t`} color={colors.blue} />
        <Stat label="Deliveries" value={totals.totalDeliveries} color={colors.purple} />
      </View>

      <Card>
        <View style={styles.certRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.certTitle}>CSR impact certificate</Text>
            <Text style={styles.muted}>Useful for company sustainability reports</Text>
          </View>
          <AppButton label="Preview" onPress={showCertificate} />
        </View>
      </Card>

      <Card>
        <Text style={styles.certTitle}>How the app stays free</Text>
        <Text style={[styles.muted, { marginTop: 4, lineHeight: 17 }]}>
          Free for small shelters and volunteers. Paid by company CSR analytics plans, city landfill-diversion
          credits, and sponsored delivery routes.
        </Text>
      </Card>
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  stat: {
    width: "48%",
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.medium,
    padding: 12,
  },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  statValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  certRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  certTitle: { color: colors.textMain, fontSize: 13, fontWeight: "700" },
  muted: { color: colors.textMuted, fontSize: 11 },
});
