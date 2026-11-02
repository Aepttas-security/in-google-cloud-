import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Platform,
  ToastAndroid,
  Alert,
  StatusBar,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, G, Rect } from 'react-native-svg';
import { useAppTheme } from '../contexts/ThemeContext';
import { colors } from '../styles/theme';
import { Icon } from '../components/Icon';
import { useCallerIntelligence } from '../hooks/useCallerIntelligence';
import { getCallerBaseUrl } from '../config/apiConfig';
import CallDetection from '../native/CallDetection';
import {
  getLocalContacts,
  findContactByNumber,
  findContactByName,
  syncContactsWithBackend,
  LocalContact,
} from '../services/ContactService';

interface MockCall {
  name: string;
  number: string;
  riskScore: number;
  type: 'Normal' | 'Spam' | 'Scam' | 'High-Risk' | 'Suspicious';
  carrier: string;
  location: string;
  frequency: string;
  source?: 'LOCAL_CONTACT' | 'CLOUD_BACKUP' | 'COMMUNITY' | 'UNKNOWN';
}

interface BlockedNumber {
  number: string;
  name: string;
  reason: string;
  date: string;
}

interface SpamCall {
  name: string;
  number: string;
  riskScore: number;
  date: string;
}

interface CallReport {
  id: string;
  number: string;
  type: string;
  description: string;
  timestamp: string;
}

interface SecurityAlertItem {
  id: string;
  title: string;
  targetName: string;
  targetNumber: string;
  detail: string;
  riskScore: number;
  type: 'SPAM' | 'BLOCKED' | 'SUSPICIOUS' | 'SCAM';
  date: string;
}

