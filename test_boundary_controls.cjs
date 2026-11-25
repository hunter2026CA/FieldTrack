const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const id of ['startBoundary', 'finishBoundary', 'undoBoundary', 'cancelBoundary', 'fitBoundary', 'clearBoundary', 'boundaryStatus']) {
  assert(ids.includes(id), `missing boundary control: ${id}`);
}
assert(/id="finishBoundary" disabled/.test(html), 'finish must start disabled');
assert(/id="undoBoundary" disabled/.test(html), 'undo must start disabled');
assert(/id="cancelBoundary" disabled/.test(html), 'cancel must start disabled');
assert(/id="fitBoundary" disabled/.test(html), 'fit must start disabled until a valid boundary exists');
assert(html.includes("$('fitBoundary').onclick=()=>{if(!fitSavedBoundary())"), 'fit button must invoke the saved-boundary fit action');
assert(html.includes("$('undoBoundary').onclick=undoBoundaryPoint"), 'undo button must call its handler');
assert(html.includes("$('cancelBoundary').onclick=cancelBoundaryDrawing"), 'cancel button must call its handler');
assert(html.includes("cancelBoundaryDrawing();cancelAreaMeasurement();mode='pin'"), 'switching to pin mode must cancel unfinished boundary and area measurements');
assert(html.includes("cancelBoundaryDrawing();cancelAreaMeasurement();mode='measure'"), 'switching to distance mode must cancel unfinished boundary and area measurements');
assert(html.includes('boundaryPoints.push(ll);refreshBoundaryPreview()'), 'map taps must refresh the boundary preview');

const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(script => script.trim()).join('\n');
new vm.Script(inline, { filename: 'FieldTrack index.html inline JavaScript' });

const helperStart = inline.indexOf('function validBoundaryPoints(points)');
const helperEnd = inline.indexOf('\nrenderBoundary();', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'boundary helper block must be present');

const elements = {
  undoBoundary: { disabled: true },
  cancelBoundary: { disabled: true },
  finishBoundary: { disabled: true },
  boundaryStatus: { textContent: '' },
  fitBoundary: { disabled: true },
  startBoundary: { classList: { removed: false, remove() { this.removed = true; } } }
};
const calls = { markers: 0, lines: 0, removedLayers: 0, polygons: 0, fitBounds: null };
const ctx = {
  boundaryPoints: [], boundaryPreview: null, boundaryLayer: null,
  savedBoundary: [[44, -65], [44.1, -65], [44.1, -65.1]], mode: 'boundary',
  map: { removeLayer() { calls.removedLayers += 1; }, fitBounds(bounds, options) { calls.fitBounds = { bounds, options }; } },
  $: id => elements[id],
  L: {
    circleMarker() { calls.markers += 1; return { addTo() { return this; } }; },
    polyline() { calls.lines += 1; return { addTo() { return this; } }; },
    polygon(points) { calls.polygons += 1; return { points, addTo() { return this; } }; },
    latLngBounds(points) { return { points, isValid() { return points.length >= 3; } }; }
  }
};
vm.createContext(ctx);
vm.runInContext(inline.slice(helperStart, helperEnd), ctx);

const point = (lat, lng) => ({ lat, lng });
assert.equal(vm.runInContext('boundaryCanFinish([])', ctx), false);
assert.equal(vm.runInContext('boundaryCanFinish([{}, {}])', ctx), false);
assert.equal(vm.runInContext('boundaryCanFinish([{}, {}, {}])', ctx), true);
assert.equal(vm.runInContext('validBoundaryPoints([[44,-65],[44.1,-65],[44.1,-65.1]])', ctx), true);
assert.equal(vm.runInContext('validBoundaryPoints([[91,-65],[44.1,-65],[44.1,-65.1]])', ctx), false, 'invalid latitude must not be treated as a saved boundary');
assert.equal(elements.fitBoundary.disabled, true, 'fit starts disabled before rendering a saved boundary');
ctx.renderBoundary();
assert.equal(elements.fitBoundary.disabled, false, 'fit enables for a valid saved boundary');
assert.equal(vm.runInContext('fitSavedBoundary()', ctx), true, 'valid saved boundary can be fitted');
assert.deepEqual(calls.fitBounds.bounds.points, [[44,-65],[44.1,-65],[44.1,-65.1]]);
assert.deepEqual(calls.fitBounds.options, { padding: [36,36], maxZoom: 17 });
ctx.savedBoundary = [[91,-65],[44.1,-65],[44.1,-65.1]];
ctx.updateBoundaryFitControl();
assert.equal(elements.fitBoundary.disabled, true, 'fit disables for invalid saved coordinates');
assert.equal(vm.runInContext('fitSavedBoundary()', ctx), false, 'invalid saved boundary is not fitted');
ctx.savedBoundary = [[44,-65],[44.1,-65],[44.1,-65.1]];
ctx.updateBoundaryFitControl();

ctx.boundaryPoints = [point(44, -65)];
ctx.refreshBoundaryPreview();
assert.equal(calls.markers, 1, 'a first point should be visible as a marker');
assert.equal(elements.undoBoundary.disabled, false, 'undo enables after the first point');
assert.equal(elements.cancelBoundary.disabled, false, 'cancel enables while drawing');
assert.equal(elements.finishBoundary.disabled, true, 'finish stays disabled before three points');

ctx.boundaryPoints = [point(44, -65), point(44.01, -65.01), point(44.02, -65.02)];
ctx.refreshBoundaryPreview();
assert.equal(calls.lines, 1, 'multiple points should render a preview line');
assert.equal(elements.finishBoundary.disabled, false, 'finish enables at three points');
assert.equal(ctx.undoBoundaryPoint(), true, 'undo removes the most recent point');
assert.equal(ctx.boundaryPoints.length, 2);
assert.equal(elements.finishBoundary.disabled, true, 'undoing below three points disables finish again');
assert.equal(ctx.undoBoundaryPoint(), true);
assert.equal(ctx.undoBoundaryPoint(), true);
assert.equal(ctx.boundaryPoints.length, 0);
assert.equal(ctx.undoBoundaryPoint(), false, 'undo on an empty boundary is harmless');

ctx.boundaryPoints = [point(44, -65), point(44.01, -65.01), point(44.02, -65.02)];
ctx.refreshBoundaryPreview();
const savedBeforeCancel = JSON.stringify(ctx.savedBoundary);
assert.equal(ctx.cancelBoundaryDrawing(), true, 'cancel exits boundary drawing mode');
assert.equal(ctx.mode, 'pin');
assert.equal(ctx.boundaryPoints.length, 0);
assert.equal(JSON.stringify(ctx.savedBoundary), savedBeforeCancel, 'cancel leaves the previously saved boundary untouched');
assert.equal(elements.cancelBoundary.disabled, true);
assert.equal(elements.finishBoundary.disabled, true);
assert.equal(elements.undoBoundary.disabled, true);
assert.equal(elements.startBoundary.classList.removed, true, 'cancel clears the active button state');
assert.equal(ctx.cancelBoundaryDrawing(), false, 'cancel outside boundary mode is harmless');

console.log('PASS: v9 boundary controls, unique IDs, inline JavaScript syntax, 3-point finish threshold, preview rendering, undo, cancel, saved-boundary preservation, coordinate validation, and zoom-to-boundary behavior.');
