import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  images: string[];
}

interface Post {
  id: string;
  caption: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function ProfileScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('vehicles');
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [vehiclesResponse, postsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/vehicles/my`),
        axios.get(`${API_BASE_URL}/api/posts/user/${user?.id}`)
      ]);

      setVehicles(vehiclesResponse.data);
      setPosts(postsResponse.data);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const renderVehicleGrid = () => (
    <View style={styles.gridContainer}>
      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-sport" size={48} color="#333" />
          <Text style={styles.emptyStateText}>No vehicles added yet</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/add-vehicle')}
          >
            <Text style={styles.addButtonText}>Add Your First Ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {vehicles.map((vehicle) => (
            <TouchableOpacity 
              key={vehicle.id} 
              style={styles.vehicleCard}
              onPress={() => router.push(`/vehicle-details?id=${vehicle.id}`)}
            >
              {vehicle.images.length > 0 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${vehicle.images[0]}` }}
                  style={styles.vehicleImage}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="car-sport" size={24} color="#888" />
                </View>
              )}
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>
                  {vehicle.year} {vehicle.make}
                </Text>
                <Text style={styles.vehicleModel}>{vehicle.model}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={styles.addVehicleCard}
            onPress={() => router.push('/add-vehicle')}
          >
            <Ionicons name="add" size={32} color="#FF6B35" />
            <Text style={styles.addVehicleText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPostsGrid = () => (
    <View style={styles.postsGrid}>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="grid" size={48} color="#333" />
          <Text style={styles.emptyStateText}>No posts yet</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/add-post')}
          >
            <Text style={styles.addButtonText}>Create Your First Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {posts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.postItem}>
              {post.images.length > 0 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${post.images[0]}` }}
                  style={styles.postImage}
                />
              ) : (
                <View style={styles.textPost}>
                  <Text style={styles.textPostContent} numberOfLines={3}>
                    {post.caption}
                  </Text>
                </View>
              )}
              {post.images.length > 1 && (
                <View style={styles.multipleImagesIndicator}>
                  <Ionicons name="copy" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfileData(true)}
            tintColor="#FF6B35"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.username}>{user?.username}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="exit-outline" size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user?.profile_image ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${user.profile_image}` }} 
                  style={styles.profileAvatar}
                />
              ) : (
                <View style={styles.profileAvatar}>
                  <Ionicons name="person" size={40} color="#888" />
                </View>
              )}
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user?.posts_count || 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user?.followers_count || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user?.following_count || 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.fullName}>{user?.full_name}</Text>
            {user?.bio && (
              <Text style={styles.bio}>{user.bio}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'vehicles' && styles.activeTab]}
            onPress={() => setActiveTab('vehicles')}
          >
            <Ionicons 
              name="car-sport" 
              size={20} 
              color={activeTab === 'vehicles' ? '#FF6B35' : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === 'vehicles' && styles.activeTabText]}>
              Vehicles
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons 
              name="grid" 
              size={20} 
              color={activeTab === 'posts' ? '#FF6B35' : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'vehicles' ? renderVehicleGrid() : renderPostsGrid()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
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
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  profileInfo: {
    marginBottom: 16,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 18,
  },
  editProfileButton: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabNavigation: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  gridContainer: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  vehicleCard: {
    width: (width - 48) / 2,
    marginHorizontal: 4,
    marginBottom: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '100%',
    height: 120,
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    padding: 12,
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 12,
    color: '#888',
  },
  addVehicleCard: {
    width: (width - 48) / 2,
    height: 160,
    marginHorizontal: 4,
    marginBottom: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addVehicleText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  postsGrid: {
    padding: 16,
  },
  postItem: {
    width: (width - 48) / 3,
    height: (width - 48) / 3,
    marginHorizontal: 2,
    marginBottom: 4,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  textPost: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
    padding: 8,
    justifyContent: 'center',
  },
  textPostContent: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});