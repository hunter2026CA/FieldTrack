# FieldTrack — reference screenshot feature inventory

This file records the feature ideas visible in the four reference screenshots supplied for FieldTrack. It separates work already in the prototype from ideas that need data-source, licensing, privacy, or architecture review. It is not a claim that every screenshot feature is implemented.

## Already implemented or advanced in v14.2

- **iTrack / GPS route:** local device GPS recording and recovery, with a live speedometer in km/h (kph), mph, or knots.
- **Crown Land reference overlay:** official Nova Scotia Crown Land map service. v14.2 requests a translucent blue renderer; final colour still requires confirmation on the hosted app. It does not prove public access or permission to hunt.
- **Measure distance:** two-point distance and bearing measurement.
- **Measure area:** temporary polygon measurement with m², hectares, and acres.
- **Wind & Weather:** current conditions, fixed north/wind compass, and on-demand 24-hour wind speed/gust/direction forecast. The requested 7-day forecast is still pending.
- **Satellite map labels:** optional road and place-name overlays.
- **My map locations:** saved stands and waypoints, user-drawn property boundary, GPS route, and manual GeoJSON backup/restore.


## User-requested additions still to implement

- **Seven-day wind forecast:** expand the Weather tab from its current 24-hour hourly view to a seven-day outlook, keeping wind direction (FROM), speed, and gusts clear and distinguishing daily summaries from hourly values.
- **2D / 3D terrain views:** add selectable map-view modes so the user can switch between standard 2D mapping and a 3D terrain perspective. Validate the chosen elevation/terrain provider and mobile performance before promising offline or unrestricted use.
- **Harvest log:** record harvested wildlife such as deer and ducks, including species/breed, quantity, date/time, GPS location/coordinates, notes, season records, and an attached photo for each entry. Keep entries private to the user's device/account unless a separate sharing feature is explicitly approved.
- **LandZone (duck hunting):** build this as a duck-hunting approach aid that uses wind direction to indicate/predict the direction ducks are likely to approach from. It is not a land-ownership, property-boundary, or Crown Land feature.

## Compatible ideas to evaluate next

### Mapping and land overlays

- **HuntZone / My Hunt Areas:** named saved hunt-area polygons, separate from a legal property boundary.
- **Property Info, Hunting Lands, Public Lands:** investigate authoritative Nova Scotia parcel/ownership/access datasets and the conditions under which they may be displayed. Never infer legal access from colour alone.
- **Rut and habitat layers:** whitetail, mule deer, blacktail, elk rut timing; whitetail habitat; tree cover. These require region-appropriate data and careful labels. Do not present U.S.-specific layers as accurate for Nova Scotia without validation.
- **Offline maps:** assess tile-provider licensing, download size, storage limits, and safe update behavior before implementation.

### Weather and hunting conditions

- **Temperature, precipitation, radar, snow accumulation:** possible future map overlays after choosing providers and verifying update frequency, coverage, attribution, and terms.
- **Wildfire current/outlook and drought monitor:** investigate reliable public feeds and Nova Scotia coverage.
- **Activity Forecast and Solunar:** evaluate a transparent, location/date-based calculation and explain that activity predictions are estimates, not guarantees.

### Other dashboard ideas

- **News Feed, Gear Store, Command Account:** not core to the agreed first version; defer until the map, offline behavior, and data costs are settled.
- **Friends / social features:** defer; do not silently introduce a social network or tracking directory.

## Explicit product constraints

- **Do not add group chat or a Group Board.**
- **Do not add shared trail-camera photo uploads.** A local trail-camera waypoint type remains acceptable.
- Live multi-hunter location sharing, if ever reconsidered, requires opt-in consent, authentication, secure hosting, and a cost review.
- Keep the goal of avoiding a mandatory monthly subscription, but do not promise it until map tiles, weather, storage, hosting, and any backend costs and terms are validated.

## Priority order

1. Make the map-first core reliable on the user's iPhone: tabs, saved data, GPS, boundaries, Crown Land, labels, and weather.
2. Validate public data sources for Nova Scotia land ownership, habitat, and weather layers.
3. Add named hunt areas, solunar/activity information, and offline map support only after their data and operating requirements are clear.
4. Keep non-core commerce/news/social features out of the first usable version.
