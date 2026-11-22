const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const id of ['gpsAccuracy','gpsDistance','gpsPoints','gpsRecovery','trackStatus','gpsSignal','gpsLastFix','startTrack','stopTrack','clearTrack']) assert(ids.includes(id), `missing ${id}`);
assert(html.includes("localStorage.getItem('fieldtrack-last-gps-fix')"), 'last GPS fix must restore independently of route points');
assert(html.includes("saveLocal('fieldtrack-last-gps-fix',lastGpsFix)"), 'each valid fix must checkpoint last known location');
assert(html.includes('Last known GPS fix — not live'), 'restored map marker must be labelled as not live');
assert.equal((html.match(/addEventListener\('pagehide'/g) || []).length, 1, 'only one pagehide handler may own GPS suspension');
assert(html.includes("type:'GPS track segment'"), 'GeoJSON exports continuous route segments separately');

const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
fs.writeFileSync('/tmp/fieldtrack-v10-inline.js', inline);
const blockStart = inline.indexOf('// GPS track state is checkpointed');
const blockEnd = inline.indexOf("$('startBoundary').onclick=", blockStart);
assert(blockStart >= 0 && blockEnd > blockStart, 'GPS block boundaries located');
const gpsBlock = inline.slice(blockStart, blockEnd);

function makeHarness(store = new Map()) {
  const elements = {};
  for (const id of ['gpsAccuracy','gpsDistance','gpsPoints','gpsRecovery','trackStatus','gpsSignal','gpsLastFix','startTrack','stopTrack','clearTrack']) {
    elements[id] = { textContent: '', disabled: false, onclick: null };
  }
  const listeners = { window: {}, document: {} };
  let watchSuccess, watchError, watchId = 0;
  const clearedWatches = [];
  const overlays = { marker: null, circle: null };
  const marker = () => ({
    latlng: null, popup: null,
    addTo() { return this; }, bindPopup(value) { this.popup = value; return this; },
    setLatLng(value) { this.latlng = value; return this; },
    setPopupContent(value) { this.popup = value; return this; }
  });
  const circle = () => ({
    latlng: null, radius: null,
    addTo() { return this; }, setLatLng(value) { this.latlng = value; return this; },
    setRadius(value) { this.radius = value; return this; }
  });
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
      circleMarker: (ll) => { overlays.marker = marker(); overlays.marker.latlng = ll; return overlays.marker; },
      circle: (ll, options) => { overlays.circle = circle(); overlays.circle.latlng = ll; overlays.circle.radius = options?.radius ?? null; return overlays.circle; }
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
    ctx, elements, listeners, store, clearedWatches, overlays,
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
assert.equal(h.elements.gpsSignal.textContent, 'Excellent', 'fix quality classifies an accurate fix');
assert.equal(JSON.parse(h.store.get('fieldtrack-last-gps-fix')).accuracy, 8, 'last fix is saved separately');
h.getSuccess()({ coords: { latitude: 44.00001, longitude: -65.0, accuracy: 120 }, timestamp: t + 5000 });
assert.equal(h.elements.gpsPoints.textContent, '1', 'weak accuracy fix is not added to route');
assert.equal(h.elements.gpsAccuracy.textContent, '±120 m', 'weak current accuracy remains visible');
assert.equal(h.elements.gpsSignal.textContent, 'Poor', 'weak fix is explicitly classified as poor');
assert.equal(h.overlays.circle.radius, 120, 'uncertainty circle expands to show weak-fix radius');
assert.deepEqual(h.overlays.marker.latlng, [44.00001, -65.0], 'last-known map marker follows weak fix without recording it');
assert.equal(JSON.parse(h.store.get('fieldtrack-last-gps-fix')).accuracy, 120, 'weak fix is checkpointed independently of the route');
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
assert.equal(h.elements.gpsAccuracy.textContent, '±7 m', 'reload restores last accepted route accuracy');
assert(h.elements.gpsLastFix.textContent !== '—', 'reload restores the last fix time');
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

// Weak fixes survive a page interruption and return as a clearly-labelled, non-live last-known marker.
const weakStore = new Map();
let weak = makeHarness(weakStore);
weak.elements.startTrack.onclick();
weak.getSuccess()({ coords: { latitude: 45.0, longitude: -64.0, accuracy: 145 }, timestamp: t });
assert.equal(weak.elements.gpsPoints.textContent, '0', 'weak-only fix does not create a route point');
weak.fire('window', 'pagehide');
weak = makeHarness(weakStore);
assert.equal(weak.elements.gpsAccuracy.textContent, '±145 m', 'weak last-known accuracy survives reload even without route points');
assert.equal(weak.elements.gpsSignal.textContent, 'Last known · Poor', 'restored signal is not misrepresented as live');
assert(weak.overlays.marker && weak.overlays.marker.popup === 'Last known GPS fix — not live', 'restored map marker is explicitly non-live');
assert.equal(weak.overlays.circle.radius, 145, 'restored uncertainty radius is retained');

// Permission and stale-fix states are visible and do not fabricate a current route point.
let errHarness = makeHarness();
errHarness.elements.startTrack.onclick();
errHarness.getError()({ code: 1 });
assert.equal(errHarness.elements.gpsSignal.textContent, 'Permission denied', 'permission denial is explicit');
let staleHarness = makeHarness();
staleHarness.elements.startTrack.onclick();
staleHarness.getSuccess()({ coords: { latitude: 46.0, longitude: -63.0, accuracy: 8 }, timestamp: t - 180000 });
assert.equal(staleHarness.elements.gpsSignal.textContent, 'Stale', 'stale fix is identified');
assert.equal(staleHarness.elements.gpsPoints.textContent, '0', 'stale fix is not recorded');

console.log('PASS: v10 GPS quality classification; weak-fix location/uncertainty display without route recording; independent last-fix checkpoint; restored non-live marker; restored accuracy/time; route recording/recovery/segmentation; jump and stale filtering; permission status; lifecycle suspension; segmented GeoJSON; unique HTML IDs.');
