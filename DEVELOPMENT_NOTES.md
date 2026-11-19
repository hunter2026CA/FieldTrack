# FieldTrack — build notes

**Build checked:** 2026-11-18  
**Current artifact:** `FieldTrack_Interactive_Prototype_v6.html`

## Scope kept

- GPS hunting map
- User-drawn property boundaries
- Saved stands and waypoints
- Hunter location tracking
- Wind and weather

Out of scope: group chat and shared trail-camera photo uploads.

## Concrete changes in v2

1. Reworked the layout so the map is the main desktop pane, with controls beside it; on narrow/mobile screens the map is first and the controls follow below.
2. Added on-device GPS route recording with start/stop, current-location marker, an accuracy circle, a breadcrumb line, and local persistence (up to 3,000 points).
3. Added GPS track export in GeoJSON. The export now includes saved pins, the drawn property boundary, and the recorded track.
4. Expanded GeoJSON import to recognize points, user-drawn property-boundary polygons, and line tracks. Imported general polygons and tracks display on the map for the current session; imported pins and the recognized property boundary are saved locally.
5. Updated the OpenStreetMap tile URL to the exact standard endpoint and added linked map/weather attribution. Switched the topographic layer to the OpenMaps.fr OpenTopoMap-R endpoint with its requested attribution.

## Checks run

- `node --check app-inline.js` — passed (JavaScript syntax).
- Static HTML check — passed (38 unique IDs; map, GPS, import and export controls present; no duplicate IDs).
- Node smoke test — passed for app startup, simulated GPS watch start/record/stop, local track persistence, and GeoJSON import of a point, property-boundary polygon and line track.

These are local/static and mocked-browser checks. They do **not** prove live GPS on an iPhone, live map tile delivery, live weather API access, or production deployment.

## Current technical limits / blockers

- This is still a single-file web prototype, not an App Store / Google Play application.
- The GPS breadcrumb records the current device only. Real-time sharing of multiple hunters requires HTTPS hosting, accounts/permissions, and a real-time backend; none is connected in the current workspace.
- The current persistent workspace is the ChatGPT file library. There is no connected Git repository, deployment project, backend project, or production credentials available here.
- Nova Scotia parcel/ownership data is not a free default layer: GeoNOVA lists the property-parcel vector file as fee-based/restricted, and Property Online requires a subscription. The app must not present user-drawn lines as legal boundaries or infer private/Crown ownership.
- Map and weather providers need a production cost/terms review. OpenStreetMap's public tile server is best-effort and restricts bulk/offline tile downloads. Open-Meteo's free API is for non-commercial use with request limits and attribution. The exact satellite imagery endpoint also needs production terms/cost confirmation.

## Next implementation gate

To move from a local prototype to a shared, installable first version, the project needs a Git repository plus an HTTPS hosting destination and a backend with authentication and real-time location storage. Until those are connected, the safest useful work is to keep improving and testing this self-contained prototype without claiming live multi-hunter tracking or deployment.

## v3 update — 2026-11-16

- Added local map-view persistence: FieldTrack restores the last map center and zoom on reload and saves subsequent map movements on this device. Invalid/corrupt saved views fall back to the Shelburne–Barrington default; zoom is clamped to Leaflet's supported 3–19 range.
- Updated the prototype badge to v3 and explained the local map-view behavior in the UI.
- Verification: inline JavaScript extracted and passed `node --check`; static HTML check passed with 38 unique IDs and assertions for the map-view restore/save behavior. This does not substitute for a live browser/device test.


## v5 update — 2026-11-17

- Reworked GPS recording around a versioned, recoverable local session checkpoint while retaining the v4 `fieldtrack-track` key for backward compatibility.
- On reload, restores the saved route, reports interrupted sessions, and lets the hunter resume onto the existing route rather than losing prior points. The browser cannot silently resume a GPS watch after reload; the hunter must tap Start again and grant/retain location permission.
- Added current/best GPS accuracy, recorded distance and point-count metrics. The accuracy circle reflects the reported horizontal accuracy.
- Added validation for coordinate ranges, stale/future timestamps, weak fixes (>60 m), duplicate/non-advancing timestamps and implausible jumps (>12 m/s). Temporary position-unavailable/timeouts no longer discard the route or automatically stop the watch; permission denial does stop it.
- Checkpoints are written on accepted points and when the page is hidden/unloaded. Tracks remain device-local; background tracking is not guaranteed by mobile browsers.
- Verification: JavaScript syntax and static structure checks; dedicated GPS logic tests cover accuracy filtering, valid-point acceptance, jump rejection, persistence/reload recovery and distance calculation. Simulated tests only; live iPhone GPS/background behavior still requires device testing over HTTPS.

### v5 verification details

