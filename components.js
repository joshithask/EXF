// components.js
// Small building blocks that many screens reuse (cards, buttons, pills...).

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "./theme";

// A rounded box that holds content.
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Title of a screen with a small label on the right.
export function ScreenTitle({ title, subtitle, badge, badgeColor = colors.greenLight }) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { borderColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Green (primary) or dark (secondary) button with an optional icon.
export function AppButton({ label, onPress, icon, kind = "primary", disabled, style }) {
  const isPrimary = kind === "primary";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={isPrimary ? colors.background : colors.textSoft}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text style={[styles.buttonText, { color: isPrimary ? colors.background : colors.textSoft }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// A small rounded label, like "Dairy" or "Nut Free".
export function Pill({ text, color = colors.textSoft }) {
  return (
    <View style={styles.pill}>
      <Text style={{ color, fontSize: 11 }}>{text}</Text>
    </View>
  );
}

// A bar that fills from 0 to 100 percent.
export function ProgressBar({ percent, color = colors.greenLight }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safePercent}%`, backgroundColor: color }]} />
    </View>
  );
}

// Shown when a screen has nothing to display yet.
export function EmptyState({ icon, title, text, buttonLabel, onPress }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: 28 }}>
      <Ionicons name={icon} size={36} color={colors.textMuted} />
      <Text style={[styles.title, { marginTop: 10 }]}>{title}</Text>
      <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 14 }]}>{text}</Text>
      {buttonLabel ? <AppButton label={buttonLabel} onPress={onPress} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.large,
    padding: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    paddingBottom: 8,
    marginBottom: 12,
  },
  title: { color: colors.textMain, fontSize: 16, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: radius.small, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.medium,
  },
  buttonPrimary: { backgroundColor: colors.green },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontWeight: "700", fontSize: 13 },
  pill: {
    backgroundColor: colors.screen,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.small,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  progressTrack: { height: 6, backgroundColor: colors.card, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 6 },
});
