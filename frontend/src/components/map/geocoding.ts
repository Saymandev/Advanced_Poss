'use client';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=en`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RahaPOS/1.0' },
  });
  const data = await response.json();
  return data.map((item: any) => ({
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    displayName: item.display_name,
    address: {
      road: item.address?.road,
      city: item.address?.city || item.address?.town || item.address?.village,
      state: item.address?.state,
      country: item.address?.country,
      postcode: item.address?.postcode,
    },
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RahaPOS/1.0' },
  });
  const data = await response.json();
  if (!data || data.error) return null;
  return {
    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),
    displayName: data.display_name,
    address: {
      road: data.address?.road,
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
      postcode: data.address?.postcode,
    },
  };
}
