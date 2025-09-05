import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto navigate to login after 3 seconds
    const timer = setTimeout(() => {
      router.replace('/auth/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.content}>
        <Text style={styles.eatText}>EAT</Text>
        <Text style={styles.sleepText}>SLEEP</Text>
        <Text style={styles.crewzText}>CREWZ</Text>
        <Text style={styles.repeatText}>REPEAT</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  eatText: {
    fontSize: width * 0.2,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-condensed',
  },
  sleepText: {
    fontSize: width * 0.2,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-condensed',
  },
  crewzText: {
    fontSize: width * 0.2,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 6,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-condensed',
  },
  repeatText: {
    fontSize: width * 0.2,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-condensed',
  },
});