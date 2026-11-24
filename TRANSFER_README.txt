FIELDTRACK GITHUB TRANSFER PACKAGE — v13.2

1. Extract this ZIP in the iPhone Files app or on a computer.
2. Open https://github.com/hunter2026CA/FieldTrack
3. Choose Add file > Upload files.
4. Upload the files inside this extracted folder (not the ZIP itself). The files are at the top level; do not create an extra nested folder in the repository.
5. Commit message: Fix v13.2 navigation button initialization
6. Upload the full package contents so index.html is replaced and the v13 snapshot, updated documentation, and regression test are added.

The current app entry point is index.html. Keep README.md, DEVELOPMENT_NOTES.md, .gitignore, versioned HTML snapshots, and all test scripts. Do not upload personal hunting coordinates, private property data, credentials, API keys, or passwords.

The Land tab contains the official Nova Scotia Crown Land map-service overlay. It is a reference layer only and does not confirm access rights or hunting permission. The GeoJSON backup/restore controls are manual local file operations, not live hunter sharing.

This upload does not itself deploy the app. After committing, verify the GitHub Pages deployment and test the map, tabs, Crown Land layer, and GPS on an iPhone over HTTPS. External map/service availability and live device GPS have not been verified by the automated tests.
