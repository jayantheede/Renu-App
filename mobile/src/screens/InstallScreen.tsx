import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BRAND_COLORS } from '../theme/theme';

export const InstallScreen = () => {
  const navigation = useNavigation<any>();

  // Device detection state
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/.test(ua);

      if (isIOS) {
        setDeviceType('ios');
      } else if (isAndroid) {
        setDeviceType('android');
      } else {
        setDeviceType('desktop');
      }

      // Check if already launched in standalone PWA mode
      const isStandalone =
        (window.navigator as any).standalone ||
        window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) {
        setIsInstalled(true);
      }

      // Listen for Chrome Android install prompt
      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setInstallPromptEvent(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleTriggerInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPromptEvent(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header Branding */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Farmer's Pride</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>GROWER PORTAL · INSTALL GUIDE</Text>
          </View>
        </View>

        {/* Intro Card */}
        <Card style={styles.mainCard}>
          <Card.Content>
            <Text style={styles.title}>Install ReNu-Biome on Your Device</Text>
            <Text style={styles.subtitle}>
              Add the Grower Portal directly to your home screen for quick 1-tap access to delivery schedules, tank levels, and nutrition programs — no app store required.
            </Text>

            <Divider style={{ marginVertical: 18 }} />

            {/* Device-Specific Instructions */}
            {deviceType === 'ios' && (
              <View style={styles.instructionSection}>
                <View style={styles.deviceHeader}>
                  <MaterialCommunityIcons name="apple" size={24} color="#0F172A" />
                  <Text style={styles.deviceTitle}>iPhone & iPad (Safari)</Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepText}>
                      Tap the <Text style={{ fontWeight: '700' }}>Share</Text> button in Safari's toolbar at the bottom of the screen.
                    </Text>
                    <View style={styles.iconDemoBox}>
                      <MaterialCommunityIcons name="export-variant" size={22} color={BRAND_COLORS.primaryTeal} />
                      <Text style={styles.iconDemoText}>Square with arrow pointing up</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepText}>
                      Scroll down the share menu and select <Text style={{ fontWeight: '700' }}>Add to Home Screen</Text>.
                    </Text>
                    <View style={styles.iconDemoBox}>
                      <MaterialCommunityIcons name="plus-box-outline" size={22} color={BRAND_COLORS.primaryTeal} />
                      <Text style={styles.iconDemoText}>[+] Add to Home Screen</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepText}>
                      Tap <Text style={{ fontWeight: '700' }}>Add</Text> in the upper right corner. The ReNu-Biome icon will appear on your home screen.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {deviceType === 'android' && (
              <View style={styles.instructionSection}>
                <View style={styles.deviceHeader}>
                  <MaterialCommunityIcons name="android" size={24} color="#16A34A" />
                  <Text style={styles.deviceTitle}>Android (Chrome / Samsung Internet)</Text>
                </View>

                {installPromptEvent ? (
                  <View style={styles.installPromptBox}>
                    <Text style={styles.installPromptText}>
                      Ready to install with 1 tap:
                    </Text>
                    <Button
                      mode="contained"
                      buttonColor={BRAND_COLORS.primaryTeal}
                      textColor="#FFFFFF"
                      onPress={handleTriggerInstall}
                      style={{ marginTop: 10, borderRadius: 10 }}
                    >
                      Install ReNu-Biome App
                    </Button>
                  </View>
                ) : (
                  <>
                    <View style={styles.stepRow}>
                      <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumberText}>1</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>
                          Tap the browser menu icon (<Text style={{ fontWeight: '700' }}>⋮</Text> three dots) in the upper right corner of Chrome.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stepRow}>
                      <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumberText}>2</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>
                          Tap <Text style={{ fontWeight: '700' }}>Install app</Text> or <Text style={{ fontWeight: '700' }}>Add to Home screen</Text>.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stepRow}>
                      <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumberText}>3</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>
                          Confirm when prompted. ReNu-Biome will be added directly to your app launcher.
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {deviceType === 'desktop' && (
              <View style={styles.instructionSection}>
                <View style={styles.deviceHeader}>
                  <MaterialCommunityIcons name="qrcode-scan" size={24} color={BRAND_COLORS.primaryTeal} />
                  <Text style={styles.deviceTitle}>Scan to Install on iPhone or Android</Text>
                </View>

                <Text style={styles.qrInstruction}>
                  Point your smartphone camera at the QR code below to open this install page directly on your phone:
                </Text>

                <View style={styles.qrWrapper}>
                  <Image
                    source={require('../../assets/brand/renu-biome-install-qr-300dpi.png')}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrUrl}>app.renu-biome.com/install</Text>
                </View>

                <View style={styles.desktopTipBox}>
                  <MaterialCommunityIcons name="monitor" size={18} color="#64748B" />
                  <Text style={styles.desktopTipText}>
                    On Chrome or Edge desktop, click the Install icon (computer with down arrow) in your address bar to install on your computer.
                  </Text>
                </View>
              </View>
            )}

            <Divider style={{ marginVertical: 20 }} />

            {/* Portal Navigation Action */}
            <Button
              mode="contained"
              buttonColor={BRAND_COLORS.primaryTeal}
              textColor="#FFFFFF"
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('SignIn');
                }
              }}
              style={styles.portalButton}
              contentStyle={{ paddingVertical: 6 }}
            >
              Sign In to Grower Portal
            </Button>
          </Card.Content>
        </Card>

        {/* Footer Support */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Questions or need assistance installing? Contact ReNu-Biome Support at{' '}
            <Text
              style={{ color: BRAND_COLORS.primaryTeal, fontWeight: '700' }}
              onPress={() => Linking.openURL('mailto:support@renu-biome.com')}
            >
              support@renu-biome.com
            </Text>{' '}
            or call <Text style={{ fontWeight: '700' }}>(559) 555-0199</Text>.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 240,
    height: 70,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#475569',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND_COLORS.primaryTeal,
    letterSpacing: 1,
  },
  mainCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    paddingVertical: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  instructionSection: {
    marginVertical: 4,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  deviceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  iconDemoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  iconDemoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  installPromptBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginVertical: 12,
  },
  installPromptText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_COLORS.primaryTeal,
  },
  qrInstruction: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  qrImage: {
    width: 190,
    height: 190,
    marginBottom: 8,
  },
  qrUrl: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  desktopTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  desktopTipText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 17,
  },
  portalButton: {
    borderRadius: 10,
  },
  footerSection: {
    marginTop: 20,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
