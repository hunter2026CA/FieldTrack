
// Define the DOM lookup helper before any event handlers use it.
const $=id=>document.getElementById(id);
const map=L.map('map');
// Restore the last map position locally so hunters reopen the same property area.
let initialView=null;try{initialView=JSON.parse(localStorage.getItem('fieldtrack-map-view')||'null')}catch(e){initialView=null}
if(initialView&&Array.isArray(initialView.center)&&initialView.center.length===2&&Number.isFinite(initialView.zoom)){map.setView(initialView.center,Math.max(3,Math.min(19,initialView.zoom)))}else{map.setView([43.65,-65.53],10)} // Default view: Shelburne–Barrington area, Nova Scotia
map.on('moveend',()=>{const c=map.getCenter();saveLocal('fieldtrack-map-view',{center:[c.lat,c.lng],zoom:map.getZoom(),savedAt:new Date().toISOString()})});
const street=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'});
const topo=L.tileLayer('https://tile.openmaps.fr/opentopomap/{z}/{x}/{y}.png',{maxZoom:17,attribution:'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> | <a href="https://github.com/sletuffe/OpenTopoMap" target="_blank" rel="noopener">© OpenTopoMap-R</a> | <a href="https://openmaps.fr/donate" target="_blank" rel="noopener">Donation</a>'});
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'<a href="https://www.esri.com/" target="_blank" rel="noopener">Imagery © Esri</a>'});
map.createPane('satelliteLabelsPane');map.getPane('satelliteLabelsPane').style.zIndex='450';map.getPane('satelliteLabelsPane').style.pointerEvents='none';
const satelliteRoadLabels=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.95,pane:'satelliteLabelsPane',attribution:'Road labels © Esri'});
const satellitePlaceLabels=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.95,pane:'satelliteLabelsPane',attribution:'Place labels © Esri'});
function updateSatelliteLabels(){const show=$('maptype').value==='sat'&&$('satelliteLabels').checked;[satelliteRoadLabels,satellitePlaceLabels].forEach(layer=>{if(show&&!map.hasLayer(layer))layer.addTo(map);else if(!show&&map.hasLayer(layer))map.removeLayer(layer)});}
$('satelliteLabels').checked=localStorage.getItem('fieldtrack-satellite-labels')!=='false';
$('satelliteLabels').addEventListener('change',e=>{localStorage.setItem('fieldtrack-satellite-labels',String(e.target.checked));updateSatelliteLabels()});
street.addTo(map);
let pins=[], pinLayer=L.layerGroup().addTo(map), ownershipLayer=null, importedLayer=L.layerGroup().addTo(map), mode='pin', firstMeasure=null, measureLine=null, locationMarker=null, accuracyCircle=null, selected=null;
// Official Nova Scotia Crown Land map service (Government of Nova Scotia).
// This service advertises dynamic-layer support. Override its server-side green
// renderer with a translucent blue polygon fill and a darker blue outline.
const crownLandServiceUrl='https://nsgiwa.novascotia.ca/arcgis/rest/services/PLAN/PLANCrownLandsWM84V1/MapServer';
const crownLandDynamicLayers=[{id:0,source:{type:'mapLayer',mapLayerId:0},drawingInfo:{renderer:{type:'simple',symbol:{type:'esriSFS',style:'esriSFSSolid',color:[39,137,215,92],outline:{type:'esriSLS',style:'esriSLSSolid',color:[19,85,151,235],width:1.6}}},transparency:0}}];
const crownLandLayer=(window.L&&L.esri&&typeof L.esri.dynamicMapLayer==='function')?L.esri.dynamicMapLayer({url:crownLandServiceUrl,layers:[0],dynamicLayers:crownLandDynamicLayers,format:'png32',opacity:1,transparent:true,f:'json',attribution:'Crown Land Map © Government of Nova Scotia'}):null;
let crownLayerLoaded=false;
if(crownLandLayer){
 crownLandLayer.on('loading',()=>{$('ownershipStatus').textContent='Requesting the blue Crown Land overlay…'});
 crownLandLayer.on('load',()=>{crownLayerLoaded=true;$('ownershipStatus').textContent='Blue Crown Land overlay loaded. Verify access and hunting rules before entering.'});
 crownLandLayer.on('requesterror',e=>{const detail=e&&e.message?': '+e.message:(e&&e.error&&e.error.message?': '+e.error.message:'');$('ownershipStatus').textContent='The Crown Land map service rejected the styled map request'+detail+'. Check connection or try again later.'});
 crownLandLayer.on('error',()=>{$('ownershipStatus').textContent='Could not retrieve the Crown Land map service. Check connection or try again later.'});
}
function toggleCrownLayer(){
 if(!crownLandLayer){$('ownershipStatus').textContent='Crown Land map layer is unavailable because the Esri map library did not load.';return false}
 const enabled=map.hasLayer(crownLandLayer);
 if(enabled){map.removeLayer(crownLandLayer);$('toggleCrown').textContent='Show Nova Scotia Crown land';$('toggleCrown').classList.add('primary');$('ownershipStatus').textContent='Crown land layer is off.'}
 else{ $('ownershipStatus').textContent='Loading official Nova Scotia Crown Land map…';crownLandLayer.addTo(map);$('toggleCrown').textContent='Hide Nova Scotia Crown land';$('toggleCrown').classList.remove('primary') }
 const pressed=String(!enabled);$('toggleCrown').setAttribute('aria-pressed',pressed);$('quickCrown').setAttribute('aria-pressed',pressed);if(map3dMap&&map3dReady)map3dMap.setLayoutProperty('ft-crown-layer','visibility',enabled?'none':'visible');return true
}
$('toggleCrown').addEventListener('click',toggleCrownLayer);$('quickCrown').addEventListener('click',toggleCrownLayer);

