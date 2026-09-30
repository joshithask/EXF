// screens/ClaimScreen.js
// This is the shelter's screen. The shelter sees the food offer and
// has 45 seconds to accept or pass.

import React from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { Card, ScreenTitle, AppButton, Pill, EmptyState } from "../components";
import { colors } from "../theme";
import { claimDonation } from "../database";
import { useSecondsLeft, formatMinutesSeconds } from "../helpers";

export default function ClaimScreen({ donation, deliveries, goTo }) {
  const secondsLeft = useSecondsLeft(donation ? donation.offerExpiresAt : null);

  // Is there an offer waiting for an answer right now?
  const hasOffer = donation && donation.status === "PENDING_CLAIM" && donation.offeredTo;

  // In this demo, the screen answers for whichever shelter holds the offer.
  // In a real app, this would be the shelter that is logged in.
  async function answer(accept) {
    try {
      const result = await claimDonation(donation.id, donation.offeredTo, accept);
      if (result === "LOCKED") {
        Alert.alert("Claim locked", "A volunteer can now pick up the food before it expires.");
        goTo("transit");
      } else {
        Alert.alert("Offer passed", "We are asking the next shelter.");
      }
    } catch (error) {
      Alert.alert("Could not answer", error.message);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <ScreenTitle title="Claim desk" subtitle="Answer before the timer runs out" badge="Shelter" badgeColor={colors.blue} />

      {!donation && (
        <EmptyState
          icon="file-tray-outline"
          title="No offers yet"
          text="When a donor posts food near you, the offer appears here."
          buttonLabel="Post food"
          onPress={() => goTo("post")}
        />
      )}

      {donation && !hasOffer && (
        <Card>
          <Text style={styles.foodTitle}>{donation.servings} x {donation.foodTitle}</Text>
          <Text style={styles.muted}>Status: {donation.status.replace("_", " ")}</Text>
          {donation.status === "CLAIMED" && (
            <AppButton label="Track the delivery" icon="map-outline" onPress={() => goTo("transit")} style={{ marginTop: 12 }} />
          )}
        </Card>
      )}

      {hasOffer && (
        <Card style={{ borderColor: colors.green, borderWidth: 2 }}>
          <Text style={styles.distance}>{donation.offeredDistanceKm} km away</Text>
          <Text style={styles.foodTitle}>{donation.servings} x {donation.foodTitle}</Text>
          <Text style={styles.muted}>{donation.pickupAddress}</Text>

          {/* Allergen labels */}
          <View style={styles.pills}>
            {donation.allergens.map((name) => (
              <Pill key={name} text={`Contains ${name}`} />
            ))}
            {!donation.allergens.includes("Nuts") && <Pill text="Nut free" color={colors.greenLight} />}
          </View>

          {/* Countdown */}
          <View style={styles.timerBox}>
            <View>
              <Text style={styles.tiny}>You have</Text>
              <Text style={styles.bigTimer}>{formatMinutesSeconds(secondsLeft)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.tiny}>If you wait, it goes to</Text>
              <Text style={styles.nextName}>
                {donation.nextInLineName
                  ? `${donation.nextInLineName} (${donation.nextInLineKm} km)`
                  : "no one else"}
              </Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <AppButton label="Accept" icon="checkmark-circle-outline" onPress={() => answer(true)} style={{ flex: 1 }} />
            <AppButton label="Pass" icon="close-circle-outline" kind="secondary" onPress={() => answer(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Real delivery history from the database */}
      <View>
        <Text style={styles.sectionTitle}>Verified deliveries</Text>
        {deliveries.length === 0 ? (
          <Text style={styles.muted}>No deliveries yet.</Text>
        ) : (
          deliveries.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{item.mealsSaved} meals • {item.foodTitle}</Text>
                <Text style={styles.tiny}>
                  {new Date(item.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {"  •  "}
                  {item.modeUsed === "OTP" ? "OTP confirmed" : "Face verified"}
                </Text>
              </View>
              <Text style={styles.saved}>SAVED</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  distance: { color: colors.greenLight, fontSize: 11, fontWeight: "600" },
  foodTitle: { color: colors.textMain, fontSize: 16, fontWeight: "700", marginTop: 4 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tiny: { color: colors.textMuted, fontSize: 10 },
  pills: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  timerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.screen,
    borderRadius: 12,
    borderColor: colors.card,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  bigTimer: { color: colors.amber, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  nextName: { color: colors.textSoft, fontSize: 12, fontWeight: "600", marginTop: 2 },
  buttons: { flexDirection: "row", gap: 8, marginTop: 14 },
  sectionTitle: { color: colors.textSoft, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  historyTitle: { color: colors.textMain, fontSize: 12, fontWeight: "600" },
  saved: {
    color: colors.greenLight,
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
