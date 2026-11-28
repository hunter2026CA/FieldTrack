# FieldTrack map views — technical spike (2026-11-27)

## Decision summary

- Keep the current **2D Leaflet map** as the default and the reliable fallback.
- Treat **3D terrain** as a separate rendering-engine evaluation, not a quick Leaflet layer toggle. MapLibre GL JS is the first candidate because its official API supports elevation-aware `raster-dem` sources and `map.setTerrain()`.
- Do not implement a **4D** mode until its meaning is confirmed. A common GIS interpretation is 3D plus time, but FieldTrack must not silently assume that this is what the user means.
- Do not add a paid tile/API dependency or promise a free operating model until data coverage, terms, quotas, hosting, and expected usage have been checked.

## What the current app actually uses

The v14.3 `index.html` creates one Leaflet map and uses raster tile layers for:

- Road map: OpenStreetMap standard raster tiles.
- Topographic map: OpenTopoMap-R raster tiles.
- Satellite imagery: Esri World Imagery raster tiles.
- Optional satellite labels: two Esri raster reference overlays for transportation and boundaries/places.
- Nova Scotia Crown Land: an Esri Leaflet dynamic map layer with a server-side blue translucent renderer.

Saved pins, the user-drawn property outline, GPS route, distance/area measurements, and elevation inspection are attached to the Leaflet map. Elevation inspection is a point lookup; it is **not** a terrain surface. The current app therefore has a working 2D map and elevation readout, but no actual 3D terrain renderer.

## Candidate 3D implementation

### Preferred technical spike: MapLibre GL JS

MapLibre's official 3D terrain example uses a `raster-dem` elevation source and `map.setTerrain()`; camera pitch makes the terrain relief visible. The source specification documents DEM encodings and source requirements:

- https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/
- https://maplibre.org/maplibre-style-spec/sources/

A contained prototype should test, in this order:

1. Flat 2D satellite rendering in MapLibre with a documented imagery source and attribution.
2. 3D terrain enabled/disabled with pitch and exaggeration initially set to realistic values (exaggeration 1.0).
3. A known DEM source with Nova Scotia coverage, published resolution/zoom limits, attribution, rate limits, and terms documented.
4. Re-rendering FieldTrack pins, the GPS route, user boundary, and distance/area geometry over the terrain.
5. Porting the Crown Land overlay. The current ArcGIS dynamic map layer is not automatically a drop-in MapLibre source; test an ArcGIS export/raster overlay or another supported service path before switching engines.
6. iPhone Safari performance, memory use, touch navigation, battery use, and fallback to 2D when WebGL/terrain tiles fail.

### Alternatives considered

- **CesiumJS:** capable 3D globe/terrain stack, but Cesium ion's current pricing page describes the free Community tier as personal/non-commercial use and lists paid commercial individual plans. That makes it a poor default for a public/commercial FieldTrack launch unless the licensing and cost model is resolved. https://cesium.com/platform/cesium-ion/pricing/
- **ArcGIS Maps SDK SceneView:** supports 3D scenes with elevation layers, including the World Elevation service, but basemap/elevation licensing and application terms must be reviewed before assuming it meets the no-monthly-subscription goal. https://developers.arcgis.com/javascript/latest/visualization/3d-visualization/terrain-rendering/ and https://developers.arcgis.com/javascript/latest/references/core/views/SceneView/

MapLibre is an open-source renderer, but that does **not** make every satellite or DEM tile source free for unrestricted production use. The imagery/elevation providers, hosting, traffic volume, and attribution obligations remain separate cost and terms questions.

## Proposed user-facing modes

| Mode | Intended behavior | Status |
|---|---|---|
| 2D | Current flat road/topographic/satellite map; remains default and fallback | Existing |
| 3D | Same hunt area with terrain relief, tilt/rotation controls, and FieldTrack overlays preserved | Planned; provider and migration spike required |
| 4D | Not specified yet. Possible GIS interpretation: a time dimension (for example, time-aware imagery or forecast snapshots), but do not assume this definition | Blocked on product definition and a suitable time-aware data source |

## Acceptance checks before release

- A hunter can switch 2D ↔ 3D without losing the selected map location, zoom, pins, saved boundary, or recorded route.
- Crown Land stays clearly distinguishable and retains its warning that map display is not proof of access or hunting permission.
- Satellite imagery, DEM tiles, and all overlays retain provider attribution and work within provider terms.
- 3D failure or unsupported hardware returns to 2D without losing local data.
- No API key or secret is embedded in a public client bundle unless the provider explicitly supports a restricted public key and its restrictions are configured.
- A realistic cost/usage estimate exists before describing the app as free of monthly operating costs.

## Initial implementation gate (before the v14.3.1 preview)

At the time of the first isolated spike, no map-engine migration or 3D UI had been applied. A disposable MapLibre proof-of-concept was created while keeping the Leaflet app untouched. The subsequent in-app preview and its remaining live-verification gates are documented below. The 4D mode remains unimplemented until its intended meaning and data source are defined.

