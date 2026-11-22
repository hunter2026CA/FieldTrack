# FieldTrack — build notes

**Build checked:** 2026-11-22  
**Current artifact:** `index.html` / `FieldTrack_Interactive_Prototype_v10.html`

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
- A private GitHub repository has since been created by the user, but this workspace has no authenticated GitHub connection or configured remote. The project has not been pushed or deployed; no hosting or production backend is connected.
- Nova Scotia parcel/ownership data is not a free default layer: GeoNOVA lists the property-parcel vector file as fee-based/restricted, and Property Online requires a subscription. The app must not present user-drawn lines as legal boundaries or infer private/Crown ownership.
- Map and weather providers need a production cost/terms review. OpenStreetMap's public tile server is best-effort and restricts bulk/offline tile downloads. Open-Meteo's free API is for non-commercial use with request limits and attribution. The exact satellite imagery endpoint also needs production terms/cost confirmation.

## Next implementation gate

The GitHub repository now exists, but the current project package still needs to be uploaded and verified there. An installable HTTPS test build then needs a hosting destination. Live multi-hunter location sharing additionally needs authentication, explicit consent, and a real-time backend. Until those are connected, this remains a self-contained browser prototype.

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

## Historical delivery note — v6 (2026-11-18)

At the v6 checkpoint, no GitHub repository had yet been created. The user has since created the private `hunter2026CA/FieldTrack` repository, but the current workspace still has no authenticated connection or remote configured. Hosting and backend setup remain separate later steps.


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

## v8 update — 2026-11-20

- Improved property-boundary drawing with a visible first-point marker, an undo-last-point action, and a cancel-drawing action.
- The Finish button stays disabled until at least three points exist. Undoing below three points disables Finish again.
- Cancelling or switching to pin/measure mode discards only the unfinished outline and leaves the previously saved boundary untouched. Clearing a saved boundary remains a separate, confirmed action.
- Added `test_boundary_controls.cjs` to verify unique HTML IDs, full inline JavaScript syntax, control wiring, the three-point threshold, preview updates, undo behavior, cancel behavior, and preservation of an existing saved boundary.
- Updated the README and transfer instructions to identify v8 as the current entry point and to distinguish the historical v6/v7 GPS tests from the current v8 boundary test.

### v8 verification details

- `node test_boundary_controls.cjs` — passed.
- `node test_gps_v7.cjs` — passed against the archived v7 snapshot.
- `node test_gps_v6.cjs` — passed against the archived v6 snapshot.
- `node --check test_boundary_controls.cjs` — passed.
- These checks use mocked browser/map behavior and static JavaScript compilation. They do not establish live iPhone GPS, background tracking, map-provider uptime, or deployed HTTPS behavior.

## Current delivery blocker

The user reports that the private GitHub repository `hunter2026CA/FieldTrack` has been created. The current project workspace still has no authenticated GitHub connection or configured remote, so this run did not upload or deploy anything and cannot verify the private repository contents. The smallest next action is to finish uploading the project files through GitHub's web interface (or connect an authorized GitHub integration). HTTPS hosting and a production backend are still not configured. Real multi-hunter location sharing remains blocked until authentication, consent controls, and a real-time backend are implemented and tested. No group chat or shared trail-camera upload feature is included.

## v9 update — 2026-11-21

- Added a **Zoom to saved boundary** map control so a hunter can bring the complete drawn property outline into view after panning elsewhere or reopening the app.
- The control is disabled until a valid saved boundary exists. Boundary coordinates are checked for array shape, finite values, and latitude/longitude ranges before the app enables the action or draws the saved polygon.
- The fit uses Leaflet bounds with 36-pixel padding and a maximum zoom of 17, keeping the full outline visible rather than zooming excessively into a small property.
- Added `test_gps_v9.cjs`, which runs the GPS recovery/quality regression harness against the archived v9 snapshot. This closes a verification gap in the previous package.
- Preserved v8 as a historical HTML snapshot and saved the current app as `FieldTrack_Interactive_Prototype_v9.html`.

### v9 verification details

- `node --check test_boundary_controls.cjs` — passed.
- `node --check test_gps_v9.cjs` — passed.
- `node test_boundary_controls.cjs` — passed: unique IDs, full inline JavaScript syntax, three-point completion rule, preview, undo/cancel, preservation of the previous saved outline, coordinate validation, fit-control enable/disable, and fit-bounds arguments.
- `node test_gps_v9.cjs` — passed against current `index.html`: GPS quality, weak-fix display, separate last-fix persistence, non-live restored marker, route recording/recovery/segmentation, stale/jump filtering, permission status, lifecycle suspension, and segmented GeoJSON.
- `node test_gps_v7.cjs` and `node test_gps_v6.cjs` — passed as historical regression checks.
- These are automated tests with mocked browser/map/GPS APIs. A physical iPhone test over HTTPS is still required for real GPS, map interaction, and background behavior.

## Current delivery blocker after v9

The private GitHub repository is user-created, but this workspace still has no authenticated GitHub connection or configured remote. The v9 package is prepared locally; it has not been uploaded, pushed, or deployed. The smallest unblock is to upload the extracted v9 package contents to the existing private repository, or authorize a GitHub integration. Hosting, backend services, production map/weather terms, and ongoing costs remain unvalidated. No group chat or shared trail-camera photo uploads are in scope.


## v10 update — 2026-11-22

- Added an optional **Location name** field when dropping a saved pin, so hunters can name specific stands and waypoints (for example, “North ridge stand”) instead of relying only on generic categories.
- Saved-location cards and map popups now show the custom name and its type. Search matches names as well as types, notes, and coordinates.
- Added an **Edit details** action to update a saved location's name and field note. Cancelling either prompt leaves the saved record unchanged.
- Added a shared pin normalizer for saved and imported points. It rejects coordinates outside latitude/longitude ranges and bounds names to 48 characters and notes to 280 characters. Existing saved pins without names remain compatible and display their type as the title.
- GeoJSON export/import now preserves custom location names. The map remains the first panel in the narrow-screen/mobile layout.
- Added `test_saved_locations.cjs` for name normalization, coordinate rejection, name search, type filtering, HTML escaping, edit/cancel behavior, export/import wiring, unique IDs, inline JavaScript syntax, and mobile map-first layout.

### v10 verification details

- `node --check test_boundary_controls.cjs`, `node --check test_gps_v9.cjs`, `node --check test_gps_v10.cjs`, and `node --check test_saved_locations.cjs` — passed.
- `node test_saved_locations.cjs` — passed.
- `node test_boundary_controls.cjs` — passed.
- `node test_gps_v10.cjs` — passed against the current `index.html`.
- `node test_gps_v9.cjs` — passed against the archived v9 snapshot.
- `node test_gps_v7.cjs` and `node test_gps_v6.cjs` — passed against historical snapshots.
- All browser, map, and GPS tests remain simulated/mocked; no live iPhone or deployed HTTPS test was possible in this workspace.

## Current delivery blocker after v10

The v10 code and tests are prepared in this workspace, but no authenticated GitHub connector or configured Git remote is available here. The private repository has not been updated by this run and no deployment exists. The next smallest action remains uploading the contents of the v10 package to the user's existing private repository. After that, a hosted HTTPS test is required before real-device GPS validation. Map/weather provider terms and operating costs, plus a backend for live multi-hunter location sharing, remain unvalidated. Group chat and shared trail-camera photo uploads remain excluded.
