import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1E3A8A', '#3B82F6', '#FCD34D']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>CREWZ</Text>
              <Text style={styles.logoSubtext}>NATION</Text>
            </View>
            <Text style={styles.tagline}>Your Automotive Social Hub</Text>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresSection}>
            <View style={styles.featureRow}>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🚗</Text>
                <Text style={styles.featureText}>Share Rides</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📸</Text>
                <Text style={styles.featureText}>Photo Feed</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🏁</Text>
                <Text style={styles.featureText}>Car Meets</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>💬</Text>
                <Text style={styles.featureText}>Forums</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FCD34D',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 18,
    color: '#E5E7EB',
    textAlign: 'center',
    fontWeight: '400',
  },
  featuresSection: {
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    width: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonSection: {
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#FCD34D',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  primaryButtonText: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});