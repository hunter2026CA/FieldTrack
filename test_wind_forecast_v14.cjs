const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
for (const id of ['showWindForecast','windForecast','windForecastStatus','windForecastList']) assert(new RegExp(`id="${id}"`).test(html), `missing ${id}`);
assert(html.includes('forecast_hours=24'), 'forecast request must cover 24 hours');
assert(html.includes('hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m'), 'forecast request must include wind speed, direction and gusts');
assert(html.includes("$('showWindForecast').setAttribute('aria-expanded',String(open))"), 'forecast toggle should expose expanded state');
assert(html.includes('Tap the map or use My location first'), 'forecast needs a selected map location');
const fn = inline.match(/async function loadWindForecast\(lat,lon\)\{[\s\S]*?\n(?=\$\('showWindForecast'\)\.onclick)/);
assert(fn, 'wind forecast loader must exist');
const elements = { windForecastStatus: { textContent: '' }, windForecastList: { innerHTML: '' } };
const times = Array.from({length: 26}, (_, i) => `2026-11-25T${String(i % 24).padStart(2,'0')}:00`);
let requestedUrl = '';
const ctx = {
  windForecastRequest: 0,
  $: id => elements[id],
  fetch: async url => { requestedUrl = url; return { ok: true, json: async () => ({ hourly: { time: times, wind_speed_10m: times.map((_,i)=>i+5), wind_direction_10m: times.map(()=>15), wind_gusts_10m: times.map((_,i)=>i+10) } }) }; },
  Date,
  Number,
  Math,
  nice: n => Number(n).toFixed(1),
  formatBearing: n => String(Math.round(Number(n))%360).padStart(3,'0'),
  cardinal16: n => Number(n)===15 ? 'NNE' : 'N',
  esc: s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
vm.runInNewContext(fn[0], ctx);
(async () => {
  await ctx.loadWindForecast(44, -65);
  assert(requestedUrl.includes('forecast_hours=24'));
  assert(requestedUrl.includes('wind_speed_unit=kmh'));
  assert.equal((elements.windForecastList.innerHTML.match(/class="forecast-row"/g)||[]).length, 24);
  assert(elements.windForecastList.innerHTML.includes('015° NNE'));
  assert(elements.windForecastStatus.textContent.includes('Next 24 hours'));
  const nullHourly = { time: ['2026-11-25T08:00'], wind_speed_10m: [null], wind_direction_10m: [null], wind_gusts_10m: [null] };
  ctx.fetch = async () => ({ ok: true, json: async () => ({ hourly: nullHourly }) });
  await ctx.loadWindForecast(44, -65);
  assert(elements.windForecastList.innerHTML.includes('<span>—</span><span>—</span><span>—</span>'), 'missing API values must stay unavailable, not be misreported as zero or north');
  console.log('PASS: 24-hour wind forecast loads hourly wind/gust/direction values, displays local times and FROM bearings, and limits output to 24 rows.');
})().catch(err => { console.error(err); process.exitCode = 1; });
