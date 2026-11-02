import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useAppTheme } from '../contexts/ThemeContext';
import { colors } from '../styles/theme';
import { Icon } from '../components/Icon';

import { GeolocationRepository } from '../data/repository';
import { locationService, UserLiveLocation } from '../services/LocationService';

interface GeoRequest {
  ip: string;
  threatLevel: 'Safe' | 'Suspicious' | 'High Risk';
  country: string;
  city: string;
  isp: string;
  latency: string;
  timeAgo: string;
  timeCategory: '1H' | '24H' | '7D';
  xPercent: number; // 0.0 to 1.0 (X coordinate on map)
  yPercent: number; // 0.0 to 1.0 (Y coordinate on map)
  latitude: string;
  longitude: string;
  isUserLiveLocation?: boolean;
  accuracy?: number;
  provider?: string;
  isMock?: boolean;
}

interface GeoTrackingScreenProps {
  onBack: () => void;
}

const allRequests: GeoRequest[] = [
  { ip: '104.244.42.1', threatLevel: 'Safe', country: 'United States', city: 'San Francisco', isp: 'Twitter Inc.', latency: '35ms', timeAgo: '5m ago', timeCategory: '1H', xPercent: 0.20, yPercent: 0.35, latitude: '37.7749° N', longitude: '122.4194° W' },
  { ip: '185.190.140.12', threatLevel: 'High Risk', country: 'Netherlands', city: 'Amsterdam', isp: 'Creanova Hosting', latency: '180ms', timeAgo: '12m ago', timeCategory: '1H', xPercent: 0.48, yPercent: 0.28, latitude: '52.3676° N', longitude: '4.9041° E' },
  { ip: '13.107.4.50', threatLevel: 'Safe', country: 'Japan', city: 'Tokyo', isp: 'Microsoft Corp', latency: '85ms', timeAgo: '42m ago', timeCategory: '1H', xPercent: 0.82, yPercent: 0.38, latitude: '35.6762° N', longitude: '139.6503° E' },
  { ip: '43.205.12.89', threatLevel: 'Suspicious', country: 'India', city: 'Mumbai', isp: 'Amazon Data Services', latency: '120ms', timeAgo: '3h ago', timeCategory: '24H', xPercent: 0.70, yPercent: 0.52, latitude: '19.0760° N', longitude: '72.8777° E' },
  { ip: '185.220.101.5', threatLevel: 'High Risk', country: 'Germany', city: 'Frankfurt', isp: 'Tor Exit Node', latency: '210ms', timeAgo: '6h ago', timeCategory: '24H', xPercent: 0.50, yPercent: 0.32, latitude: '50.1109° N', longitude: '8.6821° E' },
  { ip: '210.140.10.3', threatLevel: 'Safe', country: 'Japan', city: 'Osaka', isp: 'NTT Communications', latency: '98ms', timeAgo: '18h ago', timeCategory: '24H', xPercent: 0.84, yPercent: 0.42, latitude: '34.6937° N', longitude: '135.5023° E' },
  { ip: '103.21.244.0', threatLevel: 'Safe', country: 'Singapore', city: 'Singapore', isp: 'Cloudflare Inc.', latency: '62ms', timeAgo: '2d ago', timeCategory: '7D', xPercent: 0.78, yPercent: 0.58, latitude: '1.3521° N', longitude: '103.8198° E' },
  { ip: '91.198.174.192', threatLevel: 'Safe', country: 'France', city: 'Paris', isp: 'Wikimedia Foundation', latency: '110ms', timeAgo: '4d ago', timeCategory: '7D', xPercent: 0.46, yPercent: 0.33, latitude: '48.8566° N', longitude: '2.3522° E' },
  { ip: '109.201.154.22', threatLevel: 'Suspicious', country: 'Russia', city: 'Moscow', isp: 'Rostelecom PJSC', latency: '195ms', timeAgo: '6d ago', timeCategory: '7D', xPercent: 0.56, yPercent: 0.26, latitude: '55.7558° N', longitude: '37.6173° E' }
];

interface NearbyPlace {
  name: string;
  distance: string;
}

