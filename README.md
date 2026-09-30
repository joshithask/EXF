# SKYNEX (React Native + Firebase)

A mobile app that connects people with **extra food** (hotels, kitchens) to **nearby shelters**,
with a timer so the food is delivered while it is still safe.

This is the beginner-friendly version of the original project:

| Before | Now |
|---|---|
| HTML + Tailwind website | **React Native** app (Expo) |
| Python FastAPI server | No server needed. The app talks to the database directly |
| MongoDB + Redis | **Firebase Firestore** (a NoSQL database) |
| WebSocket live tracking | Firestore live listeners (`onSnapshot`) |

---

## 1. What you need

- Node.js (LTS version) from https://nodejs.org
- The **Expo Go** app on your phone (App Store / Play Store)
- A free Google account (for Firebase)

## 2. Set up the project

```bash
npx create-expo-app@latest skynex-app --template blank
cd skynex-app
npx expo install firebase @expo/vector-icons
```

Now copy **all the files from this folder** into your new `skynex-app` folder
(replace the default `App.js`). You should end up with:

```
skynex-app/
  App.js            <- starting point, tabs, live watching
  firebase.js       <- your Firebase keys (you edit this)
  database.js       <- ALL database code lives here
  helpers.js        <- distance, timers, settings
  theme.js          <- colors
  components.js     <- buttons, cards, pills
  screens/
    RadarScreen.js
    PostFoodScreen.js
    ClaimScreen.js
    TransitScreen.js
    VerifyScreen.js
    ImpactScreen.js
```

## 3. Set up Firebase (5 minutes, one time)

1. Go to https://console.firebase.google.com and click **Add project**.
2. Open **Build -> Firestore Database -> Create database**. Pick **test mode**.
3. Click the gear icon -> **Project settings** -> under **Your apps** click the **web icon `</>`**.
4. Copy the config values and paste them into `firebase.js`.

> **Test mode is only for learning.** It lets anyone read and write your data and turns off after
> about 30 days. Before sharing the app with real users, add proper Firestore security rules and login.

## 4. Run it

```bash
npx expo start
```

Scan the QR code with Expo Go.

## 5. Try the whole flow

1. **Radar tab** -> press **Load demo shelters** (only once).
2. **Post Food tab** -> press **Find a shelter now**. The nearest shelter is asked.
3. **Claim Desk tab** -> you have 45 seconds. Press **Accept** (or **Pass** / wait to see the fallback).
4. **Transit tab** -> press **Start ride (demo GPS)**, then **Arrived**.
5. **Verify tab** -> use **Face match** (simulated) or **OTP** (the demo code is `4892`) -> **Confirm delivery**.
6. **Impact tab** -> see meals, waste and CO2 numbers go up.

---

## How the NoSQL data looks

NoSQL stores data as documents (like JSON). We use three collections.

**organizations** (shelters that can receive food)
```json
{ "name": "Anbu Children Shelter", "type": "SHELTER", "phone": "...",
  "latitude": 13.0228, "longitude": 80.2157, "dailyOtp": "4892", "verified": true }
```

**donations** (food that is posted)
```json
{ "foodTitle": "Rice & Dal", "servings": 80, "safeUntil": 1790000000000,
  "allergens": ["Dairy"], "status": "PENDING_CLAIM",
  "offeredTo": "abc123", "offerExpiresAt": 1789999945000, "rejectedBy": [] }
```
Status goes: `PENDING_CLAIM` -> `CLAIMED` -> `IN_TRANSIT` -> `DELIVERED` (or `EXPIRED`).

**deliveries** (proof of every delivery)
```json
{ "donationId": "...", "mealsSaved": 80, "wasteDivertedKg": 33.6,
  "co2AvoidedTons": 0.084, "modeUsed": "OTP", "latitude": 13.0102, "longitude": 80.2157 }
```

## Old code -> new code

| Old (Python) | New (JavaScript) |
|---|---|
| `POST /api/organizations` | `addOrganization()` in `database.js` |
| `POST /api/donations` | `createDonation()` |
| Mongo `$near` search | `findNearbyOrganizations()` (measures distance itself) |
| Redis lock `SET NX EX` | Firestore **transaction** + `offerExpiresAt` time |
| `monitor_claim_expiry` | A timer in `App.js` that calls `handleExpiredOffer()` |
| `POST .../claim` | `claimDonation()` |
| `POST /api/deliveries/verify` | `verifyDelivery()` |
| `GET /api/reports/impact` | `summarizeDeliveries()` in `helpers.js` |
| `WS /ws/transit/{id}` | `updateTracking()` + `listenToDonation()` |

## Things that are simplified (please read)

- **Auto-fallback runs inside the app.** If nobody has the app open when the 45 seconds end, the food
  is not moved on until someone opens it. For a real product, move this to a Firebase Cloud Function
  (a small server-side timer).
- **Face check is a demo.** The math (`faceMatches`) is real, but the app does not scan a real face yet.
  OTP verification is real.
- **Locations are fixed demo points** in Guindy, Chennai. Use the `expo-location` package for real GPS.
- **Notifications are printed to the console.** Use Firebase Cloud Messaging or an SMS/WhatsApp service later.
- **No login.** The Claim Desk answers for whichever shelter currently holds the offer.
- The old web page showed made-up starting numbers (1,240 meals...). Now the Impact tab starts at 0 and
  only counts real deliveries.
- I could not run the app on a device here. I checked that all the files parse and that the icons exist,
  so if something breaks on your phone, send me the error message.
