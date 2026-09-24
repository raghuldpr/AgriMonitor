/**
 * AgriMonitor Nearby Agricultural Services Finder (Phase 6)
 *
 * Mobile-first screen querying OpenStreetMap via Overpass API for:
 * - Fertilizer shops
 * - Seed stores
 * - Agricultural supplies & garden centres
 * - Agricultural markets & mandis
 * - Government agricultural offices
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { LocationService } from '../../services/location/locationService';
import { OverpassService } from '../../services/maps/overpassService';
import { formatDistance } from '../../lib/distance';
import { NearbyPlace, PlaceCategory, UserLocation } from '../../types/nearby';

const CATEGORIES: Array<{ id: PlaceCategory; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: '🌱' },
  { id: 'fertilizer', label: 'Fertilizer', icon: '🧪' },
  { id: 'seeds', label: 'Seeds', icon: '🌾' },
  { id: 'agri_supply', label: 'Supplies', icon: '🚜' },
  { id: 'agri_center', label: 'Agri Centers', icon: '🏢' },
  { id: 'government', label: 'Govt Offices', icon: '🏛' },
];

const RADII = [
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

export const NearbyScreen: React.FC = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>('all');
  const [selectedRadius, setSelectedRadius] = useState<number>(5000);

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);

  // Initialize location on mount
  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const permitted = await LocationService.checkPermission();
      if (!permitted) {
        const requested = await LocationService.requestPermission();
        setHasPermission(requested);
        if (!requested) {
          setIsLoading(false);
          return;
        }
      } else {
        setHasPermission(true);
      }

      const loc = await LocationService.getCurrentLocation();
      if (loc) {
        setUserLocation(loc);
        fetchNearby(loc, selectedCategory, selectedRadius);
      } else {
        setErrorMessage('Unable to determine current GPS location. Please check device location settings.');
        setIsLoading(false);
      }
    } catch (e: any) {
      setErrorMessage('Failed to initialize location service.');
      setIsLoading(false);
    }
  };

  const fetchNearby = useCallback(
    async (loc: UserLocation, category: PlaceCategory, radius: number) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const results = await OverpassService.searchNearby({
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusMeters: radius,
          category,
        });
        setPlaces(results);
      } catch (err: any) {
        console.warn('[NearbyScreen Search Error]:', err?.message || err);
        setErrorMessage(
          'Unable to load nearby agricultural locations. Please check your internet connection and try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleCategoryChange = (category: PlaceCategory) => {
    setSelectedCategory(category);
    if (userLocation) {
      fetchNearby(userLocation, category, selectedRadius);
    }
  };

  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
    OverpassService.clearCache();
    if (userLocation) {
      fetchNearby(userLocation, selectedCategory, radius);
    }
  };

  const handleRefresh = () => {
    OverpassService.clearCache();
    if (userLocation) {
      fetchNearby(userLocation, selectedCategory, selectedRadius);
    } else {
      initLocation();
    }
  };

  const openDirections = (place: NearbyPlace) => {
    const lat = place.latitude;
    const lon = place.longitude;
    const label = encodeURIComponent(place.name);

    const geoUrl = Platform.select({
      android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
      ios: `maps://app?saddr=Current+Location&daddr=${lat},${lon}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });

    Linking.openURL(geoUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`).catch(() => {
        alert('Unable to open navigation app.');
      });
    });
  };

  const makeCall = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      alert('Unable to initiate phone call.');
    });
  };

  const openWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    Linking.openURL(url).catch(() => {
      alert('Unable to open website.');
    });
  };

  const getCategoryColor = (category: PlaceCategory): string => {
    switch (category) {
      case 'fertilizer':
        return '#10B981'; // Emerald
      case 'seeds':
        return '#F59E0B'; // Amber
      case 'agri_supply':
        return '#06B6D4'; // Cyan
      case 'agri_center':
        return '#8B5CF6'; // Purple
      case 'government':
        return '#38BDF8'; // Sky blue
      default:
        return '#10B981';
    }
  };

  const getCategoryBadgeIcon = (category: PlaceCategory): string => {
    switch (category) {
      case 'fertilizer':
        return '🧪';
      case 'seeds':
        return '🌾';
      case 'agri_supply':
        return '🚜';
      case 'agri_center':
        return '🏢';
      case 'government':
        return '🏛';
      default:
        return '🌱';
    }
  };

  const renderPlaceItem = ({ item }: { item: NearbyPlace }) => {
    const badgeColor = getCategoryColor(item.category);
    const badgeIcon = getCategoryBadgeIcon(item.category);

    return (
      <TouchableOpacity
        style={styles.placeCard}
        activeOpacity={0.7}
        onPress={() => setSelectedPlace(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}50` }]}>
              <Text style={[styles.categoryBadgeText, { color: badgeColor }]}>
                {badgeIcon} {item.categoryLabel}
              </Text>
            </View>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(item.distanceMeters)}</Text>
          </View>
        </View>

        {item.address ? (
          <Text style={styles.addressText} numberOfLines={2}>
            📍 {item.address}
          </Text>
        ) : (
          <Text style={styles.noAddressText}>📍 OpenStreetMap Mapped Location</Text>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => openDirections(item)}
          >
            <Text style={styles.actionBtnPrimaryText}>🧭 Directions</Text>
          </TouchableOpacity>

          {item.phone && (
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => makeCall(item.phone!)}
            >
              <Text style={styles.actionBtnSecondaryText}>📞 Call</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => setSelectedPlace(item)}
          >
            <Text style={styles.actionBtnOutlineText}>Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📍 Nearby Agriculture</Text>
          <Text style={styles.headerSubtitle}>
            Fertilizer, Seeds, Mandis & Govt Centers
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <Text style={styles.refreshBtnText}>{isLoading ? '...' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => handleCategoryChange(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.icon} {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Radius Chips */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>SEARCH RADIUS:</Text>
        <View style={styles.radiusGroup}>
          {RADII.map((r) => {
            const isSelected = selectedRadius === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.radiusChip,
                  isSelected && styles.radiusChipActive,
                ]}
                onPress={() => handleRadiusChange(r.value)}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    isSelected && styles.radiusChipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Compact Interactive Map Visualizer */}
      <View style={styles.mapContainer}>
        <View style={styles.mapCanvas}>
          {/* Radar background circles */}
          <View style={styles.radarOuter} />
          <View style={styles.radarInner} />
          
          {/* Center User Pin */}
          <View style={styles.userPin}>
            <View style={styles.userPinPulse} />
            <Text style={styles.userPinText}>📍 You</Text>
          </View>

          {/* Render nearby place marker indicators (up to 8 on radar) */}
          {places.slice(0, 8).map((p, idx) => {
            const angle = (idx * (360 / Math.min(places.length, 8)) * Math.PI) / 180;
            const distRatio = Math.min(p.distanceMeters / selectedRadius, 0.85);
            const radiusPx = 55 * distRatio + 15;
            const offsetX = Math.cos(angle) * radiusPx;
            const offsetY = Math.sin(angle) * radiusPx;
            const markerColor = getCategoryColor(p.category);

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.poiMarker,
                  {
                    transform: [{ translateX: offsetX }, { translateY: offsetY }],
                    backgroundColor: markerColor,
                  },
                ]}
                onPress={() => setSelectedPlace(p)}
              >
                <Text style={styles.poiMarkerText}>
                  {getCategoryBadgeIcon(p.category)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Map Header & Attribution */}
        <View style={styles.mapFooter}>
          <Text style={styles.poiCountText}>
            {places.length} mapped agricultural location{places.length !== 1 ? 's' : ''} found
          </Text>
          <Text style={styles.osmAttribution}>© OpenStreetMap contributors</Text>
        </View>
      </View>

      {/* Main Content Area */}
      {hasPermission === false ? (
        <View style={styles.centerState}>
          <Text style={styles.stateIcon}>📍</Text>
          <Text style={styles.stateTitle}>Location Permission Required</Text>
          <Text style={styles.stateSubtitle}>
            AgriMonitor uses your device GPS to locate nearby fertilizer shops, seed stores, and agricultural centers.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={initLocation}>
            <Text style={styles.primaryBtnText}>Allow Location Access</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Searching nearby agricultural services...</Text>
          <Text style={styles.loadingSubtext}>Querying OpenStreetMap Overpass</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <Text style={styles.stateIcon}>⚠</Text>
          <Text style={styles.stateTitle}>Unable to Load Locations</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRefresh}>
            <Text style={styles.primaryBtnText}>Retry Search</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateIcon}>🔍</Text>
          <Text style={styles.stateTitle}>No Mapped Locations Found</Text>
          <Text style={styles.stateSubtitle}>
            No agricultural shops found within {selectedRadius / 1000} km. OpenStreetMap coverage varies by region.
          </Text>
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Tips:</Text>
            <Text style={styles.tipItem}>• Increase search radius to 10 km</Text>
            <Text style={styles.tipItem}>• Select category "All"</Text>
            <Text style={styles.tipItem}>• Tap Refresh to re-query</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaceItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Place Detail Modal */}
      <Modal
        visible={selectedPlace !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPlace(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedPlace && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalName}>{selectedPlace.name}</Text>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: `${getCategoryColor(selectedPlace.category)}20`,
                          borderColor: `${getCategoryColor(selectedPlace.category)}50`,
                          marginTop: 4,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          { color: getCategoryColor(selectedPlace.category) },
                        ]}
                      >
                        {getCategoryBadgeIcon(selectedPlace.category)}{' '}
                        {selectedPlace.categoryLabel}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedPlace(null)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Straight-line Distance:</Text>
                    <Text style={styles.detailValue}>
                      {formatDistance(selectedPlace.distanceMeters)}
                    </Text>
                  </View>

                  {selectedPlace.address && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue}>{selectedPlace.address}</Text>
                    </View>
                  )}

                  {selectedPlace.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>{selectedPlace.phone}</Text>
                    </View>
                  )}

                  {selectedPlace.operator && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Operator / Agency:</Text>
                      <Text style={styles.detailValue}>{selectedPlace.operator}</Text>
                    </View>
                  )}

                  {selectedPlace.openingHours && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Hours:</Text>
                      <Text style={styles.detailValue}>{selectedPlace.openingHours}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalBtnPrimary}
                    onPress={() => {
                      openDirections(selectedPlace);
                      setSelectedPlace(null);
                    }}
                  >
                    <Text style={styles.modalBtnPrimaryText}>🧭 Open in Maps</Text>
                  </TouchableOpacity>

                  {selectedPlace.phone && (
                    <TouchableOpacity
                      style={styles.modalBtnSecondary}
                      onPress={() => makeCall(selectedPlace.phone!)}
                    >
                      <Text style={styles.modalBtnSecondaryText}>📞 Call Shop</Text>
                    </TouchableOpacity>
                  )}

                  {selectedPlace.website && (
                    <TouchableOpacity
                      style={styles.modalBtnSecondary}
                      onPress={() => openWebsite(selectedPlace.website!)}
                    >
                      <Text style={styles.modalBtnSecondaryText}>🌐 Website</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  refreshBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  categoriesContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  categoryPill: {
    backgroundColor: '#131D31',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
  },
  categoryPillActive: {
    backgroundColor: '#065F46',
    borderColor: '#10B981',
  },
  categoryPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#ECFDF5',
    fontWeight: '700',
  },
  radiusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
  },
  radiusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  radiusGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  radiusChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  radiusChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  radiusChipTextActive: {
    color: '#0B1120',
  },
  mapContainer: {
    backgroundColor: '#131D31',
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  mapCanvas: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#0D1526',
  },
  radarOuter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
  },
  radarInner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userPin: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  userPinPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#38BDF820',
  },
  userPinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  poiMarker: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 5,
  },
  poiMarkerText: {
    fontSize: 10,
  },
  mapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0B1120',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  poiCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  osmAttribution: {
    fontSize: 9.5,
    color: '#64748B',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  placeCard: {
    backgroundColor: '#131D31',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  distanceBadge: {
    backgroundColor: '#0B1120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  addressText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginBottom: 10,
    lineHeight: 16,
  },
  noAddressText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnSecondaryText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  actionBtnOutline: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  actionBtnOutlineText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stateIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#0B1120',
    fontSize: 13,
    fontWeight: '700',
  },
  tipsBox: {
    backgroundColor: '#131D31',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  tipItem: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#131D31',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  modalBody: {
    gap: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    width: '35%',
  },
  detailValue: {
    fontSize: 12.5,
    color: '#E2E8F0',
    fontWeight: '500',
    width: '65%',
    textAlign: 'right',
  },
  modalActions: {
    gap: 8,
  },
  modalBtnPrimary: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    color: '#0B1120',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalBtnSecondary: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalBtnSecondaryText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
});