## Isolated proof-of-concept added — 2026-11-27

`maplibre_3d_spike.html` now provides a separate Nova Scotia-centered MapLibre test page with a flat/3D terrain toggle and reset control. It uses MapLibre demo style and DEM endpoints strictly for evaluation. `index.html` remains unchanged. `test_maplibre_3d_spike.cjs` checks the source configuration and control wiring; it does not substitute for live browser/WebGL/device testing. Do not ship the demo endpoints in production.

## Confirmed product requirement — 2026-11-27

The user confirmed that **3D means real terrain relief**: hills, ridges, valleys, and mountains visibly rise from the map surface, with the camera able to tilt and rotate around the terrain. A flat satellite image merely pitched at an angle does not satisfy the requirement.

### Release verification gate after the v14.3.1 preview

- The main app now has a visible 2D / 3D map-mode control; 2D remains the default and fallback.
- The 3D preview uses a real `raster-dem` source and `setTerrain()`, not camera pitch alone, with pitch/rotation controls and selectable relief exaggeration.
- Saved stands/waypoints, user property boundary, GPS track/location, and measurement geometry are mirrored from the existing Leaflet state into MapLibre sources. The same local data remains authoritative.
- Crown Land is wired through an ArcGIS export-image source using the blue dynamic renderer, but the service/CORS/colour path is not live-tested. Do not claim 3D Crown Land parity until it is visibly confirmed on the hosted app.
- WebGL/library and DEM failures have a return-to-2D path. Verify that this works on real devices and does not clear local data.
- Test on iPhone Safari as well as desktop. A successful syntax/unit test is not proof of terrain tile coverage or mobile rendering.

**Release rule:** do not label the main app v14.4 until the 3D mode, Crown Land overlay, and fallback behavior are visibly verified on iPhone Safari. The current `maplibre_3d_spike.html` remains a separate demo; the main-app preview is in `index.html`.


## In-app terrain preview implementation — 2026-11-28

The isolated demo has now been followed by a contained alternate renderer in the main `index.html` preview (labelled v14.3.1, not v14.4):

- Leaflet remains the default 2D map and the authoritative local state holder. MapLibre is created only when the user selects 3D.
- 3D uses Esri World Imagery raster tiles draped over Mapzen/Tilezen Terrarium elevation tiles from the AWS Open Data `elevation-tiles-prod` bucket. The source is global and keyless, but the dataset registry links to Tilezen's provider-specific attribution requirements; it is not a guarantee of unlimited production service or zero operating cost.
- MapLibre renders hillshade and actual terrain elevation, exposes pitch/rotation controls, and offers 1.0×, 1.35×, 1.7× and 2.0× relief exaggeration. The user can return to 2D; camera center and zoom are carried across.
- Pins, the saved property outline, GPS track, current location, drawing previews, measurement shapes, imported features and user-loaded GeoJSON ownership features are mirrored from the existing Leaflet data into MapLibre GeoJSON sources. 3D clicks are routed into the existing Leaflet map-click handler.
- Crown Land is attempted in 3D through the same ArcGIS MapServer dynamic renderer, requested as a PNG32 export image per Web Mercator tile. This URL construction and layer wiring are statically checked only; CORS, dynamic export behavior, visual colour/opacity and live service performance still require a real browser test. The 2D Crown Land layer remains the fallback.
- WebGL/library unavailability prevents the switch; terrain source failures return to 2D. A failed Crown export is reported separately and does not clear local data.

### Terrain resolution finding

The AWS Open Data Registry describes Terrain Tiles as a global bare-earth elevation dataset on S3 and links to Tilezen's attribution document. Tilezen's source inventory identifies the Canadian Digital Elevation Model as the Canada source, with variable native resolution; its source table lists Canada at about 30 m nominal around zoom 12, and notes that higher zoom levels can oversample the underlying data. This is enough for regional hills and valleys, not dependable fine-scale ridges, ditches or small creek banks.

Nova Scotia's official Elevation Explorer documents downloadable LiDAR point clouds and derived DEM, DSM and hillshade products. Its published history includes South West Nova Scotia and Shelburne/Queens coverage in 2018/2019, but exact tile coverage, freshness, vertical datum, redistribution terms and a browser-ready service must be checked for the user's actual hunt areas. The next terrain-quality step is to inspect those tiles and establish whether a public image/tile service exists or whether a compliant conversion/hosting path is needed.

### Verification boundary

`test_3d_terrain_integration.cjs` checks the main-app wiring, source definitions, data synchronization hooks, mode handoff/fallback and inline syntax. It is not a live map test. The container had no outbound DNS/network access during this run, so imagery/DEM/Crown requests could not be fetched. No iPhone Safari/WebGL check or GitHub Pages deployment was performed. The main app must not be labelled v14.4 until those checks, especially Crown Land parity, pass.
