# مكتبة خزائن الرحمن - React Native App

This repository contains the MVP mobile application for "مكتبة خزائن الرحمن" built with React Native and Expo Router. The goal of this application is to provide a smooth, natively optimized, and visually calm experience for parsing the Nextcloud instance of the library.

## Architecture
- **Framework:** React Native / Expo (Managed Workflow)
- **Routing:** Expo Router (`app/` directory)
- **Language:** TypeScript
- **State Management:** Zustand (for settings, downloads, favorites) with `AsyncStorage` persistence.
- **Data Layer:** A centralized `apiService` handles retrieving structure. Today it serves mock JSON data mirroring the library, but is designed to drop in Nextcloud WebDAV APIs natively.
- **Styling:** Context-sensitive Design Tokens (`constants/Theme.ts`) via standard `StyleSheet` for robust performance across low-end and high-end Android/iOS devices.

## Features
- **RTL-First Design:** Fully forced Right-to-Left orientation for the native feel of Arabic.
- **Onboarding:** A clean introduction.
- **Home:** Featured resources and quick category drops.
- **Search:** Instant query for books and authors.
- **Offline Readiness:** Offline stores for favorites and mock downloads.

## Setup Steps
1. Make sure you have Node and `npm` installed.
2. Run `npm install`
3. Start the project with `npx expo start`
4. Use the Expo Go app on your physical device, or press `a` to open Android emulator, `i` to open iOS simulator.

## Integration Assumptions
Currently, the source URL provided (Nextcloud public link) acts as a file browser. Without an explicit App Password or structured JSON endpoint provided by the server admin, bridging directly to a public share `WebDAV` involves some CORS and Authentication workarounds:
1. `services/api.ts` implements a mock adapter. 
2. Real data would require Nextcloud's WebDAV API hitting `{host}/public.php/webdav/` using basic auth with username `2HTwmJTyPLT6mLN` and password empty.
3. The React Native app is structured such that `api.ts` is the single point of failure/swap for these network calls.

## Future Enhancements
- **Scholar Pages:** Dedicated screens grouping resources by specific authors or scholars.
- **Audio Lectures:** Build a fixed audio player at the bottom tab level to persist playback across screens.
- **Reading Lists:** Allow users to create custom folders inside 'Saved'.
- **Personalized Recommendations:** Based on viewed features.
- **Continue Reading:** Local SQLite storage of page numbers for PDFs to resume reading seamlessly.
- **Notifications:** Push notifications when the library team uploads a new resource collection.
