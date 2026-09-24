/**
 * AgriMonitor Nearby Agricultural Services Types (Phase 6)
 */

export type PlaceCategory =
  | 'all'
  | 'fertilizer'
  | 'seeds'
  | 'agri_supply'
  | 'agri_center'
  | 'government';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  operator?: string;
}

export interface NearbySearchOptions {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category?: PlaceCategory;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version?: number;
  generator?: string;
  osm3s?: any;
  elements: OverpassElement[];
}
