const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
for (const id of ['showWindForecast','windForecast','windForecastStatus','windForecastList']) assert(new RegExp(`id="${id}"`).test(html), `missing ${id}`);
assert(html.includes('forecast_days=7'), 'forecast request must cover seven days');
assert(html.includes('daily=wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max'), 'daily forecast must include max wind, dominant direction and max gust');
assert(html.includes('Show 7-day wind forecast'), 'UI must identify the seven-day forecast');
assert(html.includes("$('showWindForecast').setAttribute('aria-expanded',String(open))"), 'forecast toggle should expose expanded state');
assert(html.includes('Tap the map or use My location first'), 'forecast needs a selected map location');
const fn = inline.match(/async function loadWindForecast\(lat,lon\)\{[\s\S]*?\n(?=\$\('showWindForecast'\)\.onclick)/);
assert(fn, 'forecast loader must exist');
const elements = { windForecastStatus: { textContent: '' }, windForecastList: { innerHTML: '' } };
const dates = Array.from({length: 7}, (_, i) => `2026-11-${String(26+i).padStart(2,'0')}`);
let requestedUrl = '';
const ctx = {
  windForecastRequest: 0, $: id => elements[id],
  fetch: async url => { requestedUrl = url; return { ok: true, json: async () => ({ daily: { time: dates, wind_speed_10m_max: dates.map((_,i)=>i+5), wind_direction_10m_dominant: dates.map(()=>15), wind_gusts_10m_max: dates.map((_,i)=>i+10) } }) }; },
  Date, Number, Math, nice: n => Number(n).toFixed(1), formatBearing: n => String(Math.round(Number(n))%360).padStart(3,'0'),
  cardinal16: n => Number(n)===15 ? 'NNE' : 'N',
  esc: s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
vm.runInNewContext(fn[0], ctx);
(async () => {
  await ctx.loadWindForecast(44, -65);
  assert(requestedUrl.includes('forecast_days=7'));
  assert(requestedUrl.includes('wind_speed_unit=kmh'));
  assert.equal((elements.windForecastList.innerHTML.match(/class="forecast-row"/g)||[]).length, 7);
  assert(elements.windForecastList.innerHTML.includes('015° NNE'));
  assert(elements.windForecastStatus.textContent.includes('Next 7 days'));
  const missing = { time: ['2026-11-26'], wind_speed_10m_max: [null], wind_direction_10m_dominant: [null], wind_gusts_10m_max: [null] };
  ctx.fetch = async () => ({ ok: true, json: async () => ({ daily: missing }) });
  await ctx.loadWindForecast(44, -65);
  assert(elements.windForecastList.innerHTML.includes('<span>—</span><span>—</span><span>—</span>'), 'missing API values must stay unavailable, not be misreported as zero or north');
  console.log('PASS: seven-day daily max wind/gust/dominant FROM direction render, units, day count, and missing-value handling.');
})().catch(err => { console.error(err); process.exitCode = 1; });
