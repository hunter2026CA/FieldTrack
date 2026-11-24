# FieldTrack

A map-first hunting companion prototype focused on GPS maps, user-drawn property boundaries, saved stands and waypoints, on-device route recording, and wind/weather information.

## Current status

- Current app entry point: **v13.1** (`index.html`)
- Versioned snapshots: `FieldTrack_Interactive_Prototype_v13.html`, `FieldTrack_Interactive_Prototype_v12.html`, `FieldTrack_Interactive_Prototype_v11.html`, `FieldTrack_Interactive_Prototype_v10.html`, `FieldTrack_Interactive_Prototype_v9.html`, `FieldTrack_Interactive_Prototype_v8.html`, `FieldTrack_Interactive_Prototype_v7.html`, and `FieldTrack_Interactive_Prototype_v6.html`.
- Automated checks: `test_mapfirst_crown_v13.cjs` checks the map-first viewport, five-tab navigation, Crown Land layer wiring, backup/restore controls, and that all literal DOM lookups resolve; `test_compass_wind_v12.cjs` checks the fixed cardinal compass, wind FROM/TOWARD math and arrow rotation; `test_weather_v11.cjs` checks current weather/wind display wiring; `test_saved_locations.cjs` covers current v10 named stands/waypoints; `test_boundary_controls.cjs` covers the v9 boundary workflow; `test_gps_v10.cjs` checks the current GPS tracking implementation (introduced in v10); `test_gps_v9.cjs`, `test_gps_v7.cjs`, and `test_gps_v6.cjs` are historical regression checks for the archived versions they name.
- This is a browser prototype, not yet a production mobile app.

## Run locally

Open `index.html` in a modern browser. Map tiles and weather/elevation lookups require an internet connection. Browser geolocation generally requires HTTPS or localhost and the user's permission.

## Run automated checks

Requires Node.js 18 or newer. From the project root:

```sh
node --check test_boundary_controls.cjs
node --check test_mapfirst_crown_v13.cjs
node --check test_gps_v9.cjs
node --check test_gps_v10.cjs
node --check test_saved_locations.cjs
node --check test_weather_v11.cjs
node --check test_compass_wind_v12.cjs
node test_mapfirst_crown_v13.cjs
node test_saved_locations.cjs
node test_weather_v11.cjs
node test_compass_wind_v12.cjs
node test_boundary_controls.cjs
node test_gps_v10.cjs
node test_gps_v9.cjs
node test_gps_v7.cjs
node test_gps_v6.cjs
```

The v13.1 map-first test checks all five navigation tabs and Crown Land wiring. The v12 compass test checks all four cardinal labels, the fixed north reference, meteorological wind FROM/TOWARD conversion, and rotation of the wind arrow. The weather test checks the current Open-Meteo request and wind-direction display wiring. The v6/v7/v9 GPS suites test their matching historical HTML snapshots. The v10 GPS suite exercises the current `index.html` GPS implementation (the GPS code has not changed in v12). The boundary test checks the v9 boundary helper logic; the saved-location test covers v10 naming, filtering, editing, validation, escaping, and GeoJSON name round-trip wiring. All browser-facing tests use mocked APIs; they do not prove real-world iPhone GPS accuracy, background tracking, or production hosting behavior.

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
