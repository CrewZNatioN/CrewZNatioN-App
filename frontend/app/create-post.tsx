import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { image, video, type } = params;

  const [caption, setCaption] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(type === 'story');
  const [storyDuration, setStoryDuration] = useState(5); // seconds

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/users/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.slice(0, 20));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const translateText = async (text: string, targetLang: string = 'en') => {
    // In a real app, integrate with Google Translate API or similar
    // For now, we'll just return the original text
    return text;
  };

  const sharePost = async () => {
    if ((!image && !video) || (!caption.trim() && type === 'post')) {
      Alert.alert('Error', 'Please add content');
      return;
    }

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const endpoint = type === 'story' ? '/api/stories' : 
                     type === 'reel' ? '/api/reels' : '/api/posts';
      
      const payload: any = {
        caption: caption.trim(),
        tagged_users: taggedUsers,
        type: type,
      };

      if (image) {
        payload.image = image;
      }
      if (video) {
        payload.video = video;
      }
      if (type === 'story') {
        payload.duration = storyDuration;
      }

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const successMessage = type === 'story' ? 'Story shared!' : 
                              type === 'reel' ? 'Reel posted!' : 'Post shared!';
        Alert.alert('Success', successMessage, [
          { text: 'OK', onPress: () => router.push('/(main)/feed') }
        ]);
      } else {
        Alert.alert('Error', `Failed to share ${type}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getLanguageFromText = (text: string) => {
    // Simple language detection - in production use proper language detection
    const arabicRegex = /[\u0600-\u06FF]/;
    const chineseRegex = /[\u4e00-\u9fff]/;
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
    const koreanRegex = /[\uac00-\ud7af]/;
    const russianRegex = /[\u0400-\u04FF]/;
    
    if (arabicRegex.test(text)) return 'ar';
    if (chineseRegex.test(text)) return 'zh';
    if (japaneseRegex.test(text)) return 'ja';
    if (koreanRegex.test(text)) return 'ko';
    if (russianRegex.test(text)) return 'ru';
    return 'en';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {type === 'story' ? 'Your Story' : 
             type === 'reel' ? 'New Reel' : 'New Post'}
          </Text>
          
          <TouchableOpacity 
            onPress={sharePost}
            disabled={uploading}
            style={[styles.shareButton, uploading && styles.shareButtonDisabled]}
          >
            <Text style={styles.shareButtonText}>
              {uploading ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Media Preview */}
          <View style={styles.mediaContainer}>
            {image && (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${image}` }}
                style={[
                  styles.mediaPreview,
                  type === 'story' && styles.storyPreview
                ]}
                resizeMode="cover"
              />
            )}
            {video && (
              <View style={[
                styles.mediaPreview,
                type === 'story' && styles.storyPreview
              ]}>
                {/* Video player would go here */}
                <Ionicons name="play-circle" size={80} color="#FFD700" />
              </View>
            )}
          </View>

          {/* Caption Input */}
          {type !== 'story' && (
            <View style={styles.captionSection}>
              <TextInput
                style={[
                  styles.captionInput,
                  getLanguageFromText(caption) === 'ar' && styles.rtlText
                ]}
                placeholder={`Write a caption... (any language supported)`}
                placeholderTextColor="#666666"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={2200} // Instagram limit
                textAlign={getLanguageFromText(caption) === 'ar' ? 'right' : 'left'}
              />
              <Text style={styles.characterCount}>{caption.length}/2200</Text>
              
              {/* Language Detection Indicator */}
              {caption.length > 0 && (
                <View style={styles.languageIndicator}>
                  <Ionicons name="language" size={16} color="#FFD700" />
                  <Text style={styles.languageText}>
                    Detected: {getLanguageFromText(caption).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Story Duration (for stories only) */}
          {type === 'story' && (
            <View style={styles.storyControls}>
              <Text style={styles.sectionTitle}>Story Duration</Text>
              <View style={styles.durationButtons}>
                {[3, 5, 10, 15].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      storyDuration === duration && styles.activeDurationButton
                    ]}
                    onPress={() => setStoryDuration(duration)}
                  >
                    <Text style={[
                      styles.durationText,
                      storyDuration === duration && styles.activeDurationText
                    ]}>
                      {duration}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* User Tagging */}
          <View style={styles.userTagSection}>
            <Text style={styles.sectionTitle}>Tag People</Text>
            
            {taggedUsers.length > 0 && (
              <View style={styles.taggedUsersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {taggedUsers.map((userId, index) => {
                    const user = users.find(u => u.id === userId);
                    return (
                      <View key={userId} style={styles.taggedUserChip}>
                        <Text style={styles.taggedUserText}>@{user?.username || 'Unknown'}</Text>
                        <TouchableOpacity 
                          onPress={() => setTaggedUsers(prev => prev.filter(id => id !== userId))}
                          style={styles.removeTagButton}
                        >
                          <Ionicons name="close" size={16} color="#000000" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.addUserButton}
              onPress={() => setShowUserSearch(true)}
            >
              <Ionicons name="person-add" size={20} color="#FFD700" />
              <Text style={styles.addUserButtonText}>Tag Friends</Text>
            </TouchableOpacity>
            
            {showUserSearch && (
              <View style={styles.userSearchContainer}>
                <View style={styles.userSearchHeader}>
                  <TextInput
                    style={styles.userSearchInput}
                    placeholder="Search users..."
                    placeholderTextColor="#666666"
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowUserSearch(false)}
                    style={styles.cancelSearchButton}
                  >
                    <Text style={styles.cancelSearchText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={users.filter(user => 
                    user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) &&
                    !taggedUsers.includes(user.id)
                  )}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.userSearchItem}
                      onPress={() => {
                        setTaggedUsers(prev => [...prev, item.id]);
                        setUserSearchQuery('');
                        setShowUserSearch(false);
                      }}
                    >
                      <Ionicons name="person-circle" size={40} color="#FFD700" />
                      <View style={styles.userSearchInfo}>
                        <Text style={styles.userSearchUsername}>@{item.username}</Text>
                        <Text style={styles.userSearchEmail}>{item.email}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  style={styles.userSearchList}
                  maxHeight={200}
                />
              </View>
            )}
          </View>

          {/* Global Reach Indicator */}
          <View style={styles.globalSection}>
            <View style={styles.globalHeader}>
              <Ionicons name="globe" size={20} color="#FFD700" />
              <Text style={styles.globalTitle}>Global Reach</Text>
            </View>
            <Text style={styles.globalSubtitle}>
              Your {type} will be visible worldwide. CREWZ NATION supports all languages and regions.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  shareButtonDisabled: {
    backgroundColor: '#333333',
  },
  shareButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mediaContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
  },
  storyPreview: {
    aspectRatio: 9/16,
    height: 400,
  },
  captionSection: {
    marginBottom: 24,
  },
  captionInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    textAlignVertical: 'top',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  languageText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 6,
    fontWeight: '600',
  },
  storyControls: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  durationButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activeDurationButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  durationText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeDurationText: {
    color: '#000000',
  },
  userTagSection: {
    marginBottom: 24,
  },
  taggedUsersContainer: {
    marginBottom: 12,
  },
  taggedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  taggedUserText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginRight: 6,
  },
  removeTagButton: {
    padding: 2,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  addUserButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  userSearchContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  userSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  userSearchInput: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 16,
  },
  cancelSearchButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelSearchText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  userSearchList: {
    maxHeight: 200,
  },
  userSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  userSearchInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userSearchUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userSearchEmail: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 2,
  },
  globalSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  globalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
  },
  globalSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
});