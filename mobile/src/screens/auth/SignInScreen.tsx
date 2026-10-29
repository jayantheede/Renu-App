import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  ImageBackground,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { login, verifyMfa, resendMfa, requestPasswordReset } from '../../api/client';
import { BRAND_COLORS } from '../../theme/theme';

export const SignInScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // MFA / 2FA Verification State
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaDemoCode, setMfaDemoCode] = useState('');

  // Forgot Password Modal State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const setSession = useAuthStore((state) => state.setSession);

  // Staging vs Production detection
  const isProduction =
    typeof window !== 'undefined' &&
    Boolean(
      window?.location?.hostname === 'app.renu-biome.com' ||
      window?.location?.hostname === 'renu-biome.com' ||
      window?.location?.hostname === 'app.renubiome.com' ||
      window?.location?.hostname === 'renubiome.com'
    );

  const handleSignIn = async (directEmail?: string, directPassword?: string) => {
    setErrorMessage('');
    setLoading(true);

    const loginEmail = typeof directEmail === 'string' ? directEmail : email;
    const loginPassword = typeof directPassword === 'string' ? directPassword : password;

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please enter both your email address and password.');
      setLoading(false);
      return;
    }

    // Quick offline demo fallback
    if ((loginEmail === 'Admin' || loginEmail === 'support@renu-biome.com' || loginEmail === 'admin@renu.com') && (loginPassword === 'Admin' || loginPassword === 'admin')) {
      setSession({ id: 'admin', email: 'support@renu-biome.com', name: 'Administrator', role: 'admin' }, 'mock_token');
      setLoading(false);
      return;
    }

    if ((loginEmail === 'User' || loginEmail === 'customer@renu.com') && (loginPassword === 'User' || loginPassword === 'customer')) {
      setSession({ id: 'user', email: 'customer@renu.com', name: 'Sierra Agri Group (Grower)', role: 'Grower' }, 'mock_token');
      setLoading(false);
      return;
    }

    if ((loginEmail === 'Employee' || loginEmail === 'employee@renu.com') && (loginPassword === 'Employee' || loginPassword === 'employee')) {
      setSession({ id: 'employee-1', email: 'employee@renu.com', name: 'Dave Miller (Staff)', role: 'Staff' }, 'mock_token');
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
      const raw = error.message || '';
      let friendly = 'Could not sign in. Please verify your email and password.';
      if (raw.toLowerCase().includes('password')) {
        friendly = "That password doesn't match our records.";
      } else if (raw.toLowerCase().includes('user') || raw.toLowerCase().includes('not found') || raw.toLowerCase().includes('account')) {
        friendly = 'No account found with that email address.';
      } else if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('network')) {
        friendly = 'Network connection issue. Please check your internet connection.';
      } else if (raw) {
        friendly = raw;
      }
      setErrorMessage(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setErrorMessage('');
    if (!mfaCode || mfaCode.trim().length === 0) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyMfa(mfaEmail, mfaCode.trim());
      setSession(data.user, data.token);
    } catch (error: any) {
      setErrorMessage(error.message || 'Invalid or expired verification code.');
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
      Alert.alert('Code Dispatched', 'A fresh 6-digit verification code has been dispatched.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    const target = forgotEmail.trim() || email.trim();
    if (!target) {
      Alert.alert('Email Required', 'Please enter your email address to receive reset instructions.');
      return;
    }
    setForgotLoading(true);
    try {
      await requestPasswordReset(target);
      setForgotSuccess(true);
    } catch (e: any) {
      setForgotSuccess(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/brand/bloom-photo-STOCK-NOT-LICENSED-replace-before-launch.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(8, 63, 56, 0.92)', 'rgba(12, 96, 84, 0.86)']}
        style={styles.gradientOverlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.headerSection}>
            <Image
              source={require('../../../assets/brand/renu-biome-logo-white-orange-for-dark-backgrounds.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.taglineItalic}>Farmer's Pride</Text>
            <View style={styles.portalBadge}>
              <Text style={styles.portalBadgeText}>GROWER PORTAL</Text>
            </View>
          </View>

          {/* White Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mfaStep ? 'Two-Factor Authentication' : 'Sign In'}
            </Text>

            {/* Error Banner */}
            {Boolean(errorMessage) && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle" size={18} color="#B91C1C" style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {mfaStep ? (
              /* ================= MFA STEP ================= */
              <View style={{ width: '100%' }}>
                <View style={styles.mfaBanner}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={36}
                    color={BRAND_COLORS.primaryTeal}
                    style={{ alignSelf: 'center', marginBottom: 6 }}
                  />
                  <Text style={styles.mfaInstruction}>
                    A 6-digit security verification code was sent to:
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
                  onChangeText={(val) => {
                    setMfaCode(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, { letterSpacing: 4, textAlign: 'center', fontSize: 20 }]}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.primaryTeal}
                  activeOutlineColor={BRAND_COLORS.primaryTeal}
                  textColor="#0F172A"
                  theme={{ colors: { background: '#FFFFFF' } }}
                />

                <Button
                  mode="contained"
                  onPress={handleVerifyMfa}
                  loading={loading}
                  style={styles.primaryButton}
                  contentStyle={styles.buttonContent}
                  buttonColor={BRAND_COLORS.primaryTeal}
                  textColor="#FFFFFF"
                >
                  Verify & Sign In
                </Button>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <Button
                    mode="text"
                    onPress={handleResendCode}
                    loading={resending}
                    textColor={BRAND_COLORS.primaryTeal}
                  >
                    Resend Code
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => {
                      setMfaStep(false);
                      setMfaCode('');
                      setErrorMessage('');
                    }}
                    textColor="#64748B"
                  >
                    Back to Sign In
                  </Button>
                </View>
              </View>
            ) : (
              /* ================= NORMAL SIGN IN ================= */
              <View style={{ width: '100%' }}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor={BRAND_COLORS.primaryTeal}
                  textColor="#0F172A"
                  theme={{ colors: { background: '#FFFFFF' } }}
                />

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor={BRAND_COLORS.primaryTeal}
                  textColor="#0F172A"
                  theme={{ colors: { background: '#FFFFFF' } }}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                      color={BRAND_COLORS.primaryTeal}
                    />
                  }
                />

                <View style={styles.forgotRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setForgotEmail(email);
                      setForgotSuccess(false);
                      setForgotModalVisible(true);
                    }}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <Button
                  mode="contained"
                  onPress={() => handleSignIn()}
                  loading={loading}
                  style={styles.primaryButton}
                  contentStyle={styles.buttonContent}
                  buttonColor={BRAND_COLORS.primaryTeal}
                  textColor="#FFFFFF"
                >
                  Sign In
                </Button>

                {/* Account Assistance */}
                <View style={styles.supportHelpBox}>
                  <Text style={styles.supportHelpText}>
                    Need an account? Email{' '}
                    <Text style={{ fontWeight: '600', color: BRAND_COLORS.primaryTeal }}>
                      support@renu-biome.com
                    </Text>
                  </Text>
                </View>

                {/* Demo Logins (Staging Only) */}
                {!isProduction && (
                  <View style={styles.demoSection}>
                    <View style={styles.dividerContainer}>
                      <Divider style={styles.dividerLine} />
                      <Text style={styles.dividerText}>DEMO LOGINS (STAGING)</Text>
                      <Divider style={styles.dividerLine} />
                    </View>

                    <View style={styles.demoButtonsRow}>
                      <Button
                        mode="outlined"
                        onPress={() => handleSignIn('support@renu-biome.com', 'admin')}
                        textColor={BRAND_COLORS.primaryTeal}
                        style={styles.demoButton}
                        compact
                        labelStyle={styles.demoButtonLabel}
                      >
                        Admin
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleSignIn('customer@renu.com', 'customer')}
                        textColor={BRAND_COLORS.primaryTeal}
                        style={styles.demoButton}
                        compact
                        labelStyle={styles.demoButtonLabel}
                      >
                        Grower
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleSignIn('employee@renu.com', 'employee')}
                        textColor={BRAND_COLORS.accentOrange}
                        style={[styles.demoButton, { borderColor: BRAND_COLORS.accentOrange }]}
                        compact
                        labelStyle={styles.demoButtonLabel}
                      >
                        Staff
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Footer App Attribution */}
          <Text style={styles.footerNote}>
            ReNu-Biome Grower Portal · Version 2.0
          </Text>
        </ScrollView>
      </LinearGradient>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="lock-reset" size={28} color={BRAND_COLORS.primaryTeal} />
              <Text style={styles.modalTitle}>Reset Password</Text>
            </View>

            {forgotSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#16A34A" />
                <Text style={styles.modalSuccessText}>
                  If an account exists for this email, password reset instructions have been dispatched.
                </Text>
                <Button
                  mode="contained"
                  buttonColor={BRAND_COLORS.primaryTeal}
                  onPress={() => setForgotModalVisible(false)}
                  style={{ marginTop: 16, width: '100%', borderRadius: 8 }}
                >
                  Return to Sign In
                </Button>
              </View>
            ) : (
              <View>
                <Text style={styles.modalSubtitle}>
                  Enter your email address and we'll dispatch password reset instructions.
                </Text>
                <TextInput
                  label="Account Email"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { marginBottom: 16 }]}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor={BRAND_COLORS.primaryTeal}
                  theme={{ colors: { background: '#FFFFFF' } }}
                />
                <Button
                  mode="contained"
                  onPress={handleForgotPasswordSubmit}
                  loading={forgotLoading}
                  buttonColor={BRAND_COLORS.primaryTeal}
                  style={{ borderRadius: 8, marginBottom: 8 }}
                  contentStyle={styles.buttonContent}
                >
                  Send Reset Link
                </Button>
                <Button
                  mode="text"
                  onPress={() => setForgotModalVisible(false)}
                  textColor="#64748B"
                >
                  Cancel
                </Button>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 240,
    height: 70,
    marginBottom: 6,
  },
  taglineItalic: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#E0EDE9',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  portalBadge: {
    backgroundColor: BRAND_COLORS.accentOrange,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  portalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    color: BRAND_COLORS.primaryTeal,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 10,
    marginTop: 4,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  supportHelpBox: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  supportHelpText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  demoSection: {
    marginTop: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  demoButton: {
    borderColor: BRAND_COLORS.primaryTeal,
    borderRadius: 8,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  demoButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 0,
    letterSpacing: 0,
  },
  mfaBanner: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  mfaInstruction: {
    fontSize: 13,
    color: '#0F766E',
    textAlign: 'center',
  },
  mfaTargetEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#115E59',
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
  footerNote: {
    marginTop: 24,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalSuccessText: {
    fontSize: 14,
    color: '#15803D',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
});
