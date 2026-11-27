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

## Current implementation gate

No map-engine migration or 3D UI has been applied in this spike. The next engineering step is a disposable MapLibre proof-of-concept using a vetted DEM/imagery source, while keeping the current Leaflet app untouched. The 4D mode remains unimplemented until its intended meaning and data source are defined.

## Isolated proof-of-concept added — 2026-11-27

`maplibre_3d_spike.html` now provides a separate Nova Scotia-centered MapLibre test page with a flat/3D terrain toggle and reset control. It uses MapLibre demo style and DEM endpoints strictly for evaluation. `index.html` remains unchanged. `test_maplibre_3d_spike.cjs` checks the source configuration and control wiring; it does not substitute for live browser/WebGL/device testing. Do not ship the demo endpoints in production.
