import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LiveStreamScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [currentComment, setCurrentComment] = useState('');
  const [streamId, setStreamId] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startLiveStream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your live stream');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStreamId(data.stream_id);
        setIsLive(true);
        
        // Start periodic viewer count updates
        startViewerCountUpdates();
        
        Alert.alert('🔴 You\'re Live!', 'Your automotive live stream is now active');
      } else {
        Alert.alert('Error', 'Failed to start live stream');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const endLiveStream = async () => {
    if (!streamId) return;

    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${BACKEND_URL}/api/live/${streamId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setIsLive(false);
      setStreamId(null);
      router.back();
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  };

  const startViewerCountUpdates = () => {
    // Simulate viewer count updates (in real app, this would be WebSocket)
    const interval = setInterval(() => {
      if (!isLive) {
        clearInterval(interval);
        return;
      }
      
      setViewers(prev => {
        const change = Math.floor(Math.random() * 10) - 3; // Random change -3 to +6
        return Math.max(0, prev + change);
      });
    }, 3000);
  };

  const sendComment = () => {
    if (!currentComment.trim()) return;

    const newComment = {
      id: Date.now().toString(),
      username: 'You',
      text: currentComment.trim(),
      timestamp: new Date().toISOString(),
    };

    setComments(prev => [...prev.slice(-19), newComment]); // Keep last 20 comments
    setCurrentComment('');
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-off" size={80} color="#666666" />
          <Text style={styles.permissionText}>Camera access denied</Text>
          <Text style={styles.permissionSubText}>
            Please enable camera permissions for live streaming
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLive) {
    // Pre-stream setup
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.setupTitle}>Go Live</Text>
          <Text style={styles.setupSubtitle}>Share your automotive passion with the world</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Stream Title *</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="What are you showing today?"
              placeholderTextColor="#666666"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Tell viewers what to expect..."
              placeholderTextColor="#666666"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
            />
          </View>

          <TouchableOpacity 
            style={[styles.goLiveButton, !title.trim() && styles.goLiveButtonDisabled]}
            onPress={startLiveStream}
            disabled={!title.trim()}
          >
            <View style={styles.goLiveContent}>
              <Ionicons name="radio" size={24} color="#FFFFFF" />
              <Text style={styles.goLiveText}>Start Live Stream</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.globalNotice}>
            <Ionicons name="globe" size={20} color="#FFD700" />
            <Text style={styles.globalNoticeText}>
              Your stream will be visible to CREWZ NATION members worldwide
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Live streaming interface
  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front" // Front camera for live streaming
      >
        <View style={styles.liveOverlay}>
          {/* Top Status Bar */}
          <View style={styles.topBar}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
              <Text style={styles.viewerCount}>{viewers}</Text>
            </View>

            <TouchableOpacity 
              style={styles.endButton}
              onPress={endLiveStream}
            >
              <Text style={styles.endButtonText}>End</Text>
            </TouchableOpacity>
          </View>

          {/* Stream Info */}
          <View style={styles.streamInfo}>
            <Text style={styles.streamTitle}>{title}</Text>
            {description && (
              <Text style={styles.streamDescription}>{description}</Text>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsContainer}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Text style={styles.commentUsername}>{comment.username}</Text>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}
          </View>

          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#CCCCCC"
              value={currentComment}
              onChangeText={setCurrentComment}
              onSubmitEditing={sendComment}
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={sendComment}
            >
              <Ionicons name="send" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
  },
  permissionSubText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 8,
  },
  setupContainer: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  descriptionInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  goLiveButton: {
    backgroundColor: '#FF0000',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  goLiveButtonDisabled: {
    backgroundColor: '#333333',
  },
  goLiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goLiveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  globalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  globalNoticeText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 8,
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  liveOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  viewerCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  streamInfo: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
  },
  streamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  streamDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    maxHeight: 200,
  },
  commentItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
});