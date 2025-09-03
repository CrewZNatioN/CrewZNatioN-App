import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddPostScreen() {
  const [caption, setCaption] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const base64Images = result.assets
        .filter(asset => asset.base64)
        .map(asset => asset.base64!);
      
      setSelectedImages(prev => [...prev, ...base64Images]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImages(prev => [...prev, result.assets[0].base64!]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const createPost = async () => {
    if (!caption.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please add a caption or select at least one image');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/posts`, {
        caption: caption.trim(),
        images: selectedImages,
      });

      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => {
          setCaption('');
          setSelectedImages([]);
          router.replace('/(tabs)');
        }}
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity 
          onPress={createPost}
          disabled={loading || (!caption.trim() && selectedImages.length === 0)}
          style={[styles.shareButton, loading && styles.shareButtonDisabled]}
        >
          <Text style={[styles.shareButtonText, loading && styles.shareButtonTextDisabled]}>
            {loading ? 'Posting...' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {user?.profile_image ? (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${user.profile_image}` }} 
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={24} color="#888" />
            )}
          </View>
          <Text style={styles.username}>{user?.username}</Text>
        </View>

        {/* Caption Input */}
        <TextInput
          style={styles.captionInput}
          placeholder="What's happening with your ride?"
          placeholderTextColor="#888"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        {/* Selected Images */}
        {selectedImages.length > 0 && (
          <View style={styles.imagesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${image}` }}
                    style={styles.selectedImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF6B35" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Media Options */}
        <View style={styles.mediaOptions}>
          <TouchableOpacity style={styles.mediaOption} onPress={pickImages}>
            <Ionicons name="images" size={24} color="#FF6B35" />
            <Text style={styles.mediaOptionText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mediaOption} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#FF6B35" />
            <Text style={styles.mediaOptionText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {/* Character Count */}
        <View style={styles.footer}>
          <Text style={styles.characterCount}>
            {caption.length}/500
          </Text>
        </View>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  shareButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareButtonDisabled: {
    backgroundColor: '#333',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButtonTextDisabled: {
    color: '#888',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  captionInput: {
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    marginVertical: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  mediaOption: {
    alignItems: 'center',
  },
  mediaOptionText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  characterCount: {
    fontSize: 12,
    color: '#888',
  },
});