interface ScamInfoItem {
  id: string;
  title: string;
  category: 'Digital Arrest' | 'Banking & OTP' | 'Courier & Customs' | 'Telegram & Jobs' | 'AI Voice' | 'Utility';
  description: string;
  tactics: string;
  rule: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const SCAM_DATABASE: ScamInfoItem[] = [
  {
    id: 'scam-1',
    title: 'Digital Arrest & Police / CBI Impersonation',
    category: 'Digital Arrest',
    description:
      'Scammers impersonate CBI, Mumbai Police, or Customs officials over WhatsApp or Skype video calls wearing fake uniforms and official insignia. They claim your Aadhaar or SIM is linked to money laundering and place you under fake "digital arrest".',
    tactics:
      'High psychological intimidation, fake arrest warrants shown on camera, continuous video surveillance, demanding asset transfer to "RBI clearance accounts".',
    rule:
      'Indian law enforcement and courts NEVER conduct "digital arrests" or ask citizens to transfer funds over video calls.',
    severity: 'CRITICAL',
  },
  {
    id: 'scam-2',
    title: 'Bank OTP & AnyDesk / Screen-Share APK Fraud',
    category: 'Banking & OTP',
    description:
      'Fraudsters call claiming your debit card, credit card, or NetBanking is blocked. They instruct you to download an APK or screen-sharing tool (QuickSupport / AnyDesk) to "verify KYC", capturing banking credentials and OTPs in real-time.',
    tactics:
      'Creating urgent panic, sending malicious APK links via SMS/WhatsApp, capturing real-time screen displays to steal OTPs.',
    rule:
      'Never install third-party APKs sent via chat, and never share OTPs or passwords with any caller under any circumstance.',
    severity: 'CRITICAL',
  },
  {
    id: 'scam-3',
    title: 'Courier & Customs Illegal Parcel Fraud (FedEx / DHL)',
    category: 'Courier & Customs',
    description:
      'Automated robocalls state an international courier parcel sent in your name containing passports, foreign currency, or illegal goods has been seized by Customs and transfer you to fake narcotics officers demanding settlement fees.',
    tactics:
      'Automated IVR calling, transferring to fake uniformed inspectors, fabricating seizure notices, demanding RTGS deposits.',
    rule:
      'Legitimate courier agencies return undelivered parcels to the sender; they never demand direct bank transfers for customs clearances.',
    severity: 'HIGH',
  },
  {
    id: 'scam-4',
    title: 'Part-Time Job & Telegram VIP Investment Schemes',
    category: 'Telegram & Jobs',
    description:
      'Victims receive WhatsApp messages promising ₹2,000–₹5,000 daily for liking YouTube videos or writing Google reviews. After paying small initial rewards, scammers demand large deposits into "VIP crypto investment schemes" which are permanently frozen.',
    tactics:
      'Small payouts to build trust, high-pressure Telegram group psychology, fake trading dashboard profits, freezing funds.',
    rule:
      'Genuine employers never require employees to deposit money to work or access earnings.',
    severity: 'HIGH',
  },
  {
    id: 'scam-5',
    title: 'AI Voice Cloning & Family Distress Kidnapping',
    category: 'AI Voice',
    description:
      'Attackers use short 3-second audio clips scraped from social media or reels to clone a child or family member’s voice. They call parents claiming an urgent road accident, arrest, or kidnapping and demand immediate ransom.',
    tactics:
      'Voice synthesis deepfakes, extreme emotional manipulation, background crying/sirens, demanding immediate UPI transfer.',
    rule:
      'Always hang up immediately and dial your family member directly on their known personal phone number before taking action.',
    severity: 'CRITICAL',
  },
  {
    id: 'scam-6',
    title: 'Electricity Bill & Disconnection Panic Fraud',
    category: 'Utility',
    description:
      'Urgent SMS or robocalls claim: "Your electricity connection will be disconnected tonight at 9:30 PM due to unpaid balance. Contact electricity officer immediately."',
    tactics:
      'Urgent evening deadlines, requesting small ₹10 payment on fake payment portal to capture card CVV and PIN.',
    rule:
      'DISCOM utilities issue official physical disconnection notices; they never send personal mobile numbers for bill payments.',
    severity: 'MEDIUM',
  },
];

interface CallerIntelligenceScreenProps {
  onBack: () => void;
}

export const CallerIntelligenceScreen: React.FC<CallerIntelligenceScreenProps> = ({ onBack }) => {
  const { colors, mode } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, mode), [colors, mode]);

  const {
    blockedNumbers,
    spamCalls,
    callHistory,
    autoBlockEnabled,
    notificationsEnabled,
    addBlockedNumber,
    removeBlockedNumber,
    reportCall,
    toggleAutoBlock,
    toggleNotifications,
    refreshData,
  } = useCallerIntelligence();

  const [activeTab, setActiveTab] = useState<number>(0);

  // ── 1. REAL CONTACTS & OVERLAY PERMISSIONS ──────────────────────
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([]);
  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean>(true);
  const [hasCallLogPermission, setHasCallLogPermission] = useState<boolean>(true);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);

  const requestCallPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const perms = [
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ];
        const res = await PermissionsAndroid.requestMultiple(perms);
        const granted = res[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED;
        setHasCallLogPermission(granted);
        if (granted) {
          refreshData();
          const contacts = await getLocalContacts();
          if (Array.isArray(contacts)) {
            setLocalContacts(contacts);
          }
        }
      } catch (err) {
        console.warn('Call permissions request error:', err);
      }
    }
  }, [refreshData]);

  useEffect(() => {
    // Check overlay permission
    CallDetection.checkOverlayPermission().then(granted => {
      setHasOverlayPermission(granted);
    });

    // Request Call Log & Contacts permissions on mount
    requestCallPermissions();
  }, [requestCallPermissions]);

  const handleRequestOverlay = async () => {
    await CallDetection.requestOverlayPermission();
    setTimeout(async () => {
      const granted = await CallDetection.checkOverlayPermission();
      setHasOverlayPermission(granted);
    }, 1200);
  };

  const handleSyncContacts = async () => {
    setIsSyncingContacts(true);
    showToast('Starting contact sync with Shield cloud database...');
    try {
      const res = await syncContactsWithBackend();
      showToast(res.message);
      refreshData();
    } catch (err: any) {
      showToast('Sync failed: ' + (err?.message || 'Network error'));
    } finally {
      setIsSyncingContacts(false);
    }
  };

  // ── 2. DYNAMIC SECURITY SCORE & METRICS ─────────────────────────
  const totalCallsCount = callHistory.length;
  const threatsCount = spamCalls.length + blockedNumbers.length;
  const dynamicSecurityScore = useMemo(() => {
    if (totalCallsCount === 0 && threatsCount === 0) return 100;
    if (totalCallsCount === 0 && threatsCount > 0) return Math.max(20, 100 - threatsCount * 12);
    const safeCalls = Math.max(0, totalCallsCount - threatsCount);
    return Math.max(15, Math.min(100, Math.round((safeCalls / totalCallsCount) * 100)));
  }, [totalCallsCount, threatsCount]);

  const radius = 40;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const gaugeAngle = (dynamicSecurityScore / 100) * 260;
  const strokeDashoffset = circumference - (gaugeAngle / 360) * circumference;
  const gaugeColor =
    dynamicSecurityScore >= 80 ? colors.cyanAccent : dynamicSecurityScore >= 50 ? colors.orangeWarning : colors.redDanger;

  // ── 3. RECENT SECURITY ALERTS (PERSISTENT & SLIDESHOW) ───────────
  const securityAlerts = useMemo<SecurityAlertItem[]>(() => {
    const list: SecurityAlertItem[] = [];
    blockedNumbers.forEach((b, idx) => {
      list.push({
        id: `block-${b.number}-${idx}`,
        title: 'Caller Blocked',
        targetName: b.name || 'Unknown Caller',
        targetNumber: b.number,
        detail: b.reason || 'Blocked in Telephony Registry',
        riskScore: 100,
        type: 'BLOCKED',
        date: b.date || 'Recent',
      });
    });
    spamCalls.forEach((s, idx) => {
      list.push({
        id: `spam-${s.number}-${idx}`,
        title: 'Spam Call Intercepted',
        targetName: s.name || 'Suspected Spam',
        targetNumber: s.number,
        detail: `Crowdsourced Risk: ${s.riskScore}%`,
        riskScore: s.riskScore,
        type: 'SPAM',
        date: s.date || 'Recent',
      });
    });
    return list;
  }, [blockedNumbers, spamCalls]);

  const [alertSlideIndex, setAlertSlideIndex] = useState<number>(0);
  const [showAllAlerts, setShowAllAlerts] = useState<boolean>(false);

  const currentAlert = securityAlerts[alertSlideIndex] || null;

  const handleNextAlert = () => {
    if (securityAlerts.length > 0) {
      setAlertSlideIndex((alertSlideIndex + 1) % securityAlerts.length);
    }
  };

  const handlePrevAlert = () => {
    if (securityAlerts.length > 0) {
      setAlertSlideIndex((alertSlideIndex - 1 + securityAlerts.length) % securityAlerts.length);
    }
  };

  // ── 4. MULTI-TIER NUMBER SEARCH ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<MockCall | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    const raw = searchQuery.trim();
    if (!raw) return;
    setIsSearching(true);

    const cleanQuery = raw.replace(/\D/g, '');

    // Tier 1: Check device contacts
    if (localContacts.length > 0) {
      const foundLocal = findContactByNumber(localContacts, raw);
      if (foundLocal) {
        setSearchResult({
          name: foundLocal.displayName || 'Saved Contact',
          number: foundLocal.phoneNumber || raw,
          riskScore: 0,
          type: 'Normal',
          carrier: 'Device Phonebook',
          location: 'Saved in Local Contacts',
          frequency: 'Verified Contact in Your Phone',
          source: 'LOCAL_CONTACT',
        });
        setIsSearching(false);
        return;
      }

      const matchedByName = findContactByName(localContacts, raw);
      if (matchedByName.length > 0) {
        const first = matchedByName[0];
        setSearchResult({
          name: first.displayName,
          number: first.phoneNumber,
          riskScore: 0,
          type: 'Normal',
          carrier: 'Device Phonebook',
          location: 'Saved in Local Contacts',
          frequency: 'Verified Contact in Your Phone',
          source: 'LOCAL_CONTACT',
        });
        setIsSearching(false);
        return;
      }
    }

    // Tier 2: Check Cloud Database Backup
    try {
      const res = await fetch(`${getCallerBaseUrl()}/api/callers/lookup/${encodeURIComponent(cleanQuery || raw)}`);
      if (res.ok) {
        const data = await res.json();
        const isCloudBackup = data.source === 'CLOUD_BACKUP' || data.exists === true;
        setSearchResult({
          name: data.caller_name || (isCloudBackup ? 'Cloud Verified Contact' : 'Unknown Caller'),
          number: raw,
          riskScore: data.risk_score || (data.is_spam ? 85 : 15),
          type: data.is_spam ? 'Spam' : data.risk_score > 50 ? 'Suspicious' : 'Normal',
          carrier: data.carrier || (isCloudBackup ? 'Verified Cloud Network' : 'Cellular Network'),
          location: data.location || (isCloudBackup ? 'India (Directory)' : 'Local Network'),
          frequency: isCloudBackup
            ? 'Identified via Shield Cloud Directory Backup'
            : `${data.total_reports || 0} community reports`,
          source: isCloudBackup ? 'CLOUD_BACKUP' : 'UNKNOWN',
        });
        setIsSearching(false);
        return;
      }
    } catch (e) {
      console.warn('Backend search error:', e);
    }

    // Tier 3: Local Tri-Layer evaluation
    try {
      if (Platform.OS === 'android') {
        const localTri = await CallDetection.analyzeCaller(cleanQuery || raw);
        if (localTri) {
          setSearchResult({
            name: localTri.isInContacts ? 'Contact' : 'Unregistered Caller',
            number: raw,
            riskScore: localTri.riskScore,
            type: localTri.riskScore >= 70 ? 'Spam' : localTri.riskScore >= 40 ? 'Suspicious' : 'Normal',
            carrier: 'Cellular Network',
            location: 'Local Region',
            frequency: localTri.digitalDnaPattern || 'Shield Tri-Layer Analyzed',
            source: 'UNKNOWN',
          });
          setIsSearching(false);
          return;
        }
      }
    } catch (ignore) {}

    setSearchResult({
      name: 'Unregistered Number',
      number: raw,
      riskScore: 25,
      type: 'Normal',
      carrier: 'Cellular Network',
      location: 'Local Region',
      frequency: 'Not in phonebook or cloud backup',
      source: 'UNKNOWN',
    });
    setIsSearching(false);
  };

  // ── 5. SCAM INFO CENTER CATEGORIES & SEARCH ─────────────────────
  const [selectedScamCategory, setSelectedScamCategory] = useState<string>('All');
  const [scamSearchQuery, setScamSearchQuery] = useState<string>('');

  const filteredScams = useMemo(() => {
    return SCAM_DATABASE.filter(item => {
      const matchesCategory = selectedScamCategory === 'All' || item.category === selectedScamCategory;
      const matchesSearch =
        scamSearchQuery.trim() === '' ||
        item.title.toLowerCase().includes(scamSearchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(scamSearchQuery.toLowerCase()) ||
        item.tactics.toLowerCase().includes(scamSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedScamCategory, scamSearchQuery]);

  // ── 6. SIMULATOR & POPUPS ───────────────────────────────────────
  const [activeSimulatedCall, setActiveSimulatedCall] = useState<MockCall | null>(null);
  const [showSpamWarning, setShowSpamWarning] = useState(false);
  const [showScamAlert, setShowScamAlert] = useState(false);
  const [showHighRiskAlert, setShowHighRiskAlert] = useState(false);
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false);
  const [customBlockNumber, setCustomBlockNumber] = useState('');
  const [customBlockName, setCustomBlockName] = useState('');
  const [customBlockReason, setCustomBlockReason] = useState('');
  const [sensitivity, setSensitivity] = useState(75);
  const [privacyLogging, setPrivacyLogging] = useState(false);

  const [reportType, setReportType] = useState('Robocall / Telemarketing');
  const [reportDesc, setReportDesc] = useState('');
  const [callerToBlockOrReport, setCallerToBlockOrReport] = useState<MockCall | null>(null);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notice', message);
    }
  };

  const handleSimulateCall = async (call: MockCall) => {
    setActiveSimulatedCall(call);

    // 🚀 Trigger native Android PopupService overlay over any app
    try {
      if (Platform.OS === 'android') {
        await CallDetection.simulateCall(call.number);
      }
    } catch (e) {
      console.warn('Native simulation error:', e);
    }

    try {
      await fetch(`${getCallerBaseUrl()}/api/live-call/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_number: call.number,
          caller_name: call.name,
          call_type: call.type === 'Normal' ? 'INCOMING' : call.type === 'Spam' || call.type === 'Scam' ? 'BLOCKED' : 'INCOMING',
          duration: Math.floor(Math.random() * 60) + 15,
        }),
      });
    } catch (e) {
      console.warn('Live call analyze error:', e);
    }

    if (call.type === 'Spam') {
      setShowSpamWarning(true);
    } else if (call.type === 'Scam') {
      setShowScamAlert(true);
    } else if (call.type === 'High-Risk') {
      setShowHighRiskAlert(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.contentWrapper}>

        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (activeTab !== 0) {
                setActiveTab(0);
              } else {
                onBack();
              }
            }}
          >
            <Icon name="arrow-back" color={colors.text} size={20} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Caller Intelligence</Text>
            <Text style={styles.headerSubtitle}>Real-Time Call Shield & Spam Analysis Hub</Text>
          </View>
        </View>

        {/* Tabs Row */}
        <View style={styles.tabsRowContainer}>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
            {[
              'Dashboard',
              'Live Call Simulator',
              'Number Search',
              'Call History',
              'Spam & Blocked',
              'Scam Info Center',
              'Analytics & Settings',
            ].map((label, idx) => {
              const isSelected = activeTab === idx;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                  onPress={() => setActiveTab(idx)}
                >
                  <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* VIEW PANEL CONTROLLER */}
        <ScrollView contentContainerStyle={styles.viewContent}>
          {/* TAB 0: DASHBOARD */}
          {activeTab === 0 && (
            <View style={{ width: '100%' }}>
              {/* Overlay Permission Alert Banner */}
              {!hasOverlayPermission && (
                <View style={styles.overlayBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overlayBannerTitle}>Enable Floating Caller Shield</Text>
                    <Text style={styles.overlayBannerSub}>
                      Allow "Display over other apps" so caller ID popups automatically appear over WhatsApp, YouTube, and the Phone dialer.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.overlayGrantBtn} onPress={handleRequestOverlay}>
                    <Text style={styles.overlayGrantBtnText}>Grant</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Security Score Widget */}
              <View style={styles.dashboardCard}>
                <View style={styles.gaugeRow}>
                  <View style={styles.gaugeContainer}>
                    <Svg width={90} height={90} viewBox="0 0 100 100">
                      <G rotation="-220" origin="50, 50">
                        <Circle
                          cx="50"
                          cy="50"
                          r={radius}
                          stroke={mode === 'light' ? '#e2e8f0' : '#140c3f'}
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeDasharray={`${(260 / 360) * circumference} ${circumference}`}
                          strokeLinecap="round"
                        />
                        <Circle
                          cx="50"
                          cy="50"
                          r={radius}
                          stroke={gaugeColor}
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </G>
                    </Svg>
                    <View style={styles.gaugeTextWrapper}>
                      <Text style={[styles.gaugePct, { color: gaugeColor }]}>{dynamicSecurityScore}%</Text>
                      <Text style={styles.gaugeLabel}>Secure</Text>
                    </View>
                  </View>

                  <View style={styles.gaugeInfo}>
                    <Text style={styles.gaugeInfoTitle}>Caller Security Score</Text>
                    <Text style={styles.gaugeInfoSub}>
                      {dynamicSecurityScore >= 80
                        ? 'Shield is actively filtering unknown incoming calls.'
                        : 'Potential threat activity detected on your device.'}
                    </Text>
                    <View style={styles.statusBadge}>
                      <View
                        style={[
                          styles.greenStatusDot,
                          {
                            backgroundColor:
                              dynamicSecurityScore >= 80
                                ? '#00E676'
                                : dynamicSecurityScore >= 50
                                ? colors.orangeWarning
                                : colors.redDanger,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              dynamicSecurityScore >= 80
                                ? '#00E676'
                                : dynamicSecurityScore >= 50
                                ? colors.orangeWarning
                                : colors.redDanger,
                          },
                        ]}
                      >
                        {dynamicSecurityScore >= 80
                          ? 'Protected & Safe'
                          : dynamicSecurityScore >= 50
                          ? 'Moderate Threat Level'
                          : 'Critical Threat Alert'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Call Stats Grid (Pure Real Metrics - No Fake Offsets) */}
              <View style={styles.statsRow}>
                <View style={styles.statWidget}>
                  <Text style={styles.statWidgetLabel}>Device Calls</Text>
                  <Text style={styles.statWidgetValue}>{totalCallsCount}</Text>
                </View>
                <View style={[styles.statWidget, { borderColor: colors.orangeWarning + '55' }]}>
                  <Text style={styles.statWidgetLabel}>Spam Calls</Text>
                  <Text style={[styles.statWidgetValue, { color: colors.orangeWarning }]}>
                    {spamCalls.length}
                  </Text>
                </View>
                <View style={[styles.statWidget, { borderColor: colors.redDanger + '55' }]}>
                  <Text style={styles.statWidgetLabel}>Blocked Calls</Text>
                  <Text style={[styles.statWidgetValue, { color: colors.redDanger }]}>
                    {blockedNumbers.length}
                  </Text>
                </View>
              </View>

              {/* Recent Security Alerts Carousel (Slide Show & Show More) */}
              <View style={{ marginTop: 20 }}>
                <View style={styles.alertHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    RECENT SECURITY ALERTS ({securityAlerts.length})
                  </Text>
                  {securityAlerts.length > 1 && (
                    <TouchableOpacity onPress={() => setShowAllAlerts(!showAllAlerts)}>
                      <Text style={styles.showMoreLink}>
                        {showAllAlerts ? 'Show Slide View' : 'View All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {securityAlerts.length === 0 ? (
                  <View style={styles.emptyAlertsCard}>
                    <Icon name="check-circle" color="#00E676" size={24} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.emptyAlertsTitle}>All Clear — Zero Active Threats</Text>
                      <Text style={styles.emptyAlertsSub}>Incoming telephony calls are fully protected.</Text>
                    </View>
                  </View>
                ) : showAllAlerts ? (
                  // Full List View
                  securityAlerts.map(alert => (
                    <View key={alert.id} style={styles.alertItemCard}>
                      <View style={styles.alertIconCol}>
                        <Icon
                          name={alert.type === 'BLOCKED' ? 'block' : 'warning'}
                          color={alert.type === 'BLOCKED' ? colors.redDanger : colors.orangeWarning}
                          size={20}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.alertCardTitle}>{alert.title}</Text>
                          <Text style={styles.alertCardDate}>{alert.date}</Text>
                        </View>
                        <Text style={styles.alertCardTarget}>{alert.targetName} ({alert.targetNumber})</Text>
                        <Text style={styles.alertCardDetail}>{alert.detail}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  // Slideshow Carousel View
                  <View style={styles.carouselContainer}>
                    {currentAlert && (
                      <View style={styles.carouselCard}>
                        <View style={styles.carouselCardHeader}>
                          <View style={styles.carouselBadgeRow}>
                            <Icon
                              name={currentAlert.type === 'BLOCKED' ? 'block' : 'warning'}
                              color={currentAlert.type === 'BLOCKED' ? colors.redDanger : colors.orangeWarning}
                              size={18}
                            />
                            <Text
                              style={[
                                styles.carouselBadgeText,
                                { color: currentAlert.type === 'BLOCKED' ? colors.redDanger : colors.orangeWarning },
                              ]}
                            >
                              {currentAlert.title.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.carouselCounterText}>
                            {alertSlideIndex + 1} / {securityAlerts.length}
                          </Text>
                        </View>

                        <Text style={styles.carouselTargetName}>{currentAlert.targetName}</Text>
                        <Text style={styles.carouselTargetNumber}>{currentAlert.targetNumber}</Text>
                        <Text style={styles.carouselDetail}>{currentAlert.detail}</Text>

                        {/* Slide Pagination & Arrows */}
                        <View style={styles.carouselControlsRow}>
                          <TouchableOpacity
                            style={styles.carouselNavBtn}
                            onPress={handlePrevAlert}
                            disabled={securityAlerts.length <= 1}
                          >
                            <Icon name="arrow-back" color={colors.text} size={16} />
                          </TouchableOpacity>

                          <View style={styles.carouselDotsRow}>
                            {securityAlerts.slice(0, 5).map((_, idx) => (
                              <View
                                key={idx}
                                style={[
                                  styles.carouselDot,
                                  idx === alertSlideIndex && styles.carouselDotActive,
                                ]}
                              />
                            ))}
                            {securityAlerts.length > 5 && (
                              <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 4 }}>
                                +{securityAlerts.length - 5}
                              </Text>
                            )}
                          </View>

                          <TouchableOpacity
                            style={styles.carouselNavBtn}
                            onPress={handleNextAlert}
                            disabled={securityAlerts.length <= 1}
                          >
                            <Icon name="arrow-forward" color={colors.text} size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Quick Actions */}
              <Text style={[styles.sectionTitle, { marginTop: 22 }]}>QUICK ACTION CHANNELS</Text>
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.actionWidget} onPress={() => setActiveTab(1)}>
                  <Icon name="phone-callback" color={colors.greenSuccess} size={24} />
                  <Text style={styles.actionWidgetTitle}>Simulate Live Call</Text>
                  <Text style={styles.actionWidgetSub}>Test overlay popup</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionWidget} onPress={() => setActiveTab(2)}>
                  <Icon name="search" color={colors.cyanAccent} size={24} />
                  <Text style={styles.actionWidgetTitle}>Directory Lookup</Text>
                  <Text style={styles.actionWidgetSub}>Reputation database</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.statsRow, { marginTop: 10 }]}>
                <TouchableOpacity style={styles.actionWidget} onPress={handleSyncContacts} disabled={isSyncingContacts}>
                  <Icon name="cloud-upload" color={colors.purpleAccent} size={24} />
                  <Text style={styles.actionWidgetTitle}>{isSyncingContacts ? 'Syncing...' : 'Sync Contacts'}</Text>
                  <Text style={styles.actionWidgetSub}>Upload to Cloud DB</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionWidget} onPress={() => setActiveTab(4)}>
                  <Icon name="block" color={colors.redDanger} size={24} />
                  <Text style={styles.actionWidgetTitle}>Auto-Block Rules</Text>
                  <Text style={styles.actionWidgetSub}>Blocklist & Tri-Layer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 1: LIVE CALL SIMULATOR */}
          {activeTab === 1 && (
            <View style={{ width: '100%' }}>
              <Text style={styles.sectionTitle}>ACTIVE INCOMING CALL SIMULATION ENGINE</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
                Triggers floating system popup outside of the app over other apps, dialer, or active screen.
              </Text>

              <View style={styles.simulatorBtnsRow}>
                <TouchableOpacity
                  style={[styles.simBtn, { borderColor: colors.greenSuccess }]}
                  onPress={() =>
                    handleSimulateCall({
                      name: 'Trusted Contact Test',
                      number: '+91 98765 00001',
                      riskScore: 0,
                      type: 'Normal',
                      carrier: 'Mobile Network',
                      location: 'Local Contact',
                      frequency: 'Verified Contact',
                    })
                  }
                >
                  <Text style={styles.simBtnText}>Safe Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { borderColor: colors.orangeWarning }]}
                  onPress={() =>
                    handleSimulateCall({
                      name: 'Commercial Telemarketer',
                      number: '1409876543',
                      riskScore: 85,
                      type: 'Spam',
                      carrier: 'Telemarketing Trunk',
                      location: 'Commercial DND',
                      frequency: 'Reported Robocaller',
                    })
                  }
                >
                  <Text style={styles.simBtnText}>Spam Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { borderColor: colors.redDanger }]}
                  onPress={() =>
                    handleSimulateCall({
                      name: 'Bank KYC Scam Alert',
                      number: '+91 1800 000 111',
                      riskScore: 98,
                      type: 'Scam',
                      carrier: 'Unverified VoIP',
                      location: 'Fraud Registry',
                      frequency: 'Critical Financial Threat',
                    })
                  }
                >
                  <Text style={styles.simBtnText}>Scam Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { borderColor: '#ff1111' }]}
                  onPress={() =>
                    handleSimulateCall({
                      name: 'Digital Arrest Threat',
                      number: '+91 99999 88888',
                      riskScore: 99,
                      type: 'High-Risk',
                      carrier: 'Spoofed Caller ID',
                      location: 'National Cyber Registry',
                      frequency: 'Critical Impersonation Alert',
                    })
                  }
                >
                  <Text style={styles.simBtnText}>High-Risk Call</Text>
                </TouchableOpacity>
              </View>

              {/* Simulated Active Call Screen */}
              {activeSimulatedCall ? (
                <View
                  style={[
                    styles.callScreenCard,
                    {
                      backgroundColor:
                        activeSimulatedCall.type === 'Spam' ||
                        activeSimulatedCall.type === 'Scam' ||
                        activeSimulatedCall.type === 'High-Risk'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : activeSimulatedCall.type === 'Normal'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                    },
                  ]}
                >
                  <Icon
                    name="phone-in-talk"
                    color={
                      activeSimulatedCall.type === 'Spam' ||
                      activeSimulatedCall.type === 'Scam' ||
                      activeSimulatedCall.type === 'High-Risk'
                        ? colors.redDanger
                        : activeSimulatedCall.type === 'Normal'
                        ? colors.greenSuccess
                        : colors.orangeWarning
                    }
                    size={48}
                  />
                  <Text style={styles.callScreenName}>{activeSimulatedCall.name}</Text>
                  <Text style={styles.callScreenNumber}>{activeSimulatedCall.number}</Text>
                  <Text style={styles.callScreenCarrier}>
                    Carrier: {activeSimulatedCall.carrier} | {activeSimulatedCall.location}
                  </Text>
                  <Text
                    style={[
                      styles.callScreenScore,
                      {
                        color:
                          activeSimulatedCall.riskScore > 80
                            ? colors.redDanger
                            : activeSimulatedCall.riskScore > 50
                            ? colors.orangeWarning
                            : colors.greenSuccess,
                      },
                    ]}
                  >
                    Risk Score: {activeSimulatedCall.riskScore}%
                  </Text>

                  <View style={styles.callActionsRow}>
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: 'rgba(107, 110, 133, 0.2)' }]}
                      onPress={() => {
                        showToast(`Call allowed from ${activeSimulatedCall.name}`);
                        setActiveSimulatedCall(null);
                      }}
                    >
                      <Text style={styles.callBtnText}>Allow</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: colors.redDanger }]}
                      onPress={() => {
                        setCallerToBlockOrReport(activeSimulatedCall);
                        setShowBlockConfirmation(true);
                      }}
                    >
                      <Text style={styles.callBtnText}>Block</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: colors.cyanAccent }]}
                      onPress={() => {
                        setCallerToBlockOrReport(activeSimulatedCall);
                        setReportDesc('');
                        setShowReportPopup(true);
                      }}
                    >
                      <Text style={[styles.callBtnText, { color: '#000' }]}>Report</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.callScreenCardEmpty}>
                  <Icon name="phone-in-talk" color="#6B6E85" size={48} />
                  <Text style={styles.emptyCallText}>No simulated call active. Tap one of the triggers above.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: NUMBER SEARCH (MULTI-TIER CLOUD & CONTACTS) */}
          {activeTab === 2 && (
            <View style={{ width: '100%' }}>
              <View style={styles.searchCard}>
                <Text style={styles.searchTitle}>Reputation Directory & Cloud Search</Text>
                <Text style={styles.searchSub}>
                  Checks phonebook contacts, Cloud DB backups, and AI spam intelligence
                </Text>

                <View style={styles.searchInputRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter phone number or name (e.g. 9876543210)"
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={isSearching}>
                    <Text style={styles.searchBtnText}>{isSearching ? '...' : 'Search'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {searchResult && (
                <View style={styles.searchResultCard}>
                  {/* Origin Tag */}
                  <View style={styles.sourceTagRow}>
                    <Icon
                      name={
                        searchResult.source === 'LOCAL_CONTACT'
                          ? 'contacts'
                          : searchResult.source === 'CLOUD_BACKUP'
                          ? 'cloud-done'
                          : 'help-outline'
                      }
                      color={
                        searchResult.source === 'LOCAL_CONTACT'
                          ? colors.greenSuccess
                          : searchResult.source === 'CLOUD_BACKUP'
                          ? colors.cyanAccent
                          : colors.textMuted
                      }
                      size={14}
                    />
                    <Text
                      style={[
                        styles.sourceTagText,
                        {
                          color:
                            searchResult.source === 'LOCAL_CONTACT'
                              ? colors.greenSuccess
                              : searchResult.source === 'CLOUD_BACKUP'
                              ? colors.cyanAccent
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {searchResult.source === 'LOCAL_CONTACT'
                        ? 'SAVED IN DEVICE CONTACTS'
                        : searchResult.source === 'CLOUD_BACKUP'
                        ? 'IDENTIFIED VIA SHIELD CLOUD BACKUP'
                        : 'UNSAVED NUMBER EVALUATION'}
                    </Text>
                  </View>

                  <Text style={styles.resultName}>{searchResult.name}</Text>
                  <Text style={styles.resultNumber}>{searchResult.number}</Text>
                  <Text style={styles.resultSub}>Network: {searchResult.carrier}</Text>
                  <Text style={styles.resultSub}>Location: {searchResult.location}</Text>
                  <Text style={styles.resultSub}>Status: {searchResult.frequency}</Text>

                  <View style={styles.resultRiskRow}>
                    <Text
                      style={[
                        styles.resultScoreText,
                        {
                          color:
                            searchResult.riskScore > 70
                              ? colors.redDanger
                              : searchResult.riskScore > 40
                              ? colors.orangeWarning
                              : colors.greenSuccess,
                        },
                      ]}
                    >
                      Risk Index: {searchResult.riskScore}% [{searchResult.type.toUpperCase()}]
                    </Text>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.searchActionsRow}>
                    <TouchableOpacity
                      style={[styles.searchActionBtn, { backgroundColor: colors.greenSuccess }]}
                      onPress={() => Linking.openURL(`tel:${searchResult.number}`)}
                    >
                      <Icon name="phone" color="#fff" size={16} />
                      <Text style={styles.searchActionBtnText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.searchActionBtn, { backgroundColor: colors.redDanger }]}
                      onPress={() => {
                        addBlockedNumber(searchResult.number, searchResult.name, 'Manual User Block');
                        showToast(`Blocked ${searchResult.number}`);
                      }}
                    >
                      <Icon name="block" color="#fff" size={16} />
                      <Text style={styles.searchActionBtnText}>Block</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.searchActionBtn, { backgroundColor: '#1e293b' }]}
                      onPress={() => {
                        setCallerToBlockOrReport(searchResult);
                        setReportDesc('');
                        setShowReportPopup(true);
                      }}
                    >
                      <Icon name="report" color={colors.cyanAccent} size={16} />
                      <Text style={[styles.searchActionBtnText, { color: colors.cyanAccent }]}>Report</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: REAL CALL HISTORY */}
          {activeTab === 3 && (
            <View style={{ width: '100%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>DEVICE CALL HISTORY LOGS ({callHistory.length})</Text>
                <TouchableOpacity onPress={() => { requestCallPermissions(); refreshData(); }}>
                  <Text style={{ color: colors.cyanAccent, fontSize: 12, fontWeight: 'bold' }}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {!hasCallLogPermission && (
                <View style={{ backgroundColor: colors.cardBackgroundLight, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.orangeWarning, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="warning" color={colors.orangeWarning} size={24} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold' }}>Call Log Permission Required</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Grant call log permission so Shield can read real hardware call history.</Text>
                    <TouchableOpacity
                      style={{ marginTop: 8, backgroundColor: colors.cyanAccent, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' }}
                      onPress={requestCallPermissions}
                    >
                      <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>Grant Permission</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {callHistory.length > 0 ? (
                callHistory.map((call, idx) => {
                  let bgColor = 'rgba(255, 255, 255, 0.05)';
                  let labelColor = colors.textMuted;
                  if (call.type === 'Spam' || call.type === 'Scam' || call.type === 'High-Risk') {
                    bgColor = 'rgba(239, 68, 68, 0.2)';
                    labelColor = colors.redDanger;
                  } else if (call.type === 'Normal') {
                    bgColor = 'rgba(16, 185, 129, 0.15)';
                    labelColor = colors.greenSuccess;
                  } else if (call.type === 'Suspicious') {
                    bgColor = 'rgba(245, 158, 11, 0.15)';
                    labelColor = colors.orangeWarning;
                  }

                  return (
                    <View key={idx} style={[styles.historyRow, { backgroundColor: bgColor }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyName}>{call.name}</Text>
                        <Text style={styles.historyNumber}>{call.number}</Text>
                        <Text style={styles.historyDate}>
                          Type: <Text style={{ color: labelColor, fontWeight: 'bold' }}>{call.type}</Text> | {call.frequency}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.historyBtn}
                        onPress={() => {
                          setCallerToBlockOrReport(call);
                          setShowBlockConfirmation(true);
                        }}
                      >
                        <Text style={styles.historyBtnText}>Block</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <View style={styles.listEmptyPlaceholder}>
                  <Icon name="phone" color={colors.textMuted} size={48} />
                  <Text style={styles.placeholderText}>No incoming calls found in device log.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 4: SPAM & BLOCKED */}
          {activeTab === 4 && (
            <View style={{ width: '100%' }}>
              <Text style={styles.sectionTitle}>SPAM CALLS LOG ({spamCalls.length})</Text>
              {spamCalls.length > 0 ? (
                spamCalls.map((spam, idx) => (
                  <View key={idx} style={styles.blockedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.blockedName}>{spam.name}</Text>
                      <Text style={styles.blockedNumber}>{spam.number}</Text>
                      <Text style={styles.blockedDate}>Risk Score: {spam.riskScore}% | {spam.date}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unblockBtn}
                      onPress={() => {
                        addBlockedNumber(spam.number, spam.name, 'Auto-Blocked from Spam List');
                        showToast(`Blocked: ${spam.number}`);
                      }}
                    >
                      <Text style={styles.unblockBtnText}>Block</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.listEmptyPlaceholder}>
                  <Icon name="verified" color={colors.greenSuccess} size={36} />
                  <Text style={styles.placeholderText}>Zero active spam reports on your device.</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
                  BLOCKED TELEPHONY REGISTRY ({blockedNumbers.length})
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: colors.redDanger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  onPress={() => {
                    setCustomBlockNumber('');
                    setCustomBlockName('');
                    setCustomBlockReason('');
                    setShowCustomBlockModal(true);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>+ Block Number</Text>
                </TouchableOpacity>
              </View>

              {blockedNumbers.length > 0 ? (
                blockedNumbers.map((blocked, idx) => (
                  <View key={idx} style={styles.blockedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.blockedName}>{blocked.name}</Text>
                      <Text style={styles.blockedNumber}>{blocked.number}</Text>
                      <Text style={styles.blockedDate}>Reason: {blocked.reason} | {blocked.date}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.unblockBtn, { borderColor: colors.greenSuccess }]}
                      onPress={() => {
                        removeBlockedNumber(blocked.number);
                        showToast(`Unblocked: ${blocked.number}`);
                      }}
                    >
                      <Text style={[styles.unblockBtnText, { color: colors.greenSuccess }]}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.listEmptyPlaceholder}>
                  <Icon name="check-circle" color={colors.textMuted} size={36} />
                  <Text style={styles.placeholderText}>No blocked numbers in registry.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 5: SCAM THREAT INTELLIGENCE CENTER */}
          {activeTab === 5 && (
            <View style={{ width: '100%' }}>
              <Text style={styles.sectionTitle}>SCAM THREAT INTELLIGENCE CENTER</Text>

              {/* Emergency Cyber Crime Helpline Banner */}
              <View style={styles.helplineBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helplineTitle}>🚨 National Cyber Crime Helpline</Text>
                  <Text style={styles.helplineSub}>
                    Report immediate financial fraud, digital arrest, or identity theft to Gov Authorities.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.helplineCallBtn}
                  onPress={() => Linking.openURL('tel:1930')}
                >
                  <Icon name="phone" color="#fff" size={16} />
                  <Text style={styles.helplineCallBtnText}>Call 1930</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar for Scams */}
              <View style={styles.scamSearchRow}>
                <TextInput
                  style={styles.scamSearchInput}
                  placeholder="Search scam patterns (e.g. Digital Arrest, OTP, Courier)..."
                  placeholderTextColor={colors.textMuted}
                  value={scamSearchQuery}
                  onChangeText={setScamSearchQuery}
                />
              </View>

              {/* Category Filter Chips */}
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {['All', 'Digital Arrest', 'Banking & OTP', 'Courier & Customs', 'Telegram & Jobs', 'AI Voice'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, selectedScamCategory === cat && styles.catChipActive]}
                    onPress={() => setSelectedScamCategory(cat)}
                  >
                    <Text style={[styles.catChipText, selectedScamCategory === cat && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filtered Scam Cards */}
              {filteredScams.map(scam => (
                <View key={scam.id} style={styles.scamCard}>
                  <View style={styles.scamHeaderRow}>
                    <Text style={styles.scamTitle}>{scam.title}</Text>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor:
                            scam.severity === 'CRITICAL'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(245, 158, 11, 0.2)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          {
                            color:
                              scam.severity === 'CRITICAL' ? colors.redDanger : colors.orangeWarning,
                          },
                        ]}
                      >
                        {scam.severity} THREAT
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.scamDesc}>{scam.description}</Text>

                  <View style={styles.scamSection}>
                    <Text style={styles.scamSectionHeading}>⚠️ Scammer Tactics & Red Flags:</Text>
                    <Text style={styles.scamTactics}>{scam.tactics}</Text>
                  </View>

                  <View style={styles.scamSection}>
                    <Text style={styles.scamSectionHeading}>🛡️ Shield Safety Rule:</Text>
                    <Text style={styles.scamAction}>{scam.rule}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 6: ANALYTICS & SETTINGS */}
          {activeTab === 6 && (
            <View style={{ width: '100%' }}>
              <View style={styles.settingCard}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Auto-Block High-Risk Calls</Text>
                    <Text style={styles.settingSub}>Silently terminate known fraud and scam senders</Text>
                  </View>
                  <Switch value={autoBlockEnabled} onValueChange={toggleAutoBlock} trackColor={{ true: colors.purpleAccent }} />
                </View>

                <View style={[styles.switchRow, { marginTop: 20 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Spam Alert Notifications</Text>
                    <Text style={styles.settingSub}>Display floating warning banners for risk callers</Text>
                  </View>
                  <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ true: colors.purpleAccent }} />
                </View>

                <View style={styles.cardDivider} />

                {/* Floating Overlay Permission Toggle */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Display Over Other Apps</Text>
                    <Text style={styles.settingSub}>Enables floating caller ID outside the app</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.grantBtnSmall,
                      hasOverlayPermission && { backgroundColor: '#10b98122', borderColor: '#10b981' },
                    ]}
                    onPress={handleRequestOverlay}
                  >
                    <Text style={[styles.grantBtnSmallText, hasOverlayPermission && { color: '#10b981' }]}>
                      {hasOverlayPermission ? 'Granted' : 'Enable'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardDivider} />

                <Text style={styles.settingTitle}>Filter Sensitivity: {sensitivity}%</Text>
                <Text style={styles.settingSub}>Threshold for auto-blocking based on AI Risk score</Text>
                <View style={styles.sliderContainer}>
                  <TouchableOpacity style={styles.sliderButton} onPress={() => setSensitivity(Math.max(10, sensitivity - 5))}>
                    <Text style={styles.sliderButtonText}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.sliderTrackBg}>
                    <View style={[styles.sliderTrackFill, { width: `${sensitivity}%` }]} />
                  </View>
                  <TouchableOpacity style={styles.sliderButton} onPress={() => setSensitivity(Math.min(100, sensitivity + 5))}>
                    <Text style={styles.sliderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Privacy-Preserving Logging</Text>
                    <Text style={styles.settingSub}>Anonymize numbers before threat analysis uploads</Text>
                  </View>
                  <Switch value={privacyLogging} onValueChange={setPrivacyLogging} trackColor={{ true: colors.purpleAccent }} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* POPUP 1: SPAM WARNING DIALOG */}
        <Modal transparent={true} visible={showSpamWarning && activeSimulatedCall !== null} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderColor: colors.orangeWarning }]}>
              <View style={styles.popupHeader}>
                <Icon name="warning" color={colors.orangeWarning} size={36} />
                <Text style={styles.popupTitle}>SPAM CALL DETECTED</Text>
              </View>
              {activeSimulatedCall && (
                <>
                  <Text style={styles.popupSub}>Number: {activeSimulatedCall.number}</Text>
                  <Text style={[styles.popupRiskText, { color: colors.redDanger }]}>
                    Risk Score: {activeSimulatedCall.riskScore}%
                  </Text>
                  <Text style={styles.popupDesc}>
                    This number matches active automated spam networks. We recommend blocking this caller.
                  </Text>

                  <View style={styles.popupActions}>
                    <TouchableOpacity
                      style={[styles.popupBtn, { backgroundColor: 'rgba(107, 110, 133, 0.2)' }]}
                      onPress={() => {
                        showToast('Call allowed under observation');
                        setShowSpamWarning(false);
                      }}
                    >
                      <Text style={styles.popupBtnText}>Allow</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.popupBtn, { backgroundColor: colors.redDanger }]}
                      onPress={() => {
                        addBlockedNumber(activeSimulatedCall.number, activeSimulatedCall.name, 'Spam Network Warning');
                        showToast('Caller Blocked');
                        setActiveSimulatedCall(null);
                        setShowSpamWarning(false);
                      }}
                    >
                      <Text style={styles.popupBtnText}>Block</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* POPUP 2: SCAM WARNING DIALOG */}
        <Modal transparent={true} visible={showScamAlert && activeSimulatedCall !== null} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderColor: colors.redDanger, backgroundColor: '#2E0914' }]}>
              <View style={styles.popupHeader}>
                <Icon name="gavel" color={colors.redDanger} size={36} />
                <Text style={styles.popupTitle}>IMMEDIATE SCAM WARNING</Text>
              </View>
              {activeSimulatedCall && (
                <>
                  <Text style={[styles.popupRiskText, { color: colors.redDanger, fontWeight: '900' }]}>
                    Threat Level: CRITICAL RISK
                  </Text>
                  <Text style={styles.popupSub}>Caller: {activeSimulatedCall.name}</Text>
                  <Text style={styles.popupSub}>Number: {activeSimulatedCall.number}</Text>
                  <Text style={styles.popupDesc}>
                    Recommended Action: HANG UP IMMEDIATELY. This caller has been reported trying to spoof government bodies for credential fraud.
                  </Text>

                  <View style={styles.popupActions}>
                    <TouchableOpacity style={styles.popupTextBtn} onPress={() => setShowScamAlert(false)}>
                      <Text style={styles.popupTextBtnText}>Dismiss</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.popupBtn, { backgroundColor: colors.redDanger }]}
                      onPress={() => {
                        addBlockedNumber(activeSimulatedCall.number, activeSimulatedCall.name, 'Scam Warning Block');
                        showToast('Scam Number Terminated & Blocked');
                        setActiveSimulatedCall(null);
                        setShowScamAlert(false);
                      }}
                    >
                      <Text style={styles.popupBtnText}>Block & Report</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* POPUP 3: HIGH-RISK CALLER DIALOG */}
        <Modal transparent={true} visible={showHighRiskAlert && activeSimulatedCall !== null} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderColor: '#ff1111', backgroundColor: '#2e0000' }]}>
              <View style={styles.popupHeader}>
                <Icon name="cancel" color="#ff1111" size={44} />
                <Text style={styles.popupTitle}>CRITICAL: HIGH RISK ATTACK</Text>
              </View>
              {activeSimulatedCall && (
                <>
                  <Text style={[styles.popupRiskText, { color: '#ff1111', fontWeight: '900' }]}>
                    Risk Evaluation Score: {activeSimulatedCall.riskScore}%
                  </Text>
                  <Text style={styles.popupDesc}>
                    This caller is linked to known financial phishing campaigns. The connection is highly suspicious.
                  </Text>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: '#ff1111', height: 46 }]}
                    onPress={() => {
                      addBlockedNumber(activeSimulatedCall.number, activeSimulatedCall.name, 'Critical AI High-Risk Auto-Block');
                      showToast('Immediate Block Executed');
                      setActiveSimulatedCall(null);
                      setShowHighRiskAlert(false);
                    }}
                  >
                    <Text style={styles.primaryBtnText}>IMMEDIATE BLOCK SENDER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.popupTextBtn, { marginTop: 12 }]} onPress={() => setShowHighRiskAlert(false)}>
                    <Text style={styles.popupTextBtnText}>Ignore Risk (Dangerous)</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* POPUP 4: BLOCK CONFIRMATION */}
        <Modal transparent={true} visible={showBlockConfirmation && callerToBlockOrReport !== null} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.popupTitle}>Confirm Block Caller</Text>
              {callerToBlockOrReport && (
                <>
                  <Text style={styles.popupDesc}>
                    Are you sure you want to block calls and texts from {callerToBlockOrReport.name} ({callerToBlockOrReport.number})?
                  </Text>

                  <View style={styles.popupActions}>
                    <TouchableOpacity style={styles.popupTextBtn} onPress={() => setShowBlockConfirmation(false)}>
                      <Text style={styles.popupTextBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.popupBtn, { backgroundColor: colors.redDanger }]}
                      onPress={() => {
                        addBlockedNumber(callerToBlockOrReport.number, callerToBlockOrReport.name, 'User Block');
                        showToast('Caller Blocked');
                        setActiveSimulatedCall(null);
                        setShowBlockConfirmation(false);
                      }}
                    >
                      <Text style={styles.popupBtnText}>Confirm Block</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* POPUP 5: REPORT SENDER FORM */}
        <Modal transparent={true} visible={showReportPopup && callerToBlockOrReport !== null} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderColor: colors.cyanAccent }]}>
              <Text style={styles.popupTitle}>Report Caller to Threat Database</Text>
              {callerToBlockOrReport && (
                <>
                  <Text style={styles.reportFormLabel}>Report Type:</Text>
                  {['Robocall / Telemarketing', 'Phishing / Identity Theft', 'Government Impersonation', 'Harassment'].map(type => (
                    <TouchableOpacity key={type} style={styles.radioRow} onPress={() => setReportType(type)}>
                      <View style={styles.radioOuter}>
                        {reportType === type && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioLabel}>{type}</Text>
                    </TouchableOpacity>
                  ))}

                  <TextInput
                    style={styles.reportInput}
                    placeholder="Incident Description (Optional)"
                    placeholderTextColor={colors.textMuted}
                    value={reportDesc}
                    onChangeText={setReportDesc}
                    multiline={true}
                  />

                  <View style={styles.popupActions}>
                    <TouchableOpacity style={styles.popupTextBtn} onPress={() => setShowReportPopup(false)}>
                      <Text style={styles.popupTextBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.popupBtn, { backgroundColor: colors.cyanAccent }]}
                      onPress={() => {
                        reportCall(callerToBlockOrReport.number, reportType, reportDesc);
                        showToast('Report submitted to Shield Cloud Threat DB');
                        setShowReportPopup(false);
                      }}
                    >
                      <Text style={[styles.popupBtnText, { color: '#000' }]}>Submit Report</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* POPUP 6: CUSTOM NUMBER BLOCK MODAL */}
        <Modal transparent={true} visible={showCustomBlockModal} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderColor: colors.redDanger }]}>
              <Text style={styles.popupTitle}>Block Phone Number</Text>
              <Text style={styles.popupDesc}>Directly blacklist any phone number in Shield database.</Text>

              <TextInput
                style={styles.reportInput}
                placeholder="Phone Number (e.g. +91 98765 43210)"
                placeholderTextColor={colors.textMuted}
                value={customBlockNumber}
                onChangeText={setCustomBlockNumber}
                keyboardType="phone-pad"
              />

              <TextInput
                style={[styles.reportInput, { marginTop: 10 }]}
                placeholder="Caller Name (Optional)"
                placeholderTextColor={colors.textMuted}
                value={customBlockName}
                onChangeText={setCustomBlockName}
              />

              <TextInput
                style={[styles.reportInput, { marginTop: 10 }]}
                placeholder="Block Reason (e.g. Telemarketing, Phishing)"
                placeholderTextColor={colors.textMuted}
                value={customBlockReason}
                onChangeText={setCustomBlockReason}
              />

              <View style={styles.popupActions}>
                <TouchableOpacity style={styles.popupTextBtn} onPress={() => setShowCustomBlockModal(false)}>
                  <Text style={styles.popupTextBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupBtn, { backgroundColor: colors.redDanger }]}
                  onPress={() => {
                    if (!customBlockNumber.trim()) {
                      showToast('Please enter a valid phone number');
                      return;
                    }
                    addBlockedNumber(
                      customBlockNumber.trim(),
                      customBlockName.trim() || 'Blocked Number',
                      customBlockReason.trim() || 'Manual Block from UI'
                    );
                    showToast(`Blocked ${customBlockNumber.trim()} in DB!`);
                    setShowCustomBlockModal(false);
                  }}
                >
                  <Text style={styles.popupBtnText}>Block & Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark' = 'dark') => {
  const isLight = mode === 'light';
  const cardBg = isLight ? '#ffffff' : '#0A0726';
  const inputBg = isLight ? '#f8fafc' : '#07051F';
  const subtleBg = isLight ? '#f1f5f9' : '#07051F';
  const cardBorder = isLight ? '#e2e8f0' : 'rgba(123, 44, 191, 0.2)';
  const elevatedBg = isLight ? '#ffffff' : '#0F0A2B';
  const elevatedBorder = isLight ? '#e2e8f0' : '#337b2cbf';
  const subtextColor = isLight ? '#64748b' : '#6B6E85';

  return StyleSheet.create({
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
      paddingBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: elevatedBg,
      borderWidth: 1,
      borderColor: elevatedBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleContainer: {
      marginLeft: 16,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    headerSubtitle: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 2,
    },
    tabsRowContainer: {
      borderBottomWidth: 1,
      borderBottomColor: cardBorder,
      paddingBottom: 6,
    },
    tabsRow: {
      paddingHorizontal: 14,
    },
    tabBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: subtleBg,
      borderWidth: 1,
      borderColor: cardBorder,
      marginRight: 8,
    },
    tabBtnActive: {
      backgroundColor: isLight ? 'rgba(0, 119, 182, 0.12)' : 'rgba(0, 119, 182, 0.2)',
      borderColor: isLight ? '#0284c7' : '#00E5FF',
    },
    tabBtnText: {
      fontSize: 11,
      color: subtextColor,
    },
    tabBtnTextActive: {
      color: isLight ? '#0284c7' : '#fff',
      fontWeight: 'bold',
    },
    viewContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    overlayBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? 'rgba(0, 229, 255, 0.08)' : 'rgba(0, 229, 255, 0.12)',
      borderWidth: 1,
      borderColor: colors.cyanAccent,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    overlayBannerTitle: {
      color: colors.cyanAccent,
      fontSize: 13,
      fontWeight: 'bold',
    },
    overlayBannerSub: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    overlayGrantBtn: {
      backgroundColor: colors.cyanAccent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 10,
    },
    overlayGrantBtnText: {
      color: '#000',
      fontWeight: 'bold',
      fontSize: 12,
    },
    dashboardCard: {
      width: '100%',
      borderRadius: 14,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 16,
    },
    gaugeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gaugeContainer: {
      position: 'relative',
      width: 90,
      height: 90,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gaugeTextWrapper: {
      position: 'absolute',
      alignItems: 'center',
    },
    gaugePct: {
      fontSize: 18,
      fontWeight: '900',
    },
    gaugeLabel: {
      color: subtextColor,
      fontSize: 8,
    },
    gaugeInfo: {
      flex: 1,
      marginLeft: 16,
    },
    gaugeInfoTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
    },
    gaugeInfoSub: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    greenStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 10,
      marginLeft: 6,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 16,
    },
    statWidget: {
      flex: 0.31,
      borderRadius: 10,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 12,
    },
    statWidgetLabel: {
      color: subtextColor,
      fontSize: 10,
    },
    statWidgetValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      color: subtextColor,
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 8,
    },
    alertHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    showMoreLink: {
      color: colors.cyanAccent,
      fontWeight: 'bold',
      fontSize: 12,
    },
    emptyAlertsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: isLight ? '#bbf7d0' : 'rgba(0, 230, 118, 0.3)',
      borderRadius: 12,
      padding: 14,
      marginTop: 8,
    },
    emptyAlertsTitle: {
      color: isLight ? '#15803d' : '#00E676',
      fontSize: 13,
      fontWeight: 'bold',
    },
    emptyAlertsSub: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 2,
    },
    alertItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    alertIconCol: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: subtleBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertCardTitle: {
      color: colors.text,
      fontWeight: 'bold',
      fontSize: 12,
    },
    alertCardDate: {
      color: subtextColor,
      fontSize: 10,
    },
    alertCardTarget: {
      color: colors.cyanAccent,
      fontSize: 12,
      marginTop: 2,
      fontWeight: '600',
    },
    alertCardDetail: {
      color: subtextColor,
      fontSize: 10,
      marginTop: 2,
    },
    carouselContainer: {
      width: '100%',
      marginTop: 8,
    },
    carouselCard: {
      width: '100%',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 14,
      padding: 16,
    },
    carouselCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    carouselBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    carouselBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      marginLeft: 6,
    },
    carouselCounterText: {
      color: subtextColor,
      fontSize: 11,
    },
    carouselTargetName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
    },
    carouselTargetNumber: {
      color: colors.cyanAccent,
      fontSize: 13,
      marginTop: 2,
    },
    carouselDetail: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 6,
    },
    carouselControlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: cardBorder,
    },
    carouselNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: subtleBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    carouselDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    carouselDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
      marginHorizontal: 3,
    },
    carouselDotActive: {
      width: 14,
      backgroundColor: colors.cyanAccent,
    },
    actionWidget: {
      flex: 0.48,
      borderRadius: 12,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 14,
      alignItems: 'center',
    },
    actionWidgetTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 8,
    },
    actionWidgetSub: {
      color: subtextColor,
      fontSize: 10,
      marginTop: 2,
    },
    simulatorBtnsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 12,
    },
    simBtn: {
      flex: 0.23,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      alignItems: 'center',
    },
    simBtnText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: 'bold',
    },
    callScreenCard: {
      width: '100%',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
    },
    callScreenCardEmpty: {
      width: '100%',
      borderRadius: 16,
      padding: 36,
      alignItems: 'center',
      backgroundColor: cardBg,
      marginTop: 12,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    callScreenName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 12,
    },
    callScreenNumber: {
      color: colors.cyanAccent,
      fontSize: 14,
      marginTop: 4,
    },
    callScreenCarrier: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 4,
    },
    callScreenScore: {
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 8,
    },
    callActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 20,
    },
    callBtn: {
      flex: 0.31,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    callBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
    },
    emptyCallText: {
      color: subtextColor,
      fontSize: 12,
      marginTop: 12,
      textAlign: 'center',
    },
    searchCard: {
      width: '100%',
      borderRadius: 14,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 16,
    },
    searchTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: 'bold',
    },
    searchSub: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 2,
    },
    searchInputRow: {
      flexDirection: 'row',
      marginTop: 14,
    },
    searchInput: {
      flex: 1,
      backgroundColor: inputBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: cardBorder,
      color: colors.text,
      paddingHorizontal: 12,
      fontSize: 13,
      height: 44,
    },
    searchBtn: {
      backgroundColor: colors.cyanAccent,
      borderRadius: 8,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      height: 44,
    },
    searchBtnText: {
      color: '#000',
      fontWeight: 'bold',
      fontSize: 13,
    },
    searchResultCard: {
      width: '100%',
      borderRadius: 14,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: colors.cyanAccent,
      padding: 16,
      marginTop: 16,
    },
    sourceTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    sourceTagText: {
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      marginLeft: 6,
    },
    resultName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    resultNumber: {
      color: colors.cyanAccent,
      fontSize: 14,
      marginTop: 2,
    },
    resultSub: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 4,
    },
    resultRiskRow: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: cardBorder,
    },
    resultScoreText: {
      fontSize: 13,
      fontWeight: 'bold',
    },
    searchActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    searchActionBtn: {
      flex: 0.31,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 8,
    },
    searchActionBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
      marginLeft: 6,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 0.5,
      borderColor: cardBorder,
      backgroundColor: cardBg,
    },
    historyName: {
      color: colors.text,
      fontWeight: 'bold',
      fontSize: 13,
    },
    historyNumber: {
      color: colors.cyanAccent,
      fontSize: 11,
      marginTop: 2,
    },
    historyDate: {
      color: subtextColor,
      fontSize: 10,
      marginTop: 2,
    },
    historyBtn: {
      backgroundColor: colors.redDanger,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    historyBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 11,
    },
    listEmptyPlaceholder: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    placeholderText: {
      color: subtextColor,
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
    },
    blockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 0.5,
      borderColor: cardBorder,
    },
    blockedName: {
      color: colors.text,
      fontWeight: 'bold',
      fontSize: 13,
    },
    blockedNumber: {
      color: colors.redDanger,
      fontSize: 11,
      marginTop: 2,
    },
    blockedDate: {
      color: subtextColor,
      fontSize: 10,
      marginTop: 2,
    },
    unblockBtn: {
      borderWidth: 1,
      borderColor: colors.redDanger,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    unblockBtnText: {
      color: colors.redDanger,
      fontWeight: 'bold',
      fontSize: 11,
    },
    helplineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: colors.redDanger,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    helplineTitle: {
      color: colors.redDanger,
      fontSize: 13,
      fontWeight: 'bold',
    },
    helplineSub: {
      color: subtextColor,
      fontSize: 11,
      marginTop: 2,
    },
    helplineCallBtn: {
      backgroundColor: colors.redDanger,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 10,
    },
    helplineCallBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
      marginLeft: 4,
    },
    scamSearchRow: {
      marginBottom: 12,
    },
    scamSearchInput: {
      backgroundColor: inputBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: cardBorder,
      color: colors.text,
      paddingHorizontal: 12,
      fontSize: 12,
      height: 40,
    },
    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: subtleBg,
      borderWidth: 1,
      borderColor: cardBorder,
      marginRight: 8,
    },
    catChipActive: {
      backgroundColor: colors.cyanAccent,
      borderColor: colors.cyanAccent,
    },
    catChipText: {
      color: subtextColor,
      fontSize: 11,
    },
    catChipTextActive: {
      color: '#000',
      fontWeight: 'bold',
    },
    scamCard: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 16,
      marginBottom: 12,
    },
    scamHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    scamTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
      flex: 1,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      marginLeft: 8,
    },
    severityText: {
      fontSize: 9,
      fontWeight: '900',
    },
    scamDesc: {
      color: subtextColor,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    scamSection: {
      marginTop: 8,
      backgroundColor: subtleBg,
      padding: 10,
      borderRadius: 8,
    },
    scamSectionHeading: {
      color: colors.cyanAccent,
      fontSize: 11,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    scamTactics: {
      color: subtextColor,
      fontSize: 11,
      lineHeight: 16,
    },
    scamAction: {
      color: isLight ? '#15803d' : colors.greenSuccess,
      fontSize: 11,
      fontWeight: 'bold',
      lineHeight: 16,
    },
    settingCard: {
      width: '100%',
      borderRadius: 14,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 16,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: 'bold',
    },
    settingSub: {
      color: subtextColor,
      fontSize: 10,
      marginTop: 2,
    },
    grantBtnSmall: {
      borderWidth: 1,
      borderColor: colors.cyanAccent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isLight ? 'rgba(0, 229, 255, 0.08)' : 'rgba(0, 229, 255, 0.1)',
    },
    grantBtnSmallText: {
      color: colors.cyanAccent,
      fontWeight: 'bold',
      fontSize: 11,
    },
    cardDivider: {
      height: 1,
      backgroundColor: cardBorder,
      marginVertical: 16,
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    sliderButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: subtleBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sliderButtonText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    sliderTrackBg: {
      flex: 1,
      height: 6,
      backgroundColor: isLight ? '#e2e8f0' : '#1e293b',
      borderRadius: 3,
      marginHorizontal: 12,
      overflow: 'hidden',
    },
    sliderTrackFill: {
      height: '100%',
      backgroundColor: colors.purpleAccent,
      borderRadius: 3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: elevatedBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: elevatedBorder,
      padding: 20,
    },
    popupHeader: {
      alignItems: 'center',
      marginBottom: 12,
    },
    popupTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 8,
      textAlign: 'center',
    },
    popupSub: {
      color: colors.cyanAccent,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 4,
    },
    popupRiskText: {
      fontSize: 13,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 4,
    },
    popupDesc: {
      color: subtextColor,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 17,
    },
    popupActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    popupBtn: {
      flex: 0.48,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    popupBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
    },
    popupTextBtn: {
      flex: 0.48,
      paddingVertical: 10,
      alignItems: 'center',
    },
    popupTextBtnText: {
      color: subtextColor,
      fontSize: 12,
    },
    primaryBtn: {
      width: '100%',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 13,
    },
    reportFormLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 8,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    radioOuter: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.cyanAccent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cyanAccent,
    },
    radioLabel: {
      color: colors.text,
      fontSize: 12,
    },
    reportInput: {
      backgroundColor: inputBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: cardBorder,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      marginTop: 12,
      minHeight: 40,
    },
  });
};
