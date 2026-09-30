// helpers.js
// Small helper functions and settings used across the app.

import { useEffect, useState } from "react";

// ---------- Settings (same idea as the environment settings in the old server.py) ----------
export const CLAIM_SECONDS = 45;          // how long a shelter has to say yes or no
export const SEARCH_RADIUS_KM = 10;       // only look for shelters within 10 km
export const KG_PER_MEAL = 0.42;          // each meal saved = 0.42 kg of food waste
export const CO2_TONS_PER_KG = 0.0025;    // each kg of waste diverted = 0.0025 tons of CO2e

// Demo GPS spots in Chennai (Guindy). In a real app you would use the phone's GPS.
export const DEMO_DONOR_LOCATION = { latitude: 13.0102, longitude: 80.2157 };
export const DEMO_COURIER_LOCATION = { latitude: 13.0102, longitude: 80.2157 };

// ---------- Distance between two GPS points, in kilometers ----------
// This is called the "Haversine formula". You do not need to understand the math,
// just know that it gives the distance between two latitude/longitude points.
export function distanceInKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

// ---------- Face check ----------
// A face is turned into a list of numbers. Two faces are "the same person"
// if the numbers are very close to each other (small distance).
export function faceMatches(numbersA, numbersB, threshold = 0.55) {
  if (!numbersA || !numbersB) return false;
  if (numbersA.length !== numbersB.length) return false;

  let sum = 0;
  for (let i = 0; i < numbersA.length; i++) {
    const difference = numbersA[i] - numbersB[i];
    sum += difference * difference;
  }
  return Math.sqrt(sum) < threshold;
}

// ---------- Time formatting ----------
// 8062 seconds  ->  "02:14:22"
export function formatHoursMinutesSeconds(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// 32 seconds  ->  "00:32"
export function formatMinutesSeconds(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// ---------- Countdown hook ----------
// Give it a time (in milliseconds) and it tells you how many seconds are left.
// It updates by itself every second, so your screen keeps ticking.
export function useSecondsLeft(targetTimeInMs) {
  const calculate = () => {
    if (!targetTimeInMs) return 0;
    return Math.max(0, Math.round((targetTimeInMs - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(calculate);

  useEffect(() => {
    setSecondsLeft(calculate());
    const timerId = setInterval(() => setSecondsLeft(calculate()), 1000);
    return () => clearInterval(timerId); // stop the timer when the screen closes
  }, [targetTimeInMs]);

  return secondsLeft;
}

// ---------- Impact numbers ----------
// Adds up all finished deliveries into simple totals.
export function summarizeDeliveries(deliveries) {
  let meals = 0;
  let wasteKg = 0;
  let co2Tons = 0;

  deliveries.forEach((delivery) => {
    meals += delivery.mealsSaved || 0;
    wasteKg += delivery.wasteDivertedKg || 0;
    co2Tons += delivery.co2AvoidedTons || 0;
  });

  return {
    totalDeliveries: deliveries.length,
    totalMeals: meals,
    totalWasteKg: Math.round(wasteKg * 100) / 100,
    totalCo2Tons: Math.round(co2Tons * 10000) / 10000,
  };
}
