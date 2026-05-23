'use client';
import { useEffect } from 'react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';

interface AddressMarkerProps {
  position: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AddressMarker({ position, onMapClick }: AddressMarkerProps) {
  return (
    <>
      <ClickHandler onClick={onMapClick} />
      {position && (
        <Marker position={position}>
          <Popup>
            [{position[0].toFixed(6)}, {position[1].toFixed(6)}]
          </Popup>
        </Marker>
      )}
    </>
  );
}