// The existing Leaflet map remains the dependable 2D fallback and the source
// of truth for saved hunting data. MapLibre is an alternate 3D renderer only.
let map3dMap=null,map3dReady=false,mapMode='2d';
const emptyFeatureCollection=()=>({type:'FeatureCollection',features:[]});
function coordinatesFromPoints(points){return (points||[]).map(point=>Array.isArray(point)?[Number(point[1]),Number(point[0])]:[Number(point.lng),Number(point.lat)]).filter(pair=>pair.every(Number.isFinite));}
function featureCollectionFromLeaflet(layerGroup){
 const features=[];if(layerGroup&&typeof layerGroup.eachLayer==='function')layerGroup.eachLayer(layer=>{if(typeof layer.toGeoJSON==='function'){const data=layer.toGeoJSON();if(data&&data.type==='FeatureCollection')features.push(...data.features);else if(data&&data.type==='Feature')features.push(data)}});return {type:'FeatureCollection',features};
}
function syncMapLibreOverlays(){
 // Avoid rebuilding MapLibre GeoJSON sources while the 3D canvas is hidden.
 // The next switch into 3D calls this function and catches up in one batch.
 if(mapMode!=='3d'||!map3dMap||!map3dReady)return;
 const set=(id,data)=>{const source=map3dMap.getSource(id);if(source)source.setData(data)};
 set('ft-pins',{type:'FeatureCollection',features:pins.map(pin=>({type:'Feature',geometry:{type:'Point',coordinates:[pin.lng,pin.lat]},properties:{id:pin.id,name:pin.name||'',type:pin.type||'Waypoint',note:pin.note||''}}))});
 const boundaryCoords=validBoundaryPoints(savedBoundary)?coordinatesFromPoints(savedBoundary):[];
 if(boundaryCoords.length>=3){boundaryCoords.push(boundaryCoords[0]);set('ft-boundary',{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[boundaryCoords]},properties:{name:'User-drawn property boundary'}}]})}else set('ft-boundary',emptyFeatureCollection());
 const trackFeatures=splitTrackSegments().filter(segment=>segment.length>1).map((segment,index)=>({type:'Feature',geometry:{type:'LineString',coordinates:coordinatesFromPoints(segment)},properties:{segment:index+1}}));
 set('ft-track',{type:'FeatureCollection',features:trackFeatures});
 const location=locationMarker&&locationMarker.getLatLng?locationMarker.getLatLng():null;
 set('ft-location',location?{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[location.lng,location.lat]},properties:{name:'Current location'}}]}:emptyFeatureCollection());
 const boundaryDraft=coordinatesFromPoints(boundaryPoints);
 set('ft-boundary-draft',boundaryDraft.length>1?{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:boundaryDraft},properties:{}}]}:emptyFeatureCollection());
 const areaDraft=coordinatesFromPoints(areaPoints);
 if(areaDraft.length>=3){const ring=areaDraft.slice();ring.push(ring[0]);set('ft-area-draft',{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]},properties:{}}]})}
 else set('ft-area-draft',areaDraft.length>1?{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:areaDraft},properties:{}}]}:emptyFeatureCollection());
 set('ft-measured-area',measuredAreaLayer&&measuredAreaLayer.toGeoJSON?{type:'FeatureCollection',features:[measuredAreaLayer.toGeoJSON()]}:emptyFeatureCollection());
 set('ft-measure-line',measureLine&&measureLine.toGeoJSON?{type:'FeatureCollection',features:[measureLine.toGeoJSON()]}:emptyFeatureCollection());
 set('ft-imported',featureCollectionFromLeaflet(importedLayer));
 set('ft-ownership',featureCollectionFromLeaflet(ownershipLayer));
}
function addMapLibreOverlaySources(){
 const addSource=(id)=>map3dMap.addSource(id,{type:'geojson',data:emptyFeatureCollection()});
 addSource('ft-pins');map3dMap.addLayer({id:'ft-pins-circles',type:'circle',source:'ft-pins',paint:{'circle-radius':7,'circle-color':'#2a80c9','circle-stroke-color':'#ffffff','circle-stroke-width':2}});
 addSource('ft-boundary');map3dMap.addLayer({id:'ft-boundary-fill',type:'fill',source:'ft-boundary',paint:{'fill-color':'#a7d36b','fill-opacity':0.12}});map3dMap.addLayer({id:'ft-boundary-line',type:'line',source:'ft-boundary',paint:{'line-color':'#a7d36b','line-width':3}});
 addSource('ft-track');map3dMap.addLayer({id:'ft-track-line',type:'line',source:'ft-track',paint:{'line-color':'#f3ca72','line-width':4,'line-opacity':0.95}});
 addSource('ft-location');map3dMap.addLayer({id:'ft-location-circle',type:'circle',source:'ft-location',paint:{'circle-radius':8,'circle-color':'#a7d36b','circle-stroke-color':'#102014','circle-stroke-width':2}});
 addSource('ft-boundary-draft');map3dMap.addLayer({id:'ft-boundary-draft-line',type:'line',source:'ft-boundary-draft',paint:{'line-color':'#a7d36b','line-width':3,'line-dasharray':[2,2]}});
 addSource('ft-area-draft');map3dMap.addLayer({id:'ft-area-draft-fill',type:'fill',source:'ft-area-draft',paint:{'fill-color':'#f3ca72','fill-opacity':0.12}});map3dMap.addLayer({id:'ft-area-draft-line',type:'line',source:'ft-area-draft',paint:{'line-color':'#f3ca72','line-width':2,'line-dasharray':[2,2]}});
 addSource('ft-measured-area');map3dMap.addLayer({id:'ft-measured-area-fill',type:'fill',source:'ft-measured-area',paint:{'fill-color':'#f3ca72','fill-opacity':0.12}});map3dMap.addLayer({id:'ft-measured-area-line',type:'line',source:'ft-measured-area',paint:{'line-color':'#f3ca72','line-width':2,'line-dasharray':[2,2]}});
 addSource('ft-measure-line');map3dMap.addLayer({id:'ft-measure-line-layer',type:'line',source:'ft-measure-line',paint:{'line-color':'#f3ca72','line-width':3,'line-dasharray':[2,2]}});
 addSource('ft-imported');map3dMap.addLayer({id:'ft-imported-fill',type:'fill',source:'ft-imported',paint:{'fill-color':'#79b8e8','fill-opacity':0.08}});map3dMap.addLayer({id:'ft-imported-line',type:'line',source:'ft-imported',paint:{'line-color':'#79b8e8','line-width':2}});map3dMap.addLayer({id:'ft-imported-points',type:'circle',source:'ft-imported',paint:{'circle-radius':5,'circle-color':'#79b8e8','circle-stroke-color':'#ffffff','circle-stroke-width':1}});
 addSource('ft-ownership');map3dMap.addLayer({id:'ft-ownership-fill',type:'fill',source:'ft-ownership',paint:{'fill-color':'#79b8e8','fill-opacity':0.08}});map3dMap.addLayer({id:'ft-ownership-line',type:'line',source:'ft-ownership',paint:{'line-color':'#79b8e8','line-width':2}});
 map3dMap.on('click','ft-pins-circles',event=>{const feature=event.features&&event.features[0];if(!feature)return;const props=feature.properties||{};const title=esc(props.name||props.type||'Saved waypoint');const detail=esc(props.type||'Waypoint');new maplibregl.Popup().setLngLat(event.lngLat).setHTML(`<strong>${title}</strong><br><small>${detail}</small>`).addTo(map3dMap)});
 if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();
}
function updateMapModeControls(){const is3d=mapMode==='3d';$('quick3d').textContent=is3d?'2D map':'3D terrain';$('quick3d').title=is3d?'Return to the 2D map':'Switch to 3D satellite terrain';$('quick3d').setAttribute('aria-pressed',String(is3d));$('show2d').classList.toggle('active',!is3d);$('show3d').classList.toggle('active',is3d);$('mapModeStatus').textContent=is3d?'3D terrain • drag to rotate; two-finger gestures on touch':'2D map active';$('terrainStatus').textContent=is3d?'3D satellite terrain active. Terrain resolution varies by location; local LiDAR detail is not yet connected.':'2D map active. Select 3D terrain to view satellite imagery over elevation data.';}
function setMapMode(nextMode){
 if(nextMode==='3d'){
  if(!window.maplibregl){$('mapModeStatus').textContent='3D library did not load. The 2D map is still available.';$('terrainStatus').textContent='Could not load the 3D map library. Check your connection and continue in 2D.';return false}
  if(typeof maplibregl.supported==='function'&&!maplibregl.supported()){ $('mapModeStatus').textContent='This browser or device cannot run the 3D map. The 2D map is still available.';$('terrainStatus').textContent='WebGL is unavailable on this device or browser. Continue in 2D.';return false}
  const center=map.getCenter(),zoom=map.getZoom();$('map').style.display='none';$('map3d').style.display='block';
  if(!map3dMap){
   const dynamicLayers=encodeURIComponent(JSON.stringify(crownLandDynamicLayers));
   const crownExportUrl=crownLandServiceUrl+'/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&f=image&layers=show%3A0&dynamicLayers='+dynamicLayers;
   const style={version:8,sources:{
    'ft-imagery':{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
    'ft-dem':{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,encoding:'terrarium',maxzoom:15,attribution:'Terrain: Mapzen / Tilezen Terrain Tiles • Canada data under the Open Government Licence – Canada'},
    'ft-road-labels':{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Road labels © Esri'},
    'ft-place-labels':{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Place labels © Esri'},
    'ft-crown-land':{type:'raster',tiles:[crownExportUrl],tileSize:256,attribution:'Crown Land Map © Government of Nova Scotia'}
   },layers:[
    {id:'ft-imagery-layer',type:'raster',source:'ft-imagery'},
    {id:'ft-hillshade-layer',type:'hillshade',source:'ft-dem',paint:{'hillshade-exaggeration':0.25,'hillshade-shadow-color':'#1b241d','hillshade-highlight-color':'#e9eadf'}},
    {id:'ft-road-labels-layer',type:'raster',source:'ft-road-labels'},
    {id:'ft-place-labels-layer',type:'raster',source:'ft-place-labels'},
    {id:'ft-crown-layer',type:'raster',source:'ft-crown-land',layout:{visibility:crownLandLayer&&map.hasLayer(crownLandLayer)?'visible':'none'},paint:{'raster-opacity':1}}
   ]};
   try{map3dMap=new maplibregl.Map({container:'map3d',style,center:[center.lng,center.lat],zoom,pitch:58,bearing:0,maxPitch:82,attributionControl:true,renderWorldCopies:false})}catch(error){$('map3d').style.display='none';$('map').style.display='block';map.invalidateSize();$('mapModeStatus').textContent='3D could not start on this device: '+(error.message||'WebGL unavailable')+'. The 2D map is still available.';return false}
   map3dMap.addControl(new maplibregl.NavigationControl({visualizePitch:true,showCompass:true}),'top-left');map3dMap.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}),'bottom-left');
   map3dMap.on('load',()=>{map3dReady=true;addMapLibreOverlaySources();map3dMap.setLayoutProperty('ft-crown-layer','visibility',crownLandLayer&&map.hasLayer(crownLandLayer)?'visible':'none');try{map3dMap.setTerrain({source:'ft-dem',exaggeration:Number($('terrainRelief').value)||1.35});$('mapModeStatus').textContent='3D terrain loaded. Rotate and tilt to inspect ridges and valleys.'}catch(error){const detail='3D terrain could not start: '+(error.message||'terrain unavailable')+'. Returned to 2D.';setMapMode('2d');$('mapModeStatus').textContent=detail;$('terrainStatus').textContent=detail;return}if(!$('hillshadeToggle').checked)map3dMap.setLayoutProperty('ft-hillshade-layer','visibility','none')});
   map3dMap.on('click',event=>{const ll=L.latLng(event.lngLat.lat,event.lngLat.lng);map.fire('click',{latlng:ll,originalEvent:event.originalEvent})});
   map3dMap.on('moveend',()=>{if(!map3dMap)return;const c=map3dMap.getCenter();saveLocal('fieldtrack-map-view',{center:[c.lat,c.lng],zoom:map3dMap.getZoom(),savedAt:new Date().toISOString()})});
   map3dMap.on('error',event=>{const source=event&&event.sourceId||'',message=event&&event.error&&event.error.message||'map resource unavailable';if(source==='ft-dem'&&mapMode==='3d'){const detail='Elevation tiles failed: '+message+'. Returned to the 2D map.';setMapMode('2d');$('mapModeStatus').textContent=detail;$('terrainStatus').textContent=detail}else if(source==='ft-crown-land')$('ownershipStatus').textContent='Crown Land overlay is unavailable in 3D right now. The 2D Crown Land layer remains available.'});
  }else{map3dMap.jumpTo({center:[center.lng,center.lat],zoom,pitch:58,bearing:0});map3dMap.resize();}
  mapMode='3d';updateMapModeControls();if(map3dReady)if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();return true;
 }
 if(mapMode==='3d'&&map3dMap){const center=map3dMap.getCenter();map.setView([center.lat,center.lng],Math.max(3,Math.min(19,map3dMap.getZoom())),{animate:false})}
 mapMode='2d';$('map3d').style.display='none';$('map').style.display='block';map.invalidateSize();updateMapModeControls();return true;
}
$('show2d').addEventListener('click',()=>setMapMode('2d'));$('show3d').addEventListener('click',()=>setMapMode('3d'));$('quick3d').addEventListener('click',()=>setMapMode(mapMode==='3d'?'2d':'3d'));
$('terrainRelief').addEventListener('change',()=>{if(map3dMap&&map3dReady)map3dMap.setTerrain({source:'ft-dem',exaggeration:Number($('terrainRelief').value)||1.35})});
$('hillshadeToggle').addEventListener('change',event=>{if(map3dMap&&map3dReady)map3dMap.setLayoutProperty('ft-hillshade-layer','visibility',event.target.checked?'visible':'none')});
function setFieldTrackView(latlng,zoom){if(mapMode==='3d'&&map3dMap){const point=Array.isArray(latlng)?[Number(latlng[1]),Number(latlng[0])]:[Number(latlng.lng),Number(latlng.lat)];map3dMap.easeTo({center:point,zoom,duration:450})}else map.setView(latlng,zoom)}
function fitFieldTrackBounds(bounds,options={}){if(mapMode==='3d'&&map3dMap){map3dMap.fitBounds([[bounds.getWest(),bounds.getSouth()],[bounds.getEast(),bounds.getNorth()]],{padding:options.padding?options.padding[0]||36:36,maxZoom:options.maxZoom||17})}else map.fitBounds(bounds,options)}
function openTab(tab){const panel=$('tabPanel'),aside=document.querySelector('aside'),buttons=[...document.querySelectorAll('.ft-nav button')];buttons.forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});const returnCards=()=>{[...panel.querySelectorAll('.card')].forEach(c=>aside.appendChild(c));panel.hidden=true;panel.innerHTML=''};if(tab==='map'){returnCards();setTimeout(()=>map.invalidateSize(),80);return}returnCards();const cards={stands:['Animal tracking pins'],tracking:['Hunter GPS tracking'],weather:['Live weather & wind','North & wind compass'],land:['Map & terrain','Crown land & property boundaries','Map legend','Map backup & restore','Elevation inspection'],harvest:['Harvest log']};const titles=cards[tab]||[];const selected=[...aside.querySelectorAll('.card')].filter(c=>titles.some(t=>c.querySelector('h3')?.textContent.trim()===t));const close=document.createElement('button');close.className='ft-panel-close';close.type='button';close.textContent='Close ✕';close.addEventListener('click',()=>openTab('map'));panel.appendChild(close);selected.forEach(c=>panel.appendChild(c));panel.hidden=false;setTimeout(()=>map.invalidateSize(),80)}
document.querySelectorAll('.ft-nav button').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));$('quickLocate').addEventListener('click',()=>$('locate').click());

