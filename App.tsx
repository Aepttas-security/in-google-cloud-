import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar, StyleSheet, View, LogBox, BackHandler, ToastAndroid, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { colors } from './src/styles/theme';
import { Storage } from './src/utils/storage';
import { ChildDaemon } from './src/services/childDaemon';
import { ParentalRepository } from './src/data/parentalRepository';
import { autoSyncContactsOnFirstLogin } from './src/services/ContactService';
import { requestAllPermissionsOnFirstLogin } from './src/services/PermissionService';

// Import Screens
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { GeoTrackingScreen } from './src/screens/GeoTrackingScreen';
import { ParentalControlScreen } from './src/screens/ParentalControlScreen';
import { MalwareAnalysisScreen } from './src/screens/MalwareAnalysisScreen';
import { CallerIntelligenceScreen } from './src/screens/CallerIntelligenceScreen';
import { CallDetectionScreen } from './src/screens/CallDetectionScreen';
import { ChildLinkScreen } from './src/screens/ChildLinkScreen';
import { ChildModeScreen } from './src/screens/ChildModeScreen';
import { VulnerabilityDetectionScreen } from './src/screens/VulnerabilityDetectionScreen';
import { ChildDashboardScreen } from './src/screens/ChildDashboardScreen';
import { AdminLogsScreen } from './src/screens/AdminLogsScreen';
import { DeviceRoleSelectionScreen } from './src/screens/DeviceRoleSelectionScreen';
import { TwoStepBindingScreen } from './src/screens/TwoStepBindingScreen';
import { ChildPermissionsScreen } from './src/screens/ChildPermissionsScreen';

type ScreenName =
  | 'Login'
  | 'SignUp'
  | 'Dashboard'
  | 'GeoTracking'
  | 'ParentalControl'
  | 'MalwareAnalysis'
  | 'CallerIntelligence'
  | 'CallDetection'
  | 'ChildLink'
  | 'ChildPermissions'
  | 'ChildMode'
  | 'VulnerabilityDetection'
  | 'ChildDashboard'
  | 'AdminLogs'
  | 'DeviceRoleSelection'
  | 'TwoStepBinding';

import { useAppTheme } from './src/contexts/ThemeContext';
import { Text, TouchableOpacity } from 'react-native';

