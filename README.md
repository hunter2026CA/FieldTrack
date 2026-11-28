# FieldTrack

A map-first hunting companion prototype focused on GPS maps, user-drawn property boundaries, saved stands and waypoints, on-device route recording, and wind/weather information.

## Current status

- Current working preview: **v14.3.1 terrain preview** (`index.html`). The last fully user-verified hosted checkpoint remains v14.3 until the new 3D view, Crown Land overlay, and iPhone behavior are checked live.
- Versioned snapshots: `FieldTrack_Interactive_Prototype_v14.3.1-terrain-preview.html` (v14.3.1 preview), `FieldTrack_Interactive_Prototype_v14.3.html` (v14.3), `FieldTrack_Interactive_Prototype_v14.2.html` (v14.2), `FieldTrack_Interactive_Prototype_v14.html` (v14.2), `FieldTrack_Interactive_Prototype_v14.1.html` (previous checkpoint), `FieldTrack_Interactive_Prototype_v13.3.html`, `FieldTrack_Interactive_Prototype_v13.html`, `FieldTrack_Interactive_Prototype_v12.html`, `FieldTrack_Interactive_Prototype_v11.html`, `FieldTrack_Interactive_Prototype_v10.html`, `FieldTrack_Interactive_Prototype_v9.html`, `FieldTrack_Interactive_Prototype_v8.html`, `FieldTrack_Interactive_Prototype_v7.html`, and `FieldTrack_Interactive_Prototype_v6.html`.
- `test_3d_terrain_integration.cjs` checks the in-app MapLibre 2D/3D switch, satellite and Terrarium DEM sources, hillshade controls, Crown Land export-layer wiring, hunting-overlay synchronization, camera handoff/fallback, DOM IDs, and inline JavaScript syntax. `test_speedometer_v14.cjs` checks km/h (kph), mph, and knots conversion/persistence. `test_speedometer_v13_3.cjs` retains the original v13.3 GPS speed regression coverage. `test_map_layers_v14.cjs` checks satellite road/place label toggles, v14.2 blue Crown Land symbology and service-error handling, and the map legend; `test_wind_forecast_v14_3.cjs` exercises the seven-day daily wind forecast renderer; `test_wind_forecast_race_v14_3.cjs` checks that out-of-order requests and stale errors cannot overwrite the forecast for the latest selected map point; `test_wind_forecast_v14.cjs` retains 24-hour historical regression coverage; `test_area_measurement_v14.cjs` checks polygon area math and controls.
- Automated checks: `test_mapfirst_crown_v13.cjs` checks the map-first viewport, five-tab navigation, Crown Land layer wiring, backup/restore controls, and that all literal DOM lookups resolve; `test_compass_wind_v12.cjs` checks the fixed cardinal compass, wind FROM/TOWARD math and arrow rotation; `test_weather_v11.cjs` checks current weather/wind display wiring; `test_saved_locations.cjs` covers current v10 named stands/waypoints; `test_boundary_controls.cjs` covers the v9 boundary workflow; `test_gps_v10.cjs` checks the current GPS tracking implementation (introduced in v10); `test_gps_v9.cjs`, `test_gps_v7.cjs`, and `test_gps_v6.cjs` are historical regression checks for the archived versions they name.
- This is a browser prototype, not yet a production mobile app.

## Run locally

Serve the project folder over localhost or HTTPS and open `index.html` in a modern browser. Map tiles, terrain, weather, and elevation lookups require an internet connection. Browser geolocation generally requires HTTPS or localhost and the user's permission.

## Run automated checks

Requires Node.js 18 or newer. From the project root:

