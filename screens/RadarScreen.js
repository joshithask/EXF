// screens/RadarScreen.js
// The home screen. It shows the current food dispatch, the countdown,
// and which shelter is being asked right now.

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppButton, ProgressBar, EmptyState } from "../components";
import { colors, radius } from "../theme";
import { CLAIM_SECONDS, useSecondsLeft, formatHoursMinutesSeconds } from "../helpers";

// The 4 small cards under the main card.
const PILLARS = [
  { icon: "time-outline", color: colors.greenLight, title: "Time Freshness", text: "Every listing has an expiry timer. Urgent meals are matched first.", goTo: "post" },
  { icon: "navigate-outline", color: colors.blue, title: "Live Tracking", text: "Watch the volunteer reach the shelter before the food expires.", goTo: "transit" },
  { icon: "warning-outline", color: colors.amber, title: "Allergen Safety", text: "Allergens are declared before a shelter claims the food.", goTo: "post" },
  { icon: "shield-checkmark-outline", color: colors.purple, title: "Verified Handover", text: "Face check or OTP, plus a GPS location proof.", goTo: "verify" },
];

// Builds the text for the WhatsApp / SMS / Tamil previews.
function buildMessages(donation, hoursLeft) {
  const meals = donation ? donation.servings : 80;
  const place = donation ? donation.pickupAddress : "Guindy, Chennai";
  const food = donation ? donation.foodTitle : "Hot Meals";
  const safeTime = donation
    ? new Date(donation.safeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "03:15 PM";

  return {
    wa:
      `[WhatsApp Dispatch]\n` +
      `URGENT FOOD NEARBY\n` +
      `From: ${place}\n` +
      `Item: ${meals} x ${food}\n` +
      `Safe until: ${safeTime}\n` +
      `Reply ACCEPT within ${CLAIM_SECONDS} seconds to claim.`,
    sms:
      `[SMS Alert - works without internet]\n` +
      `SKYNEX: ${meals} meals available. Safe for ${hoursLeft} hr. ` +
      `Reply 'YES ${meals}' to confirm pickup.`,
    lang:
      `[தமிழ் / Local Language]\n` +
      `உடனடி உணவு விநியோகம்: ${meals} சூடான சாப்பாடு உள்ளது. ` +
      `செல்லுபடியாகும் நேரம்: ${hoursLeft} மணிநேரம். ஏற்கெனவே பெற '1' என பதிலளிக்கவும்.`,
  };
}

export default function RadarScreen({ donation, goTo, onLoadDemo, onStartOver, onTestFallback }) {
  const [channel, setChannel] = useState("wa"); // which message preview is open

  // Countdown until the food is no longer safe.
  const safeSecondsLeft = useSecondsLeft(donation ? donation.safeUntil : null);
  // Countdown of the shelter's answer window.
  const claimSecondsLeft = useSecondsLeft(donation ? donation.offerExpiresAt : null);

  const hoursLeft = Math.max(1, Math.round(safeSecondsLeft / 3600));
  const messages = buildMessages(donation, hoursLeft);
  const isHighRisk = safeSecondsLeft < 2 * 3600;

  return (
    <View style={{ gap: 14 }}>
      {/* ---------- Main card ---------- */}
      {donation ? (
        <Card style={{ backgroundColor: colors.card }}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={[styles.riskBadge, { borderColor: isHighRisk ? colors.amber : colors.greenLight }]}>
                <Ionicons
                  name="flame-outline"
                  size={12}
                  color={isHighRisk ? colors.amber : colors.greenLight}
                />
                <Text style={{ color: isHighRisk ? colors.amber : colors.greenLight, fontSize: 10, marginLeft: 3 }}>
                  {isHighRisk ? "High freshness risk" : "Fresh"}
                </Text>
              </View>
              <Text style={styles.heroTitle}>{donation.pickupAddress}</Text>
              <Text style={styles.muted}>
                {donation.servings} x {donation.foodTitle}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.tiny}>Safe until</Text>
              <Text style={styles.timer}>{formatHoursMinutesSeconds(safeSecondsLeft)}</Text>
            </View>
          </View>

          {/* Who is being asked right now */}
          <View style={styles.matchBox}>
            <Ionicons name="radio-outline" size={30} color={colors.greenLight} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              {donation.status === "PENDING_CLAIM" && donation.offeredTo ? (
                <>
                  <View style={styles.row}>
                    <Text style={styles.matchTitle}>Asking: {donation.offeredToName}</Text>
                    <Text style={styles.matchTime}>{claimSecondsLeft}s left</Text>
                  </View>
                  <ProgressBar percent={(claimSecondsLeft / CLAIM_SECONDS) * 100} color={colors.amber} />
                  <Text style={styles.muted}>
                    {donation.offeredDistanceKm} km away
                    {donation.nextInLineName ? `  •  Next: ${donation.nextInLineName}` : "  •  No backup shelter"}
                  </Text>
                </>
              ) : (
                <Text style={styles.matchTitle}>{statusText(donation)}</Text>
              )}
            </View>
          </View>

          <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
            <AppButton label="Open Claim Desk" icon="hand-left-outline" onPress={() => goTo("claim")} style={{ flex: 1 }} />
            <AppButton
              label="Test Fallback"
              icon="play-skip-forward-outline"
              kind="secondary"
              onPress={onTestFallback}
              disabled={!donation.offeredTo}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title="No food posted yet"
          text="Post surplus food to start matching it with a nearby shelter."
          buttonLabel="Post food"
          onPress={() => goTo("post")}
        />
      )}

      {/* ---------- 4 small cards ---------- */}
      <View style={styles.grid}>
        {PILLARS.map((item) => (
          <TouchableOpacity key={item.title} style={styles.pillar} onPress={() => goTo(item.goTo)}>
            <Ionicons name={item.icon} size={20} color={item.color} />
            <Text style={styles.pillarTitle}>{item.title}</Text>
            <Text style={styles.pillarText}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ---------- Message preview ---------- */}
      <Card>
        <View style={[styles.row, { marginBottom: 8 }]}>
          <Text style={styles.cardTitle}>Reach people without a smartphone</Text>
        </View>
        <View style={[styles.row, { gap: 6 }]}>
          <ChannelButton label="WhatsApp" active={channel === "wa"} onPress={() => setChannel("wa")} />
          <ChannelButton label="SMS" active={channel === "sms"} onPress={() => setChannel("sms")} />
          <ChannelButton label="தமிழ் / हिंदी" active={channel === "lang"} onPress={() => setChannel("lang")} />
        </View>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{messages[channel]}</Text>
        </View>
      </Card>

      {/* ---------- Setup helpers ---------- */}
      <Card>
        <Text style={styles.cardTitle}>Demo tools</Text>
        <Text style={[styles.muted, { marginVertical: 6 }]}>
          Load the demo shelters once, so the app has someone to send food to.
        </Text>
        <View style={[styles.row, { gap: 8 }]}>
          <AppButton label="Load demo shelters" icon="cloud-download-outline" kind="secondary" onPress={onLoadDemo} style={{ flex: 1 }} />
          <AppButton label="Start over" icon="refresh-outline" kind="secondary" onPress={onStartOver} style={{ flex: 1 }} />
        </View>
      </Card>
    </View>
  );
}

// A short sentence for each status.
function statusText(donation) {
  if (donation.status === "CLAIMED") return `Claimed by ${donation.claimedByName}. Waiting for pickup.`;
  if (donation.status === "IN_TRANSIT") return `On the way to ${donation.claimedByName}.`;
  if (donation.status === "DELIVERED") return "Delivered. Thank you!";
  if (donation.status === "EXPIRED") return "This food expired before anyone claimed it.";
  return "No shelter is available nearby right now.";
}

function ChannelButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.channel, active && { borderColor: colors.green, backgroundColor: "rgba(16,185,129,0.15)" }]}
    >
      <Text style={{ color: active ? colors.greenLight : colors.textMuted, fontSize: 11, fontWeight: "600" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroTitle: { color: colors.textMain, fontSize: 16, fontWeight: "700", marginTop: 8 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tiny: { color: colors.textMuted, fontSize: 10 },
  timer: { color: colors.greenLight, fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  matchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.medium,
    padding: 12,
    marginTop: 14,
  },
  matchTitle: { color: colors.textSoft, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  matchTime: { color: colors.amber, fontSize: 12, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  pillar: {
    width: "48%",
    backgroundColor: colors.screen,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.medium,
    padding: 12,
  },
  pillarTitle: { color: colors.textMain, fontSize: 13, fontWeight: "600", marginTop: 6 },
  pillarText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  cardTitle: { color: colors.textMain, fontSize: 13, fontWeight: "600" },
  channel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  messageBox: {
    backgroundColor: colors.screen,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.medium,
    padding: 10,
    marginTop: 10,
  },
  messageText: { color: colors.textSoft, fontSize: 12, lineHeight: 18 },
});
