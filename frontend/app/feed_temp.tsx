import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Post {
  _id: string;
  user_id: string;
  user: {
    username: string;
    profilePicture?: string;
  };
  image: string;
  caption: string;
  likes: number;
  comments: number;
  createdAt: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
  };
}

interface Story {
  id: string;
  user_id: string;
  user: {
    username: string;
    profilePicture?: string;
  };
  media: string;
  media_type: string;
  created_at: string;
  expires_at: string;
  views: string[];
}

interface StoryGroup {
  user_id: string;
  user: {
    username: string;
    profilePicture?: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
}

export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const fetchPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/posts/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleMessage = (userId: string, username: string) => {
    router.push({
      pathname: '/chat',
      params: { userId, username }
    });
  };

  const handleLike = async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, likes: post.likes + 1 }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {item.user.profilePicture ? (
              <Image 
                source={{ uri: item.user.profilePicture }} 
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person-circle" size={40} color="#666666" />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.user.username}</Text>
            {item.vehicle && (
              <Text style={styles.vehicleInfo}>
                {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.postHeaderButtons}>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => handleMessage(item.user_id, item.user.username)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post Image */}
      <Image 
        source={{ uri: `data:image/jpeg;base64,${item.image}` }}
        style={styles.postImage}
        resizeMode="cover"
      />

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item._id)}
          >
            <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Post Info */}
      <View style={styles.postInfo}>
        <Text style={styles.likesText}>{item.likes} likes</Text>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{item.user.username}</Text>
          {' '}{item.caption}
        </Text>
        <TouchableOpacity>
          <Text style={styles.commentsText}>
            View all {item.comments} comments
          </Text>
        </TouchableOpacity>
        <Text style={styles.timeAgo}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => router.push('/messages')}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => {/* Handle notifications */}}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stories Section */}
      <View style={styles.storiesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesScrollContent}
        >
          {/* Your Story */}
          <TouchableOpacity 
            style={styles.storyItem}
            onPress={() => router.push('/(main)/camera')}
          >
            <View style={styles.yourStoryContainer}>
              <View style={styles.yourStoryCircle}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.storyUsername}>Your Story</Text>
            </View>
          </TouchableOpacity>

          {/* Sample Stories - These would come from API */}
          {[
            { username: 'speedlover', hasUnviewed: true },
            { username: 'bikerfan', hasUnviewed: false },
            { username: 'crewzmember', hasUnviewed: true },
            { username: 'trackday', hasUnviewed: false },
            { username: 'motorhead', hasUnviewed: true },
          ].map((story, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.storyItem}
              onPress={() => {
                // This would open story viewer with real data
                Alert.alert('Story Viewer', `View ${story.username}'s story`);
              }}
            >
              <View style={[
                styles.storyCircle,
                story.hasUnviewed ? styles.unviewedStory : styles.viewedStory
              ]}>
                <View style={styles.storyAvatar}>
                  <Ionicons name="person" size={20} color="#666666" />
                </View>
              </View>
              <Text style={styles.storyUsername}>{story.username}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.feedList}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerLeft: {
    flex: 1,
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
  feedList: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#1A1A1A',
    marginBottom: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 2,
  },
  postImage: {
    width: width,
    height: width,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    marginRight: 16,
  },
  postInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  captionUsername: {
    fontWeight: '600',
  },
  commentsText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#666666',
  },
  postHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  notificationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  // Notification styles
  notificationButton: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  activeNotificationButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationsPanel: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666666',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
});