```sh
node --check test_3d_terrain_integration.cjs
node --check test_speedometer_v14.cjs
node --check test_map_layers_v14.cjs
node --check test_wind_forecast_v14_3.cjs
node --check test_wind_forecast_race_v14_3.cjs
node --check test_wind_forecast_v14.cjs
node --check test_area_measurement_v14.cjs
node --check test_speedometer_v13_3.cjs
node --check test_boundary_controls.cjs
node --check test_mapfirst_crown_v13.cjs
node --check test_gps_v9.cjs
node --check test_gps_v10.cjs
node --check test_saved_locations.cjs
node --check test_weather_v11.cjs
node --check test_compass_wind_v12.cjs
node --check test_navigation_init_v13_2.cjs
node --check test_maplibre_3d_spike.cjs
node test_3d_terrain_integration.cjs
node test_speedometer_v14.cjs
node test_map_layers_v14.cjs
node test_wind_forecast_v14_3.cjs
node test_wind_forecast_race_v14_3.cjs
node test_wind_forecast_v14.cjs
node test_area_measurement_v14.cjs
node test_speedometer_v13_3.cjs
node test_mapfirst_crown_v13.cjs
node test_saved_locations.cjs
node test_weather_v11.cjs
node test_compass_wind_v12.cjs
node test_boundary_controls.cjs
node test_gps_v10.cjs
node test_gps_v9.cjs
node test_gps_v7.cjs
node test_gps_v6.cjs
node test_navigation_init_v13_2.cjs
node test_maplibre_3d_spike.cjs
```

The navigation-init test guards the DOM helper declaration order so early event listeners cannot fail during startup. The v13.1 map-first test checks all five navigation tabs and Crown Land wiring. The v12 compass test checks all four cardinal labels, the fixed north reference, meteorological wind FROM/TOWARD conversion, and rotation of the wind arrow. The weather test checks the current Open-Meteo request and wind-direction display wiring. The v6/v7/v9 GPS suites test their matching historical HTML snapshots. The v10 GPS suite exercises the current `index.html` GPS implementation (the GPS code has not changed in v12). The boundary test checks the v9 boundary helper logic; the saved-location test covers v10 naming, filtering, editing, validation, escaping, and GeoJSON name round-trip wiring. All browser-facing tests use mocked APIs; they do not prove real-world iPhone GPS accuracy, background tracking, or production hosting behavior.

## v13.2 navigation initialization fix

- Fixed a startup-order error: the `$()` DOM lookup helper is now declared before the first navigation and Crown Land event handlers use it. In v13.1 this caused a JavaScript temporal-dead-zone error that stopped all subsequent button listeners from being registered.
- The v13.1 map-first layout, five bottom tabs, and Nova Scotia Crown Land reference overlay are otherwise unchanged.

## v13.1 map-first update

- The map is now the default full-screen view with five fixed bottom tabs: Map, Stands, Tracking, Weather, and Land.
- The Land tab includes the official Nova Scotia Crown Land map-service overlay, user-supplied boundary-file loading, and map backup/restore. The Crown Land layer is a reference only; it does not establish public access or hunting permission.
- Map backup/restore exports and imports pins, user-drawn property boundaries, and recorded tracks as GeoJSON. It is a manual device-file workflow, not live multi-hunter sharing.
- The v13.1 regression test checks the tab structure, official service wiring, backup controls, unique IDs, and that every literal `$()` DOM lookup has a matching element.

## Agreed product scope

Included: GPS hunting maps, property boundary mapping, saved stands and waypoints, hunter location tracking, and wind/weather features.

Explicitly excluded: group chat and shared trail-camera photo uploads.

Multi-hunter live location sharing is not yet implemented; it requires HTTPS hosting, authentication, explicit location-sharing consent, and a suitable backend.

## Privacy and data

The current prototype stores map state, pins, the user-drawn property boundary, and route checkpoints in the current browser/device. Do not commit personal hunting coordinates, private property data, API secrets, passwords, or tokens to this repository.

## Cost goal

The project aims to avoid a mandatory monthly subscription. Hosting, map tiles, weather services, storage, and real-time location infrastructure must be evaluated for terms, usage limits, and operating costs before that can be promised.

## Development workflow

Make changes on a feature branch where practical, run the checks above, review the diff, and merge only tested changes into the default branch. Use Git history to preserve milestones and roll back regressions.

## v13.3 GPS speedometer update — 2026-11-24

- Added a large live GPS speed readout inside the Tracking tab, with selectable km/h and mph units.
- Added maximum speed for the saved tracking session and average speed based on recorded route distance and recorded segment time. The maximum is stored in the local track-session checkpoint.
- Uses the browser GPS speed when available and falls back to distance divided by elapsed time.
- Raised the implausible-movement ceiling to 80 m/s (288 km/h) so ordinary ATV and boat travel speeds are not rejected by the previous 12 m/s limit. Extremely large calculated jumps are still filtered.
- Speed is derived from device GPS; accuracy and update frequency depend on the phone, sky view, and browser. Mobile browsers may pause tracking when backgrounded or when the phone is locked.
- Added `test_speedometer_v13_3.cjs`; existing GPS, navigation, map, weather, compass, and boundary regression checks remain in place.


