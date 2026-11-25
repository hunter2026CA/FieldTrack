const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const id of ['satelliteLabels','measureArea','finishArea','undoArea','cancelArea','areaStatus','Map legend']) {
  if (id !== 'Map legend') assert(ids.has(id), `missing map control ${id}`);
}
assert(html.includes('Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'), 'road label tile layer must be configured');
assert(html.includes('Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'), 'place label tile layer must be configured');
assert(html.includes("$('maptype').value==='sat'&&$('satelliteLabels').checked"), 'labels should only show on satellite when enabled');
assert(html.includes("localStorage.setItem('fieldtrack-satellite-labels',String(e.target.checked))"), 'label preference should persist');

const update = inline.match(/function updateSatelliteLabels\(\)\{[\s\S]*?\n(?=\$\('satelliteLabels'\)\.checked)/);
assert(update, 'satellite label updater must exist');
const active = new Set();
const map = { hasLayer: layer => active.has(layer), addLayer: layer => active.add(layer), removeLayer: layer => active.delete(layer) };
const state = { maptype: { value: 'sat' }, satelliteLabels: { checked: true } };
const makeLayer = name => ({ name, addTo(target) { target.addLayer(this); return this; } });
const ctx = { map, $: id => state[id], satelliteRoadLabels: makeLayer('roads'), satellitePlaceLabels: makeLayer('places') };
vm.runInNewContext(update[0], ctx);
ctx.updateSatelliteLabels();
assert.equal(active.size, 2, 'both label overlays should show on satellite');
state.satelliteLabels.checked = false;
ctx.updateSatelliteLabels();
assert.equal(active.size, 0, 'turning labels off should remove both overlays');
state.satelliteLabels.checked = true;
state.maptype.value = 'street';
ctx.updateSatelliteLabels();
assert.equal(active.size, 0, 'labels must remain hidden on the road map');

assert(html.includes('dynamicLayers:[{id:0,source:{type:\'mapLayer\',mapLayerId:0}'), 'Crown Land style override must target official layer 0');
assert(html.includes('color:[39,137,215,82]'), 'Crown Land fill should be blue with about 68% transparency');
assert(html.includes('color:[19,85,151,230]'), 'Crown Land outline should be a darker blue');
assert(html.includes('<h3>Map legend</h3>'), 'Land tab must include a map legend');
assert(html.includes('exact source and meaning are not verified'), 'orange triangle legend must preserve uncertainty');
assert(html.includes('not FieldTrack pins or Crown Land indicators'), 'orange triangles must not be misidentified as app data');
assert(html.includes("'Map legend','Map backup &amp; restore'" ) || html.includes("'Map legend','Map backup & restore'"), 'map legend should be accessible from Land tab');
console.log('PASS: satellite road/place label overlays toggle only on satellite, Crown Land uses blue translucent symbology, and legend explains known/unknown map symbols.');
