import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer_id: string;
  attendees: string[];
  image?: string;
  created_at: string;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/events`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const joinEvent = async (eventId: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/events/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'You have joined the event!');
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, attendees: [...event.attendees, 'current_user'] }
            : event
        ));
      } else {
        Alert.alert('Error', 'Failed to join event');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const dateInfo = formatDate(item.date);
    const isJoined = item.attendees.includes('current_user');

    return (
      <TouchableOpacity style={styles.eventCard}>
        <View style={styles.eventCardContent}>
          {/* Event Date Badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeDay}>{dateInfo.day}</Text>
            <Text style={styles.dateBadgeMonth}>{dateInfo.month}</Text>
          </View>

          {/* Event Image */}
          {item.image && (
            <Image 
              source={{ uri: `data:image/jpeg;base64,${item.image}` }}
              style={styles.eventImage}
            />
          )}

          {/* Event Details */}
          <View style={styles.eventDetails}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventDescription} numberOfLines={2}>
              {item.description}
            </Text>
            
            <View style={styles.eventMeta}>
              <View style={styles.eventMetaItem}>
                <Ionicons name="time-outline" size={16} color="#CCCCCC" />
                <Text style={styles.eventMetaText}>{dateInfo.time}</Text>
              </View>
              
              <View style={styles.eventMetaItem}>
                <Ionicons name="location-outline" size={16} color="#CCCCCC" />
                <Text style={styles.eventMetaText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
              
              <View style={styles.eventMetaItem}>
                <Ionicons name="people-outline" size={16} color="#CCCCCC" />
                <Text style={styles.eventMetaText}>
                  {item.attendees.length} attending
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.eventActions}>
              <TouchableOpacity 
                style={[
                  styles.joinButton,
                  isJoined && styles.joinedButton
                ]}
                onPress={() => !isJoined && joinEvent(item.id)}
              >
                <Ionicons 
                  name={isJoined ? "checkmark-circle" : "add-circle-outline"} 
                  size={20} 
                  color={isJoined ? "#000000" : "#FFD700"} 
                />
                <Text style={[
                  styles.joinButtonText,
                  isJoined && styles.joinedButtonText
                ]}>
                  {isJoined ? 'Joined' : 'Join Event'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-outline" size={20} color="#CCCCCC" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Car Meets & Events</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Car Meets & Events</Text>
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#666666" />
          <Text style={styles.emptyTitle}>No Events Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to create an event in your area!
          </Text>
          <TouchableOpacity style={styles.createEventButton}>
            <View style={styles.createEventContent}>
              <Ionicons name="add" size={20} color="#000000" />
              <Text style={styles.createEventText}>Create Event</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FFD700"
            />
          }
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  createEventButton: {
    marginTop: 16,
  },
  createEventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFD700',
  },
  createEventText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 8,
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  eventCardContent: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  dateBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    minWidth: 50,
    zIndex: 1,
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  dateBadgeMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  eventImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  eventDetails: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventMeta: {
    marginBottom: 16,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 8,
    flex: 1,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginRight: 12,
  },
  joinedButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 6,
  },
  joinedButtonText: {
    color: '#000000',
  },
  shareButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 12,
    padding: 10,
  },
});