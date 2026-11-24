const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const id of ['pinName', 'pinNote', 'pinSearch', 'pinFilter', 'savedPinSummary', 'savedPinList']) {
  assert(ids.includes(id), `missing saved-location control: ${id}`);
}
assert(/id="pinName" maxlength="48"/.test(html), 'location names must have a 48-character input limit');
assert(/id="pinNote" maxlength="280"/.test(html), 'field notes must have a 280-character input limit');
assert(html.includes("name:$('pinName').value"), 'new map pins must save the supplied location name');
assert(html.includes("properties:{id:p.id,name:p.name||'',type:p.type,note:p.note,time:p.time}"), 'GeoJSON export must retain location names');
assert(html.includes("name:p.name||'',type:p.type||'Imported waypoint'"), 'GeoJSON import must restore location names');
assert(/#map\{position:absolute;inset:0;width:100%;height:100%;min-height:0;z-index:1\}/.test(html), 'the map must fill the main viewport behind the bottom navigation');

const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(script => script.trim()).join('\n');
new vm.Script(inline, { filename: 'FieldTrack index.html inline JavaScript' });

function extract(start, end) {
  const a = inline.indexOf(start);
  const b = inline.indexOf(end, a);
  assert(a >= 0 && b > a, `could not locate ${start}`);
  return inline.slice(a, b);
}

const elements = {
  pinSearch: { value: '' },
  pinFilter: { value: 'all' },
  savedPinSummary: { textContent: '' },
  savedPinList: { innerHTML: '' }
};
let idCounter = 0;
let drawCalls = 0;
const promptAnswers = [];
const ctx = {
  pins: [],
  $: id => elements[id],
  makePinId: () => `test-pin-${++idCounter}`,
  prompt: () => promptAnswers.length ? promptAnswers.shift() : null,
  drawPins: () => { drawCalls += 1; },
  esc: value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
vm.createContext(ctx);
vm.runInContext(extract('function normalizePin(p)', '\nfunction savePins()'), ctx);
vm.runInContext(extract('function renderPinList()', '\nfunction drawPins()'), ctx);
vm.runInContext(extract('function editPinDetails(index)', '\nwindow.deletePin='), ctx);

const valid = vm.runInContext(`normalizePin({lat:'44.1',lng:'-65.2',name:'  North Ridge  ',type:'Hunting stand',note:'Old logging road'})`, ctx);
assert.equal(valid.lat, 44.1, 'numeric latitude strings should normalize');
assert.equal(valid.lng, -65.2, 'numeric longitude strings should normalize');
assert.equal(valid.name, 'North Ridge', 'location names should be trimmed');
assert.equal(valid.type, 'Hunting stand');
assert.equal(valid.note, 'Old logging road');
assert(valid.id, 'missing IDs should be generated');
assert.equal(vm.runInContext(`normalizePin({lat:91,lng:-65})`, ctx), null, 'out-of-range latitude must be rejected');
assert.equal(vm.runInContext(`normalizePin({lat:44,lng:181})`, ctx), null, 'out-of-range longitude must be rejected');
const bounded = vm.runInContext(`normalizePin({lat:44,lng:-65,name:'N'.repeat(70),note:'x'.repeat(400)})`, ctx);
assert.equal(bounded.name.length, 48, 'stored names must be bounded to 48 characters');
assert.equal(bounded.note.length, 280, 'stored notes must be bounded to 280 characters');

ctx.pins = [
  valid,
  vm.runInContext(`normalizePin({lat:44.2,lng:-65.3,name:'Creek Crossing',type:'Ground blind',note:'Doe trail'})`, ctx),
  vm.runInContext(`normalizePin({lat:44.3,lng:-65.4,name:'<img src=x onerror=alert(1)>',type:'Trail camera'})`, ctx)
];
ctx.renderPinList();
assert(elements.savedPinList.innerHTML.includes('North Ridge'), 'saved list should show a custom location name');
assert(elements.savedPinList.innerHTML.includes('Hunting stand'), 'saved list should show the location type');
assert(!elements.savedPinList.innerHTML.includes('<img'), 'saved location names must be HTML-escaped');
assert(elements.savedPinList.innerHTML.includes('&lt;img'), 'escaped text should remain visible');

elements.pinSearch.value = 'creek crossing';
ctx.renderPinList();
assert(elements.savedPinList.innerHTML.includes('Creek Crossing'), 'search should match custom location names');
assert(!elements.savedPinList.innerHTML.includes('North Ridge'), 'search should filter unrelated locations');

elements.pinSearch.value = '';
elements.pinFilter.value = 'Ground blind';
ctx.renderPinList();
assert(elements.savedPinList.innerHTML.includes('Creek Crossing'), 'type filter should retain matching location');
assert(!elements.savedPinList.innerHTML.includes('North Ridge'), 'type filter should hide other types');

ctx.pins = [valid];
promptAnswers.push('North Ridge — west edge', 'Fresh rub 20 yards north');
assert.equal(ctx.editPinDetails(0), true, 'valid saved location should be editable');
assert.equal(ctx.pins[0].name, 'North Ridge — west edge');
assert.equal(ctx.pins[0].note, 'Fresh rub 20 yards north');
assert.equal(drawCalls, 1, 'editing should redraw and persist the list through drawPins');
promptAnswers.push(null);
assert.equal(ctx.editPinDetails(0), false, 'cancelling an edit should leave it unchanged');
assert.equal(ctx.pins[0].name, 'North Ridge — west edge');
assert.equal(drawCalls, 1, 'cancelled edit must not redraw or mutate data');
assert.equal(ctx.editPinDetails(99), false, 'invalid saved-location index must be harmless');

console.log('PASS: v10 saved-location naming, input bounds, coordinate validation, list display, name search, type filtering, HTML escaping, edit/cancel behavior, GeoJSON name round-trip wiring, unique IDs, inline JavaScript syntax, and mobile map-first layout.');
