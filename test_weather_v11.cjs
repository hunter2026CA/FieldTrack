const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const id of ['windSpeed', 'windDir', 'weatherText', 'refreshWeather']) {
  assert(ids.includes(id), `missing weather control: ${id}`);
}
assert(html.includes('wind_speed_10m,wind_direction_10m,wind_gusts_10m'), 'weather request must include wind speed, direction, and gusts');
assert(html.includes('wind_speed_unit=kmh'), 'wind speed must request km/h units');
assert(html.includes("wind?`${formatBearing(wind.from)}° ${wind.fromLabel}`:'Unavailable'"), 'wind direction must be rendered with a compass bearing and 16-point label');
assert(html.includes('updateWindCompass(c.wind_direction_10m)'), 'weather response must update the wind compass');
assert(html.includes('Direction is where wind comes FROM.'), 'UI must explain meteorological wind direction semantics');
assert(html.includes("$('refreshWeather').onclick=()=>"), 'manual weather refresh must be wired');
assert(html.includes('https://api.open-meteo.com/v1/forecast'), 'weather source must be explicit');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
new vm.Script(inline, { filename: 'FieldTrack index.html inline JavaScript' });
console.log('PASS: weather controls, Open-Meteo wind speed/direction/gust request, km/h units, 16-point compass direction rendering, FROM-direction explanation, manual refresh wiring, unique IDs, and inline JavaScript syntax.');