const mapBackendRecordToGeoRequest = (rec: any): GeoRequest => {
  const lat = typeof rec.latitude === 'number' ? rec.latitude : parseFloat(rec.latitude) || 0;
  const lon = typeof rec.longitude === 'number' ? rec.longitude : parseFloat(rec.longitude) || 0;

  const xPercent = Math.max(0.08, Math.min(0.92, (lon + 180) / 360));
  const yPercent = Math.max(0.1, Math.min(0.9, (90 - lat) / 180));

  let threatLevel: 'Safe' | 'Suspicious' | 'High Risk' = 'Safe';
  if (rec.is_spoofed && (rec.spoof_confidence === 'high' || rec.is_mock_location)) {
    threatLevel = 'High Risk';
  } else if (rec.is_spoofed || rec.spoof_confidence === 'medium') {
    threatLevel = 'Suspicious';
  }

  return {
    ip: rec.ip || `192.168.1.${Math.abs(Math.floor(lat * 10)) % 254 + 1}`,
    threatLevel,
    country: rec.country || 'Detected Region',
    city: rec.city || 'Live GPS Node',
    isp: rec.provider || rec.isp || 'Mobile Cellular / GPS',
    latency: `${Math.floor(Math.random() * 40) + 20}ms`,
    timeAgo: rec.timestamp ? 'Live' : '5m ago',
    timeCategory: '1H',
    xPercent,
    yPercent,
    latitude: `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`,
    longitude: `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`,
    accuracy: rec.accuracy,
    provider: rec.provider,
    isMock: rec.is_mock_location,
  };
};

const getNearbyPlaces = (ip: string, city?: string): NearbyPlace[] => {
  const area = city && !city.includes('Node') && city !== 'Detected City' ? `${city} ` : '';
  return [
    { name: `${area}Medical Center`, distance: '0.8 km' },
    { name: `${area}Police Patrol Post`, distance: '1.2 km' },
    { name: `${area}Civil Safe Haven Hub`, distance: '1.7 km' }
  ];
};


