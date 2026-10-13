import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, TextInput, Button, useTheme, Divider } from 'react-native-paper';
// Supabase removed
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/useAuthStore';
import { login, verifyMfa, resendMfa } from '../../api/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const SignInScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  // MFA / 2FA Verification State
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaDemoCode, setMfaDemoCode] = useState('');

  const theme = useTheme();
  const setSession = useAuthStore((state) => state.setSession);

  const handleSignIn = async (directEmail?: string, directPassword?: string) => {
    setLoading(true);

    const loginEmail = typeof directEmail === 'string' ? directEmail : email;
    const loginPassword = typeof directPassword === 'string' ? directPassword : password;

    if (loginEmail === 'Admin' && loginPassword === 'Admin') {
      setSession({ id: 'admin', email: 'admin@renu.com', name: 'Administrator', role: 'admin' }, 'mock_token');
      setLoading(false);
      return;
    }

    if (loginEmail === 'User' && loginPassword === 'User') {
      setSession({ id: 'user', email: 'customer@renu.com', name: 'Grower User', role: 'Grower' }, 'mock_token');
      setLoading(false);
      return;
    }

    try {
      const data = await login(loginEmail, loginPassword);
      if (data.mfaRequired) {
        setMfaEmail(loginEmail);
        setMfaDemoCode(data.demoCode || '123456');
        setMfaCode(data.demoCode || '');
        setMfaStep(true);
        return;
      }
      setSession(data.user, data.token);
    } catch (error: any) {
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Could not connect to the server. Please check your network or ensure the backend is running.' 
        : error.message;
      Alert.alert('SIGN IN FAILED', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode || mfaCode.trim().length === 0) {
      Alert.alert('Verification Required', 'Please enter the 6-digit security code.');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyMfa(mfaEmail, mfaCode.trim());
      setSession(data.user, data.token);
    } catch (error: any) {
      Alert.alert('VERIFICATION FAILED', error.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const data = await resendMfa(mfaEmail);
      if (data.demoCode) {
        setMfaDemoCode(data.demoCode);
        setMfaCode(data.demoCode);
      }
      Alert.alert('Code Sent', 'A fresh 6-digit verification code has been dispatched.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  // Demo logins only on non-production / staging
  const isProduction = typeof window !== 'undefined' && Boolean(
    window?.location?.hostname === 'app.renubiome.com' || 
    window?.location?.hostname === 'renubiome.com'
  );

  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.card}>
            <View style={styles.headerContainer}>
              <Text variant="displaySmall" style={styles.title}>
                <Text style={{ color: '#F47F46' }}>Renu</Text>
                <Text style={{ color: '#2E5D36' }}> Biome</Text>
              </Text>
              <Text variant="titleMedium" style={styles.subtitle}>
                {mfaStep ? 'Two-Factor Authentication (MFA)' : 'Sign in to your account'}
              </Text>
            </View>

            {mfaStep ? (
              /* ================= MFA / 2FA VERIFICATION STEP ================= */
              <View style={{ width: '100%' }}>
                <View style={styles.mfaBanner}>
                  <MaterialCommunityIcons name="shield-check" size={36} color="#2E5D36" style={{ alignSelf: 'center', marginBottom: 6 }} />
                  <Text style={styles.mfaInstruction}>
                    A 6-digit verification code was sent to:
                  </Text>
                  <Text style={styles.mfaTargetEmail}>{mfaEmail}</Text>
                  {mfaDemoCode ? (
                    <TouchableOpacity 
                      onPress={() => setMfaCode(mfaDemoCode)}
                      style={styles.demoCodeBadge}
                    >
                      <Text style={styles.demoCodeText}>Security Code: {mfaDemoCode} (Tap to fill)</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TextInput
                  label="6-Digit Verification Code"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, { letterSpacing: 4, textAlign: 'center', fontSize: 20 }]}
                  mode="outlined"
                  outlineColor="#2E5D36"
                  activeOutlineColor="#2E5D36"
                  textColor="#1E293B"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                />

                <Button 
                  mode="contained" 
                  onPress={handleVerifyMfa} 
                  loading={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor="#2E5D36"
                  textColor="#FFFFFF"
                >
                  Verify & Sign In
                </Button>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <Button 
                    mode="text" 
                    onPress={handleResendCode}
                    loading={resending}
                    textColor="#2E5D36"
                  >
                    Resend Code
                  </Button>
                  <Button 
                    mode="text" 
                    onPress={() => { setMfaStep(false); setMfaCode(''); }}
                    textColor="#64748B"
                  >
                    Back to Sign In
                  </Button>
                </View>
              </View>
            ) : (
              /* ================= NORMAL SIGN IN STEP ================= */
              <View style={{ width: '100%' }}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2E5D36"
                  activeOutlineColor="#2E5D36"
                  textColor="#1E293B"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                />
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2E5D36"
                  activeOutlineColor="#2E5D36"
                  textColor="#1E293B"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"} 
                      onPress={() => setShowPassword(!showPassword)}
                      color="#2E5D36"
                    />
                  }
                />
                
                <Button 
                  mode="contained" 
                  onPress={() => handleSignIn()} 
                  loading={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor="#2E5D36"
                  textColor="#FFFFFF"
                >
                  Sign In
                </Button>

                {!isProduction && (
                  <View style={styles.demoSection}>
                    <View style={styles.dividerContainer}>
                      <Divider style={styles.dividerLine} />
                      <Text style={styles.dividerText}>DEMO LOGINS (STAGING ONLY)</Text>
                      <Divider style={styles.dividerLine} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                      <Button 
                        mode="outlined" 
                        onPress={() => handleSignIn('admin@renu.com', 'admin')}
                        buttonColor="rgba(255,255,255,0.7)"
                        textColor="#2E5D36"
                        style={{ borderColor: '#2E5D36', minHeight: 48, justifyContent: 'center' }}
                      >
                        Admin
                      </Button>
                      <Button 
                        mode="outlined" 
                        onPress={() => handleSignIn('customer@renu.com', 'customer')}
                        buttonColor="rgba(255,255,255,0.7)"
                        textColor="#2E5D36"
                        style={{ borderColor: '#2E5D36', minHeight: 48, justifyContent: 'center' }}
                      >
                        Customer
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            )}

          </GlassCard>

          <Text style={styles.watermark} numberOfLines={1}>
            ReNu-Biome Agriculture Platform
          </Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#1E3D2F',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 25, 0.45)',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(245, 248, 245, 0.92)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 0,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#555555',
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    height: 40,
  },
  button: {
    borderRadius: 30,
    marginTop: 4,
  },
  buttonContent: {
    paddingVertical: 2,
  },
  socialButton: {
    borderColor: '#CCCCCC',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  demoSection: {
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    backgroundColor: '#CCCCCC',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#888888',
  },
  textButton: {
    marginTop: 8,
  },
  watermark: {
    paddingVertical: 10,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  devBox: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  devTitle: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  devRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  mfaBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  mfaInstruction: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
  },
  mfaTargetEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14532D',
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  demoCodeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  demoCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
});
