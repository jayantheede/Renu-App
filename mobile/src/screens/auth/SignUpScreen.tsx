import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/useAuthStore';

export const SignUpScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing Fields', 'Please fill out all fields before signing up.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json().catch(() => null);
      
      if (!res.ok) throw new Error(data?.error || 'Failed to send OTP. Is the backend running?');
      
      Alert.alert('Check your email', 'We sent a 6-digit code to your email address.');
      setIsOtpSent(true);
    } catch (error: any) {
      if (error.message.includes('Network request failed')) {
        Alert.alert('Network Error', 'Cannot reach the backend server. Please make sure the backend is running and Expo can connect to it.');
      } else {
        Alert.alert('Sign Up Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const setSession = useAuthStore((state) => state.setSession);

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode, password, name })
      });
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to verify OTP.');

      let user = data?.user;
      let token = data?.token;

      // If token/user was not returned directly by verify-otp, perform auto-login
      if (!user || !token) {
        const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json().catch(() => null);
        
        if (!loginRes.ok) throw new Error(loginData?.error || 'Failed to auto-login');
        user = loginData.user;
        token = loginData.token;
      }

      await setSession(user, token);
      if (Platform.OS === 'web') {
        window.alert('Your email has been verified! Welcome to Agri Assistant.');
      } else {
        Alert.alert('Success', 'Your email has been verified! Welcome to Agri Assistant.');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200' }} 
      style={styles.background}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <GlassCard style={styles.card}>
            <View style={styles.headerContainer}>
              <Text variant="displaySmall" style={styles.title}>
                <Text style={{ color: '#F47F46' }}>Renu</Text>
                <Text style={{ color: '#2E5D36' }}> Biome</Text>
              </Text>
              <Text variant="titleMedium" style={styles.subtitle}>
                Join Agri Assistant today
              </Text>
            </View>
            
            {!isOtpSent ? (
              <>
                <TextInput
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2E5D36"
                  activeOutlineColor="#2E5D36"
                  textColor="#333333"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                />
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
                  textColor="#333333"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                />
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2E5D36"
                  activeOutlineColor="#2E5D36"
                  textColor="#333333"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                />
                <Button 
                  mode="contained" 
                  onPress={handleSignUp} 
                  loading={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor="#2E5D36"
                  textColor="#FFFFFF"
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <>
                <TextInput
                  label="6-Digit OTP Code"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2E5D36"
                  activeOutlineColor="#2E5D36"
                  textColor="#333333"
                  theme={{ colors: { background: '#FFFFFF', onSurfaceVariant: '#2E5D36' } }}
                />
                <Button 
                  mode="contained" 
                  onPress={handleVerifyOtp} 
                  loading={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor="#2E5D36"
                  textColor="#FFFFFF"
                >
                  Verify Email
                </Button>
              </>
            )}

            <Button 
              onPress={() => navigation.navigate('SignIn')}
              style={styles.textButton}
              textColor="#2E5D36"
            >
              Already have an account? Sign In
            </Button>
          </GlassCard>

          <Text style={styles.watermark} numberOfLines={1} adjustsFontSizeToFit>
            Designed By SRavanga AI Smart Solutions
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(245, 248, 245, 0.92)',
    padding: 16,
    borderRadius: 20,
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
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    height: 50,
  },
  button: {
    borderRadius: 30,
    marginTop: 4,
  },
  buttonContent: {
    paddingVertical: 2,
  },
  textButton: {
    marginTop: 8,
  },
  watermark: {
    paddingVertical: 10,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