## v14.1 map, weather, and measurement update — 2026-11-25

- Added **knots** to the GPS speedometer units alongside km/h (kph) and mph. Existing saved km/h/mph preferences remain compatible; the selected unit remains device-local.
- Added optional Esri road-transportation and place-name reference overlays for satellite view. They appear only when Satellite is selected and the saved **Show road and area names** option is enabled.
- Restyled the official Nova Scotia Crown Land map-service layer using an ArcGIS dynamic-layer renderer: blue fill with alpha 82/255 (about 68% transparent) and a darker blue outline. The service is documented as supporting dynamic layers; live field rendering still needs confirmation.
- Added a Land-tab **Map legend**. It explains Crown Land, user-drawn property outlines, saved pins, GPS routes, distance/area measurements, compass arrows, and the scattered orange triangles. The triangles' exact provider/source meaning is deliberately marked unverified; they are not labelled as FieldTrack pins or Crown Land.
- Added a 24-hour, on-demand wind forecast for the selected map point or device location. It displays hourly wind speed, gusts, and the direction the wind comes FROM, using Open-Meteo's hourly forecast endpoint.
- Added temporary polygon area measurement with undo/cancel/finish controls and approximate area in square metres, hectares, and acres. It does not replace or modify the saved property boundary.
- Added `FEATURE_BACKLOG_v14.md` to record compatible ideas from the user's reference screenshots and keep data-dependent or excluded features distinct.

### v14.1 verification

- `node --check` passed for every `test_*.cjs` file.
- All 14 automated test scripts passed, including new tests for speed conversions, satellite label toggling, Crown Land symbology/legend, 24-hour wind forecast rendering, and area calculation.
- A headless Chromium attempt could not load the app in this environment because the browser policy blocks local site access and the external Leaflet CDN was unreachable. Therefore, the live map tiles, Esri label overlays, Crown Land renderer, Open-Meteo live response, and physical iPhone GPS remain unverified. The new forecast renderer and map interactions were tested with mocked data/APIs.
- The current GitHub Pages deployment was not changed. No authenticated GitHub connection or configured Git remote is available in this workspace; the user must upload and commit the v14.1 package to `hunter2026CA/FieldTrack` before it can be tested on the hosted HTTPS page.
- Open-Meteo documents free access for non-commercial use, but production usage, attribution, map-tile terms, hosting, and total operating costs still need review. No no-subscription guarantee is made.


## v14.2 Crown Land colour correction — 2026-11-26

- Restored an explicit ArcGIS dynamic-layer renderer for official Crown Land layer 0 so the server's default light-green style is overridden with a translucent blue fill (`[39,137,215,92]`) and a darker blue outline (`[19,85,151,235]`).
- Uses PNG32 output to preserve transparency and Esri Leaflet's JSON response mode so service-side errors can be surfaced rather than silently looking like a successful image request.
- Replaced the ineffective `tileerror` status handler with the documented ArcGIS `requesterror` event. The status now distinguishes a successfully loaded styled overlay from a rejected request.
- Preserved the v14.1 app snapshot before updating the current v14 snapshot. The map legend swatch now matches the requested blue fill.
- The official Geocortex service catalogue reports the Nova Scotia Crown Land service as dynamic and `Supports Dynamic Layers: True`; Esri Leaflet documents `dynamicLayers` as the supported symbology override mechanism. These metadata/docs support the implementation, but only the hosted app can confirm that the server actually returns the blue renderer to the user's device.

### v14.2 verification

- `test_map_layers_v14.cjs` checks the blue fill/outline, PNG32/JSON request mode, dynamic layer target, error event wiring, legend swatch, and satellite label toggles.
- Extracted application JavaScript passed `node --check`; all 15 `test_*.cjs` scripts passed both syntax checks and execution, including the v14.2 Crown Land style/error-handling checks and the 24-hour wind-forecast missing-value regression.
- No GitHub push or Pages deployment was performed: this workspace has no authenticated GitHub connection or configured remote. Upload and commit the package, then verify the hosted map on the user's iPhone.


## v14.3 seven-day wind forecast update — 2026-11-26

