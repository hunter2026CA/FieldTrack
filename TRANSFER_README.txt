FIELDTRACK — v14.3.1 TERRAIN PREVIEW PACKAGE

What changed
- The main app (index.html) now has a 2D / 3D terrain switch.
- 2D Leaflet remains the default and fallback.
- 3D uses satellite imagery over real elevation-driven terrain, with tilt/rotation controls, hillshade, and selectable relief exaggeration.
- Saved pins, user-drawn property boundaries, GPS route/location, measurement shapes, imported GeoJSON and user-loaded ownership features are mirrored into the 3D view.
- Crown Land is requested in 3D through the provincial MapServer export endpoint, but this has NOT been live-tested. If that layer fails in 3D, the 2D map remains available.

Important status
This is a v14.3.1 PREVIEW, not v14.4 and not a production release. The 19 automated Node tests passed, but they are static/mocked checks. Live imagery/DEM/Crown Land requests, iPhone Safari/WebGL performance, GPS behavior, and GitHub Pages deployment still need to be checked. The global DEM is regional-scale elevation, not property-scale LiDAR. Nova Scotia LiDAR coverage needs tile-by-tile verification.

How to upload to the existing GitHub repository from iPhone
1. Extract this ZIP in the iPhone Files app.
2. Open https://github.com/hunter2026CA/FieldTrack
3. Choose Add file > Upload files.
4. Upload the extracted top-level contents so index.html is replaced. Keep the README, DEVELOPMENT_NOTES, MAP_VIEWS_TECHNICAL_SPIKE, FEATURE_BACKLOG_v14, test scripts, and versioned snapshots.
5. Suggested commit message: Add integrated 3D terrain preview (v14.3.1; not release v14.4).
6. After the commit and Pages rebuild, open the hosted app on iPhone over HTTPS. Confirm the 2D/3D switch, terrain relief, rotation, saved pins/boundary/route, Crown Land visibility, and return-to-2D behavior.

Do not upload private hunting coordinates, personal property data, passwords, API keys, or other secrets. This package contains no user-specific hunting locations or credentials.

Cost note
The use of MapLibre itself does not make all data providers free for unlimited commercial use. Imagery, elevation, Crown Land service usage, hosting, quotas, and attribution/terms still need review before promising a permanently free no-subscription app.

Scope remains unchanged: no group chat and no shared trail-camera photo uploads.
