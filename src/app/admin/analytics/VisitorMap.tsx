'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { StrataSession } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

interface SessionDetail {
  ip: string;
  browser: string;
  os: string;
  device: string;
  entryPage: string;
  pageviews: number;
  time: string;
}

interface CityMarker {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  sessions: SessionDetail[];
}

interface VisitorMapProps {
  sessions: StrataSession[];
}

// Major city coordinates fallback
const CITY_COORDS: Record<string, [number, number]> = {
  'New York': [40.7128, -74.006], 'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298], 'Houston': [29.7604, -95.3698],
  'Miami': [25.7617, -80.1918], 'San Francisco': [37.7749, -122.4194],
  'Seattle': [47.6062, -122.3321], 'Dallas': [32.7767, -96.797],
  'Boston': [42.3601, -71.0589], 'Atlanta': [33.749, -84.388],
  'Denver': [39.7392, -104.9903], 'Phoenix': [33.4484, -112.074],
  'London': [51.5074, -0.1278], 'Paris': [48.8566, 2.3522],
  'Berlin': [52.52, 13.405], 'Tokyo': [35.6762, 139.6503],
  'Sydney': [-33.8688, 151.2093], 'Toronto': [43.6532, -79.3832],
  'Dubai': [25.2048, 55.2708], 'Singapore': [1.3521, 103.8198],
  'Frankfurt am Main': [50.1109, 8.6821], 'Frankfurt': [50.1109, 8.6821],
  'Mumbai': [19.076, 72.8777], 'Shanghai': [31.2304, 121.4737],
  'Sao Paulo': [-23.5505, -46.6333], 'Mexico City': [19.4326, -99.1332],
  'Amsterdam': [52.3676, 4.9041], 'Seoul': [37.5665, 126.978],
  'Istanbul': [41.0082, 28.9784], 'Moscow': [55.7558, 37.6173],
  'Lagos': [6.5244, 3.3792], 'Cairo': [30.0444, 31.2357],
  'San Jose': [37.3382, -121.8863], 'Ashburn': [39.0438, -77.4874],
  'Petah Tikva': [32.0876, 34.8739], 'Kfar Yasif': [32.9547, 35.1693],
  'Tel Aviv': [32.0853, 34.7818], 'Jerusalem': [31.7683, 35.2137],
  'Haifa': [32.7940, 34.9896],
};