- Expanded the Weather tab forecast from 24 hourly rows to a seven-day daily outlook.
- Uses Open-Meteo daily maximum wind speed, maximum gust, and dominant wind direction; direction is explicitly labelled as where wind comes FROM.
- Displays weekday labels, km/h values, a seven-day request, loading/error states, and unavailable markers rather than converting missing API values to zero or north.
- Keeps the selected map point/device location behavior and stale-request guard.
- Preserved the v14.2 app snapshot as `FieldTrack_Interactive_Prototype_v14.2.html` and saved the v14.3 app snapshot as `FieldTrack_Interactive_Prototype_v14.3.html`.
- Added `test_wind_forecast_v14_3.cjs` for seven-day request parameters, seven daily rows, wind direction, status text, and missing-value handling.
- This is a code-level/mock-data verification; live Open-Meteo availability and the hosted iPhone UI still require testing after the user commits the update.

## Map-view architecture note — 2026-11-27

`MAP_VIEWS_TECHNICAL_SPIKE.md` records the Leaflet 2D fallback, the in-app MapLibre 3D terrain preview, provider/licensing checks, Nova Scotia LiDAR research, and the unresolved meaning of 4D. The 3D preview is present in `index.html`; 4D is not implemented.

## Isolated MapLibre 3D terrain spike — 2026-11-27

- Added `maplibre_3d_spike.html`, a disposable 3D terrain test centered on Nova Scotia. It uses MapLibre GL JS with a demo style and demo raster-DEM endpoint, includes a 2D/3D toggle and reset control, and does not alter or replace the production `index.html` Leaflet map.
- Added `test_maplibre_3d_spike.cjs` to verify the terrain source, toggle/reset wiring, test location, and explicit demo-only warning.
- This is a browser proof-of-concept, not a production map. Demo tiles are for evaluation only; imagery/DEM terms, Nova Scotia coverage, attribution, quota, iPhone performance, and operating costs must be validated before release.
- To try it, serve the project folder over localhost or HTTPS and open `maplibre_3d_spike.html`. A direct `file://` open may be blocked by browser security. The automated test checks source wiring only; it does not verify live tile delivery or WebGL rendering.

## v14.3.1 in-app 3D terrain preview — 2026-11-28

- Added a visible 2D / 3D terrain switch to the main map-first app. The 2D Leaflet map remains the default and fallback; the 3D view uses MapLibre GL JS, Esri World Imagery, and Mapzen/Tilezen Terrarium elevation tiles from the AWS Open Data Terrain Tiles bucket.
- Added real elevation-driven terrain with camera pitch/rotation controls, selectable 1.0× / 1.35× / 1.7× / 2.0× relief exaggeration, and an optional hillshade layer. This is not a flat image tilted in perspective.
- Mirrored saved pins, user-drawn property boundaries, GPS tracks, current GPS location, temporary boundary/area drawings, measurements, imported map features, and user-loaded ownership GeoJSON into MapLibre GeoJSON layers. Map clicks in 3D are passed back to the existing Leaflet interaction logic so the app retains one local data model.
- Added a MapServer export-image raster source for the same blue Crown Land renderer in 3D. It has not been live-tested against the provincial service; if the 3D Crown layer fails, the 2D map remains available and its Crown Land layer is unchanged.
- Added a WebGL/library failure check and a return-to-2D fallback for terrain-source failures. Camera center/zoom are carried between map modes.
- The AWS global DEM is a broad-scale bare-earth model, not fine property-scale LiDAR. Tilezen documents Canadian source data as variable resolution and about 30 m nominal at its 1-arc-second source level; zooming in does not create new ground detail. Nova Scotia's Elevation Explorer lists LiDAR-derived DEM, DSM, and hillshade products in parts of the province, including historic coverage for Shelburne and Queens counties. Exact coverage for any hunt property and a suitable hosted tile endpoint still need verification.
- Added `test_3d_terrain_integration.cjs`. It checks source/layer/control wiring, overlay sync hooks, camera handoff/fallback, unique IDs, and inline JavaScript syntax. Static tests do not verify live tile delivery, the provincial Crown export endpoint, or iPhone WebGL performance.
- This remains a **preview**, not v14.4. Do not call it a release until live Crown Land rendering and the full 3D view are checked on iPhone Safari. No GitHub push or deployment was performed; this workspace has no authenticated GitHub remote.
