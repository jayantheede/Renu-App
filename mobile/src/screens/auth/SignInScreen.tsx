import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, ImageBackground } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, TextInput, Button, useTheme, Divider } from 'react-native-paper';
// Supabase removed
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/useAuthStore';

export const SignInScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const setSession = useAuthStore((state) => state.setSession);

  const handleSignIn = async (directEmail?: string, directPassword?: string) => {
    setLoading(true);

    const loginEmail = typeof directEmail === 'string' ? directEmail : email;
    const loginPassword = typeof directPassword === 'string' ? directPassword : password;

    if (loginEmail === 'Admin' && loginPassword === 'Admin') {
      setSession({ id: 'admin', email: 'admin@renubiome.com', name: 'Administrator', role: 'admin' }, 'mock_token');
      setLoading(false);
      return;
    }

    if (loginEmail === 'User' && loginPassword === 'User') {
      setSession({ id: 'user', email: 'user@agriassistant.com', name: 'Grower User', role: 'client' }, 'mock_token');
      setLoading(false);
      return;
    }

    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      
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

  const handleAppleLogin = () => {
    Alert.alert('Coming Soon', 'Apple Login will be available in production.');
  };

  const handleGoogleLogin = () => {
    Alert.alert('Coming Soon', 'Google Login will be available in production.');
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200' }} 
      style={styles.background}
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.card}>
            <View style={styles.headerContainer}>
              <Text variant="displaySmall" style={styles.title}>
                <Text style={{ color: '#F47F46' }}>Renu</Text>
                <Text style={{ color: '#2E5D36' }}> Biome</Text>
              </Text>
              <Text variant="titleMedium" style={styles.subtitle}>
                Sign in to manage your fields
              </Text>
            </View>
            
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
              secureTextEntry={!showPassword}
              style={styles.input}
              mode="outlined"
              outlineColor="#2E5D36"
              activeOutlineColor="#2E5D36"
              textColor="#333333"
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

            <View style={styles.dividerContainer}>
              <Divider style={styles.dividerLine} />
              <Text style={styles.dividerText}>DEMO LOGINS</Text>
              <Divider style={styles.dividerLine} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
              <Button 
                mode="outlined" 
                onPress={() => handleSignIn('admin@renu.com', 'admin')}
                buttonColor="rgba(255,255,255,0.5)"
                textColor="#2E5D36"
                style={{ borderColor: '#2E5D36' }}
              >
                Admin
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => handleSignIn('employee@renu.com', 'employee')}
                buttonColor="rgba(255,255,255,0.5)"
                textColor="#2E5D36"
                style={{ borderColor: '#2E5D36' }}
              >
                Emp
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => handleSignIn('customer@renu.com', 'customer')}
                buttonColor="rgba(255,255,255,0.5)"
                textColor="#2E5D36"
                style={{ borderColor: '#2E5D36' }}
              >
                Cust
              </Button>
            </View>

            <View style={styles.dividerContainer}>
              <Divider style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <Divider style={styles.dividerLine} />
            </View>

            <Button 
              mode="outlined" 
              onPress={handleAppleLogin} 
              style={[styles.button, styles.socialButton]}
              contentStyle={styles.buttonContent}
              textColor="#333333"
              icon={() => <Svg width="20" height="20" viewBox="0 0 384 512" fill="#000000"><Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></Svg>}
            >
              Continue with Apple
            </Button>

            <Button 
              mode="outlined" 
              onPress={handleGoogleLogin} 
              style={[styles.button, styles.socialButton]}
              contentStyle={styles.buttonContent}
              textColor="#333333"
              icon={() => (
                <Svg width="20" height="20" viewBox="0 0 24 24">
                  <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </Svg>
              )}
            >
              Continue with Google
            </Button>

            <Button 
              onPress={() => navigation.navigate('SignUp')}
              style={styles.textButton}
              textColor="#2E5D36"
            >
              Don't have an account? Sign Up
            </Button>


          </GlassCard>

          <Text style={styles.watermark} numberOfLines={1}>
            Designed by SRavanga AI Smart Solutions
          </Text>
        </ScrollView>
      </View>
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
});
