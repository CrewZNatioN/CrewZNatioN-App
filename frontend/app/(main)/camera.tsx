import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getCameraPermissions();
    fetchUsers();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

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
        setUsers(data.slice(0, 20)); // Limit to first 20 users
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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
          
          setCapturedImage(manipulatedImage.base64);
          setShowCamera(false);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setCapturedImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const uploadPost = async () => {
    if (!capturedImage || !caption.trim()) {
      Alert.alert('Error', 'Please add a photo and caption');
      return;
    }

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: capturedImage,
          caption: caption.trim(),
          tagged_users: taggedUsers,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Post uploaded successfully!', [
          { text: 'OK', onPress: () => {
            setCapturedImage(null);
            setCaption('');
            setTaggedUsers([]);
            setUserSearchQuery('');
            setShowUserSearch(false);
            router.push('/(main)/feed');
          }}
        ]);
      } else {
        Alert.alert('Error', 'Failed to upload post');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUploading(false);
    }
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
            Please enable camera permissions in Settings to take photos
          </Text>
          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={pickImageFromGallery}
          >
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <SafeAreaView style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={type}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.flipButton}
                onPress={() => setType(type === 'back' ? 'front' : 'back')}
              >
                <Ionicons name="camera-reverse" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.galleryIcon}>
                <Ionicons name="images" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
              
              <View style={styles.placeholder} />
            </View>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share Your Ride</Text>
      </View>

      <ScrollView style={styles.content}>
        {capturedImage ? (
          <View style={styles.previewSection}>
            <Image 
              source={{ uri: `data:image/jpeg;base64,${capturedImage}` }}
              style={styles.previewImage}
            />
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setCapturedImage(null)}
              >
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text style={styles.editButtonText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowCamera(true)}
              >
                <Ionicons name="camera" size={20} color="#FFD700" />
                <Text style={styles.editButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.captureSection}>
            <TouchableOpacity 
              style={styles.captureOption}
              onPress={() => setShowCamera(true)}
            >
              <View style={styles.captureOptionContent}>
                <Ionicons name="camera" size={40} color="#FFD700" />
                <Text style={styles.captureOptionText}>Take Photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureOption}
              onPress={pickImageFromGallery}
            >
              <View style={styles.captureOptionContent}>
                <Ionicons name="images" size={40} color="#FFD700" />
                <Text style={styles.captureOptionText}>Choose from Gallery</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption Input */}
        <View style={styles.captionSection}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Share something about your ride..."
            placeholderTextColor="#666666"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
          />
          <Text style={styles.characterCount}>{caption.length}/500</Text>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.vehicleSection}>
          <Text style={styles.sectionTitle}>Tag Your Vehicle (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[
                styles.vehicleCard,
                selectedVehicle === null && styles.vehicleCardSelected
              ]}
              onPress={() => setSelectedVehicle(null)}
            >
              <Text style={styles.vehicleCardText}>No Vehicle</Text>
            </TouchableOpacity>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleCard,
                  selectedVehicle === vehicle.id && styles.vehicleCardSelected
                ]}
                onPress={() => setSelectedVehicle(vehicle.id)}
              >
                <Text style={styles.vehicleCardBrand}>
                  {vehicle.make}
                </Text>
                <Text style={styles.vehicleCardModel}>
                  {vehicle.model} {vehicle.year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Upload Button */}
        <TouchableOpacity 
          style={[
            styles.uploadButton,
            (!capturedImage || !caption.trim() || uploading) && styles.uploadButtonDisabled
          ]}
          onPress={uploadPost}
          disabled={!capturedImage || !caption.trim() || uploading}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : 'Share Post'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
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
  content: {
    flex: 1,
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  galleryIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 15,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
  },
  placeholder: {
    width: 60,
    height: 60,
  },
  captureSection: {
    marginBottom: 24,
  },
  captureOption: {
    marginBottom: 16,
  },
  captureOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  captureOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
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
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  vehicleSection: {
    marginBottom: 32,
  },
  vehicleCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: '#333333',
  },
  vehicleCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#2A2A00',
  },
  vehicleCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'center',
  },
  vehicleCardBrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  vehicleCardModel: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 2,
  },
  uploadButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  uploadButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
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