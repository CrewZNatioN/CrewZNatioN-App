import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>CrewZNatioN</Text>
        <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
        <Text style={styles.subtitle}>Loading your rides...</Text>
        <StatusBar style="light" backgroundColor="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CrewZNatioN</Text>
      <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
      <StatusBar style="light" backgroundColor="#000" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
});