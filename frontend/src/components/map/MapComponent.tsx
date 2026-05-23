'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, MapContainerProps } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';

interface MapComponentProps extends Partial<MapContainerProps> {
  height?: string;
  bounds?: LatLngBoundsExpression;
}

const defaultCenter: [number, number] = [23.8103, 90.4125]; // Dhaka, Bangladesh
const defaultZoom = 12;

export default function MapComponent({
  children,
  height = '400px',
  center = defaultCenter,
  zoom = defaultZoom,
  bounds,
  ...props
}: MapComponentProps) {
  return (
    <div style={{ height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        {...props}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}
