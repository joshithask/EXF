// App.js
// This is the starting point of the app.
// It does 4 jobs:
//   1. Keeps track of which tab is open.
//   2. Watches the current donation in the database (live).
//   3. Moves the food to the next shelter if nobody answers in time.
//   4. Shows the right screen.

import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius } from "./theme";
import {
  listenToDonation,
  listenToDeliveries,
  handleExpiredOffer,
  claimDonation,
  seedDemoOrganizations,
} from "./database";

import RadarScreen from "./screens/RadarScreen";
import PostFoodScreen from "./screens/PostFoodScreen";
import ClaimScreen from "./screens/ClaimScreen";
import TransitScreen from "./screens/TransitScreen";
import VerifyScreen from "./screens/VerifyScreen";
import ImpactScreen from "./screens/ImpactScreen";

// The buttons at the bottom of the app.
const TABS = [
  { id: "radar", label: "Radar", icon: "radio-outline" },
  { id: "post", label: "Post Food", icon: "add-circle-outline" },
  { id: "claim", label: "Claim Desk", icon: "file-tray-outline" },
  { id: "transit", label: "Transit", icon: "map-outline" },
  { id: "verify", label: "Verify", icon: "shield-checkmark-outline" },
  { id: "impact", label: "Impact", icon: "bar-chart-outline" },
];

// Each role opens a matching tab.
const ROLES = [
  { id: "donor", label: "Donor", opensTab: "post" },
  { id: "shelter", label: "Shelter", opensTab: "claim" },
  { id: "courier", label: "Courier", opensTab: "transit" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("radar");
  const [role, setRole] = useState("donor");
  const [donationId, setDonationId] = useState(null); // id of the food we are following
  const [donation, setDonation] = useState(null);     // the food's data (updates live)
  const [deliveries, setDeliveries] = useState([]);   // all finished deliveries

  // Watch the current donation. Runs again whenever donationId changes.
  useEffect(() => {
    if (!donationId) {
      setDonation(null);
      return;
    }
    const stopListening = listenToDonation(donationId, setDonation);
    return stopListening;
  }, [donationId]);

  // Watch the list of deliveries (used by Claim Desk and Impact).
  useEffect(() => {
    const stopListening = listenToDeliveries(setDeliveries);
    return stopListening;
  }, []);

  // AUTO-FALLBACK
  // When a shelter is asked, we set a timer for the end of its answer window.
  // If the timer finishes and nobody answered, we move to the next shelter.
  useEffect(() => {
    if (!donation || donation.status !== "PENDING_CLAIM" || !donation.offeredTo) return;

    const waitTime = Math.max(0, donation.offerExpiresAt - Date.now()) + 500;
    const timerId = setTimeout(() => {
      handleExpiredOffer(donation.id).catch((error) => console.log("Fallback error:", error.message));
    }, waitTime);

    return () => clearTimeout(timerId); // cancel if the offer changes first
  }, [donation && donation.offeredTo, donation && donation.offerExpiresAt, donation && donation.status]);

  // ---------- Button actions ----------
  function changeRole(newRole) {
    setRole(newRole.id);
    setActiveTab(newRole.opensTab);
  }

  async function loadDemoShelters() {
    try {
      const count = await seedDemoOrganizations();
      Alert.alert(
        count > 0 ? "Demo shelters added" : "Already loaded",
        count > 0 ? `${count} shelters were added near Guindy, Chennai.` : "Shelters already exist in the database."
      );
    } catch (error) {
      Alert.alert("Could not load demo data", error.message + "\n\nCheck your Firebase settings in firebase.js.");
    }
  }

  function startOver() {
    setDonationId(null);
    setActiveTab("radar");
  }

  // Pretend the current shelter pressed "Pass".
  async function testFallback() {
    try {
      await claimDonation(donation.id, donation.offeredTo, false);
    } catch (error) {
      Alert.alert("Could not test fallback", error.message);
    }
  }

  function handlePosted(newDonationId) {
    setDonationId(newDonationId);
    setActiveTab("claim");
  }

  // ---------- Which screen to show ----------
  function renderScreen() {
    if (activeTab === "radar") {
      return (
        <RadarScreen
          donation={donation}
          goTo={setActiveTab}
          onLoadDemo={loadDemoShelters}
          onStartOver={startOver}
          onTestFallback={testFallback}
        />
      );
    }
    if (activeTab === "post") return <PostFoodScreen onPosted={handlePosted} />;
    if (activeTab === "claim") return <ClaimScreen donation={donation} deliveries={deliveries} goTo={setActiveTab} />;
    if (activeTab === "transit") return <TransitScreen donation={donation} goTo={setActiveTab} />;
    if (activeTab === "verify") return <VerifyScreen donation={donation} goTo={setActiveTab} />;
    return <ImpactScreen deliveries={deliveries} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* ---------- Top bar ---------- */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <View style={styles.logo}>
                <Text style={styles.logoLetter}>S</Text>
              </View>
              <View>
                <Text style={styles.appName}>SKYNEX</Text>
                <Text style={styles.appTagline}>Surplus food dispatch</Text>
              </View>
            </View>

            <View style={styles.roleSwitch}>
              {ROLES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => changeRole(item)}
                  style={[styles.roleButton, role === item.id && styles.roleButtonActive]}
                >
                  <Text style={[styles.roleText, role === item.id && { color: colors.background, fontWeight: "700" }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.ticker}>
            <View style={styles.dot} />
            <Text style={styles.tickerText} numberOfLines={1}>
              {getStatusText(donation)}
            </Text>
          </View>
        </View>

        {/* ---------- Screen content ---------- */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          {renderScreen()}
        </ScrollView>

        {/* ---------- Bottom tabs ---------- */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tab}>
                <Ionicons name={tab.icon} size={20} color={isActive ? colors.greenLight : colors.textMuted} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.greenLight : colors.textMuted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// One short sentence for the status line at the top.
function getStatusText(donation) {
  if (!donation) return "No active dispatch";
  if (donation.status === "PENDING_CLAIM" && donation.offeredTo) {
    return `Asking ${donation.offeredToName} about ${donation.servings} meals`;
  }
  if (donation.status === "PENDING_CLAIM") return "Looking for a shelter nearby...";
  if (donation.status === "CLAIMED") return `Claimed by ${donation.claimedByName}`;
  if (donation.status === "IN_TRANSIT") return `In transit to ${donation.claimedByName}`;
  if (donation.status === "DELIVERED") return "Delivered and verified";
  return "Expired";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: colors.screen,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomColor: colors.card,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: colors.background, fontWeight: "900", fontSize: 18 },
  appName: { color: colors.textMain, fontWeight: "800", fontSize: 14 },
  appTagline: { color: colors.textMuted, fontSize: 10 },
  roleSwitch: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.small,
    padding: 3,
  },
  roleButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleButtonActive: { backgroundColor: colors.greenLight },
  roleText: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },
  ticker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.small,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.greenLight, marginRight: 8 },
  tickerText: { color: colors.textSoft, fontSize: 11, flex: 1 },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.background,
    borderTopColor: colors.card,
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  tab: { alignItems: "center", gap: 2, paddingHorizontal: 4 },
  tabLabel: { fontSize: 9 },
});
