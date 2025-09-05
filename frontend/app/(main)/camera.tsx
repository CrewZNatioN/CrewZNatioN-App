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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getCameraPermissions();
    fetchVehicles();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/vehicles`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.slice(0, 20)); // Limit to first 20 vehicles
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
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
          // Apply basic editing/filters
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [
              { resize: { width: 1080 } }, // Resize for consistency
            ],
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
          vehicle_id: selectedVehicle,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Post uploaded successfully!', [
          { text: 'OK', onPress: () => {
            setCapturedImage(null);
            setCaption('');
            setSelectedVehicle(null);
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
          <Ionicons name="camera-off" size={80} color="#9CA3AF" />
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
            {/* Header */}
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

            {/* Bottom Controls */}
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
      <LinearGradient
        colors={['#1E3A8A', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Share Your Ride</Text>
      </LinearGradient>

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
                <Ionicons name="camera" size={20} color="#3B82F6" />
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
              <LinearGradient
                colors={['#FCD34D', '#F59E0B']}
                style={styles.captureOptionGradient}
              >
                <Ionicons name="camera" size={40} color="#1E3A8A" />
                <Text style={styles.captureOptionText}>Take Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureOption}
              onPress={pickImageFromGallery}
            >
              <LinearGradient
                colors={['#3B82F6', '#1E3A8A']}
                style={styles.captureOptionGradient}
              >
                <Ionicons name="images" size={40} color="#FFFFFF" />
                <Text style={styles.captureOptionTextWhite}>Choose from Gallery</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption Input */}
        <View style={styles.captionSection}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Share something about your ride..."
            placeholderTextColor="#9CA3AF"
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
          <LinearGradient
            colors={
              capturedImage && caption.trim() && !uploading
                ? ['#FCD34D', '#F59E0B']
                : ['#9CA3AF', '#6B7280']
            }
            style={styles.uploadButtonGradient}
          >
            <Text style={styles.uploadButtonText}>
              {uploading ? 'Uploading...' : 'Share Post'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
  },
  permissionSubText: {
    fontSize: 14,
    color: '#6B7280',
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
    borderColor: '#FCD34D',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FCD34D',
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
  captureOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
  },
  captureOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginLeft: 12,
  },
  captureOptionTextWhite: {
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  captionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  captionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  vehicleSection: {
    marginBottom: 32,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  vehicleCardSelected: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  vehicleCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  vehicleCardBrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  vehicleCardModel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  uploadButton: {
    marginBottom: 40,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  galleryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  galleryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});