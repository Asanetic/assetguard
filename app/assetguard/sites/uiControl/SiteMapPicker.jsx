"use client";
import { useEffect, useRef, useState } from 'react';

/**
 * SiteLocationMap
 * Drop-in Google Map with a single pin — for showing (or picking) a site's
 * exact location. Fully self-contained, no page coupling.
 *
 * Built as a section block: takes ONE json `data` object (matches the
 * row/section-data pattern used elsewhere), not a pile of individual props.
 *
 * data shape (all optional except latitude/longitude):
 * {
 *   latitude: number,
 *   longitude: number,
 *   zoom: number,              // default 15
 *   height: string,            // default '220px'
 *   draggable: bool,           // default false
 *   caption: string,           // default 'Exact site location — updates when coordinates change'
 *   markerColor: string,       // default '#2E6CF5'
 *   apiKey: string,            // overrides NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *   className: string
 * }
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your env (or data.apiKey).
 *
 * Props:
 *  - data: json object described above (required)
 *  - onLocationChange({ lat, lng }): fires after a drag when data.draggable=true
 */

let loaderPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('mosy-google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'mosy-google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loaderPromise;
}

// Muted, brand-friendly map palette (greens/blues) to echo the prototype look
const MUTED_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EAF1E6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F8FAFC' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFE3F5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function SiteLocationMap({ data = {}, onLocationChange }) {
  const {
    latitude,
    longitude,
    zoom = 15,
    height = '230px',
    draggable = false,
    caption = 'Exact site location — updates when coordinates change',
    markerColor = '#2E6CF5',
    apiKey,
    className = '',
  } = data;

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const key = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!key) {
      setStatus('error');
      return;
    }
    let cancelled = false;

    loadGoogleMaps(key)
      .then((google) => {
        if (cancelled || !mapDivRef.current) return;

        const center = { lat: Number(latitude) || 0, lng: Number(longitude) || 0 };

        const map = new google.maps.Map(mapDivRef.current, {
          center,
          zoom,
          styles: MUTED_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });

        const marker = new google.maps.Marker({
          position: center,
          map,
          draggable,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
        });

        if (draggable) {
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            onLocationChange && onLocationChange({ lat: pos.lat(), lng: pos.lng() });
          });
        }

        mapRef.current = map;
        markerRef.current = marker;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Keep map/marker in sync when latitude/longitude change after initial load
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !markerRef.current) return;
    const center = { lat: Number(latitude) || 0, lng: Number(longitude) || 0 };
    mapRef.current.panTo(center);
    markerRef.current.setPosition(center);
  }, [latitude, longitude, status]);

  return (
    <div
      className={`position-relative border rounded-3 overflow-hidden ${className}`}
      style={{ height, background: '#EAF1E6' }}
    >
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

      {status === 'loading' && (
        <div className="position-absolute top-50 start-50 translate-middle small text-muted">
          Loading map…
        </div>
      )}

      {status === 'error' && (
        <div className="position-absolute top-50 start-50 translate-middle small text-muted text-center px-3">
          Map unavailable — check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </div>
      )}

      {caption && status === 'ready' && (
        <div
          className="position-absolute bottom-0 start-0 small px-2 py-1"
          style={{ color: '#94A3B8', fontSize: '10.5px' }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}