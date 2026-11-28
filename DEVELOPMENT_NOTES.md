# FieldTrack — build notes

**Build checked:** 2026-11-28  
**Current artifact:** `index.html` / `FieldTrack_Interactive_Prototype_v14.3.1-terrain-preview.html` (preview; last hosted user-verified checkpoint remains v14.3)

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

## v11 — weather/wind verification coverage (2026-11-22)

- Added `test_weather_v11.cjs` to verify the current app exposes wind speed, direction, gusts, and manual refresh; requests Open-Meteo wind values in km/h; renders direction as a compass bearing; and explains that the bearing indicates the direction the wind comes FROM.
- Added the weather test to the README's automated-check instructions.
- This is test/documentation coverage, not a change to the live weather provider or a measurement-accuracy guarantee. Real-world weather freshness and local wind variation still require field validation.


## v12 update — fixed north and wind-direction compass (2026-11-23)

- Replaced the phone-heading compass display with a fixed north-up compass labelled N, E, S, and W. North is a stable reference at the top; the display does not rotate with the phone.
- Added a green north arrow and a red wind arrow. The red arrow rotates to the meteorological wind bearing (the direction the wind comes FROM).
- Added explicit wind FROM and wind TOWARD readouts. The TOWARD bearing is calculated by adding 180 degrees and normalizing to 0–359.
- Added 16-point compass labels for the wind readouts so bearings such as 195° display as SSW and the opposite 015° as NNE. Existing eight-point labels used for yardage measurements are unchanged.
- If weather cannot load or the direction is missing, the wind arrow is hidden and both direction readouts show Unavailable; the fixed north arrow remains visible.
- Added `test_compass_wind_v12.cjs` for UI structure, unique IDs, helper math, arrow rotation, accessible labels, missing-data behavior, and inline JavaScript syntax.

### v12 verification details

- `node --check test_compass_wind_v12.cjs` — passed.
- `node test_compass_wind_v12.cjs` — passed.
- Full regression run passed: `test_saved_locations.cjs`, `test_weather_v11.cjs`, `test_compass_wind_v12.cjs`, `test_boundary_controls.cjs`, `test_gps_v10.cjs`, `test_gps_v9.cjs`, `test_gps_v7.cjs`, and `test_gps_v6.cjs`. All eight test scripts also passed `node --check`.
- These are mocked/static checks, not a physical iPhone compass, GPS, or live weather validation.
- No authenticated GitHub connection or configured remote is available in this workspace. The v12 package is prepared locally but has not been pushed or deployed. The user must upload the extracted package contents to the existing private repository and verify the hosted page before testing on iPhone.


## v13.1 update — 2026-11-24

- Kept the map as the default full-screen view and the five fixed bottom tabs: Map, Stands, Tracking, Weather, and Land.
- Added a manual **Map backup & restore** card to the Land tab. It exports/imports pins, user-drawn property boundaries, and recorded GPS tracks as GeoJSON; this is a device-file backup, not live multi-hunter sharing.
- Removed stale group-specific export/import handlers left behind when the earlier v13 UI removed its shared-map card. Those handlers referenced missing DOM elements and could stop the remainder of the page script during startup. The new backup controls replace that broken path without adding group chat or shared trail-camera uploads.
- Synchronized `aria-pressed` state between the Crown Land toggle in the Land panel and the quick toggle over the map, and added explicit Government of Nova Scotia attribution to the map layer.
- Updated the saved-location regression test to recognize the new full-viewport map layout. Added checks that all literal `$()` lookups point to existing HTML IDs.
- Source check: the official Nova Scotia Open Data entry describes the Crown Land Map dataset and links directly to the `PLANCrownLandsWM84V1/MapServer` service. The app uses that published service; the overlay remains a reference only, not proof of access or permission.

### v13.1 verification

- `node --check` passed for all nine `test_*.cjs` scripts.
- All nine test scripts passed: `test_mapfirst_crown_v13.cjs`, `test_saved_locations.cjs`, `test_weather_v11.cjs`, `test_compass_wind_v12.cjs`, `test_boundary_controls.cjs`, `test_gps_v10.cjs`, `test_gps_v9.cjs`, `test_gps_v7.cjs`, and `test_gps_v6.cjs`.
- ZIP integrity check passed after packaging.
- These checks are static/mocked. A live browser run, live Crown Land image requests, iPhone GPS, HTTPS deployment, and Pages deployment were not available from this workspace and remain to be tested after the user uploads/commits the package.

### Current delivery blocker after v13.1

The private GitHub repository is user-controlled and no authenticated GitHub connector or remote is configured in this workspace. The v13.1 package is prepared in the persistent project Library, but this run did not upload, commit, or deploy it to GitHub. The next user action is to upload the extracted v13.1 package contents to the existing `hunter2026CA/FieldTrack` repository and commit them.

## v13.3 update — GPS speedometer (2026-11-24)

- Added a prominent live GPS speed readout to the Tracking tab, with a km/h or mph selector.
- Added session maximum speed and average speed (recorded route distance divided by recorded segment time). The maximum is included in the local track-session checkpoint.
- Uses the browser's GPS speed when available; otherwise derives speed from consecutive valid GPS fixes. Unit preference is stored locally.
- Increased the movement-jump filter ceiling from 12 m/s to 80 m/s so normal ATV and boat travel speeds are supported without being discarded. Extreme calculated jumps remain rejected.
- Regression: `test_speedometer_v13_3.cjs` and the existing GPS, navigation, saved-location, weather, compass, and boundary tests pass. Inline application JavaScript syntax check passes.
- Automated tests are static/mocked; actual iPhone GPS accuracy, update cadence, and background behavior still require testing on the HTTPS-hosted app.


## v14.2 Crown Land colour correction — 2026-11-26