interface ErrorBoundaryProps {
  onReset: () => void;
  colors: any;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ScreenErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ScreenErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { colors, onReset } = this.props;
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors?.background || '#090d16' }}>
          <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Screen Notice
          </Text>
          <Text style={{ color: colors?.textMuted || '#94a3b8', fontSize: 13, marginBottom: 20, textAlign: 'center', lineHeight: 18 }}>
            {this.state.error?.message || 'An unexpected issue occurred while rendering this module.'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 }}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              onReset();
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent({
  renderScreen,
  onResetToDashboard,
}: {
  renderScreen: () => React.ReactNode;
  onResetToDashboard: () => void;
}) {
  const { colors, mode } = useAppTheme();
  
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.safeArea}>
          <ScreenErrorBoundary onReset={onResetToDashboard} colors={colors}>
            {renderScreen()}
          </ScreenErrorBoundary>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('DeviceRoleSelection');
  const [screenStack, setScreenStack] = useState<ScreenName[]>(['DeviceRoleSelection']);
  const [signUpSuccessMessage, setSignUpSuccessMessage] = useState('');
  const lastBackPressRef = useRef<number>(0);

  const navigateTo = useCallback((screen: ScreenName, replace = false) => {
    setCurrentScreen(screen);
    setScreenStack(prev => {
      if (replace) {
        return [...prev.slice(0, -1), screen];
      }
      if (prev[prev.length - 1] === screen) {
        return prev;
      }
      return [...prev, screen];
    });
  }, []);

  const goBack = useCallback(() => {
    setScreenStack(prev => {
      if (prev.length > 1) {
        const nextStack = [...prev];
        nextStack.pop();
        const prevScreen = nextStack[nextStack.length - 1];
        setCurrentScreen(prevScreen);
        return nextStack;
      } else {
        if (currentScreen !== 'Dashboard' && currentScreen !== 'DeviceRoleSelection' && currentScreen !== 'ChildMode') {
          setCurrentScreen('Dashboard');
          return ['Dashboard'];
        }
        return prev;
      }
    });
  }, [currentScreen]);

  // Android hardware & gesture back button handling
  useEffect(() => {
    const onHardwareBackPress = () => {
      // If we are in sub-screens, navigate back rather than closing the app
      if (
        currentScreen !== 'Dashboard' &&
        currentScreen !== 'DeviceRoleSelection' &&
        currentScreen !== 'ChildMode'
      ) {
        goBack();
        return true; // handled
      }

      // If on Dashboard or root screen, prompt before closing or double tap to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // let the system exit
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => backSub.remove();
  }, [currentScreen, goBack]);

  useEffect(() => {
    LogBox.ignoreAllLogs();
    async function checkLaunchGuard() {
      try {
        console.log('[App] Checking session on mount...');
        const token = await Storage.getAuthToken();
        const profile = await Storage.getUserProfile();
        const role = await Storage.getAssignedRole();
        const isExistingUser = await Storage.getIsExistingUser();

        if (token || profile) {
          console.log('[Auth] Active session found. Auto-routing...');
          if (role === 'CHILD') {
            setCurrentScreen('ChildMode');
            setScreenStack(['ChildMode']);
            return;
          }

          if (profile && (profile.user_id || profile.email)) {
            try {
              const backendCheck = await ParentalRepository.checkParentLinked(profile.user_id, profile.email);
              if (backendCheck?.is_linked && backendCheck?.linked_child) {
                await Storage.setLinkedChild(backendCheck.linked_child);
              }
            } catch (e) {
              console.warn('[App] Backend link check failed during launch:', e);
            }
          }
          setCurrentScreen('Dashboard');
          setScreenStack(['Dashboard']);
          requestAllPermissionsOnFirstLogin(profile?.email).catch(e => console.warn('[App] Session restore permission error:', e));
        } else if (isExistingUser) {
          console.log('[Auth] Existing user found without active session. Routing to Login...');
          setCurrentScreen('Login');
          setScreenStack(['Login']);
        } else {
          console.log('[Auth] Brand new user. Showing DeviceRoleSelection...');
          setCurrentScreen('DeviceRoleSelection');
          setScreenStack(['DeviceRoleSelection']);
        }
      } catch (error) {
        console.error('[Auth] Session restoration check failed:', error);
        setCurrentScreen('Login');
        setScreenStack(['Login']);
      } finally {
        setIsInitializing(false);
      }
    }
    checkLaunchGuard();
  }, []);

  const handleSignOut = async () => {
    await Storage.clear();
    await Storage.setIsExistingUser(true);
    ChildDaemon.stopDaemon();
    setCurrentScreen('Login');
    setScreenStack(['Login']);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'DeviceRoleSelection':
        return (
          <DeviceRoleSelectionScreen
            onSelectParent={() => navigateTo('Login')}
            onSelectChild={() => navigateTo('ChildLink')}
            onViewBindingCode={() => navigateTo('TwoStepBinding')}
          />
        );
      case 'Login':
        return (
          <LoginScreen
            onSignInSuccess={(isLinked, userEmail) => {
              setSignUpSuccessMessage('');
              if (userEmail === 'admin@gmail.com') {
                navigateTo('AdminLogs');
              } else {
                setCurrentScreen('Dashboard');
                setScreenStack(['Dashboard']);
                requestAllPermissionsOnFirstLogin(userEmail).catch(e => console.warn('[App] onSignInSuccess permission error:', e));
              }
            }}
            onSetUpChildDevice={() => navigateTo('DeviceRoleSelection')}
            onGoToSignUp={() => {
              setSignUpSuccessMessage('');
              navigateTo('SignUp');
            }}
            signUpSuccessMessage={signUpSuccessMessage}
          />
        );
      case 'TwoStepBinding':
        return (
          <TwoStepBindingScreen
            onBack={goBack}
            onCheckStatus={() => navigateTo('Dashboard')}
          />
        );
      case 'SignUp':
        return (
          <SignUpScreen
            onSignUpSuccess={() => {
              setSignUpSuccessMessage('Account created successfully! Please sign in.');
              navigateTo('Login', true);
            }}
            onGoToLogin={() => {
              setSignUpSuccessMessage('');
              navigateTo('Login', true);
            }}
          />
        );
      case 'Dashboard':
        return (
          <DashboardScreen
            onSignOut={handleSignOut}
            onOpenGeoTracking={() => navigateTo('GeoTracking')}
            onOpenParentalControl={() => navigateTo('ParentalControl')}
            onOpenMalwareAnalysis={() => navigateTo('MalwareAnalysis')}
            onOpenCallerIntelligence={() => navigateTo('CallerIntelligence')}
            onOpenCallDetection={() => navigateTo('CallDetection')}
            onOpenVulnerabilityDetection={() => navigateTo('VulnerabilityDetection')}
            onOpenChildDashboard={() => navigateTo('ChildDashboard')}
          />
        );
      case 'GeoTracking':
        return <GeoTrackingScreen onBack={goBack} />;
      case 'ParentalControl':
        return (
          <ParentalControlScreen
            onBack={goBack}
            onSignOut={handleSignOut}
          />
        );
      case 'MalwareAnalysis':
        return <MalwareAnalysisScreen onBack={goBack} />;
      case 'CallerIntelligence':
        return <CallerIntelligenceScreen onBack={goBack} />;
      case 'CallDetection':
        return <CallDetectionScreen onBack={goBack} />;
      case 'VulnerabilityDetection':
        return <VulnerabilityDetectionScreen onBack={goBack} />;
      case 'ChildDashboard':
        return <ChildDashboardScreen onBack={goBack} />;
      case 'ChildLink':
        return (
          <ChildLinkScreen
            onBack={goBack}
            onLinkSuccess={() => navigateTo('ChildPermissions')}
          />
        );
      case 'ChildPermissions':
        return (
          <ChildPermissionsScreen
            onBack={goBack}
            onConfirmPermissions={() => {
              setCurrentScreen('ChildMode');
              setScreenStack(['ChildMode']);
            }}
          />
        );
      case 'ChildMode':
        return <ChildModeScreen onUnlink={handleSignOut} />;
      case 'AdminLogs':
        return <AdminLogsScreen onBack={goBack} />;
      default:
        return (
          <DeviceRoleSelectionScreen
            onSelectParent={() => navigateTo('Login')}
            onSelectChild={() => navigateTo('ChildLink')}
            onViewBindingCode={() => navigateTo('TwoStepBinding')}
          />
        );
    }
  };

  if (isInitializing) {
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: '#090d16', justifyContent: 'center', alignItems: 'center' }}>
            <StatusBar barStyle="light-content" backgroundColor="#090d16" />
            <Image
              source={require('./src/assets/app_logo.png')}
              style={{ width: 100, height: 100, marginBottom: 20 }}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppContent
        renderScreen={renderScreen}
        onResetToDashboard={() => {
          setCurrentScreen('Dashboard');
          setScreenStack(['Dashboard']);
        }}
      />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

export default App;
