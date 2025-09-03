import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { FlashList } from '@shopify/flash-list';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Post {
  id: string;
  user_id: string;
  vehicle_id?: string;
  caption: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    profile_image?: string;
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    type: string;
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await axios.get(`${API_BASE_URL}/api/posts/feed`);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/posts/${postId}/like`);
      
      // Update the post in state
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes_count: response.data.liked ? post.likes_count + 1 : post.likes_count - 1
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const renderPost = ({ item: post }: { item: Post }) => (
    <View style={styles.postContainer}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {post.user?.profile_image ? (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${post.user.profile_image}` }} 
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={20} color="#888" />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{post.user?.username || 'Unknown'}</Text>
            {post.vehicle && (
              <Text style={styles.vehicleInfo}>
                {post.vehicle.year} {post.vehicle.make} {post.vehicle.model}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.imageContainer}
        >
          {post.images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: `data:image/jpeg;base64,${image}` }}
              style={styles.postImage}
            />
          ))}
        </ScrollView>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(post.id)}
          >
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Post Info */}
      <View style={styles.postInfo}>
        {post.likes_count > 0 && (
          <Text style={styles.likesCount}>
            {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
          </Text>
        )}
        
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionUsername}>{post.user?.username}</Text>
            <Text style={styles.caption}> {post.caption}</Text>
          </View>
        )}

        {post.comments_count > 0 && (
          <TouchableOpacity>
            <Text style={styles.viewComments}>
              View all {post.comments_count} comments
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.timeAgo}>
          {new Date(post.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CrewZNatioN</Text>
          <TouchableOpacity>
            <Ionicons name="paper-plane-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CrewZNatioN</Text>
        <TouchableOpacity>
          <Ionicons name="paper-plane-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {posts.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFeed(true)}
              tintColor="#FF6B35"
            />
          }
        >
          <Ionicons name="car-sport" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Follow other car enthusiasts or create your first post!
          </Text>
        </ScrollView>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          estimatedItemSize={400}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFeed(true)}
              tintColor="#FF6B35"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  postContainer: {
    backgroundColor: '#000',
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  imageContainer: {
    height: width,
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
  likesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  captionContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  captionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  caption: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  viewComments: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#888',
  },
});