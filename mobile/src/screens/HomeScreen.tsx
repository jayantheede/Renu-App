import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchGrowerDashboard } from '../api/client';
import { ActivityIndicator } from 'react-native-paper';

export const HomeScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const fullName = user?.name || session?.user?.name || session?.user?.user_metadata?.full_name || 'Grower';
  const firstName = fullName.split(' ')[0];
  const isPendingApproval = user?.approvalStatus === 'PENDING' || user?.user_metadata?.approvalStatus === 'PENDING';

  const [weatherText, setWeatherText] = useState('Detecting weather...');
  const [weatherIcon, setWeatherIcon] = useState('weather-cloudy');
  const [homeData, setHomeData] = useState<any>(null);

  useEffect(() => {
    fetchGrowerDashboard().then(data => setHomeData(data)).catch(console.log);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setWeatherText('Weather unavailable');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        
        let city = 'Local';
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: {
              'User-Agent': 'AgriAssistantApp/1.0 (contact@renubiome.com)',
              'Accept': 'application/json'
            }
          });
          const geoData = await geoRes.json();
          city = geoData?.address?.city || geoData?.address?.town || geoData?.address?.county || 'Local';
        } catch (e) {
          console.warn('Geocoding failed, using Local');
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`);
        const data = await res.json();
        
        if (data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          
          let condition = 'Clear';
          let icon = 'white-balance-sunny';
          
          if (code >= 1 && code <= 3) { condition = 'Cloudy'; icon = 'weather-cloudy'; }
          else if (code >= 45 && code <= 48) { condition = 'Foggy'; icon = 'weather-fog'; }
          else if (code >= 51 && code <= 67) { condition = 'Rain'; icon = 'weather-pouring'; }
          else if (code >= 71 && code <= 82) { condition = 'Snow'; icon = 'weather-snowy'; }
          else if (code >= 95) { condition = 'Storm'; icon = 'weather-lightning'; }

          setWeatherText(`${temp}°F, ${condition}, ${city}`);
          setWeatherIcon(icon);
        } else {
          setWeatherText('Weather unavailable');
        }
      } catch (error) {
        console.log("Weather fetch error:", error);
        setWeatherText('Weather unavailable');
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1543081329-873f4e3c9cf1?auto=format&fit=crop&q=80&w=1200' }} 
          style={styles.headerBackground}
          imageStyle={styles.headerImage}
        >
          <View style={styles.headerOverlay}>
            
            {/* Top Bar */}
            <View style={styles.topBar}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/renubiome_logo.png')} 
                  style={styles.logo} 
                  resizeMode="contain" 
                  tintColor="#FFFFFF"
                />
                <Text style={styles.logoSubtext}>Advanced Crop Nutrition</Text>
              </View>
              
              <TouchableOpacity style={styles.dropdownPill}>
                <Text style={styles.dropdownPillText}>All entities</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Greeting */}
            <Text style={styles.greeting}>Good morning, {firstName}</Text>
            <Text style={styles.subGreeting}>Sierra Orchards, all entities</Text>

            {/* Status Pills */}
            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <MaterialCommunityIcons name={weatherIcon as any} size={16} color="#FFF" />
                <Text style={styles.statusPillText}>{weatherText}</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.redDot} />
                <Text style={styles.statusPillText}>Post-harvest</Text>
              </View>
            </View>

          </View>
        </ImageBackground>

        {/* Content Section */}
        <View style={styles.content}>
          
          {isPendingApproval && (
            <View style={styles.pendingNoticeCard}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#D97706" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingNoticeTitle}>Account Submitted for Approval</Text>
                <Text style={styles.pendingNoticeDesc}>
                  Your customer account has been sent to the administrator for verification. You have full access to explore the catalog and set up ranches.
                </Text>
              </View>
            </View>
          )}

          {!homeData ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <>
          {/* Season Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Season 2026, almond</Text>
              <Text style={styles.cardDate}>Sep 15</Text>
            </View>

            <View style={styles.stagesContainer}>
              <View style={styles.stageCol}>
                <View style={[styles.stageBar, { backgroundColor: '#5BC18D' }]} />
                <Text style={styles.stageLabel}>Bloom</Text>
              </View>
              <View style={styles.stageCol}>
                <View style={[styles.stageBar, { backgroundColor: '#5BC18D' }]} />
                <Text style={styles.stageLabel}>Nut fill</Text>
              </View>
              <View style={styles.stageCol}>
                <View style={[styles.stageBar, { backgroundColor: '#5BC18D' }]} />
                <Text style={styles.stageLabel}>Hull split</Text>
              </View>
              <View style={styles.stageCol}>
                <View style={[styles.stageBar, { backgroundColor: '#5BC18D' }]} />
                <Text style={styles.stageLabel}>Harvest</Text>
              </View>
              <View style={styles.stageCol}>
                <View style={[styles.stageBar, { backgroundColor: '#F47F46' }]} />
                <Text style={[styles.stageLabel, styles.stageLabelActive]}>Post-harvest</Text>
              </View>
            </View>

            <Text style={styles.cardDescription}>
              Post-harvest window is open on N-4 and S-1. One recommendation is waiting for your decision.
            </Text>
          </View>

          {/* This Week Section */}
          <Text style={styles.sectionTitle}>This week</Text>

          {homeData.pendingOrders?.map((order: any) => (
            <TouchableOpacity key={order.id} style={styles.actionCard} activeOpacity={0.7}>
              <View style={styles.actionBadgeDelivery}>
                <Text style={styles.actionBadgeTextDelivery}>Delivery</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{order.qty} {order.product} en route</Text>
                <Text style={styles.actionSubtext}>Order #{order.orderId}. Window: {order.window}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          {homeData.recentMessages?.filter((m: any) => m.dot === 'on').map((msg: any) => (
            <TouchableOpacity key={msg.id} style={styles.actionCard} activeOpacity={0.7}>
              <View style={styles.actionBadgeN4}>
                <Text style={styles.actionBadgeTextN4}>Action</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{msg.title}</Text>
                <Text style={styles.actionSubtext}>{msg.sub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <View style={styles.actionBadgeTransparent}>
              <Text style={styles.actionTitle}>Balance due</Text>
              <Text style={styles.actionSubtext}>{homeData.openInvoices?.length || 0} open invoices</Text>
            </View>
            <View style={styles.actionContentRight}>
              <Text style={styles.actionPrice}>${homeData.openInvoices?.reduce((acc: number, inv: any) => acc + inv.amt, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Price Agreement Section */}
          <Text style={styles.sectionTitle}>2026 price agreement</Text>
          
          <View style={styles.card}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Green Nitrogen, 42,000 of 60,000 gal used</Text>
              <Text style={styles.progressValue}>70%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: '70%' }]} />
            </View>

            <View style={[styles.progressRow, { marginTop: 16 }]}>
              <Text style={styles.progressLabel}>KTS, 9,200 of 14,000 gal used</Text>
              <Text style={styles.progressValue}>66%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: '66%' }]} />
            </View>

            <Text style={styles.agreementNote}>
              Expires Dec 31. The 2027 agreement is ready to sign in More.
            </Text>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() => navigation?.navigate('Orders')}
            >
              <Text style={styles.quickActionText}>Reorder last delivery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() => navigation?.navigate('Shop')}
            >
              <Text style={styles.quickActionText}>Request an order</Text>
            </TouchableOpacity>
          </View>

          {/* Message Us Button */}
          <TouchableOpacity
            style={styles.messageUsButton}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('Messages')}
          >
            <Text style={styles.messageUsText}>Message us</Text>
          </TouchableOpacity>

          </>
          )}

        </View>
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F4',
  },
  scrollContent: {
    paddingBottom: 100, // For the bottom tab bar
  },
  headerBackground: {
    width: '100%',
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerImage: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerOverlay: {
    backgroundColor: 'rgba(0,30,10,0.4)',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  logo: {
    height: 30,
    width: 160,
    marginLeft: -4,
  },
  logoSubtext: {
    color: '#FFF',
    fontSize: 10,
    marginTop: -4,
    marginLeft: 4,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dropdownPillText: {
    color: '#FFF',
    marginRight: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusPillText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F47F46',
  },
  content: {
    padding: 20,
    marginTop: -20, // Overlap the header slightly
  },
  pendingNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingNoticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 2,
  },
  pendingNoticeDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  stagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stageCol: {
    flex: 1,
    paddingHorizontal: 2,
  },
  stageBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5BC18D',
    marginBottom: 8,
  },
  stageLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  stageLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  actionBadgeDelivery: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  actionBadgeTextDelivery: {
    color: '#1F4E34',
    fontWeight: '600',
    fontSize: 12,
  },
  actionBadgeN4: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  actionBadgeTextN4: {
    color: '#E65100',
    fontWeight: '600',
    fontSize: 12,
  },
  actionBadgeTransparent: {
    flex: 1,
  },
  actionContent: {
    flex: 1,
  },
  actionContentRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5BC18D',
    borderRadius: 4,
  },
  agreementNote: {
    marginTop: 16,
    fontSize: 13,
    color: '#6B7280',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#5BC18D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionText: {
    color: '#1B5A44',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageUsButton: {
    backgroundColor: '#12211A',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  messageUsText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
