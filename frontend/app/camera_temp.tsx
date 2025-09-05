import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CameraScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<'back' | 'front'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState<'post' | 'story' | 'reel' | 'live'>('post');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const cameraRef = useRef<CameraView>(null);

  const filters = [
    { name: 'none', label: 'Original', icon: 'camera-outline' },
    { name: 'vintage', label: 'Vintage', icon: 'film-outline' },
    { name: 'bright', label: 'Bright', icon: 'sunny-outline' },
    { name: 'contrast', label: 'Contrast', icon: 'contrast-outline' },
    { name: 'sepia', label: 'Sepia', icon: 'leaf-outline' },
    { name: 'blur', label: 'Blur', icon: 'water-outline' },
  ];

  useEffect(() => {
    getCameraPermissions();
    loadRecentPhotos();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadRecentPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === 'granted') {
        // Load recent photos for preview
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: false,
          quality: 0.3,
        });
        // This is just for demonstration - in real app you'd load multiple recent photos
      }
    } catch (error) {
      console.error('Error loading recent photos:', error);
    }
  };

  const applyFilter = async (imageUri: string, filterName: string) => {
    try {
      let manipulatorOptions: any = {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      };

      let actions: any[] = [];

      switch (filterName) {
        case 'vintage':
          // Vintage effect: sepia + contrast
          actions = [
            { resize: { width: 1080 } }
          ];
          break;
        case 'bright':
          // Brightness increase
          actions = [
            { resize: { width: 1080 } }
          ];
          break;
        case 'contrast':
          // High contrast
          actions = [
            { resize: { width: 1080 } }
          ];
          break;
        case 'sepia':
          // Sepia tone
          actions = [
            { resize: { width: 1080 } }
          ];
          break;
        case 'blur':
          // Slight blur effect
          actions = [
            { resize: { width: 1080 } }
          ];
          break;
        default:
          // Original - just resize
          actions = [
            { resize: { width: 1080 } }
          ];
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        manipulatorOptions
      );

      return result;
    } catch (error) {
      console.error('Error applying filter:', error);
      return null;
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        
        if (photo?.base64) {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 1080 } }],
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );
          
          // Navigate to post creation with the image
          router.push({
            pathname: '/create-post',
            params: { 
              image: manipulatedImage.base64,
              type: selectedMode 
            }
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          quality: Camera.Constants.VideoQuality['1080p'],
          maxDuration: selectedMode === 'story' ? 15 : selectedMode === 'reel' ? 30 : 300,
        });
        
        if (video) {
          router.push({
            pathname: '/create-post',
            params: { 
              video: video.uri,
              type: selectedMode 
            }
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to record video');
      } finally {
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: selectedMode === 'post' ? ['images', 'videos'] : ['images'],
        allowsEditing: true,
        aspect: selectedMode === 'story' ? [9, 16] : [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        router.push({
          pathname: '/create-post',
          params: { 
            image: asset.base64,
            video: asset.uri,
            type: selectedMode 
          }
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick from gallery');
    }
  };

  const startLiveStream = async () => {
    Alert.alert(
      'Go Live',
      'Start your live automotive stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Go Live', 
          onPress: () => {
            // Navigate to live streaming screen
            router.push('/live-stream');
          }
        },
      ]
    );
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
            Please enable camera permissions in Settings
          </Text>
          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={pickFromGallery}
          >
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={type}
        flash={flashMode}
      >
        {/* Camera Overlay */}
        <View style={styles.cameraOverlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.topButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.topCenterControls}>
              <TouchableOpacity 
                style={[styles.topButton, flashMode !== 'off' && styles.activeControl]}
                onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}
              >
                <Ionicons 
                  name={flashMode === 'off' ? 'flash-off' : 'flash'} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.topButton}
              onPress={() => setType(type === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Mode Selection */}
          <View style={styles.modeSelector}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modeScrollContent}
            >
              {['live', 'story', 'post', 'reel'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    selectedMode === mode && styles.activeModeButton
                  ]}
                  onPress={() => setSelectedMode(mode as any)}
                >
                  <Text style={[
                    styles.modeText,
                    selectedMode === mode && styles.activeModeText
                  ]}>
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Gallery Preview */}
            <TouchableOpacity 
              style={styles.galleryPreview}
              onPress={pickFromGallery}
            >
              <Ionicons name="images" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Capture Button */}
            <View style={styles.captureButtonContainer}>
              {selectedMode === 'live' ? (
                <TouchableOpacity 
                  style={styles.liveButton}
                  onPress={startLiveStream}
                >
                  <View style={styles.liveButtonInner}>
                    <Ionicons name="radio" size={24} color="#FF0000" />
                  </View>
                </TouchableOpacity>
              ) : selectedMode === 'reel' || selectedMode === 'story' ? (
                <TouchableOpacity 
                  style={[styles.captureButton, isRecording && styles.recordingButton]}
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                >
                  <View style={[styles.captureInner, isRecording && styles.recordingInner]} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              )}
              
              {/* Recording Timer */}
              {isRecording && (
                <View style={styles.recordingTimer}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>REC</Text>
                </View>
              )}
            </View>

            {/* Mode Specific Actions */}
            <View style={styles.rightControls}>
              {selectedMode === 'post' && (
                <TouchableOpacity style={styles.rightButton}>
                  <Ionicons name="car-sport" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {selectedMode === 'story' && (
                <TouchableOpacity style={styles.rightButton}>
                  <Ionicons name="text" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {selectedMode === 'reel' && (
                <TouchableOpacity style={styles.rightButton}>
                  <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Mode Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              {selectedMode === 'post' && 'Tap to capture photo'}
              {selectedMode === 'story' && 'Hold to record 15s story'}
              {selectedMode === 'reel' && 'Hold to record 30s reel'}
              {selectedMode === 'live' && 'Tap to go live'}
            </Text>
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
    marginBottom: 24,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  topButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 12,
  },
  topCenterControls: {
    flexDirection: 'row',
  },
  activeControl: {
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
  },
  modeSelector: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
  },
  modeScrollContent: {
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  activeModeButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeModeText: {
    color: '#000000',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  galleryPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 15,
  },
  captureButtonContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  recordingButton: {
    borderColor: '#FF0000',
  },
  recordingInner: {
    borderRadius: 8,
    backgroundColor: '#FF0000',
  },
  liveButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF0000',
  },
  liveButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rightControls: {
    alignItems: 'center',
  },
  rightButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 15,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  galleryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  galleryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});