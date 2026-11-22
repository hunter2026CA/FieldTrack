# FieldTrack

A map-first hunting companion prototype focused on GPS maps, user-drawn property boundaries, saved stands and waypoints, on-device route recording, and wind/weather information.

## Current status

- Current app entry point: **v10** (`index.html`)
- Versioned snapshots: `FieldTrack_Interactive_Prototype_v10.html`, `FieldTrack_Interactive_Prototype_v9.html`, `FieldTrack_Interactive_Prototype_v8.html`, `FieldTrack_Interactive_Prototype_v7.html`, and `FieldTrack_Interactive_Prototype_v6.html`.
- Automated checks: `test_saved_locations.cjs` covers current v10 named stands/waypoints; `test_boundary_controls.cjs` covers the v9 boundary workflow; `test_gps_v10.cjs` checks the current v10 GPS implementation; `test_gps_v9.cjs`, `test_gps_v7.cjs`, and `test_gps_v6.cjs` are historical regression checks for the archived versions they name.
- This is a browser prototype, not yet a production mobile app.

## Run locally

Open `index.html` in a modern browser. Map tiles and weather/elevation lookups require an internet connection. Browser geolocation generally requires HTTPS or localhost and the user's permission.

## Run automated checks

Requires Node.js 18 or newer. From the project root:

```sh
node --check test_boundary_controls.cjs
node --check test_gps_v9.cjs
node --check test_gps_v10.cjs
node --check test_saved_locations.cjs
node test_saved_locations.cjs
node test_boundary_controls.cjs
node test_gps_v10.cjs
node test_gps_v9.cjs
node test_gps_v7.cjs
node test_gps_v6.cjs
```

The v6/v7/v9 GPS suites test their matching historical HTML snapshots. The v10 GPS suite exercises the current `index.html` GPS implementation. The boundary test checks the v9 boundary helper logic; the saved-location test covers v10 naming, filtering, editing, validation, escaping, and GeoJSON name round-trip wiring. All browser-facing tests use mocked APIs; they do not prove real-world iPhone GPS accuracy, background tracking, or production hosting behavior.

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
