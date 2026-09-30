// database.js
// Every talk with the NoSQL database (Firestore) happens in THIS file.
// The screens never touch the database directly. They just call the functions below.
//
// Firestore stores data in "collections" (like folders) full of "documents" (like JSON objects).
// We use 3 collections:
//   organizations -> shelters / NGOs / community kitchens that can receive food
//   donations     -> food that a donor wants to give away
//   deliveries    -> proof that food was delivered (this is our "audit ledger")

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  CLAIM_SECONDS,
  SEARCH_RADIUS_KM,
  KG_PER_MEAL,
  CO2_TONS_PER_KG,
  DEMO_DONOR_LOCATION,
  distanceInKm,
  faceMatches,
} from "./helpers";

// These fields mean "nobody is being offered this food right now".
const NO_OFFER = {
  offeredTo: null,
  offeredToName: null,
  offeredToPhone: null,
  offeredDistanceKm: null,
  offerExpiresAt: null,
  nextInLineName: null,
  nextInLineKm: null,
};

const ALLOWED_TYPES = ["NGO", "SHELTER", "COMMUNITY_KITCHEN"];

// Round a number to a few decimal places (2.3456 -> 2.35)
function round(number, places) {
  const factor = Math.pow(10, places);
  return Math.round(number * factor) / factor;
}

// The old server printed the SMS in the console. We do the same here.
function sendNotification(phone, donation) {
  const safeTime = new Date(donation.safeUntil).toLocaleTimeString();
  console.log(
    `[NOTIFICATION -> ${phone}]\n` +
      `URGENT SURPLUS FOOD\n` +
      `Food: ${donation.foodTitle} (${donation.servings} portions)\n` +
      `Safe until: ${safeTime}\n` +
      `Reply ACCEPT or PASS within ${CLAIM_SECONDS} seconds.`
  );
}

// =====================================================================
// 1. ORGANIZATIONS
// =====================================================================

// Save a new shelter / NGO.
export async function addOrganization(data) {
  const saved = await addDoc(collection(db, "organizations"), {
    ...data,
    verified: true,
    createdAt: Date.now(),
  });
  return saved.id;
}

// Adds 3 fake shelters near Guindy, Chennai, so you can try the app.
// If shelters already exist, it does nothing.
export async function seedDemoOrganizations() {
  const existing = await getDocs(collection(db, "organizations"));
  if (existing.size > 0) return 0;

  // These phone numbers are fake on purpose.
  const demoShelters = [
    {
      name: "Anbu Children Shelter",
      type: "SHELTER",
      phone: "+91 90000 00001",
      latitude: 13.0228,
      longitude: 80.2157,
      dailyOtp: "4892",
      managerFaceEmbedding: [0.12, 0.34, 0.56],
    },
    {
      name: "Seva Community Kitchen",
      type: "COMMUNITY_KITCHEN",
      phone: "+91 90000 00002",
      latitude: 12.9922,
      longitude: 80.2347,
      dailyOtp: "4892",
      managerFaceEmbedding: [0.12, 0.34, 0.56],
    },
    {
      name: "Hope Food Bank",
      type: "NGO",
      phone: "+91 90000 00003",
      latitude: 13.0402,
      longitude: 80.2457,
      dailyOtp: "4892",
      managerFaceEmbedding: [0.12, 0.34, 0.56],
    },
  ];

  for (const shelter of demoShelters) {
    await addOrganization(shelter);
  }
  return demoShelters.length;
}

// Finds verified shelters close to the food, nearest first.
// (MongoDB did this with a "2dsphere" index. Firestore has no such feature,
//  so we simply measure the distance to each shelter ourselves.)
async function findNearbyOrganizations(donation) {
  const q = query(collection(db, "organizations"), where("verified", "==", true));
  const snapshot = await getDocs(q);

  const rejectedIds = donation.rejectedBy || [];
  const nearby = [];

  snapshot.forEach((document) => {
    const org = { id: document.id, ...document.data() };

    if (!ALLOWED_TYPES.includes(org.type)) return;
    if (rejectedIds.includes(org.id)) return; // already said no (or timed out)

    const km = distanceInKm(
      donation.latitude,
      donation.longitude,
      org.latitude,
      org.longitude
    );
    if (km <= SEARCH_RADIUS_KM) {
      nearby.push({ ...org, distanceKm: km });
    }
  });

  nearby.sort((a, b) => a.distanceKm - b.distanceKm); // nearest first
  return nearby;
}

