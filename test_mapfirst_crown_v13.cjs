const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['map-first viewport shell',/main\{position:relative;display:block;flex:1;min-height:0;height:auto;padding-bottom:66px\}/],
 ['fixed five-item bottom navigation',/class="ft-nav"[\s\S]*data-tab="map"[\s\S]*data-tab="stands"[\s\S]*data-tab="tracking"[\s\S]*data-tab="weather"[\s\S]*data-tab="land"/],
 ['map is the default active tab',/data-tab="map" aria-current="page"/],
 ['official Nova Scotia Crown Land service',/PLANCrownLandsWM84V1\/MapServer/],
 ['Crown Land toggle available from map and land panel',/id="toggleCrown"[\s\S]*id="quickCrown"/],
 ['official dataset attribution link',/data\.novascotia\.ca\/d\/sqec-gjbw/],
 ['no group chat or shared photo upload feature',!/groupChat|sharedPhotoUpload/i.test(html)]
];
for(const [name,pattern] of checks){assert(pattern instanceof RegExp?pattern.test(html):pattern,name);console.log('PASS',name)}