export const GeoTrackingScreen: React.FC<GeoTrackingScreenProps> = ({ onBack }) => {
  const { colors, mode, toggleTheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [requestsList, setRequestsList] = useState<GeoRequest[]>(allRequests);
  const [selectedFilter, setSelectedFilter] = useState<'All' | '1H' | '24H' | '7D'>('All');
  const [selectedRequest, setSelectedRequest] = useState<GeoRequest | null>(allRequests[0]);
  const [dynamicNearbyPlaces, setDynamicNearbyPlaces] = useState<NearbyPlace[]>([]);

  // User live location state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Initializing live location detector...');
  const [userLiveLocation, setUserLiveLocation] = useState<UserLiveLocation | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Detects the user's real live location (via native GPS or network/IP)
   */
  const detectLiveLocation = useCallback(async (isManual = false) => {
    if (!isMountedRef.current) return;
    setIsDetectingLocation(true);
    setLocationStatus('Acquiring real-time GPS & network coordinates...');

    try {
      const live = await locationService.detectLiveLocation();
      if (!isMountedRef.current) return;
      setUserLiveLocation(live);

      const validLon = Number.isFinite(live.longitude) ? live.longitude : 77.5946;
      const validLat = Number.isFinite(live.latitude) ? live.latitude : 12.9716;
      const xPercent = Math.max(0.08, Math.min(0.92, (validLon + 180) / 360));
      const yPercent = Math.max(0.1, Math.min(0.9, (90 - validLat) / 180));

      const liveRequest: GeoRequest = {
        ip: live.ip,
        threatLevel: live.threatLevel,
        country: live.country,
        city: live.city,
        isp: `${live.isp} (${live.provider})`,
        latency: '8ms',
        timeAgo: 'Live Now',
        timeCategory: '1H',
        xPercent,
        yPercent,
        latitude: live.latitudeStr,
        longitude: live.longitudeStr,
        isUserLiveLocation: true,
        accuracy: live.accuracy,
        provider: live.provider,
        isMock: live.isMock,
      };

      setRequestsList(prev => {
        const withoutUser = prev.filter(r => !r.isUserLiveLocation);
        return [liveRequest, ...withoutUser];
      });

      setSelectedRequest(liveRequest);
      setLocationStatus(`Live Location Fix: ${live.city}, ${live.country} (±${live.accuracy}m)`);
    } catch (err: any) {
      console.log('[GeoTrackingScreen] Live location detection notice:', err);
      if (isMountedRef.current) {
        setLocationStatus('Could not acquire live GPS. Tap Detect to retry.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsDetectingLocation(false);
      }
    }
  }, []);

  // Initial trigger for live location detection: delayed slightly to allow screen transition
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        detectLiveLocation(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [detectLiveLocation]);

  // Fetch backend geolocation history
  useEffect(() => {
    let isMounted = true;
    const fetchGeoData = async () => {
      try {
        const [liveRes, historyRes] = await Promise.allSettled([
          GeolocationRepository.getCurrentLocation(),
          GeolocationRepository.getLocationHistory(),
        ]);

        const fetchedRequests: GeoRequest[] = [];

        if (liveRes.status === 'fulfilled' && liveRes.value?.data) {
          fetchedRequests.push(mapBackendRecordToGeoRequest(liveRes.value.data));
        }

        if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value) && historyRes.value.length > 0) {
          historyRes.value.forEach((item: any) => {
            fetchedRequests.push(mapBackendRecordToGeoRequest(item));
          });
        }

        if (isMounted && fetchedRequests.length > 0) {
          setRequestsList(prev => {
            const userLive = prev.find(r => r.isUserLiveLocation);
            const others = prev.filter(r => !r.isUserLiveLocation);
            const combined = [...fetchedRequests, ...others];
            return userLive ? [userLive, ...combined] : combined;
          });
        }
      } catch (err) {
        console.log('Using default geolocation data:', err);
      }
    };

    fetchGeoData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch nearby places dynamically for the selected request
  useEffect(() => {
    let isMounted = true;
    if (!selectedRequest) return;

    const lat = parseFloat(selectedRequest.latitude);
    const lon = parseFloat(selectedRequest.longitude);

    if (!isNaN(lat) && !isNaN(lon)) {
      GeolocationRepository.getNearbyPlaces({ latitude: lat, longitude: lon, radius_km: 10 })
        .then((places) => {
          if (isMounted && Array.isArray(places) && places.length > 0) {
            setDynamicNearbyPlaces(
              places.map((p: any) => ({
                name: p.place_name || p.name || 'Local Network Node',
                distance: `${p.distance_km || p.distance || 1.5} km`,
              }))
            );
          } else if (isMounted) {
            setDynamicNearbyPlaces(getNearbyPlaces(selectedRequest.ip, selectedRequest.city));
          }
        })
        .catch(() => {
          if (isMounted) {
            setDynamicNearbyPlaces(getNearbyPlaces(selectedRequest.ip, selectedRequest.city));
          }
        });
    } else {
      setDynamicNearbyPlaces(getNearbyPlaces(selectedRequest.ip, selectedRequest.city));
    }


    return () => {
      isMounted = false;
    };
  }, [selectedRequest]);

  // Radar rotation animation
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for markers
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const radarLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    radarLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      radarLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: [0.85, 0],
  });

  const filteredRequests = requestsList.filter(req => {
    if (req.isUserLiveLocation) return true; // Always show user live location
    if (selectedFilter === 'All') return true;
    if (selectedFilter === '1H') return req.timeCategory === '1H';
    if (selectedFilter === '24H') return req.timeCategory === '1H' || req.timeCategory === '24H';
    if (selectedFilter === '7D') return true;
    return true;
  });

  const renderContinentDot = (cx: number, cy: number, seed: number) => {
    const dots = [];
    const random = (s: number) => {
      const x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };
    
    let s = seed;
    for (let i = 0; i < 15; i++) {
      const dx = (random(s++) - 0.5) * 35;
      const dy = (random(s++) - 0.5) * 25;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 25) {
        dots.push(
          <Circle
            key={i}
            cx={cx + dx}
            cy={cy + dy}
            r={random(s++) * 2 + 1}
            fill={colors.cyanAccent}
            opacity={0.12}
          />
        );
      }
    }
    return dots;
  };

  const mapWidth = 320;
  const mapHeight = 220;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.contentWrapper}>

      {/* 1. TOP HEADER APP BAR WITH BACK & DETECT BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-back" color={colors.text} size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Live Geo Tracking</Text>
          <Text style={styles.headerSubtitle}>Real-time GPS & network threat map</Text>
        </View>
        <TouchableOpacity
          style={[styles.detectBtn, isDetectingLocation && styles.detectBtnActive]}
          onPress={() => detectLiveLocation(true)}
          disabled={isDetectingLocation}
        >
          {isDetectingLocation ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.detectBtnInner}>
              <Icon name="my-location" color="#fff" size={13} />
              <Text style={styles.detectBtnText}>Detect Live</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. USER LIVE LOCATION STATUS BANNER */}
      <View style={[styles.liveStatusCard, userLiveLocation?.isMock && styles.liveStatusCardWarning]}>
        <View style={styles.liveStatusHeader}>
          <View style={styles.liveStatusTitleRow}>
            <View style={[styles.liveBeaconDot, { backgroundColor: isDetectingLocation ? colors.orangeWarning : colors.cyanAccent }]} />
            <Text style={styles.liveStatusTitle}>
              {isDetectingLocation ? 'DETECTING LIVE LOCATION...' : userLiveLocation ? 'YOUR LIVE LOCATION' : 'LOCATION TRACKER'}
            </Text>
          </View>
          {userLiveLocation && (
            <View style={[styles.accuracyBadge, { backgroundColor: colors.cyanAccent + '22' }]}>
              <Text style={[styles.accuracyBadgeText, { color: colors.cyanAccent }]}>
                {userLiveLocation.provider} • ±{userLiveLocation.accuracy}m
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.livePlaceText}>
          {userLiveLocation
            ? `${userLiveLocation.city}, ${userLiveLocation.region ? userLiveLocation.region + ', ' : ''}${userLiveLocation.country}`
            : locationStatus}
        </Text>

        {userLiveLocation && (
          <View style={styles.liveMetaRow}>
            <View style={styles.liveMetaCol}>
              <Icon name="location-on" color={colors.purpleAccent} size={12} />
              <Text style={styles.liveMetaText}>
                {userLiveLocation.latitudeStr}, {userLiveLocation.longitudeStr}
              </Text>
            </View>
            <View style={[
              styles.spoofStatusPill,
              { backgroundColor: userLiveLocation.isMock ? colors.redDanger + '25' : colors.greenSuccess + '25' }
            ]}>
              <Icon
                name={userLiveLocation.isMock ? 'warning' : 'verified-user'}
                color={userLiveLocation.isMock ? colors.redDanger : colors.greenSuccess}
                size={11}
              />
              <Text style={[
                styles.spoofStatusText,
                { color: userLiveLocation.isMock ? colors.redDanger : colors.greenSuccess }
              ]}>
                {userLiveLocation.isMock ? 'Mock GPS Detected' : 'Authentic GPS Fix'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 3. TIME RANGE FILTER BUTTONS */}
      <View style={styles.filterRow}>
        {(['1H', '24H', '7D', 'All'] as const).map(filter => {
          const isActive = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterBtn, isActive && styles.filterBtnActive]}
              onPress={() => {
                setSelectedFilter(filter);
                const matching = requestsList.filter(req => {
                  if (req.isUserLiveLocation) return true;
                  if (filter === 'All') return true;
                  if (filter === '1H') return req.timeCategory === '1H';
                  if (filter === '24H') return req.timeCategory === '1H' || req.timeCategory === '24H';
                  if (filter === '7D') return true;
                  return true;
                });
                if (matching.length > 0) {
                  setSelectedRequest(matching[0]);
                }
              }}
            >
              <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. INTERACTIVE MAP BOX */}
      <View style={styles.mapContainer}>
        {/* Latitude/Longitude Grid Lines */}
        <Svg width={mapWidth} height={mapHeight} style={StyleSheet.absoluteFill}>
          {/* Horizontal Lines */}
          {[1, 2, 3, 4, 5].map(i => (
            <Line
              key={`h-${i}`}
              x1="0"
              y1={(mapHeight / 6) * i}
              x2={mapWidth}
              y2={(mapHeight / 6) * i}
              stroke={colors.border}
              strokeWidth="0.8"
              opacity={0.3}
            />
          ))}
          {/* Vertical Lines */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <Line
              key={`v-${i}`}
              x1={(mapWidth / 10) * i}
              y1="0"
              x2={(mapWidth / 10) * i}
              y2={mapHeight}
              stroke={colors.border}
              strokeWidth="0.8"
              opacity={0.3}
            />
          ))}

          {/* Continent Silhouettes */}
          {renderContinentDot(mapWidth * 0.2, mapHeight * 0.35, 10)}
          {renderContinentDot(mapWidth * 0.3, mapHeight * 0.68, 20)}
          {renderContinentDot(mapWidth * 0.5, mapHeight * 0.38, 30)}
          {renderContinentDot(mapWidth * 0.52, mapHeight * 0.65, 40)}
          {renderContinentDot(mapWidth * 0.75, mapHeight * 0.38, 50)}
          {renderContinentDot(mapWidth * 0.85, mapHeight * 0.72, 60)}
        </Svg>

        {/* Rotating Radar Sweep */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ rotate: spin }],
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={mapWidth} height={mapHeight}>
            <Line
              x1={mapWidth / 2}
              y1={mapHeight / 2}
              x2={mapWidth / 2}
              y2={0}
              stroke={colors.purpleAccent}
              strokeWidth="2"
              opacity={0.5}
            />
          </Svg>
        </Animated.View>

        {/* Request Markers */}
        {filteredRequests.map((req) => {
          const isSelected = selectedRequest?.ip === req.ip;
          const isUser = Boolean(req.isUserLiveLocation);
          const markerColor = isUser
            ? colors.cyanAccent
            : req.threatLevel === 'High Risk'
            ? colors.redDanger
            : req.threatLevel === 'Suspicious'
            ? colors.orangeWarning
            : colors.greenSuccess;

          const validX = Number.isFinite(req.xPercent) ? Math.max(0.08, Math.min(0.92, req.xPercent)) : 0.5;
          const validY = Number.isFinite(req.yPercent) ? Math.max(0.1, Math.min(0.9, req.yPercent)) : 0.5;

          return (
            <TouchableOpacity
              key={`${req.ip}-${isUser ? 'user' : 'node'}`}
              style={[
                styles.markerContainer,
                {
                  left: validX * mapWidth - 15,
                  top: validY * mapHeight - 15,
                  zIndex: isUser ? 25 : 10,
                },
              ]}
              onPress={() => setSelectedRequest(req)}
            >
              <View style={styles.markerAnchor}>
                {/* Pulsing Outer Ring */}
                {(isSelected || isUser) ? (
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      {
                        borderColor: markerColor,
                        borderWidth: isUser ? 2 : 1.5,
                        transform: [{ scale: pulseScale }],
                        opacity: pulseOpacity,
                      },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.pulsingRing,
                      {
                        borderColor: markerColor,
                        borderWidth: 1.5,
                        opacity: 0.25,
                      },
                    ]}
                  />
                )}
                {/* Core Center Dot */}
                <View
                  style={[
                    styles.markerDot,
                    { backgroundColor: markerColor },
                    (isSelected || isUser) && styles.markerDotSelected,
                    isUser && { backgroundColor: colors.cyanAccent, borderColor: '#fff' },
                  ]}
                />
                {isUser && (
                  <View style={styles.userPinLabel}>
                    <Text style={styles.userPinLabelText}>YOU</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.liveTrackingText}>
          {isDetectingLocation ? 'LIVE TRACKING: ACQUIRING FIX...' : 'LIVE TRACKING: ACTIVE'}
        </Text>
        <Text style={styles.gridCoordsText}>
          {userLiveLocation
            ? `USER GPS: ${userLiveLocation.latitudeStr} / ${userLiveLocation.longitudeStr}`
            : 'GRID: 104°W / 45°N'}
        </Text>
      </View>

      {/* 5. LOCATION / IP DETAILS PANEL */}
      {selectedRequest && (
        <View
          style={[
            styles.detailsCard,
            selectedRequest.isUserLiveLocation
              ? { borderColor: colors.cyanAccent + '70', backgroundColor: colors.cardBackground }
              : selectedRequest.threatLevel === 'High Risk' && { borderColor: colors.redDanger + '55' },
          ]}
        >
          <View style={styles.detailsHeader}>
            <View style={styles.ipRow}>
              <Icon
                name={selectedRequest.isUserLiveLocation ? 'my-location' : 'dns'}
                color={selectedRequest.isUserLiveLocation ? colors.cyanAccent : colors.cyanAccent}
                size={18}
              />
              <Text style={styles.ipText}>
                {selectedRequest.isUserLiveLocation ? 'Your Live Device' : selectedRequest.ip}
              </Text>
            </View>

            {/* Badge */}
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: selectedRequest.isUserLiveLocation
                    ? colors.cyanAccent + '25'
                    : selectedRequest.threatLevel === 'High Risk'
                    ? colors.redDanger + '26'
                    : selectedRequest.threatLevel === 'Suspicious'
                    ? colors.orangeWarning + '26'
                    : colors.greenSuccess + '26',
                  borderColor: selectedRequest.isUserLiveLocation
                    ? colors.cyanAccent
                    : selectedRequest.threatLevel === 'High Risk'
                    ? colors.redDanger
                    : selectedRequest.threatLevel === 'Suspicious'
                    ? colors.orangeWarning
                    : colors.greenSuccess,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: selectedRequest.isUserLiveLocation
                      ? colors.cyanAccent
                      : selectedRequest.threatLevel === 'High Risk'
                      ? colors.redDanger
                      : selectedRequest.threatLevel === 'Suspicious'
                      ? colors.orangeWarning
                      : colors.greenSuccess,
                  },
                ]}
              >
                {selectedRequest.isUserLiveLocation ? 'LIVE FIX' : selectedRequest.threatLevel.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.detailsGrid}>
            <View style={styles.gridColumn}>
              <Text style={styles.detailsLabel}>LOCATION</Text>
              <View style={styles.locationRow}>
                <Icon name="globe" color={colors.textMuted} size={13} />
                <Text style={styles.detailsValue}>
                  {selectedRequest.city}, {selectedRequest.country}
                </Text>
              </View>
            </View>
            <View style={styles.gridColumn}>
              <Text style={styles.detailsLabel}>
                {selectedRequest.isUserLiveLocation ? 'NETWORK / PROVIDER' : 'ORGANIZATION'}
              </Text>
              <Text style={styles.detailsValue} numberOfLines={1}>
                {selectedRequest.isp}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsGrid, { marginTop: 12 }]}>
            <View style={styles.gridColumn}>
              <Text style={styles.detailsLabel}>
                {selectedRequest.isUserLiveLocation ? 'ACCURACY / LATENCY' : 'LATENCY'}
              </Text>
              <View style={styles.latencyRow}>
                <Icon name="speed" color={colors.greenSuccess} size={13} />
                <Text style={styles.detailsValue}>
                  {selectedRequest.accuracy ? `±${selectedRequest.accuracy}m (${selectedRequest.latency})` : selectedRequest.latency}
                </Text>
              </View>
            </View>
            <View style={styles.gridColumn}>
              <Text style={styles.detailsLabel}>
                {selectedRequest.isUserLiveLocation ? 'SECURITY AUDIT' : 'TIME DETECTED'}
              </Text>
              <View style={styles.timeRow}>
                <Icon
                  name={selectedRequest.isUserLiveLocation ? 'verified-user' : 'clock'}
                  color={selectedRequest.isMock ? colors.redDanger : colors.textMuted}
                  size={13}
                />
                <Text style={[styles.detailsValue, selectedRequest.isMock && { color: colors.redDanger }]}>
                  {selectedRequest.isUserLiveLocation
                    ? (selectedRequest.isMock ? 'Mock GPS Alert' : 'Verified Authentic')
                    : selectedRequest.timeAgo}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.detailsGrid, { marginTop: 12 }]}>
            <View style={styles.gridColumn}>
              <Text style={styles.detailsLabel}>LATITUDE</Text>
              <View style={styles.locationRow}>
                <Icon name="location-on" color={colors.purpleAccent} size={13} />
                <Text style={styles.detailsValue}>{selectedRequest.latitude}</Text>
              </View>
            </View>
            <View style={styles.gridColumn}>
              <Text style={styles.detailsLabel}>LONGITUDE</Text>
              <View style={styles.locationRow}>
                <Icon name="location-on" color={colors.purpleAccent} size={13} />
                <Text style={styles.detailsValue}>{selectedRequest.longitude}</Text>
              </View>
            </View>
          </View>

          {/* Nearby Network Places List */}
          <View style={styles.cardDivider} />
          <Text style={styles.detailsLabel}>
            {selectedRequest.isUserLiveLocation ? 'NEARBY EMERGENCY & NETWORK HUBS' : 'NEARBY NETWORK PLACES'}
          </Text>
          <View style={styles.nearbyContainer}>
            {(dynamicNearbyPlaces.length > 0 ? dynamicNearbyPlaces : getNearbyPlaces(selectedRequest.ip)).map((place, idx) => (
              <View key={idx} style={styles.nearbyPlaceRow}>
                <View style={styles.nearbyPlaceLeft}>
                  <Icon name="location-on" color={colors.purpleAccent} size={14} />
                  <Text style={styles.nearbyPlaceName}>{place.name}</Text>
                </View>
                <Text style={styles.nearbyPlaceDistance}>{place.distance}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 6. API REQUESTS SCROLLING LIST */}
      <Text style={styles.listTitle}>Tracked Geolocation Points ({filteredRequests.length})</Text>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item, index) => `${item.ip}-${item.isUserLiveLocation ? 'user' : index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedRequest?.ip === item.ip;
          const alertColor = item.isUserLiveLocation
            ? colors.cyanAccent
            : item.threatLevel === 'High Risk'
            ? colors.redDanger
            : item.threatLevel === 'Suspicious'
            ? colors.orangeWarning
            : colors.greenSuccess;

          return (
            <TouchableOpacity
              style={[
                styles.logItem,
                isSelected ? styles.logItemActive : styles.logItemInactive,
                item.isUserLiveLocation && styles.logItemUser,
              ]}
              onPress={() => setSelectedRequest(item)}
            >
              <View style={[styles.logIndicator, { backgroundColor: alertColor }]} />
              <View style={styles.logTexts}>
                <View style={styles.logIpRow}>
                  <Text style={[styles.logIp, item.isUserLiveLocation && { color: colors.cyanAccent }]}>
                    {item.isUserLiveLocation ? 'Your Live Location' : item.ip}
                  </Text>
                  {item.isUserLiveLocation && (
                    <View style={styles.liveTag}>
                      <Text style={styles.liveTagText}>YOU</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.logSub}>
                  {item.city}, {item.country}
                </Text>
              </View>
              <View style={styles.logRightCol}>
                <Text style={styles.logTime}>{item.timeAgo}</Text>
                <Text style={styles.logLatency}>
                  {item.isUserLiveLocation && item.accuracy ? `±${item.accuracy}m` : item.latency}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purpleAccent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  detectBtnActive: {
    opacity: 0.8,
  },
  detectBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  liveStatusCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cyanAccent + '40',
  },
  liveStatusCardWarning: {
    borderColor: colors.redDanger + '60',
  },
  liveStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBeaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveStatusTitle: {
    color: colors.cyanAccent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accuracyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  accuracyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  livePlaceText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  liveMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  liveMetaCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveMetaText: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 4,
  },
  spoofStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spoofStatusText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  filterBtn: {
    flex: 0.23,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.purpleAccent,
    borderColor: 'transparent',
  },
  filterBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  mapContainer: {
    width: 320,
    height: 220,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  markerContainer: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerAnchor: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markerDotSelected: {
    borderWidth: 1.5,
    borderColor: colors.text,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  userPinLabel: {
    position: 'absolute',
    top: -14,
    backgroundColor: colors.cyanAccent,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  userPinLabelText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  liveTrackingText: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.greenSuccess,
    opacity: 0.9,
  },
  gridCoordsText: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 9,
    color: colors.textMuted,
    opacity: 0.7,
  },
  detailsCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ipText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridColumn: {
    flex: 1,
  },
  detailsLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  latencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  listTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  logItemActive: {
    backgroundColor: colors.cardBackground + '80',
    borderColor: colors.purpleAccent,
  },
  logItemInactive: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  },
  logItemUser: {
    borderColor: colors.cyanAccent + '60',
    backgroundColor: colors.cardBackground,
  },
  logIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logTexts: {
    flex: 1,
    marginLeft: 10,
  },
  logIpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIp: {
    color: colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  liveTag: {
    backgroundColor: colors.cyanAccent,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  liveTagText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  logSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logRightCol: {
    alignItems: 'flex-end',
  },
  logTime: {
    color: colors.textMuted,
    fontSize: 10,
  },
  logLatency: {
    color: colors.greenSuccess,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  nearbyContainer: {
    marginTop: 4,
  },
  nearbyPlaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  nearbyPlaceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyPlaceName: {
    color: colors.text,
    fontSize: 11,
    marginLeft: 6,
  },
  nearbyPlaceDistance: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
});
