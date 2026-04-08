#!/usr/bin/env python3
"""
WMS Raster Viewer with GeoJSON Clipping
Shows full raster from GeoServer WMS, then clips to uploaded GeoJSON boundary.
Run: python raster_clip_viewer.py
Then open http://localhost:5000 in your browser.
"""

from flask import Flask, send_file, jsonify, request
import io
import os

app = Flask(__name__)

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Landcover Raster Clip Viewer</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --bg: #0a0e1a;
    --panel: #111827;
    --border: #1e2d40;
    --accent: #00d4aa;
    --accent2: #ff6b35;
    --text: #e2e8f0;
    --muted: #64748b;
    --panel-w: 320px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    height: 100vh;
    display: flex;
    overflow: hidden;
  }

  /* ── SIDEBAR ── */
  #sidebar {
    width: var(--panel-w);
    min-width: var(--panel-w);
    background: var(--panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow-y: auto;
  }

  .logo {
    padding: 24px 20px 16px;
    border-bottom: 1px solid var(--border);
  }

  .logo h1 {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .logo p {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
    line-height: 1.4;
  }

  .section {
    padding: 20px;
    border-bottom: 1px solid var(--border);
  }

  .section-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* drop zone */
  #drop-zone {
    border: 2px dashed var(--border);
    border-radius: 8px;
    padding: 28px 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
  }

  #drop-zone:hover, #drop-zone.drag-over {
    border-color: var(--accent);
    background: rgba(0, 212, 170, 0.05);
  }

  #drop-zone svg {
    width: 32px;
    height: 32px;
    stroke: var(--accent);
    margin-bottom: 10px;
  }

  #drop-zone p {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
  }

  #drop-zone strong {
    color: var(--accent);
    display: block;
    font-size: 14px;
    margin-bottom: 4px;
  }

  #file-input { display: none; }

  /* file list */
  #file-list {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .file-tag {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0,212,170,0.08);
    border: 1px solid rgba(0,212,170,0.2);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-family: 'Space Mono', monospace;
    color: var(--accent);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .file-tag button {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.2s;
  }
  .file-tag button:hover { color: var(--accent2); }

  /* action buttons */
  .btn {
    width: 100%;
    padding: 11px;
    border-radius: 7px;
    border: none;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 8px;
  }

  .btn-primary {
    background: var(--accent);
    color: #0a0e1a;
    font-weight: 700;
  }
  .btn-primary:hover { background: #00bfa0; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover { border-color: var(--muted); color: var(--text); }

  /* status */
  #status {
    font-size: 12px;
    color: var(--muted);
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(255,255,255,0.03);
    line-height: 1.5;
    display: none;
  }
  #status.visible { display: block; }
  #status.success { color: var(--accent); background: rgba(0,212,170,0.08); }
  #status.error   { color: var(--accent2); background: rgba(255,107,53,0.08); }

  /* layer toggle */
  .layer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 13px;
  }

  .toggle {
    width: 36px;
    height: 20px;
    border-radius: 10px;
    background: var(--border);
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    border: none;
    flex-shrink: 0;
  }
  .toggle.on { background: var(--accent); }
  .toggle::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    top: 3px;
    left: 3px;
    transition: left 0.2s;
  }
  .toggle.on::after { left: 19px; }

  /* opacity slider */
  .slider-row { display: flex; flex-direction: column; gap: 6px; padding: 6px 0; }
  .slider-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); }
  input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    outline: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
  }

  /* info footer */
  #info-footer {
    margin-top: auto;
    padding: 16px 20px;
    font-size: 11px;
    color: var(--muted);
    border-top: 1px solid var(--border);
    line-height: 1.6;
  }

  /* ── MAP ── */
  #map {
    flex: 1;
    position: relative;
  }

  /* Leaflet overrides */
.leaflet-container { background: #ffffff !important; }
  /* clip mask canvas overlay */
  #clip-canvas {
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
    z-index: 450;
  }

  /* loading spinner */
  #loader {
    position: absolute;
    top: 50%;
    left: calc(50% + var(--panel-w)/2);
    transform: translate(-50%, -50%);
    z-index: 999;
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  #loader.visible { display: flex; }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  #loader p {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.1em;
  }

  /* coordinates HUD */
  #coords-hud {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 500;
    background: rgba(10,14,26,0.85);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 14px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    backdrop-filter: blur(6px);
    pointer-events: none;
  }
</style>
</head>
<body>

