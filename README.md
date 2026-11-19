# FieldTrack

A map-first hunting companion prototype focused on GPS maps, user-drawn property boundaries, saved stands and waypoints, on-device route recording, and wind/weather information.

## Current status

- Current prototype: **v7** (`index.html`)
- Historical v6 and v7 HTML test fixtures are retained for regression checks.
- Automated GPS regression tests are included as `test_gps_v6.cjs` and `test_gps_v7.cjs`.
- This is a browser prototype, not yet a production mobile app.

## Run locally

Open `index.html` in a modern browser. Map tiles and weather/elevation lookups require an internet connection. Browser geolocation generally requires HTTPS or localhost and the user's permission.

## Run automated tests

Requires Node.js 18 or newer. From the repository root:

```sh
node --check test_gps_v6.cjs
node --check test_gps_v7.cjs
node test_gps_v6.cjs
node test_gps_v7.cjs
```

The tests use mocked browser APIs. They do not prove real-world iPhone GPS accuracy, background tracking, or production hosting behavior.

## Agreed product scope

Included: GPS hunting maps, property boundary mapping, saved stands and waypoints, hunter location tracking, and wind/weather features.

Explicitly excluded: group chat and shared trail-camera photo uploads.

Multi-hunter live location sharing is not yet implemented; it requires HTTPS hosting, authentication, explicit location-sharing consent, and a suitable backend.

## Privacy and data

The current prototype stores map state, pins, and route checkpoints in the current browser/device. Do not commit personal hunting coordinates, private property data, API secrets, passwords, or tokens to this repository.

## Cost goal

The project aims to avoid a mandatory monthly subscription. Hosting, map tiles, weather services, storage, and real-time location infrastructure must be evaluated for terms, usage limits, and operating costs before that can be promised.

## Development workflow

Make changes on a feature branch where practical, run the checks above, review the diff, and merge only tested changes into the default branch. Use Git history to preserve milestones and roll back regressions.
