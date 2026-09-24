/**
 * AgriMonitor Overpass OpenStreetMap Search Service (Phase 6)
 *
 * Queries public OpenStreetMap Overpass API for agricultural POIs,
 * normalizes nodes/ways/relations, calculates Haversine distances, and sorts results.
 */

import {
  NearbyPlace,
  NearbySearchOptions,
  OverpassElement,
  OverpassResponse,
  PlaceCategory,
} from '../../types/nearby';
import { calculateDistanceMeters } from '../../lib/distance';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export class OverpassService {
  private static cachedPlaces: NearbyPlace[] = [];
  private static lastQueryKey: string | null = null;
  private static inFlightController: AbortController | null = null;

  /**
   * Builds an Overpass QL query string for given coordinate, radius, and optional category
   */
  public static buildOverpassQuery(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    category: PlaceCategory = 'all'
  ): string {
    const radius = Math.min(Math.max(radiusMeters, 1000), 25000); // 1km to 25km bounds

    let filterClauses = '';

    if (category === 'fertilizer') {
      filterClauses = `
        node["shop"="fertilizer"](around:${radius},${latitude},${longitude});
        way["shop"="fertilizer"](around:${radius},${latitude},${longitude});
        node["shop"="agrarian"]["fertilizer"](around:${radius},${latitude},${longitude});
        way["shop"="agrarian"]["fertilizer"](around:${radius},${latitude},${longitude});
      `;
    } else if (category === 'seeds') {
      filterClauses = `
        node["shop"="seeds"](around:${radius},${latitude},${longitude});
        way["shop"="seeds"](around:${radius},${latitude},${longitude});
        node["shop"="agrarian"]["seeds"](around:${radius},${latitude},${longitude});
        way["shop"="agrarian"]["seeds"](around:${radius},${latitude},${longitude});
      `;
    } else if (category === 'agri_supply') {
      filterClauses = `
        node["shop"="agrarian"](around:${radius},${latitude},${longitude});
        way["shop"="agrarian"](around:${radius},${latitude},${longitude});
        node["shop"="farm"](around:${radius},${latitude},${longitude});
        way["shop"="farm"](around:${radius},${latitude},${longitude});
        node["shop"="garden_centre"](around:${radius},${latitude},${longitude});
        way["shop"="garden_centre"](around:${radius},${latitude},${longitude});
      `;
    } else if (category === 'agri_center') {
      filterClauses = `
        node["amenity"="marketplace"]["agrarian"](around:${radius},${latitude},${longitude});
        way["amenity"="marketplace"]["agrarian"](around:${radius},${latitude},${longitude});
        node["amenity"="warehouse"]["agricultural"](around:${radius},${latitude},${longitude});
        way["amenity"="warehouse"]["agricultural"](around:${radius},${latitude},${longitude});
        node["building"="agricultural"](around:${radius},${latitude},${longitude});
        way["building"="agricultural"](around:${radius},${latitude},${longitude});
      `;
    } else if (category === 'government') {
      filterClauses = `
        node["office"="government"]["government"="agriculture"](around:${radius},${latitude},${longitude});
        way["office"="government"]["government"="agriculture"](around:${radius},${latitude},${longitude});
        node["office"="government"]["name"~"agri|krishi|farmer|agriculture",i](around:${radius},${latitude},${longitude});
        way["office"="government"]["name"~"agri|krishi|farmer|agriculture",i](around:${radius},${latitude},${longitude});
      `;
    } else {
      // 'all' query: Comprehensive union of agricultural POIs
      filterClauses = `
        node["shop"="agrarian"](around:${radius},${latitude},${longitude});
        way["shop"="agrarian"](around:${radius},${latitude},${longitude});
        node["shop"="fertilizer"](around:${radius},${latitude},${longitude});
        way["shop"="fertilizer"](around:${radius},${latitude},${longitude});
        node["shop"="seeds"](around:${radius},${latitude},${longitude});
        way["shop"="seeds"](around:${radius},${latitude},${longitude});
        node["shop"="farm"](around:${radius},${latitude},${longitude});
        way["shop"="farm"](around:${radius},${latitude},${longitude});
        node["shop"="garden_centre"](around:${radius},${latitude},${longitude});
        way["shop"="garden_centre"](around:${radius},${latitude},${longitude});
        node["office"="government"]["government"="agriculture"](around:${radius},${latitude},${longitude});
        way["office"="government"]["government"="agriculture"](around:${radius},${latitude},${longitude});
        node["office"="government"]["name"~"agri|krishi|farmer|agriculture",i](around:${radius},${latitude},${longitude});
        way["office"="government"]["name"~"agri|krishi|farmer|agriculture",i](around:${radius},${latitude},${longitude});
        node["amenity"="marketplace"]["agrarian"](around:${radius},${latitude},${longitude});
        way["amenity"="marketplace"]["agrarian"](around:${radius},${latitude},${longitude});
      `;
    }

    return `[out:json][timeout:25];(${filterClauses});out center tags;`;
  }

  /**
   * Classify an Overpass element into a domain PlaceCategory
   */
  public static categorizeElement(tags?: Record<string, string>): {
    category: PlaceCategory;
    label: string;
  } {
    if (!tags) {
      return { category: 'agri_supply', label: 'Agricultural Supply' };
    }

    const shop = (tags.shop || '').toLowerCase();
    const office = (tags.office || '').toLowerCase();
    const gov = (tags.government || '').toLowerCase();
    const name = (tags.name || '').toLowerCase();

    if (shop === 'fertilizer' || tags.fertilizer === 'yes' || name.includes('fertilizer')) {
      return { category: 'fertilizer', label: 'Fertilizer Shop' };
    }

    if (shop === 'seeds' || tags.seeds === 'yes' || name.includes('seed')) {
      return { category: 'seeds', label: 'Seed Store' };
    }

    if (
      office === 'government' ||
      gov === 'agriculture' ||
      name.includes('krishi') ||
      name.includes('dept of agriculture') ||
      name.includes('raitha') ||
      name.includes('panchayat')
    ) {
      return { category: 'government', label: 'Agri Govt Office' };
    }

    if (
      tags.amenity === 'marketplace' ||
      tags.amenity === 'warehouse' ||
      tags.building === 'agricultural' ||
      name.includes('center') ||
      name.includes('centre') ||
      name.includes('mandi')
    ) {
      return { category: 'agri_center', label: 'Agricultural Center' };
    }

    return { category: 'agri_supply', label: 'Agricultural Supplies' };
  }

  /**
   * Formats address components from OSM tags
   */
  public static formatAddress(tags?: Record<string, string>): string | undefined {
    if (!tags) return undefined;

    const parts: string[] = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
    if (tags['addr:city'] || tags['addr:town'] || tags['addr:village']) {
      parts.push(tags['addr:city'] || tags['addr:town'] || tags['addr:village']!);
    }
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Parses raw Overpass JSON response into normalized NearbyPlace objects
   */
  public static parseOverpassResponse(
    response: OverpassResponse,
    userLat: number,
    userLon: number
  ): NearbyPlace[] {
    if (!response || !Array.isArray(response.elements)) {
      return [];
    }

    const places: NearbyPlace[] = [];
    const seenCoordinates = new Set<string>();

    for (const elem of response.elements) {
      const lat = elem.lat ?? elem.center?.lat;
      const lon = elem.lon ?? elem.center?.lon;

      if (lat === undefined || lon === undefined) {
        continue;
      }

      // Deduplicate overlapping nodes at exact same coordinates
      const coordKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
      if (seenCoordinates.has(coordKey)) {
        continue;
      }
      seenCoordinates.add(coordKey);

      const tags = elem.tags || {};
      const rawName = tags.name || tags['name:en'] || tags.operator || tags.brand;
      const categorization = this.categorizeElement(tags);

      // Prefer named POIs, fallback to category label with locality
      const name = rawName ? rawName.trim() : `${categorization.label}`;

      const distanceMeters = calculateDistanceMeters(userLat, userLon, lat, lon);
      const address = this.formatAddress(tags);
      const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'];
      const website = tags.website || tags['contact:website'];
      const openingHours = tags.opening_hours;
      const operator = tags.operator;

      places.push({
        id: `osm_${elem.type}_${elem.id}`,
        name,
        category: categorization.category,
        categoryLabel: categorization.label,
        latitude: lat,
        longitude: lon,
        distanceMeters,
        address,
        phone,
        website,
        openingHours,
        operator,
      });
    }

    // Sort ascending by distance (nearest first)
    places.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return places;
  }

  /**
   * Search nearby agricultural POIs using Overpass API with endpoint fallback and local caching
   */
  public static async searchNearby(options: NearbySearchOptions): Promise<NearbyPlace[]> {
    const { latitude, longitude, radiusMeters, category = 'all' } = options;

    const queryKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}_${radiusMeters}`;

    // Cancel any previous in-flight request
    if (this.inFlightController) {
      this.inFlightController.abort();
    }
    this.inFlightController = new AbortController();

    // If we have cached results for this location/radius, filter locally
    if (this.lastQueryKey === queryKey && this.cachedPlaces.length > 0) {
      if (category === 'all') {
        return this.cachedPlaces;
      }
      return this.cachedPlaces.filter((p) => p.category === category);
    }

    const overpassQuery = this.buildOverpassQuery(latitude, longitude, radiusMeters, 'all');

    let lastError: any = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: this.inFlightController.signal,
        });

        if (!response.ok) {
          throw new Error(`Overpass server responded with status: ${response.status}`);
        }

        const data: OverpassResponse = await response.json();
        const allPlaces = this.parseOverpassResponse(data, latitude, longitude);

        this.cachedPlaces = allPlaces;
        this.lastQueryKey = queryKey;

        if (category === 'all') {
          return allPlaces;
        }
        return allPlaces.filter((p) => p.category === category);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return [];
        }
        lastError = err;
        console.warn(`[OverpassService] Error with endpoint ${endpoint}:`, err?.message || err);
      }
    }

    throw new Error(
      lastError?.message ||
        'Unable to load nearby agricultural locations. Please check your network connection.'
    );
  }

  /**
   * Clear in-memory query cache
   */
  public static clearCache() {
    this.cachedPlaces = [];
    this.lastQueryKey = null;
  }
}
