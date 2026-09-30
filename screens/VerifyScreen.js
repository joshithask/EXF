// screens/VerifyScreen.js
// The volunteer proves the food was handed over.
// Two ways to prove it: a face check, or a 4-digit OTP from the shelter.

import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Animated, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, ScreenTitle, AppButton, EmptyState } from "../components";
import { colors, radius } from "../theme";
import { verifyDelivery } from "../database";
import { DEMO_COURIER_LOCATION } from "../helpers";

export default function VerifyScreen({ donation, goTo }) {
  const [mode, setMode] = useState("FACE_MATCH"); // "FACE_MATCH" or "OTP"
  const [otp, setOtp] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [clock, setClock] = useState(new Date());

  // The moving green line on the fake camera.
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(scanLine, { toValue: 1, duration: 2500, useNativeDriver: true })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Update the timestamp text every second.
  useEffect(() => {
    const timerId = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const canVerify = donation && (donation.status === "CLAIMED" || donation.status === "IN_TRANSIT");
  if (!canVerify) {
    return (
      <View style={{ gap: 14 }}>
        <ScreenTitle title="Delivery proof" subtitle="Confirm the handover" badge="Volunteer" badgeColor={colors.purple} />
        <EmptyState
          icon="shield-checkmark-outline"
          title="Nothing to verify"
          text="Deliver food that a shelter has claimed first."
          buttonLabel="Open claim desk"
          onPress={() => goTo("claim")}
        />
      </View>
    );
  }

  async function handleCapture() {
    setIsChecking(true);
    try {
      const record = await verifyDelivery({
        donationId: donation.id,
        courierId: "courier_demo",
        latitude: DEMO_COURIER_LOCATION.latitude,
        longitude: DEMO_COURIER_LOCATION.longitude,
        mode: mode,
        otp: otp,
        // DEMO ONLY: a real app would scan the manager's face and turn it into numbers.
        // Here we send numbers that are very close to the saved ones, so the check passes.
        faceNumbers: [0.121, 0.339, 0.558],
      });

      Alert.alert(
        "Handover verified",
        `${record.mealsSaved} meals delivered to ${record.recipientName}.\n` +
          `Location saved: ${record.latitude}, ${record.longitude}`
      );
      goTo("impact");
    } catch (error) {
      Alert.alert("Verification failed", error.message);
    }
    setIsChecking(false);
  }

  const lineMovement = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  return (
    <View style={{ gap: 14 }}>
      <ScreenTitle title="Delivery proof" subtitle="Location + time + who received it" badge="Volunteer" badgeColor={colors.purple} />

      {/* Fake camera view */}
      <View style={styles.camera}>
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: lineMovement }] }]} />
        <View style={styles.faceBox}>
          <Ionicons name={mode === "FACE_MATCH" ? "scan-outline" : "keypad-outline"} size={40} color={colors.greenLight} />
          <Text style={styles.faceText}>{mode === "FACE_MATCH" ? "Face scan (demo)" : "OTP mode"}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoGreen}>
            LAT {DEMO_COURIER_LOCATION.latitude}   LON {DEMO_COURIER_LOCATION.longitude}
          </Text>
          <Text style={styles.infoGrey}>TIME: {clock.toISOString().replace("T", " ").substring(0, 19)}</Text>
        </View>
      </View>

      {/* Choose a method */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <AppButton
          label="Face match"
          icon="scan-outline"
          kind={mode === "FACE_MATCH" ? "primary" : "secondary"}
          onPress={() => setMode("FACE_MATCH")}
          style={{ flex: 1 }}
        />
        <AppButton
          label="OTP"
          icon="keypad-outline"
          kind={mode === "OTP" ? "primary" : "secondary"}
          onPress={() => setMode("OTP")}
          style={{ flex: 1 }}
        />
      </View>

      {mode === "OTP" && (
        <View>
          <Text style={styles.label}>Ask the shelter for their 4-digit code</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4892 (demo code)"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      )}

      <AppButton
        label={isChecking ? "Checking..." : "Confirm delivery"}
        icon="camera-outline"
        onPress={handleCapture}
        disabled={isChecking}
      />

      <Card>
        <Text style={styles.noteTitle}>Privacy first</Text>
        <Text style={styles.noteText}>
          Face checking is optional and should happen on the phone. Photos of faces are never saved in the
          database. The shelter can always use an OTP instead. In this demo the face scan is simulated.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    height: 240,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.large,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 10,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.greenLight,
  },
  faceBox: { alignItems: "center", justifyContent: "center", flex: 1 },
  faceText: { color: colors.greenLight, fontSize: 11, marginTop: 6 },
  infoBox: {
    backgroundColor: "rgba(2,6,23,0.9)",
    borderRadius: radius.small,
    borderColor: colors.card,
    borderWidth: 1,
    padding: 8,
  },
  infoGreen: { color: colors.greenLight, fontSize: 10, fontWeight: "700" },
  infoGrey: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textMain,
    fontSize: 16,
    letterSpacing: 4,
  },
  noteTitle: { color: colors.textSoft, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  noteText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
});
