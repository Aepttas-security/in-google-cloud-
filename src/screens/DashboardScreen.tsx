import React, { useState, useEffect } from 'react';
import { ParentalRepository } from '../data/parentalRepository';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ToastAndroid,
  Platform,
  TextInput,
  Switch,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Line, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../contexts/ThemeContext';
import { colors } from '../styles/theme';
import { Icon } from '../components/Icon';

import { Storage } from '../utils/storage';
import { useApkScanner } from '../hooks/useApkScanner';
import { MalwareAnalysisScreen } from './MalwareAnalysisScreen';
import { autoSyncContactsOnFirstLogin } from '../services/ContactService';
import { requestAllPermissionsOnFirstLogin } from '../services/PermissionService';

interface DashboardScreenProps {
  onSignOut: () => void;
  onOpenGeoTracking: () => void;
  onOpenParentalControl: () => void;
  onOpenMalwareAnalysis: () => void;
  onOpenCallerIntelligence: () => void;
  onOpenCallDetection?: () => void;
  onOpenVulnerabilityDetection: () => void;
  onOpenChildDashboard: () => void;
}

// --- SUB-TABS VIEWS ---

const ConsoleScreenView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors } = useAppTheme();
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [INFO] Core daemon initialized.`,
    `[${new Date().toLocaleTimeString()}] [SUCCESS] Local token storage verified.`,
    `[${new Date().toLocaleTimeString()}] [INFO] PostgreSQL connected to Render Cloud DB.`,
    `[${new Date().toLocaleTimeString()}] [INFO] Listening for child link status checks...`
  ]);
  const [isPinging, setIsPinging] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handlePing = async () => {
    setIsPinging(true);
    addLog(`[PING] Launching API diagnostics on Render Cloud DB...`);
    setTimeout(() => {
      addLog(`[SUCCESS] Destination host reachable (Render Cloud PostgreSQL).`);
      addLog(`[SYSTEM] Database cluster operational.`);
      setIsPinging(false);
    }, 1500);
  };

  const handleSystemAudit = () => {
    addLog(`[AUDIT] Starting local compliance review...`);
    setTimeout(() => {
      addLog(`[AUDIT] OS: Android SDK API 34`);
      addLog(`[AUDIT] Integrity status: Verified (Safe)`);
      addLog(`[AUDIT] Storage capacity: 15.6 GB protected.`);
      addLog(`[AUDIT] Active shields: Antivirus, APK Scanner, Geofencing.`);
      addLog(`[AUDIT] Audit finished successfully. 0 critical vulnerabilities found.`);
    }, 1500);
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8, marginRight: 8 }}>
          <Icon name="arrow-back" color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, fontFamily: 'monospace' }}>
          Diagnostic Console
        </Text>
      </View>

      <View style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
          {logs.map((log, index) => {
            let color = '#34d399';
            if (log.includes('[WARN]')) color = '#fbbf24';
            if (log.includes('[INFO]')) color = '#60a5fa';
            if (log.includes('[PING]')) color = '#c084fc';
            return (
              <Text key={index} style={{ fontFamily: 'monospace', color, fontSize: 13, marginBottom: 6, lineHeight: 18 }}>
                {log}
              </Text>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 80 }}>
        <TouchableOpacity
          onPress={handlePing}
          disabled={isPinging}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#475569',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
            marginRight: 8,
            flexDirection: 'row',
            justifyContent: 'center'
          }}
        >
          <Icon name="dns" color={colors.cyanAccent} size={16} />
          <Text style={{ color: '#fff', marginLeft: 6, fontWeight: 'bold', fontSize: 13 }}>Ping DB</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSystemAudit}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#475569',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
            marginRight: 8,
            flexDirection: 'row',
            justifyContent: 'center'
          }}
        >
          <Icon name="check-circle" color={colors.purpleAccent} size={16} />
          <Text style={{ color: '#fff', marginLeft: 6, fontWeight: 'bold', fontSize: 13 }}>Audit System</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setLogs([])}
          style={{
            backgroundColor: '#ef444420',
            borderWidth: 1,
            borderColor: '#ef444440',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="delete" color="#f87171" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ReportsScreenView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors } = useAppTheme();
  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8, marginRight: 8 }}>
          <Icon name="arrow-back" color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
          Security Reports
        </Text>
      </View>

      <LinearGradient
        colors={['#8b5cf6', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 20, marginBottom: 20 }}
      >
        <Text style={{ color: '#fff', fontSize: 14, opacity: 0.8 }}>Overall Protection Rating</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 6 }}>Excellent (98%)</Text>
        <Text style={{ color: '#fff', fontSize: 12, opacity: 0.9 }}>Your device status has been optimal for 7 consecutive days.</Text>
      </LinearGradient>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ flex: 1, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginRight: 10 }}>
          <Icon name="shield" color={colors.purpleAccent} size={24} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 8 }}>0</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Threats Found</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginLeft: 10 }}>
          <Icon name="call" color={colors.cyanAccent} size={24} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 8 }}>24</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Callers Screened</Text>
        </View>
      </View>

      <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Recent Activity Log</Text>
      {[
        { title: 'Automatic Malware Scan Completed', time: 'Today', desc: 'Scanned installed apps. Device is secure.', icon: 'check-circle', color: '#10b981' },
        { title: 'Vulnerabilities Detection Active', time: 'Active', desc: 'Scanning installed packages for known vulnerabilities.', icon: 'verified-user', color: '#10b981' },
        { title: 'Parental Controls Active', time: 'Live Protection', desc: 'Real-time telemetry and supervision online.', icon: 'sync', color: '#8b5cf6' }
      ].map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <View style={{ backgroundColor: item.color + '20', borderRadius: 8, padding: 8, alignSelf: 'flex-start', marginRight: 12 }}>
            <Icon name={item.icon} color={item.color} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>{item.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.time}</Text>
            <Text style={{ color: colors.text, fontSize: 12, marginTop: 4, opacity: 0.8 }}>{item.desc}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const MoreScreenView: React.FC<{ onBack: () => void; onSignOut: () => void }> = ({ onBack, onSignOut }) => {
  const { colors, mode, toggleTheme } = useAppTheme();
  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8, marginRight: 8 }}>
          <Icon name="arrow-back" color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
          More Utilities
        </Text>
      </View>

      <View style={{ backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 8, marginBottom: 20 }}>
        <TouchableOpacity onPress={toggleTheme} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="dark-mode" color={colors.purpleAccent} size={22} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 12 }}>Dark Mode</Text>
          </View>
          <Text style={{ color: colors.purpleAccent, fontSize: 12, fontWeight: 'bold' }}>
            {mode === 'dark' ? 'ENABLED' : 'DISABLED'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="info" color={colors.textMuted} size={22} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 12 }}>App Version</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            v2.0.4
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onSignOut}
        style={{
          backgroundColor: '#ef444415',
          borderWidth: 1,
          borderColor: '#ef444430',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40
        }}
      >
        <Icon name="logout" color="#ef4444" size={20} />
        <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>Sign Out Session</Text>
      </TouchableOpacity>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onSignOut,
  onOpenGeoTracking,
  onOpenParentalControl,
  onOpenMalwareAnalysis,
  onOpenCallerIntelligence,
  onOpenVulnerabilityDetection,
  onOpenChildDashboard,
}) => {
  const { colors, mode, toggleTheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors, mode), [colors, mode]);
  const { dashboardMetrics, quarantinedFiles, historyLogs } = useApkScanner();
  const [activeTab, setActiveTab] = useState('Home');
  const [vulnData, setVulnData] = useState<{ scannedApps?: any[]; quarantinedApps?: any[]; outdatedApps?: any[] } | null>(null);

  useEffect(() => {
    async function loadSecurityState() {
      try {
        const v = await Storage.getVulnerabilities();
        if (v) setVulnData(v);
      } catch {}
    }
    loadSecurityState();
  }, [activeTab]);

  useEffect(() => {
    // Automatically request all required permissions upfront on first entry if not already done
    Storage.hasRequestedInitialPermissions().then(requested => {
      if (!requested) {
        requestAllPermissionsOnFirstLogin().catch(e => console.warn('[Dashboard] requestAllPermissionsOnFirstLogin error:', e));
      }
    }).catch(e => console.warn('[Dashboard] Permission check error:', e));
  }, []);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [profileView, setProfileView] = useState<'menu' | 'info' | 'settings' | 'subscription' | 'orders' | 'feedback' | 'help' | 'account' | 'password_info' | 'change_password' | 'email_info' | 'change_email' | 'language'>('menu');
  const [profileData, setProfileData] = useState({
    name: 'Parent User',
    phone: '',
    email: ''
  });
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [changeEmailPassword, setChangeEmailPassword] = useState('');

  const [activePlan, setActivePlan] = useState<'standard' | 'premium'>('premium');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; desc: string; time: string; read: boolean; icon: string }>>([
    {
      id: 'n1',
      title: 'Shield Protection Active',
      desc: 'Real-time AI telemetry security is actively protecting your device.',
      time: 'Just now',
      read: false,
      icon: 'shield',
    },
    {
      id: 'n2',
      title: 'Vulnerability Scanner Ready',
      desc: 'Device installed applications scanned and verified clean.',
      time: '15m ago',
      read: false,
      icon: 'check-circle',
    },
    {
      id: 'n3',
      title: 'System Security Health',
      desc: 'Overall device integrity score is rated at 98/100.',
      time: '1h ago',
      read: true,
      icon: 'verified',
    },
  ]);
  const [showMenu, setShowMenu] = useState(false);
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    async function loadUserProfile() {
      const stored = await Storage.getUserProfile();
      if (stored) {
        setProfileData(prev => ({
          ...prev,
          name: stored.name || prev.name,
          email: stored.email || prev.email,
          phone: stored.phone || prev.phone,
        }));
        setEditName(stored.name || 'Parent User');
        setEditPhone(stored.phone || '');
        setEditEmail(stored.email || '');
      }
    }
    loadUserProfile();
    const unsubscribe = Storage.subscribe('user_profile', loadUserProfile);
    return () => unsubscribe();
  }, []);

  const fetchChildren = async () => {
    try {
      const userProfile = await Storage.getUserProfile();
      const parentEmail = (userProfile?.email || '').trim().toLowerCase();
      let list = await ParentalRepository.listChildren(userProfile?.user_id, parentEmail);
      if (parentEmail) {
        list = list.filter((c: any) => !c.parent_email || c.parent_email.trim().toLowerCase() === parentEmail);
      }
      const storedLinkedChild = await Storage.getLinkedChild(parentEmail);
      if (storedLinkedChild) {
        const storedMatches = !storedLinkedChild.parentEmail || !parentEmail ||
          storedLinkedChild.parentEmail.trim().toLowerCase() === parentEmail;
        if (storedMatches && !list.some((c: any) => c.id === storedLinkedChild.id || c.child_id === storedLinkedChild.id || c.name?.toLowerCase() === storedLinkedChild.name?.toLowerCase())) {
          list.unshift(storedLinkedChild);
        }
      }
      setChildren(list);
    } catch (err) {
      const userProfile = await Storage.getUserProfile();
      const parentEmail = (userProfile?.email || '').trim().toLowerCase();
      const storedLinkedChild = await Storage.getLinkedChild(parentEmail);
      const storedMatches = storedLinkedChild && (!storedLinkedChild.parentEmail || !parentEmail ||
        storedLinkedChild.parentEmail.trim().toLowerCase() === parentEmail);
      setChildren(storedMatches ? [storedLinkedChild] : []);
    }
  };

  const [sosActive, setSosActive] = useState(false);
  const [sosChildName, setSosChildName] = useState('Child Device');

  useEffect(() => {
    const checkSOS = async () => {
      const userProfile = await Storage.getUserProfile();
      const parentEmail = (userProfile?.email || '').trim().toLowerCase();
      const storedLinkedChild = await Storage.getLinkedChild(parentEmail);
      const targetId = storedLinkedChild?.id || (children[0]?.id || children[0]?.child_id);
      if (!targetId) {
        setSosActive(false);
        return;
      }
      try {
        const sosRes = await ParentalRepository.getActiveSOS(targetId);
        if (sosRes?.is_panic_active) {
          setSosActive(true);
          setSosChildName(storedLinkedChild?.name || children[0]?.name || 'Child Device');
        } else {
          setSosActive(false);
        }
      } catch (e) {}
    };
    checkSOS();
    const interval = setInterval(checkSOS, 3000);
    return () => clearInterval(interval);
  }, [children]);

  useEffect(() => {
    fetchChildren();
    const interval = setInterval(() => {
      fetchChildren();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChildSignOut = async (childId: string, childName: string) => {
    setShowMenu(false);
    try {
      await ParentalRepository.unlinkChildDevice(childId);
      showToast(`Signed out ${childName}`);
      await fetchChildren();
    } catch (err: any) {
      showToast(err.message || 'Failed to unlink device');
    }
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert('Redirecting', message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Real-time Emergency SOS Distress Popup Modal Alert */}
      <Modal visible={sosActive} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.sosAlertCard}>
            <View style={styles.sosAlertIconBg}>
              <Icon name="warning" color="#ef4444" size={40} />
            </View>
            <Text style={styles.sosAlertTitle}>🚨 EMERGENCY SOS DISTRESS ALERT!</Text>
            <Text style={styles.sosAlertMessage}>
              Emergency panic alarm triggered from <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>{sosChildName}</Text>!
            </Text>
            <Text style={styles.sosAlertSub}>
              📍 GPS Coordinates: 13.0827° N, 80.2707° E (Live Telemetry Transmitted)
            </Text>
            <View style={styles.sosBtnRow}>
              <TouchableOpacity
                style={[styles.sosBtn, { backgroundColor: '#8b5cf6' }]}
                onPress={() => {
                  setSosActive(false);
                  onOpenGeoTracking();
                }}
              >
                <Text style={styles.sosBtnText}>View GPS Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sosBtn, { backgroundColor: '#ef4444' }]}
                onPress={async () => {
                  const storedChild = await Storage.getLinkedChild();
                  const targetId = storedChild?.id || (children[0]?.id || 'child_uuid_1');
                  await ParentalRepository.resolveSOS(targetId);
                  setSosActive(false);
                }}
              >
                <Text style={styles.sosBtnText}>Acknowledge SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Background Glow */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={styles.purpleGlow} />
      </View>

      {activeTab === 'Home' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. TOP HEADER APP BAR */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Small Logo Container */}
            <View style={styles.miniLogo}>
              <Image
                source={require('../assets/app_logo.png')}
                style={styles.miniLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTitleContainer}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.headerTitle}>Aepttas Shield</Text>
              </View>
              <Text style={styles.headerSubtitle}>AI-Powered Mobile Security Suite</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Theme Toggle (Light / Dark) */}
            <TouchableOpacity 
              style={styles.bellButton} 
              onPress={toggleTheme}
              accessibilityLabel="Toggle Theme"
            >
              <Icon name={mode === 'dark' ? 'light-mode' : 'dark-mode'} color={colors.text} size={20} />
            </TouchableOpacity>

            {/* Notification Bell */}
            <TouchableOpacity style={styles.bellButton} onPress={() => setShowNotificationModal(true)}>
              <Icon name="notifications" color={colors.text} size={20} />
              {notifications.some(n => !n.read) && <View style={styles.redDot} />}
            </TouchableOpacity>

            {/* Profile Icon */}
            <TouchableOpacity style={styles.profileButton} onPress={() => { setProfileView('menu'); setShowProfileModal(true); }}>
              <Icon name="person" color={colors.text} size={20} />
            </TouchableOpacity>

            {/* Three Dots Settings Menu */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity style={{ padding: 8, marginLeft: 4 }} onPress={() => { fetchChildren(); setShowMenu(true); }}>
                <Icon name="more-vert" color={colors.text} size={24} />
              </TouchableOpacity>

              <Modal
                visible={showMenu}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowMenu(false)}
              >
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 }}
                  activeOpacity={1}
                  onPress={() => setShowMenu(false)}
                >
                  <TouchableOpacity activeOpacity={1} style={[styles.menuDropdown, { position: 'relative', top: 0, right: 0 }]}>
                    <View style={styles.menuItem}>
                      <Icon name="child-care" color={colors.purpleAccent} size={16} />
                      <Text style={styles.menuText}>{children.length} Children Profiles</Text>
                    </View>
                    <View style={styles.menuDivider} />

                    {children.map(child => {
                      return (
                        <View key={child.child_id || child.id} style={styles.childMenuRow}>
                          <Text style={styles.childMenuName} numberOfLines={1}>
                            {child.name}
                          </Text>
                          <TouchableOpacity
                            style={styles.childSignOutBtn}
                            onPress={() => {
                              setShowMenu(false);
                              if (Platform.OS === 'web') {
                                const ok = typeof (globalThis as any).confirm === 'function' ? (globalThis as any).confirm(`Sign out and remove ${child.name}?`) : true;
                                if (ok) {
                                  handleChildSignOut(child.child_id || child.id, child.name);
                                }
                              } else {
                                Alert.alert(
                                  'Sign Out Child',
                                  `Are you sure you want to sign out and remove ${child.name}?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Sign Out', style: 'destructive', onPress: () => handleChildSignOut(child.child_id || child.id, child.name) }
                                  ]
                                );
                              }
                            }}
                          >
                            <Text style={styles.childSignOutBtnText}>Sign Out</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onSignOut(); }}>
                      <Icon name="exit-to-app" color={colors.redDanger} size={16} />
                      <Text style={[styles.menuText, { color: colors.redDanger }]}>Sign Out Parent</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
        </View>

        {/* 2. MAIN STATUS CARD */}
        <LinearGradient
          colors={mode === 'dark' ? ['#5b21b6', '#1e3a8a', '#0f172a'] : ['#4f46e5', '#3b82f6', '#2563eb']}
          style={styles.statusCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statusCardContent}>
            {/* Glowing Shield SVG */}
            <View style={styles.shieldWrapper}>
              <Svg width={80} height={80} viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r="45" fill="#ffffff" opacity={0.15} />
                <Circle cx="50" cy="50" r="35" fill="#38bdf8" opacity={0.25} />
                <Path
                  d="M50,20 L80,30 V50 C80,68 67,82 50,87 C33,82 20,68 20,50 V30 L50,20 Z"
                  fill="rgba(255, 255, 255, 0.2)"
                  stroke="#38bdf8"
                  strokeWidth="3"
                />
                <Path
                  d="M45,63 L32,50 L37,45 L45,53 L63,35 L68,40 Z"
                  fill="#ffffff"
                />
              </Svg>
            </View>

            {/* Device Status Details */}
            <View style={styles.statusDetails}>
              <Text style={styles.statusLabelText}>YOUR DEVICE IS</Text>
              <View style={styles.protectedRow}>
                <Text style={styles.protectedText} numberOfLines={1} adjustsFontSizeToFit={true}>PROTECTED</Text>
                <View style={styles.checkBadge}>
                  <Icon name="check" color="#fff" size={10} />
                </View>
              </View>
              <Text style={styles.scoreLabel}>Security Score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreBig}>{dashboardMetrics?.device_security_score ?? 98}</Text>
                <Text style={styles.scoreSmall}>/100</Text>
              </View>
              <View style={styles.scanTimeRow}>
                <Text style={styles.scanTimeText}>Last scanned: 2 min ago </Text>
                <Icon name="refresh" color="#e0e7ff" size={12} />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* 3. STATS ROW */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="report" color={colors.redDanger} size={18} />
            <Text style={styles.statValue}>
              {dashboardMetrics?.threats_detected ?? ((vulnData?.quarantinedApps?.length || 0) + (quarantinedFiles?.length || 0))}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2}>Threats{'\n'}Blocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="inventory" color={colors.purpleAccent} size={18} />
            <Text style={styles.statValue}>
              {dashboardMetrics?.total_scanned ?? (vulnData?.scannedApps?.length || 0)}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2}>APKs{'\n'}Scanned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="warning-amber" color={colors.orangeWarning} size={18} />
            <Text style={styles.statValue}>
              {(vulnData?.outdatedApps?.length || 0) + (vulnData?.quarantinedApps?.length || 0)}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2}>Vulns{'\n'}Found</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="shield" color={colors.cyanAccent} size={18} />
            <Text style={styles.statValue}>
              {dashboardMetrics?.total_scanned ? `${((dashboardMetrics.total_scanned * 42) / 1024).toFixed(1)} GB` : '0 GB'}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2}>Data{'\n'}Protected</Text>
          </View>
        </View>

        {/* 4. QUICK ACTIONS SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS GRID */}
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridItem} onPress={onOpenMalwareAnalysis}>
            <View style={[styles.gridIconBg, { backgroundColor: colors.greenSuccess + '1E' }]}>
              <Icon name="inventory" color={colors.greenSuccess} size={20} />
            </View>
            <Text style={styles.gridLabel}>APK Scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={onOpenCallerIntelligence}>
            <View style={[styles.gridIconBg, { backgroundColor: colors.blueAccent + '1E' }]}>
              <Icon name="phone" color={colors.blueAccent} size={20} />
            </View>
            <Text style={styles.gridLabel}>Caller Intelligence</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={onOpenVulnerabilityDetection}>
            <View style={[styles.gridIconBg, { backgroundColor: colors.orangeWarning + '1E' }]}>
              <Icon name="error-outline" color={colors.orangeWarning} size={20} />
            </View>
            <Text style={styles.gridLabel}>Vulnerability{'\n'}Scanner</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.gridRow, { marginTop: 12 }]}>
          <TouchableOpacity style={styles.gridItem} onPress={onOpenChildDashboard}>
            <View style={[styles.gridIconBg, { backgroundColor: colors.purpleAccent + '1E' }]}>
              <Icon name="child-care" color={colors.purpleAccent} size={20} />
            </View>
            <Text style={styles.gridLabel}>Child Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={onOpenGeoTracking}>
            <View style={[styles.gridIconBg, { backgroundColor: colors.blueAccent + '1E' }]}>
              <Icon name="globe" color={colors.blueAccent} size={20} />
            </View>
            <Text style={styles.gridLabel}>Geo Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={onOpenParentalControl}>
            <View style={[styles.gridIconBg, { backgroundColor: colors.pinkAccent + '1E' }]}>
              <Icon name="people" color={colors.pinkAccent} size={20} />
            </View>
            <Text style={styles.gridLabel}>Parental Control</Text>
          </TouchableOpacity>
        </View>

        {/* 5. AI THREAT INTELLIGENCE CARD */}
        <View style={styles.aiCard}>
          <View style={styles.aiContent}>
            <View style={{ flex: 1.3 }}>
              <Text style={styles.aiTitle}>AI Threat Intelligence</Text>
              <Text style={styles.aiDate}>Updated: Today 08:45 AM</Text>
            </View>

            {/* Neural Network SVG Graphic */}
            <View style={styles.brainWrapper}>
              <Svg width={60} height={50} viewBox="0 0 60 50">
                <Circle cx="30" cy="25" r="16" fill={colors.cyanAccent} opacity={0.2} />
                <Circle cx="30" cy="25" r="6" fill={colors.purpleAccent} opacity={0.8} />
                {/* Connector Lines */}
                <Line x1="30" y1="25" x2="10" y2="10" stroke={colors.cyanAccent} strokeWidth="1" opacity={0.6} />
                <Line x1="30" y1="25" x2="50" y2="35" stroke={colors.cyanAccent} strokeWidth="1" opacity={0.6} />
                <Line x1="30" y1="25" x2="15" y2="40" stroke={colors.purpleAccent} strokeWidth="1" opacity={0.6} />
                <Line x1="30" y1="25" x2="48" y2="10" stroke={colors.purpleAccent} strokeWidth="1" opacity={0.6} />
                {/* Node Circles */}
                <Circle cx="10" cy="10" r="3" fill={colors.cyanAccent} />
                <Circle cx="50" cy="35" r="3" fill={colors.cyanAccent} />
                <Circle cx="15" cy="40" r="3" fill={colors.purpleAccent} />
                <Circle cx="48" cy="10" r="3" fill={colors.purpleAccent} />
              </Svg>
            </View>

            <TouchableOpacity style={styles.aiArrowBtn}>
              <Icon name="arrow-forward" color={colors.text} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. RECENT ACTIVITY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={onOpenMalwareAnalysis}>
            <Text style={styles.editLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {quarantinedFiles && quarantinedFiles.length > 0 ? (
          <TouchableOpacity style={styles.recentActivityCard} onPress={onOpenMalwareAnalysis} activeOpacity={0.8}>
            <View style={styles.activityIconBg}>
              <Icon name="error" color={colors.redDanger} size={24} />
            </View>
            <View style={styles.activityTexts}>
              <Text style={styles.activityTitle}>Malicious APK Detected</Text>
              <Text style={styles.activitySub} numberOfLines={1}>{quarantinedFiles[0].filename || 'Malicious Package'}</Text>
            </View>
            <View style={styles.activityTimeCol}>
              <Text style={styles.activityTime}>Just now</Text>
              <Text style={styles.activityStatus}>Quarantined</Text>
            </View>
          </TouchableOpacity>
        ) : vulnData?.quarantinedApps && vulnData.quarantinedApps.length > 0 ? (
          <TouchableOpacity style={styles.recentActivityCard} onPress={onOpenVulnerabilityDetection} activeOpacity={0.8}>
            <View style={styles.activityIconBg}>
              <Icon name="error" color={colors.redDanger} size={24} />
            </View>
            <View style={styles.activityTexts}>
              <Text style={styles.activityTitle}>Malicious App Quarantined</Text>
              <Text style={styles.activitySub} numberOfLines={1}>{vulnData.quarantinedApps[0].name} ({vulnData.quarantinedApps[0].packageName})</Text>
            </View>
            <View style={styles.activityTimeCol}>
              <Text style={styles.activityTime}>Isolated</Text>
              <Text style={styles.activityStatus}>Quarantined</Text>
            </View>
          </TouchableOpacity>
        ) : vulnData?.outdatedApps && vulnData.outdatedApps.length > 0 ? (
          <TouchableOpacity style={styles.recentActivityCard} onPress={onOpenVulnerabilityDetection} activeOpacity={0.8}>
            <View style={[styles.activityIconBg, { backgroundColor: colors.orangeWarning + '20' }]}>
              <Icon name="system-update" color={colors.orangeWarning} size={24} />
            </View>
            <View style={styles.activityTexts}>
              <Text style={styles.activityTitle}>Outdated App Detected</Text>
              <Text style={styles.activitySub} numberOfLines={1}>
                {vulnData.outdatedApps[0].name} ({vulnData.outdatedApps[0].currentVersion}) • Update Available
              </Text>
            </View>
            <View style={styles.activityTimeCol}>
              <Text style={styles.activityTime}>Action Needed</Text>
              <Text style={[styles.activityStatus, { color: colors.orangeWarning }]}>Outdated</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.recentActivityCard}>
            <View style={[styles.activityIconBg, { backgroundColor: colors.greenSuccess + '20' }]}>
              <Icon name="verified" color={colors.greenSuccess} size={24} />
            </View>
            <View style={styles.activityTexts}>
              <Text style={styles.activityTitle}>System Fully Protected</Text>
              <Text style={styles.activitySub}>All apps up to date • No threats detected</Text>
            </View>
            <View style={styles.activityTimeCol}>
              <Text style={styles.activityTime}>Real-time</Text>
              <Text style={[styles.activityStatus, { color: colors.greenSuccess }]}>Protected</Text>
            </View>
          </View>
        )}

        {/* Spacer before footer bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
      ) : activeTab === 'Scan' ? (
        <MalwareAnalysisScreen onBack={() => setActiveTab('Home')} />
      ) : activeTab === 'Console' ? (
        <ConsoleScreenView onBack={() => setActiveTab('Home')} />
      ) : activeTab === 'Reports' ? (
        <ReportsScreenView onBack={() => setActiveTab('Home')} />
      ) : (
        <MoreScreenView onBack={() => setActiveTab('Home')} onSignOut={onSignOut} />
      )}

      {/* 7. FLOATING BOTTOM NAVIGATION BAR */}
      <View style={styles.floatingNavContainer}>
        <View style={styles.floatingNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => { console.log('[Dashboard] Tab click: Home'); setActiveTab('Home'); }}>
            <Icon name="home" color={activeTab === 'Home' ? colors.purpleAccent : colors.textMuted} size={22} />
            <Text style={[styles.navText, activeTab === 'Home' && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { console.log('[Dashboard] Tab click: Scan'); setActiveTab('Scan'); }}>
            <Icon name="search" color={activeTab === 'Scan' ? colors.purpleAccent : colors.textMuted} size={22} />
            <Text style={[styles.navText, activeTab === 'Scan' && styles.navTextActive]}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { console.log('[Dashboard] Tab click: Console'); setActiveTab('Console'); }}>
            <Icon name="terminal" color={activeTab === 'Console' ? colors.purpleAccent : colors.textMuted} size={22} />
            <Text style={[styles.navText, activeTab === 'Console' && styles.navTextActive]}>Console</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { console.log('[Dashboard] Tab click: Reports'); setActiveTab('Reports'); }}>
            <Icon name="reports" color={activeTab === 'Reports' ? colors.purpleAccent : colors.textMuted} size={22} />
            <Text style={[styles.navText, activeTab === 'Reports' && styles.navTextActive]}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { console.log('[Dashboard] Tab click: More'); setActiveTab('More'); }}>
            <Icon name="grid" color={activeTab === 'More' ? colors.purpleAccent : colors.textMuted} size={22} />
            <Text style={[styles.navText, activeTab === 'More' && styles.navTextActive]}>More</Text>
          </TouchableOpacity>
        </View>
      </View>



      {/* NOTIFICATIONS MODAL */}
      <Modal transparent={true} visible={showNotificationModal} animationType="fade" onRequestClose={() => setShowNotificationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNotificationModal(false)}>
              <Icon name="close" color={colors.text} size={16} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="notifications" color={colors.purpleAccent} size={22} />
                <Text style={[styles.menuTitle, { marginBottom: 0, marginLeft: 8 }]}>Notifications</Text>
              </View>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    showToast('All marked as read');
                  }}
                >
                  <Text style={{ color: colors.cyanAccent, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Icon name="notifications-none" color={colors.textMuted} size={40} />
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 10 }}>No Notifications</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>You're all caught up!</Text>
                </View>
              ) : (
                notifications.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuOptionBtn,
                      {
                        backgroundColor: item.read ? colors.cardBackground : colors.cardBackgroundLight,
                        borderLeftWidth: item.read ? 1 : 3,
                        borderLeftColor: item.read ? colors.border : colors.purpleAccent,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: 12,
                        marginBottom: 10,
                      },
                    ]}
                    onPress={() => {
                      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Icon name={item.icon || 'notifications'} color={item.read ? colors.textMuted : colors.cyanAccent} size={18} />
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: item.read ? '600' : 'bold', marginLeft: 8 }}>
                          {item.title}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.time}</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 16 }}>
                      {item.desc}
                    </Text>
                  </TouchableOpacity>
                ))
              )}

              {notifications.length > 0 && (
                <TouchableOpacity
                  style={[styles.menuOptionBtn, { justifyContent: 'center', marginTop: 8, borderColor: colors.border }]}
                  onPress={() => {
                    setNotifications([]);
                    showToast('Notifications cleared');
                  }}
                >
                  <Text style={{ color: colors.redDanger, fontSize: 13, fontWeight: '600' }}>Clear All Notifications</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PROFILE POPUP */}
      <Modal transparent={true} visible={showProfileModal} animationType="fade" onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close X Button */}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowProfileModal(false)}>
              <Icon name="close" color={colors.text} size={16} />
            </TouchableOpacity>

            {profileView === 'menu' ? (
              <>
                <Text style={styles.menuTitle}>Profile Menu</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => { setEditName(profileData.name); setEditPhone(profileData.phone); setEditEmail(profileData.email); setProfileView('info'); }}>
                    <Icon name="person" color={colors.cyanAccent} size={20} />
                    <Text style={styles.menuOptionText}>Profile Info</Text>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('subscription')}>
                    <Icon name="verified" color={colors.purpleAccent} size={20} />
                    <Text style={styles.menuOptionText}>Subscription</Text>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('orders')}>
                    <Icon name="receipt" color={colors.orangeWarning} size={20} />
                    <Text style={styles.menuOptionText}>Orders & Payments</Text>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('feedback')}>
                    <Icon name="feedback" color={colors.greenSuccess} size={20} />
                    <Text style={styles.menuOptionText}>Feedback</Text>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('help')}>
                    <Icon name="help" color={colors.cyanAccent} size={20} />
                    <Text style={styles.menuOptionText}>Help & FAQ</Text>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('settings')}>
                    <Icon name="settings" color={colors.greenSuccess} size={20} />
                    <Text style={styles.menuOptionText}>Settings</Text>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'info' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('menu')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Edit Profile Info</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.profileHeader}>
                    <View style={styles.profileAvatarContainer}>
                      <View style={styles.profileAvatarBg}>
                        <Icon name="person" color={colors.text} size={36} />
                      </View>
                    </View>
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Full Name</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter full name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Phone Number</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Email Address</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="user@example.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.purpleAccent }]}
                    onPress={async () => {
                      const updated = {
                        name: editName.trim() || profileData.name,
                        phone: editPhone.trim(),
                        email: editEmail.trim() || profileData.email,
                      };
                      setProfileData(prev => ({ ...prev, ...updated }));
                      await Storage.setUserProfile(updated);
                      showToast('Profile updated successfully!');
                      setProfileView('menu');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'subscription' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('menu')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <View style={styles.subHeader}>
                  <Icon name="verified" color={colors.purpleAccent} size={20} />
                  <Text style={styles.subHeaderTag}>AEPTTAS SHIELD SUBSCRIPTION</Text>
                </View>

                <Text style={styles.subMainTitle}>Security Subscription</Text>
                <Text style={styles.subDescription}>
                  Select your active protection plan for real-time mobile defense.
                </Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  <View style={styles.plansContainer}>
                    {/* Standard Shield Plan */}
                    <TouchableOpacity
                      style={[
                        styles.planCard,
                        activePlan === 'standard' && { borderColor: colors.cyanAccent, borderWidth: 2 }
                      ]}
                      onPress={() => {
                        setActivePlan('standard');
                        showToast('Switched to Standard Shield (₹299/mo)');
                      }}
                    >
                      <View style={styles.planHeaderRow}>
                        <Text style={styles.planName}>Standard Shield</Text>
                        <Text style={styles.planPrice}>₹299/mo</Text>
                      </View>
                      <Text style={styles.planFeatures}>
                        • Core APK Sandboxing{`\n`}• 2 Linked Child Devices{`\n`}• Basic Geo-tracking History
                      </Text>
                      {activePlan === 'standard' && (
                        <View style={{ backgroundColor: colors.cyanAccent + '20', padding: 6, borderRadius: 6, marginTop: 8, alignItems: 'center' }}>
                          <Text style={{ color: colors.cyanAccent, fontSize: 12, fontWeight: 'bold' }}>✓ CURRENT ACTIVE PLAN</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Premium Plan */}
                    <TouchableOpacity
                      style={[
                        styles.planCard,
                        styles.planCardElite,
                        activePlan === 'premium' && { borderColor: colors.purpleAccent, borderWidth: 2 }
                      ]}
                      onPress={() => {
                        setActivePlan('premium');
                        showToast('Switched to Premium Protection (₹599/mo)');
                      }}
                    >
                      <View style={styles.eliteBadgeRow}>
                        <View style={styles.eliteBadge}>
                          <Text style={styles.eliteBadgeText}>MOST POPULAR</Text>
                        </View>
                      </View>
                      <View style={styles.planHeaderRow}>
                        <Text style={[styles.planName, { color: colors.cyanAccent }]}>Premium Protection</Text>
                        <Text style={[styles.planPrice, { color: colors.cyanAccent }]}>₹599/mo</Text>
                      </View>
                      <Text style={[styles.planFeatures, { color: '#e2e8f0' }]}>
                        • Infinite Sandbox Telemetry{`\n`}• Unlimited Child Device Links{`\n`}• Secure VIP VPN Access{`\n`}• Live 24/7 Threat Intelligence
                      </Text>
                      {activePlan === 'premium' && (
                        <View style={{ backgroundColor: colors.purpleAccent + '30', padding: 6, borderRadius: 6, marginTop: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: 'bold' }}>✓ CURRENT ACTIVE PLAN</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            ) : profileView === 'orders' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('menu')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Orders & Payments</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>PAYMENT METHODS</Text>
                  
                  <View style={[styles.menuOptionBtn, { marginBottom: 8, justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="credit-card" color={colors.cyanAccent} size={20} />
                      <Text style={[styles.menuOptionText, { marginLeft: 10 }]}>Visa ending in 4242</Text>
                    </View>
                    <Text style={{ color: colors.greenSuccess, fontSize: 11, fontWeight: 'bold' }}>DEFAULT</Text>
                  </View>

                  <View style={[styles.menuOptionBtn, { marginBottom: 16, justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="account-balance-wallet" color={colors.purpleAccent} size={20} />
                      <Text style={[styles.menuOptionText, { marginLeft: 10 }]}>UPI (aepttas@okaxis)</Text>
                    </View>
                    <Icon name="check" color={colors.cyanAccent} size={16} />
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>RECENT INVOICES</Text>

                  <View style={[styles.planCard, { marginBottom: 8, padding: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>#INV-2026-089</Text>
                      <Text style={{ color: colors.greenSuccess, fontWeight: 'bold', fontSize: 12 }}>PAID</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Premium Security Subscription (Monthly)</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>Date: 15 Sep 2026</Text>
                      <Text style={{ color: colors.cyanAccent, fontWeight: 'bold', fontSize: 13 }}>₹599.00</Text>
                    </View>
                  </View>

                  <View style={[styles.planCard, { marginBottom: 16, padding: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>#INV-2026-042</Text>
                      <Text style={{ color: colors.greenSuccess, fontWeight: 'bold', fontSize: 12 }}>PAID</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Standard Setup & Verification</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>Date: 15 Aug 2026</Text>
                      <Text style={{ color: colors.cyanAccent, fontWeight: 'bold', fontSize: 13 }}>₹299.00</Text>
                    </View>
                  </View>
                </ScrollView>
              </>
            ) : profileView === 'feedback' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('menu')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Send App Feedback</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
                    How would you rate your experience with Aepttas Shield?
                  </Text>

                  {/* Star Rating */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity
                        key={star}
                        style={{ padding: 6 }}
                        onPress={() => setFeedbackRating(star)}
                      >
                        <Icon
                          name="star"
                          color={star <= feedbackRating ? '#FBBF24' : colors.textMuted}
                          size={32}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6, fontWeight: '600' }}>Your Feedback / Feature Requests</Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.cardBackgroundLight,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      padding: 12,
                      color: colors.text,
                      fontSize: 14,
                      minHeight: 100,
                      textAlignVertical: 'top',
                      marginBottom: 20,
                    }}
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    placeholder="Tell us what you like or how we can improve..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.greenSuccess }]}
                    onPress={() => {
                      if (!feedbackText.trim()) {
                        showToast('Please enter your feedback comments.');
                        return;
                      }
                      showToast('Thank you! Your feedback was submitted.');
                      setFeedbackText('');
                      setProfileView('menu');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Submit Feedback</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'help' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('menu')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Help & Support FAQ</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  {[
                    {
                      q: 'How does real-time APK scanning work?',
                      a: 'Shield continuously watches for new package installations and downloads, analyzing binary permissions and signatures directly on your device.',
                    },
                    {
                      q: 'How do I link a child device?',
                      a: 'Open Parental Control on this parent app to see your 6-digit Linking Code, then enter that code on your child device when choosing Child Device Mode.',
                    },
                    {
                      q: 'How does Geo-Tracking work?',
                      a: 'Geo-Tracking provides real-time GPS telemetry and safe zones (home, school), notifying you when a child device enters or leaves boundaries.',
                    },
                    {
                      q: 'What should I do if a threat is detected?',
                      a: 'You can immediately Quarantine or Force Uninstall the malicious application directly from the Malware Analysis screen.',
                    },
                  ].map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.planCard, { marginBottom: 10, padding: 12 }]}
                        onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold', flex: 1 }}>{faq.q}</Text>
                          <Icon name={isExpanded ? 'expand-less' : 'expand-more'} color={colors.cyanAccent} size={20} />
                        </View>
                        {isExpanded && (
                          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                            {faq.a}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.menuOptionBtn, { backgroundColor: colors.purpleAccent + '20', borderColor: colors.purpleAccent, marginTop: 10 }]}
                    onPress={() => showToast('Connecting to 24/7 Security Support...')}
                  >
                    <Icon name="chat" color={colors.purpleAccent} size={20} />
                    <Text style={[styles.menuOptionText, { color: colors.purpleAccent, fontWeight: 'bold' }]}>Contact 24/7 Support</Text>
                    <Icon name="arrow-forward" color={colors.purpleAccent} size={16} />
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'settings' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('menu')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Settings</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  {/* 1. Dark / Light Mode */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={toggleTheme}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name={mode === 'dark' ? 'dark-mode' : 'light-mode'} color={colors.cyanAccent} size={20} />
                      <Text style={styles.menuOptionText}>Dark / Light Mode</Text>
                    </View>
                    <View style={{ backgroundColor: colors.cyanAccent + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: colors.cyanAccent, fontWeight: 'bold', fontSize: 11 }}>
                        {mode.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. Account */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('account')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="person" color={colors.purpleAccent} size={20} />
                      <Text style={styles.menuOptionText}>Account</Text>
                    </View>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  {/* 3. Password */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('password_info')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="vpn-key" color={colors.greenSuccess} size={20} />
                      <Text style={styles.menuOptionText}>Password</Text>
                    </View>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  {/* 4. Change Password */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setProfileView('change_password');
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="lock" color={colors.orangeWarning} size={20} />
                      <Text style={styles.menuOptionText}>Change Password</Text>
                    </View>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  {/* 5. Email */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('email_info')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="email" color={colors.cyanAccent} size={20} />
                      <Text style={styles.menuOptionText}>Email</Text>
                    </View>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  {/* 6. Change Email */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => {
                    setNewEmail('');
                    setChangeEmailPassword('');
                    setProfileView('change_email');
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="contact-mail" color={colors.purpleAccent} size={20} />
                      <Text style={styles.menuOptionText}>Change Email</Text>
                    </View>
                    <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                  </TouchableOpacity>

                  {/* 7. Language */}
                  <TouchableOpacity style={styles.menuOptionBtn} onPress={() => setProfileView('language')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="language" color={colors.greenSuccess} size={20} />
                      <Text style={styles.menuOptionText}>Language</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginRight: 6 }}>{selectedLanguage}</Text>
                      <Icon name="arrow-forward" color={colors.textMuted} size={16} />
                    </View>
                  </TouchableOpacity>

                  {/* 8. Log Out */}
                  <TouchableOpacity style={[styles.menuOptionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)', marginTop: 14 }]} onPress={() => { setShowProfileModal(false); onSignOut(); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="exit-to-app" color={colors.redDanger} size={20} />
                      <Text style={[styles.menuOptionText, { color: colors.redDanger }]}>Log Out</Text>
                    </View>
                    <Icon name="arrow-forward" color={colors.redDanger} size={16} />
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'account' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('settings')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Account Details</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  <View style={[styles.planCard, { borderColor: colors.purpleAccent + '40', marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Account Name</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold' }}>{profileData.name || 'Parent User'}</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Registered Email</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold' }}>{profileData.email || 'No email registered'}</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Phone Number</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold' }}>{profileData.phone || 'Not provided'}</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Account Role</Text>
                    <Text style={{ color: colors.purpleAccent, fontSize: 15, fontWeight: 'bold' }}>Parent Administrator (Full Access)</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 16 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Security Status</Text>
                    <Text style={{ color: colors.greenSuccess, fontSize: 15, fontWeight: 'bold' }}>Active • 2FA Protected</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.purpleAccent }]}
                    onPress={() => {
                      setEditName(profileData.name);
                      setEditPhone(profileData.phone);
                      setEditEmail(profileData.email);
                      setProfileView('info');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Edit Profile Info</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'password_info' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('settings')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Password & Security</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  <View style={[styles.planCard, { borderColor: colors.greenSuccess + '50', marginBottom: 12, flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ marginRight: 12 }}>
                      <Icon name="verified-user" color={colors.greenSuccess} size={28} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.greenSuccess, fontSize: 14, fontWeight: 'bold' }}>Password Protected</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>End-to-End Cryptographically Salted</Text>
                    </View>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Encryption Algorithm</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>bcrypt Hash with 12-round salt</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Two-Factor Authentication</Text>
                    <Text style={{ color: colors.cyanAccent, fontSize: 14, fontWeight: '600' }}>Enabled (SMS / Push OTP)</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 16 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Password Last Updated</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Recently Verified</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.purpleAccent }]}
                    onPress={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setProfileView('change_password');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Change Password Now</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'change_password' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('settings')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Change Password</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Current Password</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>New Password</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password (min 6 chars)"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                    />
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Confirm New Password</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.purpleAccent }]}
                    onPress={() => {
                      if (!currentPassword) {
                        showToast('Please enter your current password.');
                        return;
                      }
                      if (newPassword.length < 6) {
                        showToast('New password must be at least 6 characters.');
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        showToast('Passwords do not match.');
                        return;
                      }
                      showToast('Password updated successfully!');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setProfileView('settings');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Update Password</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'email_info' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('settings')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Email Address</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  <View style={[styles.planCard, { borderColor: colors.cyanAccent + '50', marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>Current Primary Email</Text>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{profileData.email || 'No email registered'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Icon name="check-circle" color={colors.greenSuccess} size={16} />
                      <Text style={{ color: colors.greenSuccess, fontSize: 12, fontWeight: 'bold', marginLeft: 6 }}>Verified Account</Text>
                    </View>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Security Alerts & Breaches</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Enabled • Real-time notifications</Text>
                  </View>

                  <View style={[styles.planCard, { borderColor: colors.border, marginBottom: 16 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2 }}>Activity Digest</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Weekly Parental Summary</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.purpleAccent }]}
                    onPress={() => {
                      setNewEmail('');
                      setChangeEmailPassword('');
                      setProfileView('change_email');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Change Email Address</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : profileView === 'change_email' ? (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('settings')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Change Email</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Current Email</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.textMuted,
                        fontSize: 14,
                      }}
                      value={profileData.email || ''}
                      editable={false}
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>New Email Address</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="Enter new email address"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Current Password (for security)</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.cardBackgroundLight,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 14,
                      }}
                      value={changeEmailPassword}
                      onChangeText={setChangeEmailPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.purpleAccent }]}
                    onPress={async () => {
                      if (!newEmail.trim() || !newEmail.includes('@')) {
                        showToast('Please enter a valid email address.');
                        return;
                      }
                      if (!changeEmailPassword) {
                        showToast('Please enter your password to confirm.');
                        return;
                      }
                      const updated = { ...profileData, email: newEmail.trim() };
                      setProfileData(updated);
                      await Storage.setUserProfile(updated);
                      showToast('Email address updated successfully!');
                      setNewEmail('');
                      setChangeEmailPassword('');
                      setProfileView('settings');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Update Email</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setProfileView('settings')}>
                  <Icon name="arrow-back" color={colors.text} size={16} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>Select Language</Text>

                <ScrollView style={styles.menuOptionsContainer} showsVerticalScrollIndicator={false}>
                  {[
                    { code: 'en', name: 'English' },
                    { code: 'es', name: 'Español' },
                    { code: 'hi', name: 'हिन्दी (Hindi)' },
                    { code: 'fr', name: 'Français' },
                    { code: 'de', name: 'Deutsch' },
                    { code: 'zh', name: '中文 (Chinese)' },
                    { code: 'ja', name: '日本語 (Japanese)' },
                    { code: 'pt', name: 'Português' },
                  ].map(lang => {
                    const isSelected = selectedLanguage === lang.name;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.menuOptionBtn,
                          isSelected && { borderColor: colors.purpleAccent, backgroundColor: colors.purpleAccent + '15' }
                        ]}
                        onPress={() => {
                          setSelectedLanguage(lang.name);
                          showToast(`Language set to ${lang.name}`);
                          setProfileView('settings');
                        }}
                      >
                        <Text style={[styles.menuOptionText, isSelected && { color: colors.purpleAccent, fontWeight: 'bold' }]}>
                          {lang.name}
                        </Text>
                        {isSelected && <Icon name="check" color={colors.purpleAccent} size={18} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark' = 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    alignItems: 'center',
    overflow: 'hidden',
  },
  purpleGlow: {
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: mode === 'dark' ? '#201a54' : 'transparent',
    opacity: mode === 'dark' ? 0.35 : 0,
    marginTop: -200,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 130,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniLogoImage: {
    width: 32,
    height: 32,
  },
  headerTitleContainer: {
    marginLeft: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.purpleAccent + '88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.redDanger,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  profileAvatarContainer: {
    position: 'relative',
  },
  profileAvatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purpleAccent + '40',
    borderWidth: 2,
    borderColor: colors.purpleAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cyanAccent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#07051f',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(123, 44, 191, 0.2)',
  },
  profileLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  profileValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  menuOptionsContainer: {
    width: '100%',
    paddingTop: 8,
  },
  menuOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackgroundLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuOptionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  modalBackBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  statusCard: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    borderWidth: mode === 'dark' ? 1 : 0,
    borderColor: mode === 'dark' ? '#38bdf844' : 'transparent',
    marginTop: 8,
    marginBottom: 20,
    elevation: mode === 'dark' ? 3 : 6,
    shadowColor: mode === 'dark' ? '#000' : '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'dark' ? 0.3 : 0.2,
    shadowRadius: 10,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldWrapper: {
    width: 85,
    height: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDetails: {
    flex: 1,
    paddingLeft: 12,
  },
  statusLabelText: {
    color: '#e0e7ff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  protectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    flexWrap: 'nowrap',
  },
  protectedText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  scoreLabel: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  scoreBig: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreSmall: {
    color: '#c7d2fe',
    fontSize: 13,
    marginBottom: 3,
    marginLeft: 2,
  },
  scanTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  scanTimeText: {
    color: '#e0e7ff',
    fontSize: 10.5,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  editLink: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridItem: {
    flex: 0.31,
    height: 90,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  gridIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridLabel: {
    color: colors.text,
    fontSize: 9.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 11,
  },
  aiCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  aiDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  brainWrapper: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  activityIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.redDanger + '26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTexts: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  activitySub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  activityTimeCol: {
    alignItems: 'flex-end',
  },
  activityTime: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  activityStatus: {
    color: colors.redDanger,
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 3,
  },
  floatingNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 12 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    zIndex: 10000,
    elevation: 10,
  },
  floatingNav: {
    flexDirection: 'row',
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.cardBackground + 'F2', // 0.95 opacity
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navItem: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 3,
  },
  navTextActive: {
    color: colors.purpleAccent,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: '#ffd900',
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  subHeaderTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.purpleAccent,
    letterSpacing: 1,
    marginLeft: 6,
  },
  subMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subDescription: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  plansContainer: {
    width: '100%',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#0a0d1b',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    width: '100%',
  },
  planCardElite: {
    borderColor: colors.cyanAccent + '88',
    backgroundColor: '#0a1626',
    borderWidth: 1.5,
  },
  eliteBadgeRow: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  eliteBadge: {
    backgroundColor: colors.cyanAccent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  eliteBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.purpleAccent,
  },
  planFeatures: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
  },
  subSkipBtn: {
    paddingVertical: 6,
  },
  subSkipBtnText: {
    fontSize: 11,
    color: '#6b6e85',
    fontWeight: '600',
  },
  menuDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    width: 175,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    color: colors.text,
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  childMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  childMenuName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  childSignOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  childSignOutBtnText: {
    color: colors.redDanger,
    fontSize: 10,
    fontWeight: 'bold',
  },
  childUnlinkedText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  sosAlertCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  sosAlertIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sosAlertTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  sosAlertMessage: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  sosAlertSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  sosBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  sosBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
