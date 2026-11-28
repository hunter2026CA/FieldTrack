const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync(new URL('./index.html', `file://${__filename}`), 'utf8');

// The main app, not only the disposable spike, must contain the 3D mode.
for (const id of ['map3d', 'quick3d', 'show2d', 'show3d', 'mapModeStatus', 'terrainStatus', 'terrainRelief', 'hillshadeToggle']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing ${id}`);
}
assert.match(html, /maplibre-gl@5\.6\.2\/dist\/maplibre-gl\.js/);
assert.match(html, /type:'raster-dem'/);
assert.match(html, /encoding:'terrarium'/);
assert.match(html, /elevation-tiles-prod\/terrarium\/\{z\}\/\{x\}\/\{y\}\.png/);
assert.match(html, /World_Imagery\/MapServer\/tile/);
assert.match(html, /map3dMap\.setTerrain\(\{source:'ft-dem',exaggeration:/);
assert.match(html, /ft-hillshade-layer/);
assert.match(html, /hillshadeToggle/);
assert.match(html, /crownLandServiceUrl\+'\/export\?bbox=\{bbox-epsg-3857\}/);
assert.match(html, /ft-crown-layer/);
assert.match(html, /ft-pins-circles/);
assert.match(html, /ft-boundary-line/);
assert.match(html, /ft-track-line/);
assert.match(html, /ft-location-circle/);
assert.match(html, /ft-imported/);
assert.match(html, /ft-ownership/);
assert.match(html, /map\.fire\('click',\{latlng:ll/);
assert.match(html, /map3dMap\.getCenter\(\)/);
assert.match(html, /map\.setView\(\[center\.lat,center\.lng\]/);
assert.match(html, /maplibregl\.supported\(\)/);
assert.match(html, /Returned to the 2D map/);
assert.doesNotMatch(html, /demotiles\.maplibre\.org/);
assert.match(html, /v14\.3\.1 • terrain preview/);

// Every literal DOM lookup in the main script must resolve to a unique element.
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'duplicate HTML IDs');
const lookups = [...html.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
for (const id of new Set(lookups)) assert.ok(ids.includes(id), `DOM lookup #${id} has no element`);

// Compile the actual inline application script to catch syntax errors.
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inlineScripts.length, 1, 'expected one inline app script');
assert.doesNotThrow(() => new Function(inlineScripts[0][1]));

// Ensure all core saved overlays are synchronized when their Leaflet data changes.
for (const fn of ['drawPins', 'renderBoundary', 'drawTrack', 'updateGpsOverlay']) {
  const start = html.indexOf(`function ${fn}(`);
  assert.notEqual(start, -1, `missing ${fn}`);
  const next = html.indexOf('\nfunction ', start + 10);
  const body = html.slice(start, next < 0 ? html.length : next);
  assert.match(body, /syncMapLibreOverlays/ , `${fn} does not synchronize the 3D overlay`);
}

console.log('PASS: integrated 2D/3D terrain mode, satellite + Terrarium DEM, hillshade, Crown Land and hunting-overlay wiring, camera handoff/fallback, unique DOM IDs, and inline JavaScript syntax.');