- `node --check /tmp/fieldtrack-v5-inline.js` — passed.
- `node /mnt/data/fieldtrack/test_gps_v5.cjs` — passed: 44 unique IDs and required GPS controls; valid-fix recording; rejection of >60 m accuracy; rejection of implausible >12 m/s jump; distance calculation; page-hide interrupted checkpoint; reload restoration; resumed append; and clean manual stop.
- The test uses mocked Geolocation, map and browser storage. It does not establish actual GPS accuracy, browser process-kill behavior, or continued tracking while an iPhone is locked/backgrounded.


## v6 update — 2026-11-18

- Fixed a lifecycle bug in v5: a second `pagehide` handler called a normal stop after the interrupted-session checkpoint and could overwrite the interruption flag. v6 has one idempotent lifecycle suspension handler for `pagehide` and `beforeunload`; backgrounding via `visibilitychange` uses the same suspension path. It clears the active geolocation watch, saves the route as interrupted, and requires a deliberate user tap to restart.
- Added crash recovery for sessions whose last persisted state was still `active`: on next load, FieldTrack converts that stale active state into an interrupted session and offers recovery.
- Added continuous-route segmentation. Resuming after interruption/backgrounding, restarting after a manual stop, or receiving a fix after a gap longer than five minutes starts a new segment. The map and GeoJSON export keep each continuous segment separate, and distance totals do not include unknown travel across gaps. This avoids a misleading straight line through unrecorded terrain.
- The current GPS accuracy display now reflects the latest reported fix even when that fix is too weak to record; the best accepted accuracy remains part of the recording status.
- Preserved v4/v5 local track compatibility, the 3,000-point cap, existing accuracy/staleness/jump filters, and device-local checkpoints.

### v6 verification details

- `node --check /tmp/fieldtrack-v6-inline.js` — passed (complete inline JavaScript syntax).
- `node --check /mnt/data/fieldtrack/test_gps_v6.cjs` — passed.
- `node /mnt/data/fieldtrack/test_gps_v6.cjs` — passed: unique HTML IDs; single pagehide owner; current weak-accuracy display; accurate/weak/stale/jump handling; active-session persistence; idempotent pagehide/beforeunload suspension; watch cleanup; interrupted reload recovery; route segmentation; distance excluding route gaps; manual stop/restart; background/foreground handling; unclean-process-exit recovery; and actual segmented GeoJSON serialization.
- These are mocked-browser tests. They do not establish real iPhone GPS performance, background recording, browser process-kill behavior, or deployed HTTPS operation.

## Current delivery blocker

The persistent project folder is available and contains v2–v6 plus test scripts, but it is not a Git repository and no hosting/backend project or credentials are connected. The smallest next step toward an installable HTTPS test build is to create/connect a GitHub repository and provide its repository URL or authorize the GitHub connection. Real multi-hunter location sharing remains blocked until a hosted authentication and real-time backend are configured and tested.


## v7 update — 2026-11-19

- Added a live GPS fix-quality readout based on the device-reported horizontal accuracy: Excellent (≤10 m), Good (≤20 m), Fair (≤60 m), and Poor (>60 m). This is an accuracy classification, not a measurement of satellite radio signal strength.
- Added a last-fix time display. Older saved fixes show a date and time rather than a time-only value.
- A valid but weak fix now moves the current-location marker and expands the uncertainty circle, while remaining excluded from the recorded breadcrumb route. This makes it easier to distinguish a poor current fix from the last accepted route point.
- Last known coordinates, reported accuracy and timestamp are checkpointed separately from route points. After reopening, the map can show that position with the explicit label “Last known GPS fix — not live”; it does not claim that the phone is currently there.
- The last accepted route accuracy/time are restored on reload for older sessions that do not have the separate last-fix checkpoint. Implausible jump fixes are not promoted to the last-known position.
- Permission denial, unavailable location and stale fixes have distinct visible fix-quality states.
- Preserved v6 route segmentation, recovery behavior, GeoJSON segment export, local-only storage and the 3,000-point cap.

### v7 verification details

- Extracted the complete inline JavaScript and passed `node --check`.
- `node --check test_gps_v7.cjs` — passed.
- `node test_gps_v7.cjs` — passed: 48 unique HTML IDs; accuracy-quality classification; weak-fix marker and uncertainty-circle updates without route recording; independent last-fix persistence; non-live marker restoration; restored accuracy/time; stale and jump filtering; permission-denial state; interrupted recovery; route segmentation and distance; background suspension; and segmented GeoJSON serialization.
- Re-ran the v5 and v6 GPS regression suites; both passed.
- All GPS tests use a mocked browser, storage, map and Geolocation API. They do not prove real iPhone location accuracy, lock-screen/background tracking, or process-kill behavior. The v7 prototype remains a single-file browser app; it has not been deployed over HTTPS or tested on a physical phone.

## Current delivery blocker (unchanged)

The persistent working folder contains v2–v7 and their test scripts, but it is not connected to GitHub, an HTTPS hosting project, or a production backend. The smallest user action to enable version-controlled handoff is to create a GitHub account/repository and provide its repository URL or authorize the GitHub connection. Actual multi-hunter tracking additionally requires a configured authentication and real-time backend. No group chat or shared trail-camera upload feature is included.
