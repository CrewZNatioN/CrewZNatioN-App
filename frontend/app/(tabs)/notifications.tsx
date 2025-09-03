import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow';
  user: {
    username: string;
    profile_image?: string;
  };
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationsScreen() {
  const { user } = useAuth();

  // Mock notifications data
  const notifications: NotificationItem[] = [
    {
      id: '1',
      type: 'like',
      user: { username: 'speedster92' },
      message: 'liked your post',
      time: '2h',
      read: false,
    },
    {
      id: '2',
      type: 'comment',
      user: { username: 'turbocharged' },
      message: 'commented on your post',
      time: '4h',
      read: false,
    },
    {
      id: '3',
      type: 'follow',
      user: { username: 'rideordie' },
      message: 'started following you',
      time: '1d',
      read: true,
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={20} color="#FF6B35" />;
      case 'comment':
        return <Ionicons name="chatbubble" size={20} color="#4A90E2" />;
      case 'follow':
        return <Ionicons name="person-add" size={20} color="#50E3C2" />;
      default:
        return <Ionicons name="notifications" size={20} color="#888" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity>
          <Ionicons name="checkmark-done" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#333" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When people interact with your posts, you'll see them here
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.unreadNotification
                ]}
              >
                <View style={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </View>

                <View style={styles.avatarContainer}>
                  {notification.user.profile_image ? (
                    <Image 
                      source={{ uri: `data:image/jpeg;base64,${notification.user.profile_image}` }} 
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={18} color="#888" />
                    </View>
                  )}
                </View>

                <View style={styles.notificationContent}>
                  <Text style={styles.notificationText}>
                    <Text style={styles.username}>
                      {notification.user.username}
                    </Text>
                    {' '}
                    <Text style={styles.message}>
                      {notification.message}
                    </Text>
                  </Text>
                  <Text style={styles.timeText}>{notification.time}</Text>
                </View>

                {!notification.read && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  unreadNotification: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  username: {
    fontWeight: '600',
    color: '#fff',
  },
  message: {
    color: '#ccc',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginLeft: 8,
  },
});