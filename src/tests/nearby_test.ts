/**
 * AgriMonitor Phase 6 Nearby Services Unit Tests
 *
 * Verifies:
 * 1. Haversine distance calculations and user-friendly formatting.
 * 2. Overpass query construction for all categories.
 * 3. Element classification from OpenStreetMap tags.
 * 4. Response parsing (nodes, ways with center, address extraction, sorting nearest-first).
 * 5. Error handling and malformed API payload resilience.
 */

import { calculateDistanceMeters, formatDistance } from '../lib/distance';
import { OverpassService } from '../services/maps/overpassService';
import { OverpassResponse } from '../types/nearby';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('=== Starting AgriMonitor Phase 6 Nearby Services Test Suite ===\n');

  // TEST 1: Haversine Distance Calculation
  console.log('--- 1. Testing Haversine Distance Calculation & Formatting ---');
  
  // Same coordinates -> 0 meters
  const zeroDistance = calculateDistanceMeters(13.0827, 80.2707, 13.0827, 80.2707);
  assert(zeroDistance === 0, 'Same coordinates produce 0 m');
  assert(formatDistance(0) === '0 m', 'Formats 0 m');

  // Short distance (~111 meters for 0.001 deg latitude)
  const shortDist = calculateDistanceMeters(13.0827, 80.2707, 13.0837, 80.2707);
  assert(shortDist >= 105 && shortDist <= 118, `Short distance calculated accurately: ${shortDist} m`);
  assert(formatDistance(shortDist) === `${shortDist} m`, 'Formats sub-kilometer distances in meters');

  // Known city distance (Chennai 13.0827, 80.2707 to Bangalore 12.9716, 77.5946 ~ 290 km)
  const cityDist = calculateDistanceMeters(13.0827, 80.2707, 12.9716, 77.5946);
  assert(cityDist >= 285000 && cityDist <= 295000, `Intercity distance calculated accurately: ${cityDist} m`);
  assert(formatDistance(cityDist) === '290 km', 'Formats long distances in whole kilometers');

  // Format distance boundary tests
  assert(formatDistance(450) === '450 m', 'Sub-1km formats as meters');
  assert(formatDistance(1400) === '1.4 km', '1.4km formats with single decimal');
  assert(formatDistance(15600) === '16 km', 'Over 10km formats as whole km');

  // TEST 2: Overpass Query Construction
  console.log('\n--- 2. Testing Overpass Query Construction ---');
  const allQuery = OverpassService.buildOverpassQuery(13.0827, 80.2707, 5000, 'all');
  assert(allQuery.includes('around:5000,13.0827,80.2707'), 'Includes center coordinates and radius');
  assert(allQuery.includes('"shop"="fertilizer"') && allQuery.includes('"shop"="seeds"'), 'Includes multiple POI tags in "all"');
  assert(allQuery.includes('out center tags;'), 'Requests center coordinates for ways');

  const fertQuery = OverpassService.buildOverpassQuery(13.0827, 80.2707, 2000, 'fertilizer');
  assert(fertQuery.includes('around:2000'), 'Uses 2km radius');
  assert(fertQuery.includes('"shop"="fertilizer"'), 'Targets fertilizer tags');

  const govQuery = OverpassService.buildOverpassQuery(13.0827, 80.2707, 10000, 'government');
  assert(govQuery.includes('around:10000'), 'Uses 10km radius');
  assert(govQuery.includes('"office"="government"'), 'Targets government agriculture tags');

  // TEST 3: Tag Categorization & Classification
  console.log('\n--- 3. Testing OSM Tag Categorization ---');
  const catFert = OverpassService.categorizeElement({ shop: 'fertilizer', name: 'Kisan Agro' });
  assert(catFert.category === 'fertilizer', 'Classifies shop=fertilizer');

  const catSeeds = OverpassService.categorizeElement({ shop: 'seeds', name: 'Green Seed Store' });
  assert(catSeeds.category === 'seeds', 'Classifies shop=seeds');

  const catGov = OverpassService.categorizeElement({
    office: 'government',
    government: 'agriculture',
    name: 'Raitha Samparka Kendra',
  });
  assert(catGov.category === 'government', 'Classifies agricultural government center');

  const catMandi = OverpassService.categorizeElement({
    amenity: 'marketplace',
    name: 'APMC Grain Mandi',
  });
  assert(catGov.category === 'government' && catMandi.category === 'agri_center', 'Classifies APMC market as agri_center');

  const catSupply = OverpassService.categorizeElement({ shop: 'agrarian', name: 'Farmer Supply Depot' });
  assert(catSupply.category === 'agri_supply', 'Classifies generic agrarian shop as agri_supply');

  // TEST 4: Overpass Response Parsing & Distance Sorting
  console.log('\n--- 4. Testing Overpass Response Parsing & Sorting ---');
  const userLat = 13.0827;
  const userLon = 80.2707;

  const mockResponse: OverpassResponse = {
    version: 0.6,
    generator: 'Overpass API',
    elements: [
      {
        type: 'node',
        id: 101,
        lat: 13.0837,
        lon: 80.2707,
        tags: {
          name: 'Sri Balaji Fertilizer & Agro',
          shop: 'fertilizer',
          'addr:street': 'GST Road',
          'addr:city': 'Chennai',
          phone: '+91 9876543210',
        },
      },
      {
        type: 'way',
        id: 202,
        center: { lat: 13.0927, lon: 80.2707 },
        tags: {
          name: 'National Seeds Corporation',
          shop: 'seeds',
          'addr:street': 'Anna Salai',
          website: 'https://nationalseeds.gov.in',
        },
      },
      {
        type: 'node',
        id: 303,
        lat: 13.0727,
        lon: 80.2707,
        tags: {
          name: 'Department of Agriculture Extension Office',
          office: 'government',
          government: 'agriculture',
          operator: 'Govt of Tamil Nadu',
        },
      },
      {
        // Malformed element with missing coordinates -> must be skipped
        type: 'node',
        id: 404,
        tags: { name: 'Invalid POI' },
      },
    ],
  };

  const parsed = OverpassService.parseOverpassResponse(mockResponse, userLat, userLon);

  assert(parsed.length === 3, 'Parsed 3 valid POIs and safely skipped malformed coordinate element');
  assert(parsed[0].name === 'Sri Balaji Fertilizer & Agro', 'Nearest POI is first');
  assert(parsed[0].category === 'fertilizer', 'Categorized as fertilizer');
  assert(parsed[0].distanceMeters <= 120, 'Computed accurate distance for node');
  assert(parsed[0].address === 'GST Road, Chennai', 'Formatted address correctly');
  assert(parsed[0].phone === '+91 9876543210', 'Extracted phone number');

  // Way with center
  assert(parsed[1].name === 'National Seeds Corporation' || parsed[2].name === 'National Seeds Corporation', 'Extracted way element using center coordinates');

  // Verify ascending sort order
  assert(
    parsed[0].distanceMeters <= parsed[1].distanceMeters &&
      parsed[1].distanceMeters <= parsed[2].distanceMeters,
    'Results are sorted ascending by distance (nearest first)'
  );

  // TEST 5: Error Handling & Malformed Payloads
  console.log('\n--- 5. Testing Error Handling & Malformed Payloads ---');
  const emptyParsed = OverpassService.parseOverpassResponse({ elements: [] }, userLat, userLon);
  assert(emptyParsed.length === 0, 'Handles empty elements array gracefully');

  const nullParsed = OverpassService.parseOverpassResponse(null as any, userLat, userLon);
  assert(nullParsed.length === 0, 'Handles null response gracefully without crashing');

  console.log('\n🎉 ALL PHASE 6 NEARBY SERVICES UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
