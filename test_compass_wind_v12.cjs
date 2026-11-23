const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const id of ['compass', 'northArrow', 'windArrow', 'windFrom', 'windToward', 'windCompassHelp']) {
  assert(ids.includes(id), `missing compass element: ${id}`);
}
for (const label of ['N', 'E', 'S', 'W']) {
  assert(new RegExp(`<span class="compass-label [^"]+">${label}<\\/span>`).test(html), `missing ${label} compass label`);
}
assert(/id="northArrow" class="compass-arrow north-arrow"/.test(html), 'fixed north arrow must exist');
assert(/id="windArrow" class="compass-arrow wind-arrow"/.test(html), 'separate wind arrow must exist');
assert(html.includes('Direction is where wind comes FROM.'), 'weather panel must retain FROM semantics');
assert(html.includes('Wind blows TOWARD'), 'compass must explain the opposite direction');
assert(!html.includes('enableCompass'), 'fixed north-up wind compass must not require phone-heading permission');
assert(/wind=updateWindCompass\(c\.wind_direction_10m\)/.test(html), 'weather response must update the compass');

const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(m => m[1]).filter(s => s.trim()).join('\n');
new vm.Script(inline, { filename: 'FieldTrack v12 inline JavaScript' });
const start = inline.indexOf('function normalizeBearing');
const end = inline.indexOf('\nfunction distance', start);
assert(start >= 0 && end > start, 'wind direction helpers must be present');
const elements = Object.fromEntries(['windArrow','windFrom','windToward','compass'].map(id => [id, {
  style: { display: '', transform: '' }, textContent: '', attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; }
}]));
const ctx = { $, document: null, Number, Math, String };
function $(id) { return elements[id]; }
vm.createContext(ctx);
vm.runInContext(inline.slice(start, end), ctx);

let wind = ctx.windDirections(195);
assert.equal(wind.from, 195);
assert.equal(wind.fromLabel, 'SSW');
assert.equal(wind.toward, 15);
assert.equal(wind.towardLabel, 'NNE');
assert.equal(ctx.formatBearing(15), '015');
assert.equal(ctx.formatBearing(360), '000');
wind = ctx.windDirections(-45);
assert.equal(wind.from, 315);
assert.equal(wind.toward, 135);
assert.equal(wind.fromLabel, 'NW');
assert.equal(wind.towardLabel, 'SE');

const rendered = ctx.updateWindCompass(195);
assert.equal(rendered.from, 195);
assert.equal(elements.windArrow.style.display, 'block');
assert.equal(elements.windArrow.style.transform, 'rotate(195deg)');
assert.equal(elements.windFrom.textContent, '195° SSW');
assert.equal(elements.windToward.textContent, '015° NNE');
assert(elements.compass.attributes['aria-label'].includes('wind comes from'));

ctx.updateWindCompass(null);
assert.equal(elements.windArrow.style.display, 'none', 'missing weather must hide the red wind arrow');
assert.equal(elements.windFrom.textContent, 'Unavailable');
assert.equal(elements.windToward.textContent, 'Unavailable');
assert(elements.compass.attributes['aria-label'].includes('unavailable'));

console.log('PASS: N/E/S/W fixed compass, separate north/wind arrows, FROM/TOWARD conversion, 16-point bearings, normalized wind-arrow rotation, accessible description, missing-data handling, unique IDs, and inline JavaScript syntax.');
