'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

// Fix for default marker icons in React Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const PickupIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DropoffIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RiderIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to handle auto-panning/fitting bounds
function MapBoundsUpdater({ 
  riderLocation, 
  pickupLocation, 
  dropoffLocation,
  isFollowingRider
}: { 
  riderLocation?: { lat: number; lng: number } | null,
  pickupLocation?: { lat: number; lng: number } | null,
  dropoffLocation?: { lat: number; lng: number } | null,
  isFollowingRider: boolean
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const isValidLocation = (loc: TrackingLocation | null | undefined): loc is TrackingLocation & { lat: number; lng: number } => {
      return !!loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
    };

    if (isFollowingRider && isValidLocation(riderLocation)) {
      map.setView([riderLocation.lat, riderLocation.lng], map.getZoom(), {
        animate: true,
        duration: 1
      });
      return;
    }

    const points: L.LatLngTuple[] = [];
    if (isValidLocation(riderLocation)) points.push([riderLocation.lat, riderLocation.lng]);
    if (isValidLocation(pickupLocation)) points.push([pickupLocation.lat, pickupLocation.lng]);
    if (isValidLocation(dropoffLocation)) points.push([dropoffLocation.lat, dropoffLocation.lng]);

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [map, riderLocation, pickupLocation, dropoffLocation, isFollowingRider]);

  return null;
}

export interface TrackingLocation {
  lat: number;
  lng: number;
  address?: string;
  heading?: number;
  speed?: number;
}

interface LiveTrackingMapProps {
  riderLocation?: TrackingLocation | null;
  pickupLocation?: TrackingLocation | null;
  dropoffLocation?: TrackingLocation | null;
  isFollowingRider?: boolean;
  className?: string;
}

export default function LiveTrackingMap({
  riderLocation,
  pickupLocation,
  dropoffLocation,
  isFollowingRider = false,
  className = 'h-full w-full min-h-[400px]',
}: LiveTrackingMapProps) {
  
  // Default center (e.g. Dhaka)
  const defaultCenter: L.LatLngTuple = [23.8103, 90.4125];
  
  const isValidLocation = (loc: TrackingLocation | null | undefined): loc is TrackingLocation & { lat: number; lng: number } => {
    return !!loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
  };

  const center: L.LatLngTuple = isValidLocation(riderLocation)
    ? [riderLocation.lat, riderLocation.lng]
    : isValidLocation(pickupLocation)
      ? [pickupLocation.lat, pickupLocation.lng]
      : defaultCenter;

  const routePoints: L.LatLngTuple[] = [];
  if (isValidLocation(riderLocation)) routePoints.push([riderLocation.lat, riderLocation.lng]);
  else if (isValidLocation(pickupLocation)) routePoints.push([pickupLocation.lat, pickupLocation.lng]);
  if (isValidLocation(dropoffLocation)) routePoints.push([dropoffLocation.lat, dropoffLocation.lng]);

  return (
    <div className={`relative z-0 ${className}`}>
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={false}
        className="h-full w-full rounded-lg shadow-inner z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapBoundsUpdater 
          riderLocation={riderLocation}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          isFollowingRider={isFollowingRider}
        />

        {routePoints.length >= 2 && (
          <Polyline 
            positions={routePoints} 
            color="#3b82f6" 
            weight={4}
            dashArray="10, 10"
            opacity={0.7}
          />
        )}

        {isValidLocation(pickupLocation) && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={PickupIcon}>
            <Popup>
              <strong>Pickup Location</strong>
              <br />
              {pickupLocation.address || 'Restaurant'}
            </Popup>
          </Marker>
        )}

        {isValidLocation(dropoffLocation) && (
          <Marker position={[dropoffLocation.lat, dropoffLocation.lng]} icon={DropoffIcon}>
            <Popup>
              <strong>Delivery Location</strong>
              <br />
              {dropoffLocation.address || 'Customer'}
            </Popup>
          </Marker>
        )}

        {isValidLocation(riderLocation) && (
          <Marker 
            position={[riderLocation.lat, riderLocation.lng]} 
            icon={RiderIcon}
          >
            <Popup>
              <strong>Rider Location</strong>
              <br />
              Speed: {riderLocation.speed ? `${Math.round(riderLocation.speed)} km/h` : 'N/A'}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