let boundaryPoints=[], boundaryLayer=null, boundaryPreview=null, savedBoundary=null;
let areaPoints=[],areaPreview=null,measuredAreaLayer=null;
let trackPoints=[], trackLines=[], trackWatchId=null;
try{savedBoundary=JSON.parse(localStorage.getItem('fieldtrack-boundary')||'null')}catch(e){savedBoundary=null}

function metersToYards(m){return m*1.0936133}
function bearing(a,b){const r=Math.PI/180,lat1=a.lat*r,lat2=b.lat*r,dLon=(b.lng-a.lng)*r,y=Math.sin(dLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);return (Math.atan2(y,x)/r+360)%360}
function cardinal(d){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8]}
function normalizeBearing(degrees){return ((Number(degrees)%360)+360)%360}
function cardinal16(degrees){return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(normalizeBearing(degrees)/22.5)%16]}
function formatBearing(degrees){return String(Math.round(normalizeBearing(degrees))%360).padStart(3,'0')}
function windDirections(degrees){const from=normalizeBearing(degrees),toward=normalizeBearing(from+180);return {from,toward,fromLabel:cardinal16(from),towardLabel:cardinal16(toward)}}
function updateWindCompass(degrees){
 const arrow=$('windArrow'),fromEl=$('windFrom'),towardEl=$('windToward'),compass=$('compass');
 if(degrees==null||degrees===''||!Number.isFinite(Number(degrees))){arrow.style.display='none';fromEl.textContent='Unavailable';towardEl.textContent='Unavailable';compass.setAttribute('aria-label','Fixed north-up compass. Wind direction is unavailable.');return null}
 const wind=windDirections(degrees);arrow.style.display='block';arrow.style.transform=`rotate(${wind.from}deg)`;
 fromEl.textContent=`${formatBearing(wind.from)}° ${wind.fromLabel}`;towardEl.textContent=`${formatBearing(wind.toward)}° ${wind.towardLabel}`;
 compass.setAttribute('aria-label',`Fixed north-up compass. Green arrow points north. Red arrow points ${formatBearing(wind.from)} degrees ${wind.fromLabel}, where wind comes from. Wind blows toward ${formatBearing(wind.toward)} degrees ${wind.towardLabel}.`);
 return wind;
}
function distance(a,b){return map.distance(a,b)}
function nice(n){return Number(n).toFixed(1)}
function polygonAreaSquareMeters(points){if(!Array.isArray(points)||points.length<3)return 0;const r=Math.PI/180,R=6378137;let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=(b.lng-a.lng)*r*(2+Math.sin(a.lat*r)+Math.sin(b.lat*r))}return Math.abs(sum*R*R/2)}
function saveLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}}
// Device-local harvest journal. Photos are resized before storage to reduce quota pressure.
let harvestEntries=[],harvestCoords=null,harvestPhotoData=null;
try{const stored=JSON.parse(localStorage.getItem('fieldtrack-harvest')||'[]');if(Array.isArray(stored))harvestEntries=stored.filter(x=>x&&typeof x.id==='string'&&typeof x.type==='string')}catch(e){harvestEntries=[]}
$('harvestDate').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
function renderHarvestEntries(){
 $('harvestStatus').textContent=`${harvestEntries.length} harvest entr${harvestEntries.length===1?'y':'ies'} saved on this device.`;
 $('harvestList').innerHTML=harvestEntries.length?harvestEntries.slice().reverse().map(entry=>`<div class="saved-location"><div class="saved-location-title">${esc(entry.quantity)} × ${esc(entry.species||entry.type)}</div><div class="saved-location-meta">${esc(entry.type)} • ${esc(entry.date||'Date not recorded')}<br>${entry.coords?`${Number(entry.coords.lat).toFixed(5)}, ${Number(entry.coords.lng).toFixed(5)}`:'No GPS location'}${entry.notes?`<br>${esc(entry.notes)}`:''}</div>${entry.photo?`<img src="${entry.photo}" alt="Harvest photo" style="display:block;max-width:100%;max-height:150px;border-radius:8px;margin-top:7px">`:''}<div class="saved-location-actions"><button data-harvest-delete="${esc(entry.id)}">Delete</button></div></div>`).join(''):'<p>No harvest entries yet.</p>';
}
$('harvestUseLocation').addEventListener('click',()=>{if(!navigator.geolocation){$('harvestLocationStatus').textContent='GPS is not available in this browser.';return}$('harvestLocationStatus').textContent='Getting GPS location…';navigator.geolocation.getCurrentPosition(pos=>{harvestCoords={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};$('harvestLocationStatus').textContent=`GPS attached: ${harvestCoords.lat.toFixed(5)}, ${harvestCoords.lng.toFixed(5)} (±${Math.round(harvestCoords.accuracy)} m)`},err=>{$('harvestLocationStatus').textContent=`Could not get GPS location: ${err.message}`},{enableHighAccuracy:true,timeout:15000,maximumAge:30000})});
$('harvestClearLocation').addEventListener('click',()=>{harvestCoords=null;$('harvestLocationStatus').textContent='No GPS location attached.'});
$('harvestPhoto').addEventListener('change',()=>{const file=$('harvestPhoto').files&&$('harvestPhoto').files[0];harvestPhotoData=null;if(!file){$('harvestPhotoStatus').textContent='No photo selected.';return}if(!file.type.startsWith('image/')){$('harvestPhotoStatus').textContent='Please choose an image.';return}if(file.size>15*1024*1024){$('harvestPhotoStatus').textContent='Photo is larger than 15 MB. Choose a smaller image.';$('harvestPhoto').value='';return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,1280/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);harvestPhotoData=canvas.toDataURL('image/jpeg',.72);$('harvestPhotoStatus').textContent='Photo ready (resized for local storage).'};img.onerror=()=>{$('harvestPhotoStatus').textContent='Could not read this image.'};img.src=reader.result};reader.onerror=()=>{$('harvestPhotoStatus').textContent='Could not read this image.'};reader.readAsDataURL(file)});
$('saveHarvest').addEventListener('click',()=>{const quantity=Number($('harvestQuantity').value),date=$('harvestDate').value;if(!Number.isInteger(quantity)||quantity<1||quantity>99){$('harvestStatus').textContent='Quantity must be a whole number from 1 to 99.';return}if(!date||!Number.isFinite(Date.parse(date))){$('harvestStatus').textContent='Choose a valid harvest date and time.';return}const entry={id:makePinId(),type:$('harvestType').value,species:$('harvestSpecies').value.trim().slice(0,60),quantity,date:new Date(date).toISOString(),coords:harvestCoords,notes:$('harvestNotes').value.trim().slice(0,500),photo:harvestPhotoData};const next=[...harvestEntries,entry];if(!saveLocal('fieldtrack-harvest',next)){$('harvestStatus').textContent='Could not save: device storage may be full. Try removing a photo or exporting your browser data.';return}harvestEntries=next;$('harvestSpecies').value='';$('harvestQuantity').value='1';$('harvestNotes').value='';$('harvestPhoto').value='';$('harvestPhotoStatus').textContent='No photo selected.';harvestPhotoData=null;harvestCoords=null;$('harvestLocationStatus').textContent='No GPS location attached.';renderHarvestEntries();});
$('harvestList').addEventListener('click',e=>{const button=e.target.closest('[data-harvest-delete]');if(!button)return;const id=button.dataset.harvestDelete;if(!confirm('Delete this harvest entry from this device?'))return;const next=harvestEntries.filter(x=>x.id!==id);if(saveLocal('fieldtrack-harvest',next)){harvestEntries=next;renderHarvestEntries()}else $('harvestStatus').textContent='Could not update local storage.'});
renderHarvestEntries();
function makePinId(){return window.crypto&&window.crypto.randomUUID?window.crypto.randomUUID():`pin-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function normalizePin(p){
 if(!p||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return null;
 const lat=Number(p.lat),lng=Number(p.lng);
 if(Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return {id:typeof p.id==='string'&&p.id?p.id:makePinId(),lat,lng,name:String(p.name||'').trim().slice(0,48),type:String(p.type||'Other waypoint').slice(0,40),note:String(p.note||'').slice(0,280),time:typeof p.time==='string'?p.time:new Date().toISOString()};
}
function savePins(){if(!saveLocal('fieldtrack-pins',pins))$('pinCount').textContent='Storage is full; export your pins to keep a backup.';else $('pinCount').textContent=pins.length+' pins saved in this browser.'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderPinList(){
 const query=$('pinSearch').value.trim().toLowerCase(),filter=$('pinFilter').value;
 const matches=pins.map((p,index)=>({p,index})).filter(({p})=>(filter==='all'||p.type===filter)&&(!query||`${p.name||''} ${p.type||''} ${p.note||''} ${p.lat} ${p.lng}`.toLowerCase().includes(query)));
 $('savedPinSummary').textContent=`${matches.length} matching location${matches.length===1?'':'s'} • ${pins.length} saved total`;
 $('savedPinList').innerHTML=matches.length?matches.slice(0,50).map(({p,index})=>{
  const when=p.time&&Number.isFinite(Date.parse(p.time))?new Date(p.time).toLocaleString():'Date not recorded';
  const title=esc(p.name||p.type||'Waypoint'),kind=esc(p.type||'Waypoint');
  return `<div class="saved-location"><div class="saved-location-title">${title}</div>${p.name?`<div class="saved-location-meta">${kind}</div>`:''}<div class="saved-location-meta">${esc(p.note||'No note')}<br>${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}<br>${esc(when)}</div><div class="saved-location-actions"><button data-action="show" data-index="${index}">Show</button><button data-action="edit" data-index="${index}">Edit details</button><button data-action="delete" data-index="${index}">Delete</button></div></div>`
 }).join(''):'<p>No matching saved locations.</p>';
 if(matches.length>50)$('savedPinSummary').textContent+=` • showing first 50`;
}
function drawPins(){pinLayer.clearLayers();pins.forEach((p,i)=>{const marker=L.marker([p.lat,p.lng]).addTo(pinLayer);marker.__fieldTrackPinId=p.id;marker.bindPopup(`<b>${esc(p.name||p.type||'Waypoint')}</b><br><small>${esc(p.type||'Waypoint')}</small><br>${esc(p.note||'No note')}<br><small>${esc(p.time||'Date not recorded')}</small><br><button onclick="deletePin(${i})">Delete pin</button>`)});savePins();renderPinList();if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays()}
function editPinDetails(index){
 if(!Number.isInteger(index)||index<0||index>=pins.length)return false;
 const pin=pins[index],name=prompt('Location name (leave blank to use its type):',pin.name||'');if(name===null)return false;
 const note=prompt('Field note:',pin.note||'');if(note===null)return false;
 pin.name=String(name).trim().slice(0,48);pin.note=String(note).slice(0,280);drawPins();return true;
}
window.deletePin=i=>{if(Number.isInteger(i)&&i>=0&&i<pins.length){pins.splice(i,1);drawPins()}}
try{pins=JSON.parse(localStorage.getItem('fieldtrack-pins')||'[]');if(!Array.isArray(pins))pins=[]}catch(e){pins=[]}pins=pins.map(normalizePin).filter(Boolean);drawPins();
$('pinSearch').addEventListener('input',renderPinList);$('pinFilter').addEventListener('change',renderPinList);
$('savedPinList').addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(!button)return;const index=Number(button.dataset.index),pin=pins[index];if(!pin)return;
 if(button.dataset.action==='show'){if(typeof setFieldTrackView==='function')setFieldTrackView([pin.lat,pin.lng],Math.max(typeof map3dMap!=='undefined'&&mapMode==='3d'&&map3dMap?map3dMap.getZoom():map.getZoom(),16));else map.setView([pin.lat,pin.lng],Math.max(map.getZoom(),16));pinLayer.eachLayer(layer=>{if(layer.__fieldTrackPinId===pin.id)layer.openPopup()})}
 else if(button.dataset.action==='edit'){editPinDetails(index)}
 else if(button.dataset.action==='delete'&&confirm(`Delete this ${pin.name||pin.type||'waypoint'}?`)){pins.splice(index,1);drawPins()}
});
function validBoundaryPoints(points){return Array.isArray(points)&&points.length>=3&&points.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))&&Math.abs(Number(p[0]))<=90&&Math.abs(Number(p[1]))<=180)}
function updateBoundaryFitControl(){$('fitBoundary').disabled=!validBoundaryPoints(savedBoundary)}
function fitSavedBoundary(){if(!validBoundaryPoints(savedBoundary))return false;const bounds=L.latLngBounds(savedBoundary.map(([lat,lng])=>[Number(lat),Number(lng)]));if(!bounds.isValid())return false;if(typeof fitFieldTrackBounds==='function')fitFieldTrackBounds(bounds,{padding:[36,36],maxZoom:17});else map.fitBounds(bounds,{padding:[36,36],maxZoom:17});return true}
function renderBoundary(){if(boundaryLayer)map.removeLayer(boundaryLayer);boundaryLayer=null;updateBoundaryFitControl();if(validBoundaryPoints(savedBoundary)){boundaryLayer=L.polygon(savedBoundary,{color:'#a7d36b',weight:3,fillOpacity:.12}).addTo(map);$('boundaryStatus').textContent='Property boundary saved on this device ('+savedBoundary.length+' points). Verify it against an authoritative survey or land record.';}if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays()}
function boundaryCanFinish(points){return Array.isArray(points)&&points.length>=3}
function refreshBoundaryPreview(){
 if(boundaryPreview)map.removeLayer(boundaryPreview);
 boundaryPreview=null;
 if(boundaryPoints.length===1)boundaryPreview=L.circleMarker(boundaryPoints[0],{radius:5,color:'#a7d36b',fillOpacity:.9}).addTo(map);
 else if(boundaryPoints.length>1)boundaryPreview=L.polyline(boundaryPoints,{color:'#a7d36b',weight:3,dashArray:'6 5'}).addTo(map);
 $('undoBoundary').disabled=boundaryPoints.length===0;
 $('cancelBoundary').disabled=mode!=='boundary';
 $('finishBoundary').disabled=!boundaryCanFinish(boundaryPoints);if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();
}
function undoBoundaryPoint(){
 if(mode!=='boundary'||boundaryPoints.length===0)return false;
 boundaryPoints.pop();refreshBoundaryPreview();
 $('boundaryStatus').textContent=boundaryPoints.length?`${boundaryPoints.length} boundary points remain. Add at least 3 points, then finish.`:'Last point removed. Tap the map to add boundary points.';
 return true;
}
function cancelBoundaryDrawing(){
 if(mode!=='boundary')return false;
 boundaryPoints=[];mode='pin';refreshBoundaryPreview();$('startBoundary').classList.remove('active');
 $('boundaryStatus').textContent='Boundary drawing cancelled. Your previously saved boundary was left unchanged.';
 return true;
}
renderBoundary();
function refreshAreaPreview(){if(areaPreview)map.removeLayer(areaPreview);areaPreview=null;if(areaPoints.length===1)areaPreview=L.circleMarker(areaPoints[0],{radius:5,color:'#f3ca72'}).addTo(map);else if(areaPoints.length===2)areaPreview=L.polyline(areaPoints,{color:'#f3ca72',weight:3,dashArray:'6 5'}).addTo(map);else if(areaPoints.length>=3)areaPreview=L.polygon(areaPoints,{color:'#f3ca72',weight:2,fillColor:'#f3ca72',fillOpacity:.12,dashArray:'6 5'}).addTo(map);$('undoArea').disabled=areaPoints.length===0;$('finishArea').disabled=areaPoints.length<3;$('cancelArea').disabled=mode!=='area';if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays()}
function undoAreaPoint(){if(mode!=='area'||areaPoints.length===0)return false;areaPoints.pop();refreshAreaPreview();$('areaStatus').textContent=areaPoints.length?`${areaPoints.length} area points remain. Add at least ${Math.max(0,3-areaPoints.length)} more point(s) to finish.`:'Last area point removed.';return true;}
function cancelAreaMeasurement(){if(mode!=='area')return false;areaPoints=[];if(areaPreview)map.removeLayer(areaPreview);areaPreview=null;mode='pin';refreshAreaPreview();$('measureArea').classList.remove('active');$('areaStatus').textContent='Area measurement cancelled.';return true;}
// GPS track state is checkpointed as one recoverable session. v6 keeps interrupted route gaps separate.
let trackSession=null;
try{
 const raw=JSON.parse(localStorage.getItem('fieldtrack-track-session')||'null');
 if(raw&&Array.isArray(raw.points))trackSession=raw;
}catch(e){trackSession=null}
try{trackPoints=trackSession?trackSession.points:JSON.parse(localStorage.getItem('fieldtrack-track')||'[]')}catch(e){trackPoints=[]}
if(!Array.isArray(trackPoints))trackPoints=[];
trackPoints=trackPoints.filter(p=>p&&Number.isFinite(+p.lat)&&Number.isFinite(+p.lng)&&Math.abs(+p.lat)<=90&&Math.abs(+p.lng)<=180).slice(-3000).map(p=>({...p,lat:+p.lat,lng:+p.lng}));
let bestGpsAccuracy=trackPoints.reduce((best,p)=>Number.isFinite(+p.accuracy)?Math.min(best,+p.accuracy):best,Infinity);
let lastGpsFix=null;try{const savedFix=JSON.parse(localStorage.getItem('fieldtrack-last-gps-fix')||'null');if(savedFix&&Number.isFinite(+savedFix.lat)&&Number.isFinite(+savedFix.lng)&&Math.abs(+savedFix.lat)<=90&&Math.abs(+savedFix.lng)<=180&&Number.isFinite(Date.parse(savedFix.time)))lastGpsFix={...savedFix,lat:+savedFix.lat,lng:+savedFix.lng,accuracy:Number.isFinite(+savedFix.accuracy)&&+savedFix.accuracy>0?+savedFix.accuracy:NaN}}catch(e){lastGpsFix=null}
const lastTrackFix=trackPoints[trackPoints.length-1]||null;
const savedFixTime=lastGpsFix?Date.parse(lastGpsFix.time):NaN,lastTrackFixTime=lastTrackFix?Date.parse(lastTrackFix.time):NaN;
let latestGpsFixAt=Number.isFinite(savedFixTime)&&(!Number.isFinite(lastTrackFixTime)||savedFixTime>lastTrackFixTime)?savedFixTime:(Number.isFinite(lastTrackFixTime)?lastTrackFixTime:(Number.isFinite(Date.parse(trackSession?.lastFixAt||''))?Date.parse(trackSession.lastFixAt):null));
let latestGpsAccuracy=Number.isFinite(savedFixTime)&&(!Number.isFinite(lastTrackFixTime)||savedFixTime>lastTrackFixTime)?lastGpsFix.accuracy:(lastTrackFix&&Number.isFinite(+lastTrackFix.accuracy)?+lastTrackFix.accuracy:Number(trackSession?.lastAccuracy));
let trackDistanceMeters=0, resumeNeedsSegmentBreak=!!trackSession?.segmentBreakOnResume;
let currentSpeedMps=NaN, maxSpeedMps=Number.isFinite(+trackSession?.maxSpeedMps)?Math.max(0,+trackSession.maxSpeedMps):0;
let speedUnit=['mph','knots'].includes(localStorage.getItem('fieldtrack-speed-unit'))?localStorage.getItem('fieldtrack-speed-unit'):'kmh';
function gpsDistanceMeters(a,b){const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r,lat1=a.lat*r,lat2=b.lat*r;const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;const bounded=Math.max(0,Math.min(1,h));return 6371000*2*Math.atan2(Math.sqrt(bounded),Math.sqrt(1-bounded));}
function splitTrackSegments(points=trackPoints){const segments=[];let current=[];points.forEach((point,index)=>{if(index>0&&point.breakBefore){if(current.length)segments.push(current);current=[]}current.push(point)});if(current.length)segments.push(current);return segments;}
function recalculateTrackDistance(){trackDistanceMeters=0;splitTrackSegments().forEach(segment=>{for(let i=1;i<segment.length;i++)trackDistanceMeters+=gpsDistanceMeters(segment[i-1],segment[i])});}
function gpsQuality(accuracy){if(!Number.isFinite(accuracy)||accuracy<=0)return 'Unknown';if(accuracy<=10)return 'Excellent';if(accuracy<=20)return 'Good';if(accuracy<=60)return 'Fair';return 'Poor'}
function updateGpsSignal(accuracy,timestamp=latestGpsFixAt,state=null){
 const quality=state||gpsQuality(accuracy);$('gpsSignal').textContent=quality;
 if(!Number.isFinite(timestamp))$('gpsLastFix').textContent='—';
 else {const fixDate=new Date(timestamp);$('gpsLastFix').textContent=Date.now()-timestamp>86400000?fixDate.toLocaleString():fixDate.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}
}
function updateGpsOverlay(lat,lng,accuracy,label='Your current location'){
 const ll=[lat,lng];
 if(locationMarker){locationMarker.setLatLng(ll);if(locationMarker.setPopupContent)locationMarker.setPopupContent(label)}else locationMarker=L.circleMarker(ll,{radius:8,color:'#a7d36b',fillOpacity:.9}).addTo(map).bindPopup(label);
 if(Number.isFinite(accuracy)&&accuracy>0){if(accuracyCircle)accuracyCircle.setLatLng(ll).setRadius(Math.max(accuracy,5));else accuracyCircle=L.circle(ll,{radius:Math.max(accuracy,5),color:'#a7d36b',weight:1,fillOpacity:.06}).addTo(map)}if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();
}
function trackElapsedSeconds(){let seconds=0;splitTrackSegments().forEach(segment=>{for(let i=1;i<segment.length;i++){const dt=(Date.parse(segment[i].time)-Date.parse(segment[i-1].time))/1000;if(Number.isFinite(dt)&&dt>0&&dt<=300)seconds+=dt;}});return seconds;}
function speedDisplay(mps){if(!Number.isFinite(mps))return '—';const units={kmh:{factor:3.6,label:'km/h'},mph:{factor:2.236936,label:'mph'},knots:{factor:1.943844,label:'knots'}};const unit=units[speedUnit]||units.kmh;return `${(mps*unit.factor).toFixed(1)} ${unit.label}`;}
function updateSpeedMetrics(){const live=$('gpsSpeed'),max=$('gpsMaxSpeed'),avg=$('gpsAvgSpeed');if(!live)return;live.textContent=speedDisplay(currentSpeedMps);max.textContent=speedDisplay(maxSpeedMps);const elapsed=trackElapsedSeconds(),average=elapsed>0?trackDistanceMeters/elapsed:NaN;avg.textContent=speedDisplay(average);}
function updateGpsMetrics(accuracy){$('gpsAccuracy').textContent=Number.isFinite(accuracy)?`±${Math.round(accuracy)} m`:'—';$('gpsDistance').textContent=trackDistanceMeters>=1000?`${(trackDistanceMeters/1000).toFixed(2)} km`:`${Math.round(trackDistanceMeters)} m`;$('gpsPoints').textContent=String(trackPoints.length);updateSpeedMetrics();}
const speedUnitSelect=$('speedUnit');if(speedUnitSelect){speedUnitSelect.value=speedUnit;speedUnitSelect.addEventListener('change',e=>{speedUnit=['mph','knots'].includes(e.target.value)?e.target.value:'kmh';localStorage.setItem('fieldtrack-speed-unit',speedUnit);updateSpeedMetrics();});}
function persistTrack(interrupted){
 const now=new Date().toISOString();
 trackSession={version:2,points:trackPoints,startedAt:trackSession?.startedAt||trackPoints[0]?.time||now,updatedAt:now,active:!!(trackWatchId!==null)&&!interrupted,interrupted:!!interrupted,segmentBreakOnResume:!!resumeNeedsSegmentBreak,distanceMeters:Math.round(trackDistanceMeters),bestAccuracy:Number.isFinite(bestGpsAccuracy)?bestGpsAccuracy:null,lastFixAt:latestGpsFixAt?new Date(latestGpsFixAt).toISOString():null,lastAccuracy:Number.isFinite(latestGpsAccuracy)?latestGpsAccuracy:null,maxSpeedMps:Number.isFinite(maxSpeedMps)?maxSpeedMps:0};
 const sessionSaved=saveLocal('fieldtrack-track-session',trackSession);
 const legacySaved=saveLocal('fieldtrack-track',trackPoints);
 return sessionSaved&&legacySaved;
}
function drawTrack(){trackLines.forEach(layer=>map.removeLayer(layer));trackLines=[];splitTrackSegments().filter(segment=>segment.length>1).forEach(segment=>{trackLines.push(L.polyline(segment.map(p=>[p.lat,p.lng]),{color:'#f3ca72',weight:4,opacity:.9}).addTo(map))});if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays()}
function updateTrackStatus(message){$('trackStatus').textContent=message;}
function stopGpsTrack(markInterrupted=false){
 const hadWatch=trackWatchId!==null;
 if(hadWatch){navigator.geolocation.clearWatch(trackWatchId);trackWatchId=null;}
 if(trackPoints.length)resumeNeedsSegmentBreak=true;
 currentSpeedMps=NaN;updateSpeedMetrics();
 $('startTrack').disabled=false;$('stopTrack').disabled=true;
 if(trackSession){trackSession.active=false;trackSession.interrupted=!!markInterrupted;persistTrack(!!markInterrupted);}
}
function suspendGpsTrack(reason){
 if(trackWatchId===null)return false;
 try{navigator.geolocation.clearWatch(trackWatchId)}catch(e){}
 trackWatchId=null;resumeNeedsSegmentBreak=trackPoints.length>0;currentSpeedMps=NaN;updateSpeedMetrics();
 $('startTrack').disabled=false;$('stopTrack').disabled=true;
 if(trackSession){trackSession.active=false;trackSession.interrupted=true;persistTrack(true)}
 $('gpsRecovery').textContent=`Recording paused • ${trackPoints.length} saved points. Tap Start GPS track to resume; the next route segment will be kept separate across this gap.`;
 updateTrackStatus(`${reason} Your route checkpoint is saved on this device. Tap Start GPS track when you return.`);
 return true;
}
function addGpsPosition(pos){
 const {latitude,longitude,accuracy}=pos.coords||{}, now=Date.now(), stamp=Number(pos.timestamp)||now;
 $('gpsAccuracy').textContent=Number.isFinite(accuracy)&&accuracy>0?`±${Math.round(accuracy)} m`:'—';
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){updateTrackStatus('GPS returned invalid coordinates. Waiting for a valid fix.');return}
 if(stamp>now+60000||now-stamp>120000){updateGpsSignal(accuracy,stamp,'Stale');updateTrackStatus('GPS fix is stale. Waiting for a fresh position.');return}
 if(!Number.isFinite(accuracy)||accuracy<=0||accuracy>60){latestGpsFixAt=stamp;latestGpsAccuracy=Number.isFinite(accuracy)&&accuracy>0?Number(accuracy):NaN;lastGpsFix={lat:latitude,lng:longitude,accuracy:Number.isFinite(latestGpsAccuracy)?latestGpsAccuracy:null,time:new Date(stamp).toISOString()};saveLocal('fieldtrack-last-gps-fix',lastGpsFix);updateGpsSignal(accuracy,stamp);updateGpsOverlay(latitude,longitude,accuracy);updateTrackStatus(`GPS fix too weak to record (${Number.isFinite(accuracy)?'±'+Math.round(accuracy)+' m':'unknown accuracy'}). Your location and uncertainty circle are shown, but this fix is not added to the route. Waiting for accuracy of 60 m or better.`);return}
 const ll=[latitude,longitude];
 const point={lat:latitude,lng:longitude,time:new Date(stamp).toISOString(),accuracy:Number(accuracy)};
 const previous=trackPoints[trackPoints.length-1];
 const elapsed=previous?(stamp-new Date(previous.time).getTime())/1000:0;
 if(previous&&elapsed<=0){updateTrackStatus('GPS timestamp did not advance; ignoring duplicate fix.');return}
 const startsNewSegment=!!(previous&&(resumeNeedsSegmentBreak||elapsed>300));
 let calculatedSpeed=0;
 if(previous&&!startsNewSegment&&elapsed>0){calculatedSpeed=gpsDistanceMeters(previous,point)/elapsed;}
 // GPS speed is preferred when supplied; distance/time is the fallback. A generous sanity ceiling
 // supports faster ATV and boat travel while still rejecting obvious GPS teleportation.
 const reportedSpeed=Number(pos.coords.speed);
 const measuredSpeed=Number.isFinite(reportedSpeed)&&reportedSpeed>=0&&reportedSpeed<=80?reportedSpeed:calculatedSpeed;
 if(previous&&!startsNewSegment&&calculatedSpeed>80){updateTrackStatus('GPS position jump rejected as an implausible movement. Waiting for the next fix.');return}
 currentSpeedMps=Number.isFinite(measuredSpeed)?measuredSpeed:NaN;
 if(Number.isFinite(currentSpeedMps))maxSpeedMps=Math.max(maxSpeedMps,currentSpeedMps);
 if(startsNewSegment)point.breakBefore=true;
 latestGpsFixAt=stamp;latestGpsAccuracy=Number.isFinite(accuracy)&&accuracy>0?Number(accuracy):NaN;lastGpsFix={lat:latitude,lng:longitude,accuracy:Number.isFinite(latestGpsAccuracy)?latestGpsAccuracy:null,time:new Date(stamp).toISOString()};saveLocal('fieldtrack-last-gps-fix',lastGpsFix);updateGpsSignal(accuracy,stamp);updateGpsOverlay(latitude,longitude,accuracy);
 const movedEnough=!previous||gpsDistanceMeters(previous,point)>=5, waitedEnough=!previous||stamp-new Date(previous.time).getTime()>=30000;
 bestGpsAccuracy=Math.min(bestGpsAccuracy,accuracy);
 let storageWarning=false;
 if(startsNewSegment||movedEnough||waitedEnough){trackPoints.push(point);resumeNeedsSegmentBreak=false;if(trackPoints.length>3000)trackPoints=trackPoints.slice(-3000);recalculateTrackDistance();storageWarning=!persistTrack(false);drawTrack();}
 updateGpsMetrics(accuracy);
 if(trackPoints.length===1){if(typeof setFieldTrackView==='function')setFieldTrackView(ll,16);else map.setView(ll,16)}
 const segmentCount=splitTrackSegments().length;
 updateTrackStatus(storageWarning?'Recording, but device storage is full. Export your map and track now to keep a backup.':`Recording this device • ${trackPoints.length} points • ${segmentCount} route segment${segmentCount===1?'':'s'} • current ±${Math.round(accuracy)} m • best ±${Math.round(bestGpsAccuracy)} m. Gaps are not drawn as straight lines.`);
}
function renderRecoveredTrack(){
 if(trackSession&&trackSession.active){trackSession.active=false;trackSession.interrupted=true;trackSession.recoveredAfterUncleanExit=true;resumeNeedsSegmentBreak=trackPoints.length>0;}
 if(trackPoints.length&&(!trackSession||!trackSession.active||trackSession.interrupted||trackSession.segmentBreakOnResume))resumeNeedsSegmentBreak=true;
 recalculateTrackDistance();drawTrack();
 const lastPoint=trackPoints[trackPoints.length-1],lastPointTime=lastPoint?Date.parse(lastPoint.time):NaN;
 if(lastGpsFix&&(!Number.isFinite(lastPointTime)||Date.parse(lastGpsFix.time)>lastPointTime)){latestGpsFixAt=Date.parse(lastGpsFix.time);latestGpsAccuracy=lastGpsFix.accuracy;updateGpsOverlay(lastGpsFix.lat,lastGpsFix.lng,lastGpsFix.accuracy,'Last known GPS fix — not live');}
 else if(lastPoint){latestGpsFixAt=lastPointTime;latestGpsAccuracy=Number(lastPoint.accuracy);}
 const restoredLabel=lastGpsFix?'Last known':lastPoint?'Last saved':'No fix';
 updateGpsMetrics(latestGpsAccuracy);updateGpsSignal(latestGpsAccuracy,latestGpsFixAt,restoredLabel==='No fix'?restoredLabel:restoredLabel+' · '+gpsQuality(latestGpsAccuracy));
 if(trackSession&&trackSession.interrupted){persistTrack(true);$('gpsRecovery').textContent=`An interrupted track was recovered: ${trackPoints.length} saved points (${trackDistanceMeters>=1000?(trackDistanceMeters/1000).toFixed(2)+' km':Math.round(trackDistanceMeters)+' m'}) across ${splitTrackSegments().length} route segment(s). Press Start GPS track to continue without drawing a false line across the gap.`;updateTrackStatus('Previous GPS session recovered. Recording is stopped until you tap Start.');}
 else if(trackPoints.length){$('gpsRecovery').textContent=`Previous route available on this device • ${trackPoints.length} saved points. Start tracking to continue it.`;updateTrackStatus('Saved route restored. GPS tracking is off.');}
}
renderRecoveredTrack();
$('startTrack').onclick=()=>{
 if(!navigator.geolocation){updateTrackStatus('This browser does not provide GPS location.');return}
 if(!window.isSecureContext){updateTrackStatus('GPS needs a secure HTTPS page (or localhost). This saved-file preview may not allow GPS.');return}
 if(trackWatchId!==null)return;
 if(trackSession?.interrupted&&trackPoints.length)resumeNeedsSegmentBreak=true;
 trackSession={...(trackSession||{}),version:2,points:trackPoints,startedAt:trackSession?.startedAt||new Date().toISOString(),active:true,interrupted:false};persistTrack(false);
 $('startTrack').disabled=true;$('stopTrack').disabled=false;updateTrackStatus('Waiting for a fresh, accurate GPS fix…');
 try{trackWatchId=navigator.geolocation.watchPosition(addGpsPosition,err=>{
  const msg=err.code===1?'Location permission denied.':err.code===2?'GPS position temporarily unavailable.':'GPS timed out; still waiting for another fix.';
  if(err.code===1){updateGpsSignal(NaN,latestGpsFixAt,'Permission denied');stopGpsTrack(false);updateTrackStatus(msg+' Allow location access in phone settings before restarting.');}
  else {updateGpsSignal(NaN,latestGpsFixAt,err.code===2?'Signal unavailable':'Waiting for fix');updateTrackStatus(msg+' Your saved route is safe; the GPS watch remains active and will accept the next valid fix.');}
 },{enableHighAccuracy:true,maximumAge:0,timeout:30000});persistTrack(false);
 }catch(err){trackWatchId=null;stopGpsTrack(false);updateTrackStatus('Could not start GPS tracking: '+err.message)}
};
$('stopTrack').onclick=()=>{stopGpsTrack(false);updateTrackStatus(`Tracking stopped • ${trackPoints.length} points • route checkpoint saved on this device. Starting again creates a separate segment.`)};
$('clearTrack').onclick=()=>{if(confirm('Delete the GPS track saved on this device?')){stopGpsTrack(false);trackPoints=[];trackSession=null;trackDistanceMeters=0;bestGpsAccuracy=Infinity;resumeNeedsSegmentBreak=false;currentSpeedMps=NaN;maxSpeedMps=0;localStorage.removeItem('fieldtrack-track-session');saveLocal('fieldtrack-track',trackPoints);drawTrack();updateGpsMetrics(NaN);latestGpsFixAt=null;updateGpsSignal(NaN,null,'No fix');$('gpsRecovery').textContent='';updateTrackStatus('GPS track cleared from this device.')}};
// One lifecycle handler owns suspension. It is deliberately idempotent because pagehide and beforeunload can both fire.
function handleTrackPageExit(){suspendGpsTrack('GPS recording paused because the page is closing.');}
window.addEventListener('pagehide',handleTrackPageExit);
window.addEventListener('beforeunload',handleTrackPageExit);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden')suspendGpsTrack('GPS recording paused because FieldTrack went into the background.');
 else if(trackSession?.interrupted&&trackPoints.length){$('gpsRecovery').textContent=`Recording is paused • ${trackPoints.length} points recovered. Tap Start GPS track to resume on a separate route segment.`;updateTrackStatus('FieldTrack is visible again. GPS does not automatically restart; tap Start GPS track to continue.');}
});
$('startBoundary').onclick=()=>{cancelAreaMeasurement();mode='boundary';boundaryPoints=[];refreshBoundaryPreview();$('startBoundary').classList.add('active');$('addPin').classList.remove('active');$('measure').classList.remove('active');$('boundaryStatus').textContent='Tap around the property edge on the map. Add at least 3 points. You can undo the last point or cancel without changing the saved outline.'};
$('undoBoundary').onclick=undoBoundaryPoint;
$('cancelBoundary').onclick=cancelBoundaryDrawing;
$('finishBoundary').onclick=()=>{if(mode!=='boundary'||!boundaryCanFinish(boundaryPoints)){$('boundaryStatus').textContent='Add at least 3 points before finishing.';return}savedBoundary=boundaryPoints.map(p=>[p.lat,p.lng]);localStorage.setItem('fieldtrack-boundary',JSON.stringify(savedBoundary));if(boundaryPreview)map.removeLayer(boundaryPreview);boundaryPreview=null;boundaryPoints=[];mode='pin';refreshBoundaryPreview();$('startBoundary').classList.remove('active');renderBoundary()};
$('fitBoundary').onclick=()=>{if(!fitSavedBoundary())$('boundaryStatus').textContent='No valid saved boundary is available to zoom to.'};
$('clearBoundary').onclick=()=>{if(confirm('Clear the saved property boundary from this device?')){savedBoundary=null;localStorage.removeItem('fieldtrack-boundary');if(boundaryLayer)map.removeLayer(boundaryLayer);boundaryLayer=null;updateBoundaryFitControl();boundaryPoints=[];mode='pin';refreshBoundaryPreview();if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();$('boundaryStatus').textContent='No property boundary drawn yet.';$('startBoundary').classList.remove('active')}};
$('maptype').addEventListener('change',e=>{[street,topo,sat].forEach(l=>map.removeLayer(l));({street,topo,sat}[e.target.value]).addTo(map);updateSatelliteLabels()});
$('measureArea').onclick=()=>{cancelBoundaryDrawing();cancelAreaMeasurement();mode='area';areaPoints=[];if(areaPreview)map.removeLayer(areaPreview);areaPreview=null;if(measuredAreaLayer)map.removeLayer(measuredAreaLayer);measuredAreaLayer=null;refreshAreaPreview();$('measureArea').classList.add('active');$('measure').classList.remove('active');$('addPin').classList.remove('active');$('startBoundary').classList.remove('active');$('areaStatus').textContent='Tap around the area edge. Add at least 3 points, then finish.'};
$('undoArea').onclick=undoAreaPoint;
$('cancelArea').onclick=cancelAreaMeasurement;
$('finishArea').onclick=()=>{if(mode!=='area'||areaPoints.length<3){$('areaStatus').textContent='Add at least 3 points before finishing the area.';return}const points=areaPoints.slice(),m2=polygonAreaSquareMeters(points);if(areaPreview)map.removeLayer(areaPreview);areaPreview=null;if(measuredAreaLayer)map.removeLayer(measuredAreaLayer);measuredAreaLayer=L.polygon(points,{color:'#f3ca72',weight:2,fillColor:'#f3ca72',fillOpacity:.12,dashArray:'6 5'}).addTo(map);areaPoints=[];mode='pin';refreshAreaPreview();if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();$('measureArea').classList.remove('active');$('areaStatus').textContent=`Area: ${Math.round(m2).toLocaleString()} m² • ${(m2/10000).toFixed(2)} ha • ${(m2/4046.8564224).toFixed(2)} acres. Approximate map measurement.`};
$('addPin').onclick=()=>{cancelBoundaryDrawing();cancelAreaMeasurement();mode='pin';$('addPin').classList.add('active');$('measure').classList.remove('active');$('coords').textContent='Tap the map where you want to place the pin.'};
$('measure').onclick=()=>{cancelBoundaryDrawing();cancelAreaMeasurement();mode='measure';firstMeasure=null;$('measure').classList.add('active');$('addPin').classList.remove('active');$('rangeText').textContent='Tap your start point, then end point.';if(measureLine){map.removeLayer(measureLine);measureLine=null}};
$('locate').onclick=()=>{if(!navigator.geolocation){$('weatherText').textContent='Location is not supported by this browser.';return}navigator.geolocation.getCurrentPosition(pos=>{const ll=[pos.coords.latitude,pos.coords.longitude];setFieldTrackView(ll,16);if(locationMarker)map.removeLayer(locationMarker);locationMarker=L.circleMarker(ll,{radius:8,color:'#a7d36b',fillOpacity:.8}).addTo(map).bindPopup('Your current location');if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();loadWeather(ll[0],ll[1]);inspectElevation(ll[0],ll[1]);},()=>{$('weatherText').textContent='Location permission denied or unavailable. Tap the map to choose a location.'},{enableHighAccuracy:true,timeout:12000})};
map.on('click',e=>{const ll=e.latlng;if(mode==='boundary'){boundaryPoints.push(ll);refreshBoundaryPreview();$('boundaryStatus').textContent=boundaryPoints.length+' boundary points added. '+(boundaryCanFinish(boundaryPoints)?'You can finish the boundary now, or undo/cancel.':'Add at least '+(3-boundaryPoints.length)+' more point(s) to finish.')}else if(mode==='area'){areaPoints.push(ll);refreshAreaPreview();$('areaStatus').textContent=areaPoints.length+' area points added. '+(areaPoints.length>=3?'You can finish the area now, or undo/cancel.':'Add at least '+(3-areaPoints.length)+' more point(s) to finish.')}else if(mode==='measure'){if(!firstMeasure){firstMeasure=ll;$('rangeText').textContent='Start point set. Tap the end point.';L.circleMarker(ll,{radius:5,color:'#f3ca72'}).addTo(map)}else{if(measureLine)map.removeLayer(measureLine);measureLine=L.polyline([firstMeasure,ll],{color:'#f3ca72',weight:4,dashArray:'7 6'}).addTo(map);const m=distance(firstMeasure,ll),b=bearing(firstMeasure,ll);$('rangeText').textContent=`${nice(metersToYards(m))} yd (${nice(m)} m) • bearing ${Math.round(b)}° ${cardinal(b)}`;firstMeasure=null;mode='pin';$('measure').classList.remove('active');if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays()}}else if($('addPin').classList.contains('active')){const pin=normalizePin({id:makePinId(),lat:ll.lat,lng:ll.lng,name:$('pinName').value,type:$('pinType').value,note:$('pinNote').value,time:new Date().toISOString()});if(pin)pins.push(pin);drawPins();$('pinName').value='';$('pinNote').value='';$('addPin').classList.remove('active');L.popup().setLatLng(ll).setContent('Pin saved.').openOn(map)}else{selected=ll;$('coords').textContent=`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)} • loading elevation…`;loadWeather(ll.lat,ll.lng);inspectElevation(ll.lat,ll.lng)}});
let lastWeatherLocation=null,windForecastRequest=0;
async function loadWeather(lat,lon){lastWeatherLocation={lat:Number(lat),lon:Number(lon)};$('weatherText').textContent='Loading current modelled conditions…';if(!$('windForecast').hidden)loadWindForecast(lat,lon);try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto`;const r=await fetch(u);if(!r.ok)throw Error('Weather unavailable');const d=await r.json(),c=d.current,wind=updateWindCompass(c.wind_direction_10m);$('windSpeed').textContent=nice(c.wind_speed_10m)+' km/h';$('windDir').textContent=wind?`${formatBearing(wind.from)}° ${wind.fromLabel}`:'Unavailable';$('weatherText').textContent=`${nice(c.temperature_2m)}°C • gusts ${nice(c.wind_gusts_10m)} km/h • updated ${c.time||'now'}. Direction is where wind comes FROM.`}catch(e){updateWindCompass(null);$('windSpeed').textContent='—';$('windDir').textContent='Unavailable';$('weatherText').textContent='Could not load weather. Check connection and try again.'}}
async function loadWindForecast(lat,lon){const request=++windForecastRequest,status=$('windForecastStatus'),list=$('windForecastList');status.textContent='Loading the next 7 days of modelled wind…';list.innerHTML='';try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max&forecast_days=7&wind_speed_unit=kmh&timezone=auto`;const r=await fetch(u);if(!r.ok)throw Error('Forecast unavailable');const d=await r.json(),day=d.daily||{},dates=day.time||[],speeds=day.wind_speed_10m_max||[],directions=day.wind_direction_10m_dominant||[],gusts=day.wind_gusts_10m_max||[];if(!dates.length)throw Error('No daily wind forecast returned');if(request!==windForecastRequest)return;const hasValue=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));list.innerHTML=dates.slice(0,7).map((date,i)=>{const parsed=new Date(`${date}T12:00:00`),dayName=Number.isNaN(parsed.getTime())?String(date):parsed.toLocaleDateString([],{weekday:'short'}),speed=hasValue(speeds[i])?`${nice(speeds[i])} km/h`:'—',gust=hasValue(gusts[i])?`${nice(gusts[i])} km/h`:'—',dir=hasValue(directions[i])?`${formatBearing(directions[i])}° ${cardinal16(directions[i])}`:'—';return `<div class="forecast-row"><strong>${esc(dayName)}</strong><span>${esc(speed)}</span><span>${esc(gust)}</span><span>${esc(dir)}</span></div>`}).join('');status.textContent=`Next ${Math.min(dates.length,7)} days • daily maximum wind and gusts • direction is the dominant direction wind comes FROM.`}catch(e){if(request===windForecastRequest)status.textContent='Could not load the 7-day wind forecast. Check the connection and try again.'}}
$('showWindForecast').onclick=()=>{const panel=$('windForecast'),open=panel.hidden;panel.hidden=!open;$('showWindForecast').setAttribute('aria-expanded',String(open));$('showWindForecast').textContent=open?'Hide 7-day wind forecast':'Show 7-day wind forecast';if(open){const point=lastWeatherLocation||selected||(locationMarker?locationMarker.getLatLng():null);if(point)loadWindForecast(point.lat,point.lon);else $('windForecastStatus').textContent='Tap the map or use My location first to choose a forecast location.'}};
$('refreshWeather').onclick=()=>{const c=selected|| (locationMarker?locationMarker.getLatLng():map.getCenter());loadWeather(c.lat,c.lng)};
async function inspectElevation(lat,lon){$('elevation').textContent='Loading…';try{const r=await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);if(!r.ok)throw Error();const d=await r.json();$('elevation').textContent=(d.elevation?.[0]!=null?Math.round(d.elevation[0])+' m':'Unavailable');$('coords').textContent=`${lat.toFixed(6)}, ${lon.toFixed(6)} • elevation estimate`}catch(e){$('elevation').textContent='Unavailable';$('coords').textContent=`${lat.toFixed(6)}, ${lon.toFixed(6)} • elevation lookup failed`}}
function geojsonPayload(){return {type:'FeatureCollection',name:'FieldTrack',metadata:{exportedAt:new Date().toISOString(),app:'FieldTrack',formatVersion:1},features:[...pins.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{id:p.id,name:p.name||'',type:p.type,note:p.note,time:p.time}})),...(savedBoundary&&savedBoundary.length>=3?[{type:'Feature',geometry:{type:'Polygon',coordinates:[[...savedBoundary.map(p=>[p[1],p[0]]),[savedBoundary[0][1],savedBoundary[0][0]]]]},properties:{type:'User-drawn property boundary',warning:'User-drawn outline; not a legal survey'}}]:[]),...splitTrackSegments().filter(segment=>segment.length>1).map((segment,index)=>({type:'Feature',geometry:{type:'LineString',coordinates:segment.map(p=>[p.lng,p.lat])},properties:{type:'GPS track segment',segment:index+1,points:segment,warning:'Recorded on one device; gaps between segments are intentional; not live hunter sharing'}}))]}}
function downloadGeojson(filename){const blob=new Blob([JSON.stringify(geojsonPayload(),null,2)],{type:'application/geo+json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('exportPins').onclick=()=>downloadGeojson('fieldtrack-map.geojson');
$('exportTrack').onclick=()=>downloadGeojson('fieldtrack-map-and-track.geojson');
$('exportData').onclick=()=>{downloadGeojson('fieldtrack-map-backup.geojson');$('dataStatus').textContent='Map backup exported. Keep the GeoJSON file somewhere safe; it contains hunting locations and route data.'};
$('importData').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{
 const d=JSON.parse(await f.text());if(d.type!=='FeatureCollection'||!Array.isArray(d.features))throw Error('Not a GeoJSON FeatureCollection');
 const incoming=[],polygons=[],lines=[];
 for(const feature of d.features){const g=feature.geometry,p=feature.properties||{};if(!g)continue;
  if(g.type==='Point'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2){const [lng,lat]=g.coordinates;if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)incoming.push(normalizePin({id:makePinId(),lat,lng,name:p.name||'',type:p.type||'Imported waypoint',note:p.note||'',time:p.time||new Date().toISOString()}))}
  else if(g.type==='Polygon'||g.type==='MultiPolygon')polygons.push(feature);
  else if(g.type==='LineString'||g.type==='MultiLineString')lines.push(feature);
 }
 const total=incoming.length+polygons.length+lines.length;if(!total)throw Error('No supported map features found');
 if(confirm(`Import ${incoming.length} waypoints, ${polygons.length} boundary shapes and ${lines.length} tracks?`)){
  pins.push(...incoming.filter(Boolean));drawPins();
  polygons.forEach(feature=>{const p=feature.properties||{},ring=feature.geometry.type==='Polygon'?feature.geometry.coordinates[0]:feature.geometry.coordinates[0]?.[0];if(ring?.length>=4&&/property boundary/i.test(p.type||'')){savedBoundary=ring.slice(0,-1).map(([lng,lat])=>[lat,lng]);saveLocal('fieldtrack-boundary',savedBoundary);renderBoundary()}else L.geoJSON(feature).addTo(importedLayer)});
  lines.forEach(feature=>L.geoJSON(feature,{style:{color:'#f3ca72',weight:4,dashArray:'5 4'}}).addTo(importedLayer));if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();
  $('dataStatus').textContent=`Imported ${incoming.length} waypoints, ${polygons.length} boundary shapes and ${lines.length} tracks from ${f.name}. Non-property shapes and imported tracks are displayed for this session.`;
 }
 }catch(err){$('dataStatus').textContent='Import failed: '+(err.message||'choose a valid GeoJSON FeatureCollection with Point, Polygon or LineString features.')}e.target.value='';};
$('clearPins').onclick=()=>{if(confirm('Delete all saved pins from this browser?')){pins=[];drawPins()}};
$('ownershipFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(ownershipLayer)map.removeLayer(ownershipLayer);ownershipLayer=L.geoJSON(data,{style:feature=>{const p=feature.properties||{},s=JSON.stringify(p).toLowerCase();return {color:s.includes('crown')?'#a7d36b':s.includes('private')?'#f3ca72':'#79b8e8',weight:2,fillOpacity:.12}},onEachFeature:(feature,layer)=>layer.bindPopup('<b>Boundary data</b><br>'+esc(JSON.stringify(feature.properties||{}).slice(0,700)))}).addTo(map);if(ownershipLayer.getBounds().isValid())fitFieldTrackBounds(ownershipLayer.getBounds(),{padding:[36,36],maxZoom:17});if(typeof syncMapLibreOverlays==='function')syncMapLibreOverlays();$('ownershipStatus').textContent='Loaded '+f.name+'. Colour is inferred from attribute text only; verify data source, date, and legal status.'}catch(err){$('ownershipStatus').textContent='Could not read file. Use valid GeoJSON/JSON.'}};