// =====================================================================
// 2. DONATIONS
// =====================================================================

// A donor posts surplus food.
// form = { foodTitle, category, servings, safeHours, allergens, pickupAddress }
export async function createDonation(form) {
  if (!form.foodTitle || form.foodTitle.trim() === "") {
    throw new Error("Please enter the food name.");
  }
  if (!form.servings || form.servings < 1) {
    throw new Error("Portions must be at least 1.");
  }
  if (!form.allergens || form.allergens.length === 0) {
    throw new Error("Please pick at least one allergen (it is mandatory).");
  }

  const now = Date.now();

  const saved = await addDoc(collection(db, "donations"), {
    donorId: "donor_demo",
    foodTitle: form.foodTitle.trim(),
    category: form.category,
    servings: form.servings,
    safeUntil: now + form.safeHours * 60 * 60 * 1000, // hours -> milliseconds
    allergens: form.allergens,
    latitude: DEMO_DONOR_LOCATION.latitude,
    longitude: DEMO_DONOR_LOCATION.longitude,
    pickupAddress: form.pickupAddress,
    status: "PENDING_CLAIM",
    rejectedBy: [],
    claimedBy: null,
    tracking: null,
    createdAt: now,
    ...NO_OFFER,
  });

  // Immediately offer the food to the nearest shelter.
  await offerToNextOrganization(saved.id);
  return saved.id;
}

// Offers the food to the nearest shelter that has not said no yet.
export async function offerToNextOrganization(donationId) {
  const donationRef = doc(db, "donations", donationId);
  const snapshot = await getDoc(donationRef);
  if (!snapshot.exists()) return;

  const donation = snapshot.data();
  if (donation.status !== "PENDING_CLAIM") return;

  // Food is no longer safe? Mark it as expired.
  if (donation.safeUntil <= Date.now()) {
    await updateDoc(donationRef, { status: "EXPIRED", ...NO_OFFER });
    return;
  }

  const nearby = await findNearbyOrganizations(donation);
  if (nearby.length === 0) {
    console.log("No shelter available nearby for this donation.");
    await updateDoc(donationRef, { ...NO_OFFER });
    return;
  }

  const first = nearby[0];
  const second = nearby[1]; // the "next in line" (may not exist)

  // A "transaction" is a safe way to update data.
  // It makes sure two phones cannot offer the same food at the same time.
  // (The old server used Redis for this job.)
  await runTransaction(db, async (transaction) => {
    const fresh = await transaction.get(donationRef);
    const current = fresh.data();

    // Somebody else already made an offer, so we stop.
    if (current.status !== "PENDING_CLAIM" || current.offeredTo) return;

    transaction.update(donationRef, {
      offeredTo: first.id,
      offeredToName: first.name,
      offeredToPhone: first.phone || null,
      offeredDistanceKm: round(first.distanceKm, 1),
      offerExpiresAt: Date.now() + CLAIM_SECONDS * 1000,
      nextInLineName: second ? second.name : null,
      nextInLineKm: second ? round(second.distanceKm, 1) : null,
    });
  });

  sendNotification(first.phone || "unknown", donation);
}

// Called when the shelter did not answer in time.
// It skips that shelter and offers the food to the next one.
export async function handleExpiredOffer(donationId) {
  const donationRef = doc(db, "donations", donationId);
  let movedOn = false;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(donationRef);
    if (!snapshot.exists()) return;
    const donation = snapshot.data();

    const stillWaiting =
      donation.status === "PENDING_CLAIM" &&
      donation.offeredTo &&
      Date.now() >= donation.offerExpiresAt;

    if (!stillWaiting) return; // somebody already handled it

    transaction.update(donationRef, {
      rejectedBy: arrayUnion(donation.offeredTo),
      ...NO_OFFER,
    });
    movedOn = true;
  });

  if (movedOn) {
    console.log("Shelter timed out. Offering to the next one...");
    await offerToNextOrganization(donationId);
  }
}