<div id="sidebar">
  <div class="logo">
    <h1>Raster Clip Viewer</h1>
    <p>GeoServer WMS · Landcover OSS 2000<br>Upload a GeoJSON to clip the raster</p>
  </div>

  <div class="section">
    <div class="section-label">GeoJSON Mask</div>
    <div id="drop-zone" onclick="document.getElementById('file-input').click()">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
        <polyline points="8 10 12 6 16 10"/>
        <line x1="12" y1="6" x2="12" y2="16"/>
      </svg>
      <strong>Drop GeoJSON here</strong>
      <p>or click to browse<br><span style="font-size:11px;color:#334155">.geojson / .json</span></p>
    </div>
    <input type="file" id="file-input" accept=".geojson,.json" multiple/>
    <div id="file-list"></div>
  </div>

  <div class="section">
    <div class="section-label">Actions</div>
    <button class="btn btn-primary" id="btn-clip" disabled onclick="applyClip()">Apply Clip Mask</button>
    <button class="btn btn-ghost" onclick="resetView()">Reset Full Raster</button>
    <div id="status"></div>
  </div>

  <div class="section">
    <div class="section-label">Layers</div>

    <div class="layer-row">
      <span>WMS Raster</span>
      <button class="toggle on" id="toggle-wms" onclick="toggleLayer('wms', this)"></button>
    </div>
    <div class="slider-row">
      <div class="slider-label"><span>Opacity</span><span id="wms-opacity-val">85%</span></div>
      <input type="range" min="0" max="100" value="85" id="wms-opacity" oninput="setOpacity('wms', this.value)"/>
    </div>

    <div class="layer-row" style="margin-top:10px">
      <span>GeoJSON Outline</span>
      <button class="toggle on" id="toggle-geojson" onclick="toggleLayer('geojson', this)"></button>
    </div>
    <div class="slider-row">
      <div class="slider-label"><span>Opacity</span><span id="geojson-opacity-val">100%</span></div>
      <input type="range" min="0" max="100" value="100" id="geojson-opacity" oninput="setOpacity('geojson', this.value)"/>
    </div>
  </div>

  <div id="info-footer">
    <b style="color:var(--text)">Layer:</b> LC:LandcoverOSS2000<br>
    <b style="color:var(--text)">SRS:</b> EPSG:4326<br>
    <b style="color:var(--text)">Format:</b> image/png<br>
    <b style="color:var(--text)">Source:</b> localhost:8081
  </div>
</div>

<div id="map">
  <canvas id="clip-canvas"></canvas>
  <div id="loader"><div class="spinner"></div><p>Loading…</p></div>
  <div id="coords-hud">lat — &nbsp; lng —</div>
</div>

<script>
// ── State ──
const WMS_URL   = 'http://localhost:8081/geoserver/LC/wms';
const WMS_LAYER = 'LC:LandcoverOSS2000';
const FULL_BBOX = [[-34.834, -25.359], [37.560, 60.000]]; // [[south,west],[north,east]]

let map, wmsLayer, geojsonLayer;
let loadedGeoJSONs  = [];  // {name, geojson}
let clipping = false;

// ── Init map ──
function initMap() {
  map = L.map('map', {
    center: [1.36, 17.32],
    zoom: 4,
    zoomControl: true,
    attributionControl: false,
  });

// OSM basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

  // WMS Layer
  wmsLayer = L.tileLayer.wms(WMS_URL, {
    layers: WMS_LAYER,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    opacity: 0.85,
    attribution: 'GeoServer LC'
  }).addTo(map);

  // Fit to full raster extent
  map.fitBounds(FULL_BBOX);

  // Coords HUD
  map.on('mousemove', e => {
    document.getElementById('coords-hud').innerHTML =
      `lat ${e.latlng.lat.toFixed(4)} &nbsp; lng ${e.latlng.lng.toFixed(4)}`;
  });

  // Resize canvas with map
  map.on('resize move zoom', resizeCanvas);
  resizeCanvas();
}

function resizeCanvas() {
  const c = document.getElementById('clip-canvas');
  const mapEl = document.getElementById('map');
  c.width  = mapEl.offsetWidth;
  c.height = mapEl.offsetHeight;
  if (clipping) redrawClipMask();
}

// ── File handling ──
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

async function handleFiles(files) {
  for (const file of files) {
    if (!file.name.match(/\.(geojson|json)$/i)) continue;
    try {
      const text = await file.text();
      const geojson = JSON.parse(text);
      if (!geojson.type) throw new Error('Invalid GeoJSON');
      loadedGeoJSONs.push({ name: file.name, geojson });
      addFileTag(file.name, loadedGeoJSONs.length - 1);
    } catch(e) {
      setStatus(`❌ Failed to parse ${file.name}: ${e.message}`, 'error');
    }
  }
  document.getElementById('btn-clip').disabled = loadedGeoJSONs.length === 0;
  fileInput.value = '';
}

function addFileTag(name, idx) {
  const list = document.getElementById('file-list');
  const tag = document.createElement('div');
  tag.className = 'file-tag';
  tag.dataset.idx = idx;
  tag.innerHTML = `<span>${name.length > 28 ? name.slice(0,25)+'…' : name}</span>
    <button onclick="removeFile(${idx}, this.parentElement)" title="Remove">✕</button>`;
  list.appendChild(tag);
}

