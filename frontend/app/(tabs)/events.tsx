import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  event_date: string;
  max_attendees?: number;
  attendees_count: number;
  image?: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    profile_image?: string;
  };
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleAttendEvent = async (eventId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/events/${eventId}/attend`);
      // Refresh events to update attendance count
      loadEvents();
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance');
    }
  };

  const openMap = (event: Event) => {
    if (event.latitude && event.longitude) {
      // Open in native maps app
      const url = `maps:0,0?q=${event.latitude},${event.longitude}`;
      Alert.alert(
        'Open in Maps',
        `Open ${event.location} in Maps app?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => console.log('Opening maps...') }
        ]
      );
    } else {
      Alert.alert('Location', `Event location: ${event.location}`);
    }
  };

  const renderEventCard = (event: Event) => (
    <View key={event.id} style={styles.eventCard}>
      {event.image && (
        <Image source={{ uri: `data:image/jpeg;base64,${event.image}` }} style={styles.eventImage} />
      )}
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>
            {format(new Date(event.event_date), 'MMM d, h:mm a')}
          </Text>
        </View>

        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>

        <TouchableOpacity style={styles.locationContainer} onPress={() => openMap(event)}>
          <Ionicons name="location" size={16} color={Colors.secondary} />
          <Text style={styles.locationText}>{event.location}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.eventFooter}>
          <View style={styles.attendanceInfo}>
            <Ionicons name="people" size={16} color={Colors.textMuted} />
            <Text style={styles.attendanceText}>
              {event.attendees_count} attending
              {event.max_attendees && ` • ${event.max_attendees} max`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.attendButton}
            onPress={() => handleAttendEvent(event.id)}
          >
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            <Text style={styles.attendButtonText}>Attend</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.organizerInfo}>
          <View style={styles.organizerAvatar}>
            {event.user?.profile_image ? (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${event.user.profile_image}` }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Ionicons name="person" size={16} color={Colors.textMuted} />
            )}
          </View>
          <Text style={styles.organizerName}>
            By {event.user?.full_name || event.user?.username}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Automotive Events</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptyDescription}>
              Be the first to create an automotive event in your area!
            </Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {events.map(renderEventCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  eventsContainer: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.card,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  attendButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  organizerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  organizerName: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
