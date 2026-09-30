// screens/TransitScreen.js
// The volunteer's screen. It shows a simple map with the kitchen, the
// volunteer, and the shelter. The volunteer's progress is saved in the
// database, so everyone sees it live.

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Linking, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, ScreenTitle, AppButton, EmptyState } from "../components";
import { colors, radius } from "../theme";
import { updateTracking } from "../database";
import { useSecondsLeft } from "../helpers";

const TRIP_MINUTES = 8;   // pretend trip time for the demo
const MAP_WIDTH_PERCENT = 80; // how far along the road the courier can move

export default function TransitScreen({ donation, goTo }) {
  const [isMoving, setIsMoving] = useState(false);
  const timerRef = useRef(null); // remembers our movement timer

  const safeSecondsLeft = useSecondsLeft(donation ? donation.safeUntil : null);

  // Stop the timer if the screen closes.
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const canDeliver = donation && (donation.status === "CLAIMED" || donation.status === "IN_TRANSIT");
  if (!canDeliver) {
    return (
      <View style={{ gap: 14 }}>
        <ScreenTitle title="Delivery route" subtitle="Volunteer view" badge="Volunteer" badgeColor={colors.purple} />
        <EmptyState
          icon="map-outline"
          title="Nothing to deliver yet"
          text="A shelter needs to accept the food first."
          buttonLabel="Open claim desk"
          onPress={() => goTo("claim")}
        />
      </View>
    );
  }

  const tracking = donation.tracking || { progress: 0, speedKmh: 0, etaMinutes: TRIP_MINUTES };
  const progress = tracking.progress; // a number from 0 to 1
  const distanceKm = donation.claimedDistanceKm || 0;
  const kmLeft = Math.round(distanceKm * (1 - progress) * 10) / 10;
  const spareMinutes = Math.floor(safeSecondsLeft / 60) - tracking.etaMinutes;

  // Pretends the volunteer is riding. A real app would use the phone's GPS here.
  function startRide() {
    if (isMoving) return;
    setIsMoving(true);
    let currentProgress = progress;

    timerRef.current = setInterval(async () => {
      currentProgress = Math.min(1, currentProgress + 0.05);
      try {
        await updateTracking(donation.id, {
          progress: currentProgress,
          speedKmh: currentProgress >= 1 ? 0 : 24,
          etaMinutes: Math.round(TRIP_MINUTES * (1 - currentProgress)),
        });
      } catch (error) {
        console.log("Tracking error:", error.message);
      }
      if (currentProgress >= 1) {
        clearInterval(timerRef.current);
        setIsMoving(false);
      }
    }, 1000);
  }

  function callShelter() {
    if (!donation.claimedByPhone) return Alert.alert("No phone number saved for this shelter.");
    Linking.openURL(`tel:${donation.claimedByPhone.replace(/\s/g, "")}`);
  }

  function whatsappShelter() {
    if (!donation.claimedByPhone) return Alert.alert("No phone number saved for this shelter.");
    const digits = donation.claimedByPhone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${digits}`);
  }

  return (
    <View style={{ gap: 14 }}>
      <ScreenTitle title="Delivery route" subtitle="Get there before the food expires" badge="Volunteer" badgeColor={colors.purple} />

      {/* ---------- Simple map ---------- */}
      <View style={styles.map}>
        <View style={styles.mapTop}>
          <Text style={styles.chip}>Speed: {tracking.speedKmh} km/h</Text>
          <Text style={[styles.chip, { color: spareMinutes >= 0 ? colors.greenLight : colors.danger }]}>
            ETA: {tracking.etaMinutes} min
          </Text>
        </View>

        {/* The road */}
        <View style={styles.roadArea}>
          <View style={styles.road} />
          <View style={[styles.roadDone, { width: `${progress * MAP_WIDTH_PERCENT}%` }]} />

          <View style={[styles.pin, { left: "0%" }]}>
            <View style={[styles.pinCircle, { backgroundColor: colors.green }]}>
              <Ionicons name="restaurant-outline" size={16} color={colors.background} />
            </View>
            <Text style={styles.pinLabel}>Kitchen</Text>
          </View>

          <View style={[styles.pin, { left: `${progress * MAP_WIDTH_PERCENT}%` }]}>
            <View style={[styles.pinCircle, { backgroundColor: colors.blue }]}>
              <Ionicons name="bicycle-outline" size={18} color="white" />
            </View>
            <Text style={styles.pinLabel}>Volunteer</Text>
          </View>

          <View style={[styles.pin, { left: `${MAP_WIDTH_PERCENT}%` }]}>
            <View style={[styles.pinCircle, { backgroundColor: colors.amber }]}>
              <Ionicons name="home-outline" size={16} color={colors.background} />
            </View>
            <Text style={styles.pinLabel} numberOfLines={1}>{donation.claimedByName}</Text>
          </View>
        </View>

        <View style={styles.mapBottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeTitle}>To: {donation.claimedByName}</Text>
            <Text style={styles.muted}>{kmLeft} km left</Text>
            <Text style={[styles.muted, { color: spareMinutes >= 0 ? colors.greenLight : colors.danger }]}>
              {spareMinutes >= 0
                ? `Arrives ${spareMinutes} min before the food expires`
                : "Warning: food may expire before arrival"}
            </Text>
          </View>
          <AppButton label="Arrived" icon="arrow-forward" onPress={() => goTo("verify")} />
        </View>
      </View>

      <AppButton
        label={isMoving ? "Riding..." : "Start ride (demo GPS)"}
        icon="bicycle-outline"
        kind="secondary"
        onPress={startRide}
        disabled={isMoving || progress >= 1}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <AppButton label="Call shelter" icon="call-outline" kind="secondary" onPress={callShelter} style={{ flex: 1 }} />
        <AppButton label="WhatsApp" icon="logo-whatsapp" kind="secondary" onPress={whatsappShelter} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.large,
    padding: 12,
  },
  mapTop: { flexDirection: "row", justifyContent: "space-between" },
  chip: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: colors.screen,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.small,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  roadArea: { height: 100, marginHorizontal: 20, justifyContent: "center" },
  road: {
    position: "absolute",
    left: 0,
    width: `${MAP_WIDTH_PERCENT}%`,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  roadDone: { position: "absolute", left: 0, height: 4, borderRadius: 4, backgroundColor: colors.green },
  pin: { position: "absolute", alignItems: "center", marginLeft: -30, width: 60 },
  pinCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pinLabel: { color: colors.textSoft, fontSize: 9, marginTop: 3 },
  mapBottom: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.screen,
    borderRadius: radius.medium,
    padding: 10,
    gap: 8,
  },
  routeTitle: { color: colors.textMain, fontSize: 12, fontWeight: "700" },
  muted: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