// A shelter says YES (accept = true) or NO (accept = false).
export async function claimDonation(donationId, organizationId, accept) {
  const donationRef = doc(db, "donations", donationId);
  let result = "";

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(donationRef);
    if (!snapshot.exists()) throw new Error("Donation not found.");
    const donation = snapshot.data();

    const offerIsValid =
      donation.status === "PENDING_CLAIM" &&
      donation.offeredTo === organizationId &&
      Date.now() <= donation.offerExpiresAt;

    if (!offerIsValid) {
      throw new Error("The claim window expired, or this offer is not for this shelter.");
    }

    if (accept) {
      transaction.update(donationRef, {
        status: "CLAIMED",
        claimedBy: organizationId,
        claimedByName: donation.offeredToName,
        claimedByPhone: donation.offeredToPhone,
        claimedDistanceKm: donation.offeredDistanceKm,
        claimedAt: Date.now(),
        ...NO_OFFER,
      });
      result = "LOCKED";
    } else {
      transaction.update(donationRef, {
        rejectedBy: arrayUnion(organizationId),
        ...NO_OFFER,
      });
      result = "PASSED";
    }
  });

  if (result === "PASSED") {
    await offerToNextOrganization(donationId);
  }
  return result;
}

// =====================================================================
// 3. LIVE TRACKING (replaces the old WebSocket)
// =====================================================================

// The courier's phone saves its progress. Everyone watching the donation
// sees the change instantly because of listenToDonation() below.
export async function updateTracking(donationId, tracking) {
  await updateDoc(doc(db, "donations", donationId), {
    status: "IN_TRANSIT",
    tracking: { ...tracking, updatedAt: Date.now() },
  });
}

// =====================================================================
// 4. DELIVERY PROOF
// =====================================================================

// Checks the handover (OTP or face) and saves a delivery record.
export async function verifyDelivery(details) {
  const donationRef = doc(db, "donations", details.donationId);
  const donationSnap = await getDoc(donationRef);
  if (!donationSnap.exists()) throw new Error("Donation not found.");

  const donation = donationSnap.data();
  if (!["CLAIMED", "IN_TRANSIT"].includes(donation.status)) {
    throw new Error("This donation is not ready for delivery yet.");
  }

  const orgSnap = await getDoc(doc(db, "organizations", donation.claimedBy));
  if (!orgSnap.exists()) throw new Error("Receiving shelter not found.");
  const org = orgSnap.data();

  let isVerified = false;
  if (details.mode === "OTP") {
    isVerified = !!details.otp && details.otp === (org.dailyOtp || "4892");
  } else if (details.mode === "FACE_MATCH") {
    isVerified = faceMatches(details.faceNumbers, org.managerFaceEmbedding);
  }

  if (!isVerified) {
    throw new Error("Handover check failed. Please try again.");
  }

  const wasteKg = round(donation.servings * KG_PER_MEAL, 2);
  const co2Tons = round(wasteKg * CO2_TONS_PER_KG, 4);

  const record = {
    donationId: details.donationId,
    foodTitle: donation.foodTitle,
    donorId: donation.donorId,
    recipientId: donation.claimedBy,
    recipientName: donation.claimedByName || org.name,
    courierId: details.courierId,
    deliveredAt: Date.now(),
    latitude: details.latitude,
    longitude: details.longitude,
    modeUsed: details.mode,
    mealsSaved: donation.servings,
    wasteDivertedKg: wasteKg,
    co2AvoidedTons: co2Tons,
  };

  const saved = await addDoc(collection(db, "deliveries"), record);
  await updateDoc(donationRef, { status: "DELIVERED", tracking: null });

  return { id: saved.id, ...record };
}

// =====================================================================
// 5. LIVE LISTENERS
// =====================================================================
// A "listener" calls your function again every time the data changes.
// It returns an "unsubscribe" function. Call that to stop listening.

export function listenToDonation(donationId, onChange) {
  return onSnapshot(
    doc(db, "donations", donationId),
    (snapshot) => {
      onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    (error) => console.log("Could not listen to donation:", error.message)
  );
}

export function listenToDeliveries(onChange) {
  const q = query(collection(db, "deliveries"), orderBy("deliveredAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((document) => list.push({ id: document.id, ...document.data() }));
      onChange(list);
    },
    (error) => console.log("Could not listen to deliveries:", error.message)
  );
}