function removeFile(idx, el) {
  loadedGeoJSONs[idx] = null;
  el.remove();
  const remaining = loadedGeoJSONs.filter(Boolean);
  if (remaining.length === 0) {
    document.getElementById('btn-clip').disabled = true;
    resetView();
  }
}

// ── Clip logic ──
function applyClip() {
  const validGeoJSONs = loadedGeoJSONs.filter(Boolean);
  if (!validGeoJSONs.length) return;

  clipping = true;
  setStatus('✓ Clip mask applied. Only the GeoJSON area shows the raster.', 'success');

  // Remove old geojson layer
  if (geojsonLayer) { map.removeLayer(geojsonLayer); geojsonLayer = null; }

  // Merge all GeoJSONs into a FeatureCollection
  const allFeatures = validGeoJSONs.flatMap(g => {
    if (g.geojson.type === 'FeatureCollection') return g.geojson.features;
    if (g.geojson.type === 'Feature') return [g.geojson];
    return [{ type: 'Feature', geometry: g.geojson, properties: {} }];
  });

  const merged = { type: 'FeatureCollection', features: allFeatures };

  // Show GeoJSON outline
  geojsonLayer = L.geoJSON(merged, {
    style: {
      color: '#00d4aa',
      weight: 2,
      opacity: 1,
      fillColor: '#00d4aa',
      fillOpacity: 0,
    }
  }).addTo(map);

  // Fit map to GeoJSON bounds
  map.fitBounds(geojsonLayer.getBounds(), { padding: [40, 40] });

  // Draw clip mask after map settles
  setTimeout(() => drawClipMask(merged), 400);

  map.on('moveend zoomend', () => {
    if (clipping) redrawClipMask();
  });
}

let _currentMerged = null;

function drawClipMask(merged) {
  _currentMerged = merged;
  redrawClipMask();
}

function redrawClipMask() {
  if (!_currentMerged) return;
  const canvas = document.getElementById('clip-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Fill entire canvas with dark overlay (masks the WMS)
ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(0, 0, W, H);

  // Cut out the GeoJSON shapes using destination-out (makes them transparent = raster shows through)
  ctx.globalCompositeOperation = 'destination-out';

  const features = _currentMerged.features;
  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom) continue;
    drawGeometry(ctx, geom);
  }

  ctx.globalCompositeOperation = 'source-over';
}

function drawGeometry(ctx, geom) {
  if (geom.type === 'Polygon') {
    drawPolygon(ctx, geom.coordinates);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) drawPolygon(ctx, poly);
  } else if (geom.type === 'GeometryCollection') {
    for (const g of geom.geometries) drawGeometry(ctx, g);
  }
}

function drawPolygon(ctx, rings) {
  ctx.beginPath();
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
      // Adjust for sidebar offset
      const x = pt.x;
      const y = pt.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fill();
}

function resetView() {
  clipping = false;
  _currentMerged = null;
  loadedGeoJSONs = [];
  document.getElementById('file-list').innerHTML = '';
  document.getElementById('btn-clip').disabled = true;

  const canvas = document.getElementById('clip-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (geojsonLayer) { map.removeLayer(geojsonLayer); geojsonLayer = null; }
  map.off('moveend zoomend');
  map.fitBounds(FULL_BBOX);
  setStatus('', '');
}

// ── Layer toggles ──
function toggleLayer(which, btn) {
  btn.classList.toggle('on');
  const on = btn.classList.contains('on');
  if (which === 'wms' && wmsLayer) {
    on ? map.addLayer(wmsLayer) : map.removeLayer(wmsLayer);
  } else if (which === 'geojson' && geojsonLayer) {
    on ? map.addLayer(geojsonLayer) : map.removeLayer(geojsonLayer);
  }
}

function setOpacity(which, val) {
  if (which === 'wms') {
    document.getElementById('wms-opacity-val').textContent = val + '%';
    if (wmsLayer) wmsLayer.setOpacity(val / 100);
  } else if (which === 'geojson') {
    document.getElementById('geojson-opacity-val').textContent = val + '%';
    if (geojsonLayer) geojsonLayer.setStyle({ opacity: val/100 });
  }
}

// ── Status ──
function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = msg ? `visible ${type}` : '';
}

// ── Boot ──
window.addEventListener('load', initMap);
</script>
</body>
</html>
"""

@app.route('/')
def index():
    return HTML

if __name__ == '__main__':
    print("=" * 55)
    print("  Raster Clip Viewer")
    print("  Open http://localhost:5000 in your browser")
    print("=" * 55)
    app.run(debug=True, port=5001)