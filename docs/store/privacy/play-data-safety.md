# Google Play Console: Data safety answers

App: مكتبة خزائن الرحمن · package `com.khazayin.app` · v1.0.0
Source of truth: design `docs/plans/2026-10-24-store-submission-design.md` §0 and §3.

Where: Play Console → **App content → Data safety**.

## Step 1. Overview

Nothing to answer.

## Step 2. Data collection and security

| Question | Answer | Note |
| --- | --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** | Crash logs, diagnostics, approximate location |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Sentry ingest and the OS geocoder use HTTPS/TLS. archive.org streaming is HTTPS. |
| Which of the following methods of account creation does your app support? | **My app does not allow users to create an account** | No login of any kind |
| Do you provide a way for users to request that their data is deleted? | **No** (see below) | |

**Deletion request: why "No".** The only data that leaves the device is anonymous diagnostics. They carry no user ID or install ID, and the IP is not stored, so the Foundation cannot find one user's records to delete them. Sentry deletes them on its retention schedule. Location stays on the device and is deleted with the app's data. Play accepts "No" when there is no account.
Answer **Yes** only if the Foundation commits to a real process, for example "email us and we purge by time window". In that case also give the deletion URL that Play asks for: `«[يُستكمل: deletion-request URL, only if Yes]»`.

## Step 3. Data types

Tick only these:

| Category | Data type | Collected | Shared |
| --- | --- | --- | --- |
| Location | **Approximate location** | Yes | No |
| App info and performance | **Crash logs** | Yes | No |
| App info and performance | **Diagnostics** | Yes | No |

Leave every other type unticked: Precise location, Personal info, Financial info, Health and fitness, Messages, Photos and videos, Audio files, Files and docs, Calendar, Contacts, App activity, Web browsing, **Device or other IDs**, and Other app performance data.

"Shared" is **No** everywhere. Sentry is a service provider processing on the Foundation's behalf, and the OS geocoder (Google Play services) is a service provider too. Play's definition excludes transfers to service providers from "sharing".

## Step 4. Usage and handling, per data type

### Approximate location

| Question | Answer |
| --- | --- |
| Is this data collected, shared, or both? | **Collected** |
| Is this data processed ephemerally? | **Yes**. The rounded coordinate is sent to the geocoder only to resolve the country, and the response is used at once. The copy kept for prayer times stays in local settings on the device and is never sent to the Foundation. |
| Is this data required for your app, or can users choose whether it's collected? | **Users can choose whether this data is collected** (optional, when-in-use permission) |
| Why is this user data collected? | **App functionality** (prayer-time calculation and choosing the regional calculation method) |

Why declare it on Play when Apple's answer is "not collected": Play counts any transmission off the device, including to the OS geocoder (`Location.reverseGeocodeAsync` → Play services). The conservative stance in design §0 applies, and declaring an optional, ephemeral, non-shared type costs nothing.

### Crash logs

| Question | Answer |
| --- | --- |
| Collected, shared, or both? | **Collected** |
| Processed ephemerally? | **No** (Sentry stores events for its retention period) |
| Required or optional? | **Required** (there is no in-app opt-out in v1) |
| Why is this user data collected? | **Analytics** (design §0: crash and diagnostics go under Analytics, not App functionality) |

### Diagnostics

| Question | Answer |
| --- | --- |
| Collected, shared, or both? | **Collected** |
| Processed ephemerally? | **No** |
| Required or optional? | **Required** |
| Why is this user data collected? | **Analytics** |

Diagnostics covers performance traces (20% sample), session/release-health pings, device model, OS version, app version and build, locale, memory and storage state, and breadcrumbs (screen names, archive.org request URLs).

## Step 5. Why no "Device or other IDs"

Sentry's per-install ID is replaced with the fixed `anonymous` user (`services/sentryOptions.ts`), on both the native scope and in `beforeSend`. There is no Advertising ID: no ads SDK, and `com.google.android.gms.permission.AD_ID` is not requested. Verify the merged manifest before every release. There is no Firebase Installation ID and no push token, because notifications are local only.

## Step 6. Preview (what users will see)

- **No data shared with third parties**
- **Data collected:** Location (approximate), App info and performance (crash logs, diagnostics)
- **Data is encrypted in transit**
- **You can't request that data be deleted** (unless Step 2 is answered Yes)

## Re-check before every release

- [ ] The merged manifest has `ACCESS_COARSE_LOCATION` only: no `ACCESS_FINE_LOCATION`, no `ACCESS_BACKGROUND_LOCATION`, no `AD_ID`.
- [ ] No new SDK (analytics, ads, auth, Firebase).
- [ ] Community is still `off` in production.
- [ ] The privacy policy URL in Play (App content → Privacy policy) is the same https URL as in the app.
