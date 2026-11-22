const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/FieldTrack_Interactive_Prototype_v6.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const id of ['gpsAccuracy','gpsDistance','gpsPoints','gpsRecovery','trackStatus','startTrack','stopTrack','clearTrack']) assert(ids.includes(id), `missing ${id}`);
assert.equal((html.match(/addEventListener\('pagehide'/g) || []).length, 1, 'only one pagehide handler may own GPS suspension');
assert(!html.includes("window.addEventListener('pagehide',stopGpsTrack)"), 'legacy clean-stop pagehide handler must be removed');
assert(html.includes("type:'GPS track segment'"), 'GeoJSON exports continuous route segments separately');

const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
fs.writeFileSync('/tmp/fieldtrack-v6-inline.js', inline);
const blockStart = inline.indexOf('// GPS track state is checkpointed');
const blockEnd = inline.indexOf("$('startBoundary').onclick=", blockStart);
assert(blockStart >= 0 && blockEnd > blockStart, 'GPS block boundaries located');
const gpsBlock = inline.slice(blockStart, blockEnd);

function makeHarness(store = new Map()) {
  const elements = {};
  for (const id of ['gpsAccuracy','gpsDistance','gpsPoints','gpsRecovery','trackStatus','startTrack','stopTrack','clearTrack']) {
    elements[id] = { textContent: '', disabled: false, onclick: null };
  }
  const listeners = { window: {}, document: {} };
  let watchSuccess, watchError, watchId = 0;
  const clearedWatches = [];
  const ctx = {
    console, Date, Math, Number, JSON, Infinity, confirm: () => true,
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    saveLocal: (k, v) => { store.set(k, JSON.stringify(v)); return true; },
    $: id => elements[id],
    map: { removeLayer() {}, setView() {} },
    L: {
      polyline: () => ({ addTo() { return this; } }),
      circleMarker: () => ({ addTo() { return this; }, bindPopup() { return this; }, setLatLng() { return this; } }),
      circle: () => ({ addTo() { return this; }, setLatLng() { return this; }, setRadius() { return this; } })
    },
    locationMarker: null, accuracyCircle: null,
    navigator: { geolocation: {
      watchPosition: (ok, err) => { watchSuccess = ok; watchError = err; watchId += 1; return watchId; },
      clearWatch: id => clearedWatches.push(id)
    } },
    window: {
      isSecureContext: true,
      addEventListener: (name, fn) => { (listeners.window[name] ||= []).push(fn); }
    },
    document: {
      visibilityState: 'visible',
      addEventListener: (name, fn) => { (listeners.document[name] ||= []).push(fn); }
    }
  };
  vm.createContext(ctx);
  vm.runInContext('let trackPoints=[], trackLines=[], trackWatchId=null, pins=[], savedBoundary=null;', ctx);
  vm.runInContext(gpsBlock, ctx);
  return {
    ctx, elements, listeners, store, clearedWatches,
    getSuccess: () => watchSuccess,
    getError: () => watchError,
    fire: (target, name) => (listeners[target][name] || []).forEach(fn => fn())
  };
}

let h = makeHarness();
h.elements.startTrack.onclick();
assert.equal(h.elements.stopTrack.disabled, false, 'start enables stop');
assert.equal(JSON.parse(h.store.get('fieldtrack-track-session')).active, true, 'active state is checkpointed after watch starts');
const t = Date.now();
h.getSuccess()({ coords: { latitude: 44.0, longitude: -65.0, accuracy: 8 }, timestamp: t });
assert.equal(h.elements.gpsPoints.textContent, '1', 'first good fix recorded');
h.getSuccess()({ coords: { latitude: 44.00001, longitude: -65.0, accuracy: 120 }, timestamp: t + 5000 });
assert.equal(h.elements.gpsPoints.textContent, '1', 'weak accuracy fix rejected');
assert.equal(h.elements.gpsAccuracy.textContent, '±120 m', 'weak current accuracy remains visible instead of showing stale good accuracy');
h.getSuccess()({ coords: { latitude: 44.0002, longitude: -65.0, accuracy: 7 }, timestamp: t + 10000 });
assert.equal(h.elements.gpsPoints.textContent, '2', 'valid second fix recorded');
const distanceBeforeGap = Number(h.elements.gpsDistance.textContent.replace(/[^0-9.]/g, ''));
assert(distanceBeforeGap > 0, 'distance calculated for continuous segment');
h.getSuccess()({ coords: { latitude: 44.01, longitude: -65.0, accuracy: 5 }, timestamp: t + 11000 });
assert.equal(h.elements.gpsPoints.textContent, '2', 'implausible jump rejected inside a continuous segment');
assert.equal(h.listeners.window.pagehide.length, 1, 'single pagehide handler registered');
h.fire('window', 'pagehide');
let saved = JSON.parse(h.store.get('fieldtrack-track-session'));
assert.equal(saved.interrupted, true, 'pagehide preserves interrupted state');
assert.equal(saved.active, false, 'pagehide clears active state');
assert.equal(h.elements.startTrack.disabled, false, 'pagehide releases the UI start control');
assert.equal(h.clearedWatches.length, 1, 'pagehide clears the actual geolocation watch');
h.fire('window', 'beforeunload');
saved = JSON.parse(h.store.get('fieldtrack-track-session'));
assert.equal(saved.interrupted, true, 'second lifecycle event cannot overwrite interrupted checkpoint');

h = makeHarness(h.store);
assert(h.elements.gpsRecovery.textContent.includes('interrupted track was recovered'), 'reload offers recovery');
assert.equal(h.elements.gpsPoints.textContent, '2', 'reload restores existing points');
h.elements.startTrack.onclick();
h.getSuccess()({ coords: { latitude: 44.01, longitude: -65.0, accuracy: 6 }, timestamp: t + 20000 });
assert.equal(h.elements.gpsPoints.textContent, '3', 'recording resumes onto recovered route');
let points = vm.runInContext('trackPoints', h.ctx);
assert.equal(points[2].breakBefore, true, 'resumed fix starts a new route segment');
assert.equal(Number(h.elements.gpsDistance.textContent.replace(/[^0-9.]/g, '')), distanceBeforeGap, 'unknown travel during interruption is not added to recorded distance');
assert.equal(vm.runInContext('splitTrackSegments().length', h.ctx), 2, 'route gap creates a separate segment');
h.getSuccess()({ coords: { latitude: 44.0101, longitude: -65.0, accuracy: 6 }, timestamp: t + 30000 });
assert.equal(h.elements.gpsPoints.textContent, '4', 'next continuous fix is recorded');
assert(Number(h.elements.gpsDistance.textContent.replace(/[^0-9.]/g, '')) > distanceBeforeGap, 'distance resumes within the new segment');

h.elements.stopTrack.onclick();
saved = JSON.parse(h.store.get('fieldtrack-track-session'));
assert.equal(saved.interrupted, false, 'manual stop is saved as a clean stop');
h.elements.startTrack.onclick();
h.getSuccess()({ coords: { latitude: 44.0102, longitude: -65.0, accuracy: 5 }, timestamp: t + 40000 });
points = vm.runInContext('trackPoints', h.ctx);
assert.equal(points[4].breakBefore, true, 'manual stop/restart also creates a new segment');
const exportStart = inline.indexOf('function geojsonPayload()');
const exportEnd = inline.indexOf('function downloadGeojson', exportStart);
assert(exportStart >= 0 && exportEnd > exportStart, 'GeoJSON export function located');
vm.runInContext(inline.slice(exportStart, exportEnd), h.ctx);
const exported = vm.runInContext('geojsonPayload()', h.ctx);
const exportedLines = exported.features.filter(feature => feature.geometry?.type === 'LineString');
assert.equal(exportedLines.length, 2, 'GeoJSON exports each continuous multi-point segment as its own line');
assert(exportedLines.every(feature => feature.geometry.coordinates.length === 2), 'exported lines contain only their own continuous segment points');
h.ctx.document.visibilityState = 'hidden';
h.fire('document', 'visibilitychange');
saved = JSON.parse(h.store.get('fieldtrack-track-session'));
assert.equal(saved.interrupted, true, 'backgrounding checkpoints the route as interrupted');
assert.equal(h.elements.stopTrack.disabled, true, 'backgrounding stops the active watch UI');
h.ctx.document.visibilityState = 'visible';
h.fire('document', 'visibilitychange');
assert(h.elements.trackStatus.textContent.includes('does not automatically restart'), 'returning to foreground clearly asks for a manual GPS restart');

const crashStore = new Map();
let crash = makeHarness(crashStore);
crash.elements.startTrack.onclick();
crash.getSuccess()({ coords: { latitude: 45.0, longitude: -64.0, accuracy: 5 }, timestamp: t });
assert.equal(JSON.parse(crashStore.get('fieldtrack-track-session')).active, true, 'crash fixture has an active persisted session');
crash = makeHarness(crashStore);
saved = JSON.parse(crashStore.get('fieldtrack-track-session'));
assert.equal(saved.interrupted, true, 'startup detects a previously active session after an unclean process exit');
assert(crash.elements.gpsRecovery.textContent.includes('interrupted track was recovered'), 'unclean-exit recovery is shown');

console.log('PASS: unique IDs; single lifecycle owner; current weak accuracy display; GPS accuracy filter; valid fixes; jump rejection; active checkpoint; pagehide/beforeunload idempotence; watch cleanup; reload recovery; route segmentation; no false gap distance; manual stop/restart; background/foreground handling; crash recovery; actual segmented GeoJSON serialization.');
