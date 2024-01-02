import * as maplibregl from 'maplibre-gl'; //map lib
import * as syncMaps from '@mapbox/mapbox-gl-sync-move'; //syncing map movement
import * as pmtiles from "pmtiles"; //pmtiles stuff
import layers from 'protomaps-themes-base'; //styling

//bullshit because syncMaps is cjs or something so it breaks in prod...thanks js
const actualSyncMaps = syncMaps.default ?? syncMaps;

//css
import './node_modules/maplibre-gl/dist/maplibre-gl.css';
import './node_modules/@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css';

//pmtiles protocol handling setup
let protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

//logging stuff
const workersLogger = document.getElementById('workers-logger');
const r2Logger = document.getElementById('r2-logger');

//logging function
const sendLog = (log, element) => {
  if (element.children.length >= 20) { //cant make it too long
    element.removeChild(element.lastChild);
  }

  const p = document.createElement("p");
  
  p.className = 'log';
  p.innerHTML = `<span class="coord">${log.z}/${log.x}/${log.y}</span> - <span class="size">${log.size / 1000} kB</span> - <span class="time">${log.duration}ms</span>`

  element.insertBefore(p, element.firstChild);
}

const buildLog = (e, element) => {
  if (!e.tile) return;

  const logData = {
    z: e?.tile?.latestFeatureIndex?.z,
    x: e?.tile?.latestFeatureIndex?.x,
    y: e?.tile?.latestFeatureIndex?.y,
    size: e?.tile?.latestRawTileData?.byteLength,
    duration: e?.tile?.resourceTiming[0]?.duration,
  };

  sendLog(logData, element);
}

self.addEventListener("fetch", (event) => {
  console.log("Handling fetch event for", event.request.url);
});

//variables for setup
const initialCoords = [-87.63081155037817, 41.881198583190304];
const initialZoom = 10;
const mapLayers = layers('protomaps', 'dark');

//map powered by workers
const workersMap = new maplibregl.Map({
  container: "workers",
  center: initialCoords,
  zoom: initialZoom,
  collectResourceTiming: true,
  hash: true,
  style: {
    glyphs:
      "https://fonts.transitstat.us/_output/{fontstack}/{range}.pbf",
    sprite: "https://osml.transitstat.us/sprites/osm-liberty",
    layers: mapLayers,
    sources: {
      protomaps: {
        type: "vector",
        tiles: [
          "https://tilea.piemadd.com/tiles/{z}/{x}/{y}.mvt",
          "https://tileb.piemadd.com/tiles/{z}/{x}/{y}.mvt",
          "https://tilec.piemadd.com/tiles/{z}/{x}/{y}.mvt",
          "https://tiled.piemadd.com/tiles/{z}/{x}/{y}.mvt",
        ],
        maxzoom: 13,
      }
    },
    version: 8
  },
  transformRequest: (url, resourceType) => {
    return { url, collectResourceTiming: true }
  }
});

const r2Map = new maplibregl.Map({
  container: "r2",
  center: initialCoords,
  zoom: initialZoom,
  collectResourceTiming: true,
  hash: true,
  style: {
    glyphs:
      "https://fonts.transitstat.us/_output/{fontstack}/{range}.pbf",
    sprite: "https://osml.transitstat.us/sprites/osm-liberty",
    layers: mapLayers,
    sources: {
      protomaps: {
        type: "vector",
        url: "pmtiles://https://tiles.transitstat.us/pmtiles/03-06-2023/tiles.pmtiles",
        maxzoom: 13,
        attribution: 'Map Data &copy; OpenStreetMap Contributors | &copy; Transitstatus 2023 | Uses Protomaps'
      }
    },
    version: 8
  }
})
  .addControl(new maplibregl.NavigationControl({
    visualizePitch: true
  }));

//showing map boundaries for funsies
workersMap.showTileBoundaries = true;
r2Map.showTileBoundaries = true;

workersMap.on('sourcedata', (e) => {
  buildLog(e, workersLogger);
})

r2Map.on('sourcedata', (e) => {
  buildLog(e, r2Logger);
})

actualSyncMaps(workersMap, r2Map);

console.log('Both maps are exposed as the variables \'workers\' (left) and \'r2\' (right) respectively');
console.log('workers', workers)
console.log('r2', r2)