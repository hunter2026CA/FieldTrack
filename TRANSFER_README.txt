FIELDTRACK GITHUB TRANSFER PACKAGE — v14.0

1. Extract this ZIP in the iPhone Files app or on a computer.
2. Open https://github.com/hunter2026CA/FieldTrack
3. Choose Add file > Upload files.
4. Upload the files inside this extracted folder (not the ZIP itself). The files are at the top level; do not create an extra nested folder in the repository.
5. Commit message: Add v14 map labels, wind forecast, and field tools
6. Upload the full package contents so index.html is replaced and the v14 snapshot, updated documentation, feature inventory, and regression tests are added.

The current app entry point is index.html. Keep README.md, DEVELOPMENT_NOTES.md, FEATURE_BACKLOG_v14.md, .gitignore, versioned HTML snapshots, and all test scripts. Do not upload personal hunting coordinates, private property data, credentials, API keys, or passwords.

The Tracking tab now supports km/h (kph), mph, and knots, with live, maximum, and average GPS speed. The Land tab adds satellite road/place labels, a blue translucent Nova Scotia Crown Land overlay, a map legend, and area measurement. The Weather tab adds an on-demand 24-hour wind forecast.

Crown Land is a reference layer only and does not confirm access rights or hunting permission. Orange triangles are shown in the legend as base-map symbols whose exact source/meaning remains unverified. Area measurement is approximate and is not a legal survey. Weather is modelled forecast data; local wind can differ.

The app does not add group chat or shared trail-camera photo uploads. Map backup/restore remains a manual local file operation, not live hunter sharing.

This upload does not itself deploy the app. After committing, verify the GitHub Pages deployment and test the map, tabs, satellite labels, Crown Land rendering, wind forecast, area measurement, and GPS tracking on an iPhone over HTTPS. External map/service availability and live device GPS have not been verified by automated tests.
