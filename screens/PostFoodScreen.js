// screens/PostFoodScreen.js
// The donor fills in this form to post surplus food.

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, ScreenTitle, AppButton } from "../components";
import { colors, radius } from "../theme";
import { createDonation } from "../database";

const CATEGORIES = ["Cooked Hot Meals", "Bakery & Bread", "Raw Vegetables/Fruit", "Dry Ration/Packaged"];
const ALLERGENS = ["Dairy", "Gluten", "Nuts", "Spice"];

export default function PostFoodScreen({ onPosted }) {
  // Each useState below remembers one thing the user typed or picked.
  const [foodTitle, setFoodTitle] = useState("Steamed Basmati Rice & Dal Makhani");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [servings, setServings] = useState("80");
  const [safeHours, setSafeHours] = useState(3.5);
  const [allergens, setAllergens] = useState(["Dairy", "Spice"]);
  const [pickupAddress, setPickupAddress] = useState("ITC Grand Chola Banquet Kitchen, Guindy, Chennai");
  const [isSending, setIsSending] = useState(false);

  // Add the allergen if it is not selected, remove it if it is.
  function toggleAllergen(name) {
    if (allergens.includes(name)) {
      setAllergens(allergens.filter((item) => item !== name));
    } else {
      setAllergens([...allergens, name]);
    }
  }

  // Change the safe-until hours by 0.5, but stay between 1 and 8.
  function changeHours(amount) {
    const next = safeHours + amount;
    if (next >= 1 && next <= 8) setSafeHours(next);
  }

  async function handleSubmit() {
    setIsSending(true);
    try {
      const donationId = await createDonation({
        foodTitle,
        category,
        servings: parseInt(servings, 10),
        safeHours,
        allergens,
        pickupAddress,
      });
      Alert.alert("Dispatch published", "We are now asking the nearest shelter to claim your food.");
      onPosted(donationId); // tells App.js which donation to watch
    } catch (error) {
      Alert.alert("Could not post", error.message);
    }
    setIsSending(false);
  }

  return (
    <View style={{ gap: 14 }}>
      <ScreenTitle
        title="Post surplus food"
        subtitle="For kitchens, hotels and events"
        badge="Donor"
      />

      <View>
        <Text style={styles.label}>Food name</Text>
        <TextInput style={styles.input} value={foodTitle} onChangeText={setFoodTitle} placeholderTextColor={colors.textMuted} />
      </View>

      <View>
        <Text style={styles.label}>Category</Text>
        <View style={styles.wrap}>
          {CATEGORIES.map((name) => (
            <TouchableOpacity
              key={name}
              onPress={() => setCategory(name)}
              style={[styles.chip, category === name && styles.chipActive]}
            >
              <Text style={{ color: category === name ? colors.greenLight : colors.textSoft, fontSize: 12 }}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>Number of portions</Text>
        <TextInput
          style={styles.input}
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Safe-until hours with - and + buttons */}
      <Card>
        <View style={styles.spaceBetween}>
          <Text style={styles.label}>How long is the food safe?</Text>
          <Text style={styles.hours}>{safeHours} hours</Text>
        </View>
        <View style={[styles.spaceBetween, { marginTop: 8, gap: 10 }]}>
          <AppButton label="-  30 min" kind="secondary" onPress={() => changeHours(-0.5)} style={{ flex: 1 }} />
          <AppButton label="+  30 min" kind="secondary" onPress={() => changeHours(0.5)} style={{ flex: 1 }} />
        </View>
        <Text style={styles.hint}>1 hour = urgent  •  4 hours = cooked food  •  8 hours = dry food</Text>
      </Card>

      <View>
        <View style={styles.spaceBetween}>
          <Text style={styles.label}>Allergens (pick at least one)</Text>
          <Text style={{ color: colors.greenLight, fontSize: 10 }}>FSSAI rule</Text>
        </View>
        <View style={styles.wrap}>
          {ALLERGENS.map((name) => {
            const isOn = allergens.includes(name);
            return (
              <TouchableOpacity key={name} onPress={() => toggleAllergen(name)} style={[styles.chip, isOn && styles.chipActive]}>
                <Text style={{ color: isOn ? colors.greenLight : colors.textSoft, fontSize: 12 }}>
                  {isOn ? "✓ " : ""}{name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={styles.label}>Pickup place</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="location-outline" size={16} color={colors.greenLight} />
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <AppButton
        label={isSending ? "Sending..." : "Find a shelter now"}
        icon="send-outline"
        onPress={handleSubmit}
        disabled={isSending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textMain,
    fontSize: 13,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingLeft: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.card,
    backgroundColor: colors.background,
  },
  chipActive: { borderColor: colors.green, backgroundColor: "rgba(16,185,129,0.12)" },
  spaceBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hours: { color: colors.greenLight, fontWeight: "700", fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 10, marginTop: 8 },
});