// Auto-fit map bounds to markers
function FitBounds({ markers }: { markers: CityMarker[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || markers.length === 0) return;
    fitted.current = true;

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 10);
    } else {
      const bounds = markers.map(m => [m.lat, m.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [markers, map]);

  return null;
}

export default function VisitorMap({ sessions }: VisitorMapProps) {
  const [selectedCity, setSelectedCity] = useState<CityMarker | null>(null);

  // Aggregate sessions by city
  const cityMarkers = useMemo(() => {
    const cityMap = new Map<string, CityMarker>();
    for (const s of sessions) {
      const city = s.city || 'Unknown';
      const country = s.country || 'Unknown';
      if (city === 'Unknown') continue;

      const detail: SessionDetail = {
        ip: s.ip_address || '—',
        browser: s.browser || '—',
        os: s.os || '—',
        device: s.device_type || '—',
        entryPage: s.entry_page || '/',
        pageviews: s.pageview_count || 0,
        time: s.started_at ? new Date(s.started_at).toLocaleString() : '—',
      };

      const key = `${city}|${country}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.count++;
        existing.sessions.push(detail);
        if (s.latitude != null && s.longitude != null && !existing.lat) {
          existing.lat = s.latitude;
          existing.lng = s.longitude;
        }
      } else {
        let lat = s.latitude;
        let lng = s.longitude;
        if (lat == null || lng == null) {
          const coords = CITY_COORDS[city];
          if (coords) [lat, lng] = coords;
        }
        if (lat != null && lng != null) {
          cityMap.set(key, { city, country, lat, lng, count: 1, sessions: [detail] });
        }
      }
    }
    return Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
  }, [sessions]);

  const maxCount = Math.max(...cityMarkers.map(m => m.count), 1);
  const totalVisitors = cityMarkers.reduce((sum, m) => sum + m.count, 0);
  const totalCountries = useMemo(() => new Set(cityMarkers.map(m => m.country)).size, [cityMarkers]);
  const topCity = cityMarkers[0];

  if (cityMarkers.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-background border border-border" style={{ height: 540 }}>
        <div className="text-center">
          <div className="text-3xl mb-3 opacity-40">🗺️</div>
          <div className="text-text-muted text-sm">No city-level geo data yet</div>
          <div className="text-text-muted/70 text-xs mt-1">Visitor locations will appear as data comes in</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 540 }}>
      <MapContainer
        center={[30, 10]}
        zoom={3}
        scrollWheelZoom={true}
        zoomControl={true}
        className="w-full h-full z-0"
        style={{ height: '100%', background: '#f8fafc' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={cityMarkers} />

        {cityMarkers.map((marker) => {
          const intensity = Math.min(marker.count / maxCount, 1);
          const radius = Math.max(6, Math.min(24, 6 + intensity * 18));

          return (
            <CircleMarker
              key={`${marker.city}-${marker.country}`}
              center={[marker.lat, marker.lng]}
              radius={radius}
              pathOptions={{
                color: '#0891b2',
                fillColor: `hsl(${190 + intensity * 30}, 90%, ${60 - intensity * 15}%)`,
                fillOpacity: 0.7 + intensity * 0.2,
                weight: 2,
              }}
              eventHandlers={{
                click: () => setSelectedCity(prev =>
                  prev?.city === marker.city && prev?.country === marker.country ? null : marker
                ),
              }}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <div className="font-bold text-sm">{marker.city}</div>
                  <div className="text-xs text-gray-500">{marker.country}</div>
                  <div className="mt-1 pt-1 border-t border-gray-100">
                    <span className="text-lg font-black text-cyan-600">{marker.count}</span>
                    <span className="text-xs text-gray-500 ml-1">
                      {marker.count === 1 ? 'visitor' : 'visitors'}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({((marker.count / totalVisitors) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Stats overlay - top left */}
      <div className="absolute top-3 left-3 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-600">Live Geo</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{totalVisitors}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {cityMarkers.length} {cityMarkers.length === 1 ? 'city' : 'cities'} &middot; {totalCountries} {totalCountries === 1 ? 'country' : 'countries'}
          </div>
          {topCity && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Top Origin</div>
              <div className="text-sm font-bold text-cyan-600">{topCity.city}</div>
              <div className="text-xs text-gray-400">{topCity.count} visitors</div>
            </div>
          )}
        </div>
      </div>

      {/* City rankings - top right */}
      {cityMarkers.length > 1 && (
        <div className="absolute top-3 right-3 z-[1000]">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 px-3 py-3 shadow-lg w-48">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Top Locations</div>
            <div className="space-y-1.5">
              {cityMarkers.slice(0, 6).map((m, i) => {
                const pct = (m.count / maxCount) * 100;
                return (
                  <div key={`${m.city}-${m.country}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400 w-3">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[90px]">{m.city}</span>
                      </div>
                      <span className="text-xs font-bold text-cyan-600 tabular-nums">{m.count}</span>
                    </div>
                    <div className="ml-4 h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Session detail panel */}
      {selectedCity && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000]">
          <div className="bg-white/98 backdrop-blur-sm border-t border-gray-200">
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-sm font-bold text-gray-900">{selectedCity.city}</span>
                <span className="text-xs text-gray-400">{selectedCity.country}</span>
                <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
                  {selectedCity.count} {selectedCity.count === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-[10px] uppercase tracking-wider bg-gray-50">
                    <th className="text-left px-4 py-1.5 font-semibold">IP</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Browser</th>
                    <th className="text-left px-3 py-1.5 font-semibold">OS</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Device</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Entry Page</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Pages</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCity.sessions.map((s, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-1.5 font-mono text-cyan-700">{s.ip}</td>
                      <td className="px-3 py-1.5 text-gray-600">{s.browser}</td>
                      <td className="px-3 py-1.5 text-gray-600">{s.os}</td>
                      <td className="px-3 py-1.5 text-gray-500">{s.device}</td>
                      <td className="px-3 py-1.5 text-gray-500 max-w-[180px] truncate">{s.entryPage}</td>
                      <td className="px-3 py-1.5 text-gray-600 tabular-nums">{s.pageviews}</td>
                      <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{s.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
