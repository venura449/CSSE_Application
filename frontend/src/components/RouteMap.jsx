import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

function haversine(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat / 2) * Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon), Math.sqrt(1 - (sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon)));
  return R * c;
}

export default function RouteMap({ events }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const polyRef = useRef(null);
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [sequence, setSequence] = useState([]);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (!mapEl.current) return;
    // initialize map
    const defaultCenter = events && events.length > 0 ? [events[0].location.lat, events[0].location.lng] : [6.9271, 79.8612];
    const map = L.map(mapEl.current, { preferCanvas: true }).setView(defaultCenter, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    // add markers
    events.forEach(ev => {
      if (!ev.location || ev.location.lat == null) return;
      const m = L.marker([ev.location.lat, ev.location.lng]).addTo(map).bindPopup(`${ev.type} • ${ev.time || ''}`);
      markersRef.current[ev.id] = m;
    });
    // fit
    const group = L.featureGroup(Object.values(markersRef.current));
    if (Object.keys(markersRef.current).length > 0) map.fitBounds(group.getBounds().pad(0.2));
  }, [events]);

  async function resolveMyLocation() {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition((pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => resolve(null));
    });
  }

  async function computeRoute() {
    // collect points
    const points = events.filter(e => e.location && e.location.lat != null).map(e => ({ id: e.id, lat: e.location.lat, lng: e.location.lng }));
    if (points.length === 0) return setSequence([]);
    let startPoint = null;
    let endPoint = null;
    if (useMyLocation && myLocation) {
      startPoint = { id: '__start__', lat: myLocation.lat, lng: myLocation.lng };
    } else if (startId) {
      startPoint = points.find(p => p.id === startId);
    }
    if (endId) endPoint = points.find(p => p.id === endId);

    // build route sequence using greedy nearest neighbor
    const remaining = points.slice();
    let seq = [];
    if (startPoint) {
      // if start is not one of points (my location), we don't include it in sequence results but start from it
      if (startPoint.id !== '__start__') {
        seq.push(startPoint);
        const idx = remaining.findIndex(r => r.id === startPoint.id);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    } else {
      // no start chosen: pick first as start
      seq.push(remaining.shift());
    }

    while (remaining.length > 0) {
      const last = seq[seq.length - 1] || startPoint;
      // if next should be endPoint and endPoint is in remaining and it's the nearest, it will be picked; otherwise keep going
      let nearestIdx = 0;
      let nearestDist = haversine(last, remaining[0]);
      for (let i = 1; i < remaining.length; i++) {
        const d = haversine(last, remaining[i]);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      seq.push(remaining.splice(nearestIdx, 1)[0]);
    }

    // if endPoint chosen and it's not last, move it to last
    if (endPoint) {
      const idx = seq.findIndex(s => s.id === endPoint.id);
      if (idx >= 0 && idx !== seq.length - 1) {
        const [ep] = seq.splice(idx, 1);
        seq.push(ep);
      }
    }

    setSequence(seq);
    // draw route using OSRM (road-aware)
    try {
      setIsRouting(true);
      await drawRouteOSRM(seq, startPoint);
    } catch (err) {
      console.error('OSRM route failed, falling back to straight lines', err);
      drawPolyline(seq, startPoint);
    } finally {
      setIsRouting(false);
    }
  }

  function drawPolyline(seq, startPoint) {
    const map = mapRef.current;
    if (!map) return;
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    const latlngs = [];
    if (startPoint && startPoint.id === '__start__') latlngs.push([startPoint.lat, startPoint.lng]);
    seq.forEach(s => latlngs.push([s.lat, s.lng]));
    polyRef.current = L.polyline(latlngs, { color: 'blue' }).addTo(map);
    // add numbered markers
    seq.forEach((s, i) => {
      const marker = markersRef.current[s.id];
      if (marker) marker.bindTooltip(String(i + 1), { permanent: true, direction: 'top', className: 'bg-white text-black px-1 rounded' }).openTooltip();
    });
  }

  async function drawRouteOSRM(seq, startPoint) {
    const map = mapRef.current;
    if (!map) return;
    // build coordinate list for OSRM: lon,lat;lon,lat;...
    const coordList = [];
    if (startPoint && startPoint.id === '__start__') {
      coordList.push([startPoint.lng, startPoint.lat]);
    }
    seq.forEach(s => coordList.push([s.lng, s.lat]));
    // join
    const coordStr = coordList.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM request failed');
    const json = await res.json();
    if (!json.routes || !json.routes[0]) throw new Error('No route');
    const geo = json.routes[0].geometry;
    // remove previous
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    polyRef.current = L.geoJSON(geo, { style: { color: 'blue', weight: 4 } }).addTo(map);
    const bounds = polyRef.current.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    // add numbered markers (ensure they show on top)
    seq.forEach((s, i) => {
      const marker = markersRef.current[s.id];
      if (marker) marker.bindTooltip(String(i + 1), { permanent: true, direction: 'top', className: 'bg-white text-black px-1 rounded' }).openTooltip();
    });
  }

  useEffect(() => {
    if (useMyLocation) {
      resolveMyLocation().then(loc => { setMyLocation(loc); });
    }
  }, [useMyLocation]);

  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="flex gap-3 mb-2 items-center">
        <div>
          <label className="text-xs text-gray-600">Start</label>
          <select className="border rounded p-1 m-2" value={startId} onChange={e => setStartId(e.target.value)}>
            <option value="">(auto)</option>
            <option value="__my">My Location</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.type} • {ev.time || ''}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">End</label>
          <select className="border rounded p-1 m-2" value={endId} onChange={e => setEndId(e.target.value)}>
            <option value="">(none)</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.type} • {ev.time || ''}</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => {
            if (startId === '__my') { setUseMyLocation(true); setStartId(''); } else setUseMyLocation(false);
            computeRoute();
          }}>Compute Route</button>
        </div>
      </div>
      <div ref={mapEl} className="h-64 rounded" />
      {sequence && sequence.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">Route: {sequence.map((s, i) => `${i+1}. ${s.id}`).join(' → ')}</div>
      )}
    </div>
  );
}