- User-confirmed result from v14.1: the official Crown Land layer is now visible, but its fill remains light green. This confirms the base map service is returning parcels; the remaining issue is the renderer colour.
- Restored a per-request dynamic layer renderer targeting official MapServer layer 0, with a blue polygon fill (RGBA 39,137,215,92) and dark blue outline (RGBA 19,85,151,235). The style is applied through the documented `dynamicLayers` option and the service's `mapLayerId: 0` source.
- Changed the export image format to PNG32 and the Esri Leaflet response mode to JSON. This preserves alpha transparency and allows service response errors to be surfaced.
- Added a `requesterror` handler; the prior `tileerror` handler was not the documented MapService error event for this dynamic image layer.
- Matched the map legend to the blue fill and retained the previous v14.1 HTML as `FieldTrack_Interactive_Prototype_v14.1.html`.
- Fixed a wind-forecast data edge case discovered by the regression test: JavaScript treats `Number(null)` as zero, so absent hourly speed/gust/direction values could be displayed as `0.0 km/h` or `000° N`. The forecast now explicitly rejects `null`, `undefined`, and empty values and displays an em dash.

### v14.2 verification

- Extracted inline application JavaScript passed `node --check` (49,047 characters). All 15 test scripts passed `node --check` and execution, including the Crown Land style/legend checks, all GPS and saved-location regressions, speedometer units, map-first navigation, boundary tools, weather/compass, area measurement, and 24-hour wind forecast missing-value handling.
- The Geocortex catalogue for the official Nova Scotia service reports `Supports Dynamic Layers: True` and server version 11.5. Esri Leaflet documents the `dynamicLayers` option and `setDynamicLayers` method as the supported way to override service symbology.
- This is not yet a live server/device verification. The user must upload and commit the package, then confirm the hosted overlay colour. The workspace still has no authenticated GitHub connection or configured remote.


## v14.3.1 verification hardening and map-view spike — 2026-11-27

- Added `test_wind_forecast_race_v14_3.cjs`. It deliberately resolves two forecast requests out of order and verifies that the latest selected map point remains displayed; it also verifies that a late failure from an older request cannot replace a newer successful forecast.
- Added `MAP_VIEWS_TECHNICAL_SPIKE.md` after inspecting the current map implementation. The current app is Leaflet-based 2D raster mapping with point elevation lookup, not a 3D terrain map. The note evaluates MapLibre GL JS `raster-dem`/`setTerrain` as the first 3D proof-of-concept candidate and records provider/attribution/cost and Crown Land overlay migration checks.
- 4D remains undefined. A time dimension is documented only as a possible GIS interpretation, not an agreed feature definition. No 3D/4D engine or UI was added in this run.
- Validation: see the run summary for the full regression suite and extracted application JavaScript syntax check. These remain static/mock checks, not live iPhone, map-provider, or deployed-site verification.
- GitHub upload/commit/deployment was not performed because this workspace has no authenticated GitHub connection or configured remote.


## v14.3.1 in-app 3D terrain preview — 2026-11-28

- Added MapLibre GL JS as an alternate map renderer in the main app, with 2D Leaflet still the default. The new toolbar/panel controls switch between 2D and 3D satellite terrain.
- Configured Esri World Imagery as the 3D raster basemap and AWS Open Data Mapzen/Tilezen Terrarium as the raster-DEM terrain source. Added true `setTerrain()` relief, pitch/rotation navigation, hillshade, and user-selectable relief exaggeration.
- Added MapLibre GeoJSON layers that mirror saved pins, saved property boundary, segmented GPS route, current GPS marker, in-progress boundary/area drawing, distance/area measurements, imported GeoJSON and user-loaded ownership features. 3D map clicks are sent through the existing Leaflet click handler to keep one local data model.
- Added a MapServer export-image raster source for the blue Crown Land renderer in 3D, plus explicit error reporting. This endpoint has not been tested live; Crown Land parity is not yet verified.
- Added WebGL/library checks and fallback to 2D if the 3D engine or DEM fails. Camera center/zoom are preserved when returning to 2D.
- Researched terrain resolution: AWS/Tilezen Canada data is a broad-scale DEM with nominal ~30 m source resolution around zoom 12; high zoom can be oversampled. Nova Scotia's Elevation Explorer lists higher-detail LiDAR-derived DEM/DSM/hillshade downloads in some areas, including historical South West NS and Shelburne/Queens coverage. Exact property-level coverage and a browser tile service remain to be established.
- Added `test_3d_terrain_integration.cjs` for static wiring, DOM uniqueness, overlay synchronization hooks, camera/fallback and inline syntax. All 19 test scripts passed both `node --check` and execution; these checks do not prove live tile delivery or iPhone behavior.
- No authenticated GitHub remote is configured and container DNS/network access was unavailable. No upload, commit, deployment, or live service check was performed. Keep this labelled v14.3.1 preview; do not call it v14.4 yet.

## 2026-11-28 performance follow-up — hidden 3D overlay sync

- User reported that the app feels laggy after the 3D terrain preview was added.
- Inspection found that `syncMapLibreOverlays()` continued rebuilding all MapLibre GeoJSON sources whenever GPS fixes, pins, boundaries, or measurement shapes changed, even after switching back to the hidden 2D Leaflet map. GPS updates could therefore trigger unnecessary GeoJSON conversion and WebGL source updates in the background.
- Changed the synchronization function in `index.html` and its extracted `app-inline.js` mirror to return immediately unless 3D mode is active. Switching into 3D already performs a full overlay sync, so the visible 3D map catches up when needed.
- This is a targeted reduction in background work; it does not remove the cost of rendering live 3D terrain while 3D is selected. Needs an iPhone before/after feel test.
