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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Story {
  id: string;
  media: string;
  media_type: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  views: string[];
  view_count: number;
}

export default function StoriesScreen() {
  const router = useRouter();
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  useEffect(() => {
    fetchMyStories();
  }, []);

  const fetchMyStories = async () => {
    try {
      // This would fetch stories from the backend
      // For now, using mock data
      const mockStories: Story[] = [
        {
          id: '1',
          media: 'base64_image_data_here',
          media_type: 'image',
          caption: 'New wheels on the BMW! 🔥',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(), // 22 hours from now
          views: ['user1', 'user2', 'user3'],
          view_count: 15
        },
        {
          id: '2',
          media: 'base64_image_data_here',
          media_type: 'video',
          caption: 'Track day prep 🏁',
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          expires_at: new Date(Date.now() + 19 * 60 * 60 * 1000).toISOString(), // 19 hours from now
          views: ['user1', 'user4'],
          view_count: 8
        },
      ];
      setMyStories(mockStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would delete from backend
              setMyStories(prev => prev.filter(story => story.id !== storyId));
              Alert.alert('Success', 'Story deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete story');
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const storyTime = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - storyTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    return `${diffInHours} hours ago`;
  };

  const formatExpiresIn = (expiresAt: string) => {
    const now = new Date();
    const expiryTime = new Date(expiresAt);
    const diffInHours = Math.floor((expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Expires soon';
    if (diffInHours === 1) return 'Expires in 1 hour';
    return `Expires in ${diffInHours} hours`;
  };

  const renderStory = ({ item }: { item: Story }) => (
    <TouchableOpacity 
      style={styles.storyCard}
      onPress={() => {
        setSelectedStory(item);
        setShowStoryViewer(true);
      }}
    >
      <View style={styles.storyImageContainer}>
        <View style={styles.storyPlaceholder}>
          <Ionicons 
            name={item.media_type === 'video' ? 'play' : 'image'} 
            size={40} 
            color="#FFD700" 
          />
        </View>
        
        {/* Story Info Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.storyOverlay}
        >
          <Text style={styles.storyCaption} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
        </LinearGradient>
        
        {/* View Count Badge */}
        <View style={styles.viewCountBadge}>
          <Ionicons name="eye" size={12} color="#FFFFFF" />
          <Text style={styles.viewCountText}>{item.view_count}</Text>
        </View>
      </View>
      
      <View style={styles.storyDetails}>
        <View style={styles.storyTimeInfo}>
          <Text style={styles.storyTimeText}>{formatTimeAgo(item.created_at)}</Text>
          <Text style={styles.storyExpiryText}>{formatExpiresIn(item.expires_at)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteStory(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyStories();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>My Stories</Text>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/(main)/camera')}
          >
            <Ionicons name="add-circle" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stories List */}
      {myStories.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="camera-outline" size={80} color="#333333" />
          </View>
          <Text style={styles.emptyTitle}>No Stories Yet</Text>
          <Text style={styles.emptySubtitle}>
            Share your automotive moments with 24-hour stories!
          </Text>
          <TouchableOpacity 
            style={styles.createStoryButton}
            onPress={() => router.push('/(main)/camera')}
          >
            <LinearGradient
              colors={['#FFD700', '#F59E0B']}
              style={styles.createStoryGradient}
            >
              <Ionicons name="camera" size={20} color="#000000" />
              <Text style={styles.createStoryText}>Create Your First Story</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.storiesHeader}>
            <Text style={styles.storiesCount}>
              {myStories.length} active {myStories.length === 1 ? 'story' : 'stories'}
            </Text>
            <Text style={styles.storiesSubtext}>
              Stories disappear after 24 hours
            </Text>
          </View>
          
          <FlatList
            data={myStories}
            renderItem={renderStory}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#FFD700"
              />
            }
            contentContainerStyle={styles.storiesList}
            numColumns={2}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowStoryViewer(false)}
      >
        <View style={styles.storyViewerContainer}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.storyViewerGradient}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowStoryViewer(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Story Content */}
            <View style={styles.storyContent}>
              <View style={styles.storyViewerPlaceholder}>
                <Ionicons 
                  name={selectedStory?.media_type === 'video' ? 'play-circle' : 'image'} 
                  size={100} 
                  color="#FFD700" 
                />
                <Text style={styles.storyViewerText}>
                  {selectedStory?.caption || 'Your story content would appear here'}
                </Text>
              </View>
            </View>
            
            {/* Story Info */}
            <View style={styles.storyViewerInfo}>
              <View style={styles.storyViewerDetails}>
                <Text style={styles.storyViewerTime}>
                  {selectedStory && formatTimeAgo(selectedStory.created_at)}
                </Text>
                <View style={styles.storyViewerViews}>
                  <Ionicons name="eye" size={16} color="#FFFFFF" />
                  <Text style={styles.storyViewerViewsText}>
                    {selectedStory?.view_count} views
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  storiesHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  storiesCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  storiesSubtext: {
    fontSize: 14,
    color: '#999999',
  },
  storiesList: {
    padding: 16,
  },
  storyCard: {
    flex: 1,
    margin: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  storyImageContainer: {
    height: 200,
    position: 'relative',
  },
  storyPlaceholder: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  storyCaption: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  viewCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  storyDetails: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyTimeInfo: {
    flex: 1,
  },
  storyTimeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  storyExpiryText: {
    fontSize: 10,
    color: '#999999',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 16,
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  createStoryButton: {
    marginTop: 16,
  },
  createStoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  createStoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 8,
  },
  // Story Viewer Modal
  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  storyViewerGradient: {
    flex: 1,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyViewerPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  storyViewerText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
  },
  storyViewerInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  storyViewerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyViewerTime: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  storyViewerViews: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyViewerViewsText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
  },
});