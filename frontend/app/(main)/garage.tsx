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
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  engine?: string;
  horsepower?: number;
  image?: string;
  isOwned?: boolean;
}

interface UserGarageVehicle extends Vehicle {
  notes?: string;
  dateAdded: string;
  media?: MediaItem[];
}

interface MediaItem {
  id: string;
  image: string;
  media_type: string;
  caption: string;
  created_at: string;
}

export default function GarageScreen() {
  const [userVehicles, setUserVehicles] = useState<UserGarageVehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [username, setUsername] = useState<string>('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedGarageVehicle, setSelectedGarageVehicle] = useState<UserGarageVehicle | null>(null);
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const pickImage = async (type: 'camera' | 'library') => {
    try {
      let result;
      
      if (type === 'camera') {
        // Request camera permissions
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
          base64: true,
        });
      } else {
        // Request library permissions
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'Photo library permission is required to select photos');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.cancelled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Process the image
        let manipulatedImage;
        if (asset.type === 'image') {
          manipulatedImage = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 800 } }],
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );
        }

        // Update the vehicle with the photo/video - ADD to existing media
        if (selectedGarageVehicle && (asset.base64 || manipulatedImage?.base64)) {
          await addVehiclePhoto(
            selectedGarageVehicle.id, 
            manipulatedImage?.base64 || asset.base64,
            asset.type,
            photoCaption
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process media');
      console.error('Media picking error:', error);
    }
  };

  const addVehiclePhoto = async (vehicleId: string, mediaBase64: string, mediaType: string, caption: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/garage/${vehicleId}/photo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: mediaBase64,
          media_type: mediaType,
          caption: caption,
        }),
      });

      if (response.ok) {
        // Refresh garage to show updated photo
        fetchUserGarage();
        setPhotoCaption(''); // Reset caption
        Alert.alert('Success', 'Photo added successfully!');
      } else {
        Alert.alert('Error', 'Failed to add photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
      console.error('Add photo error:', error);
    }
  };

  const deleteVehiclePhoto = async (vehicleId: string, mediaId: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/garage/${vehicleId}/photo/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh garage
        fetchUserGarage();
        Alert.alert('Success', 'Photo deleted successfully!');
      } else {
        Alert.alert('Error', 'Failed to delete photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
      console.error('Delete photo error:', error);
    }
  };

  const openPhotoModal = (vehicle: UserGarageVehicle) => {
    setSelectedGarageVehicle(vehicle);
    setPhotoCaption(''); // Reset caption when opening modal
    setShowPhotoModal(true);
  };

  const openMediaViewer = (vehicle: UserGarageVehicle, startIndex: number = 0) => {
    setSelectedGarageVehicle(vehicle);
    setSelectedMediaIndex(startIndex);
    setShowMediaViewer(true);
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUsername(userData.username);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserGarage = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/garage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserVehicles(data);
      }
    } catch (error) {
      console.error('Error fetching user garage:', error);
    }
  };

  const fetchAllVehicles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/vehicles`);
      if (response.ok) {
        const data = await response.json();
        setAllVehicles(data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchUserGarage();
    fetchAllVehicles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
    fetchUserGarage();
    fetchAllVehicles();
  };

  const addVehicleToGarage = async (vehicle: Vehicle, notes?: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/garage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          notes: notes || '',
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Vehicle added to your garage!');
        fetchUserGarage();
        setShowAddModal(false);
        setSelectedVehicle(null);
      } else {
        Alert.alert('Error', 'Failed to add vehicle to garage');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const removeVehicleFromGarage = async (vehicleId: string) => {
    Alert.alert(
      'Remove Vehicle',
      'Are you sure you want to remove this vehicle from your garage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              const response = await fetch(`${BACKEND_URL}/api/garage/${vehicleId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                fetchUserGarage();
              } else {
                Alert.alert('Error', 'Failed to remove vehicle');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const filteredVehicles = allVehicles.filter(vehicle =>
    `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserVehicle = ({ item }: { item: UserGarageVehicle }) => (
    <TouchableOpacity style={styles.vehicleCard}>
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={styles.vehicleCardGradient}
      >
        {item.image && (
          <Image 
            source={{ uri: `data:image/jpeg;base64,${item.image}` }}
            style={styles.vehicleImage}
          />
        )}
        
        <View style={styles.vehicleDetails}>
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleMake}>{item.make}</Text>
              <Text style={styles.vehicleModel}>{item.model} {item.year}</Text>
              <Text style={styles.vehicleType}>{item.type}</Text>
            </View>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeVehicleFromGarage(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {item.engine && (
            <View style={styles.specRow}>
              <Ionicons name="hardware-chip-outline" size={16} color="#6B7280" />
              <Text style={styles.specText}>{item.engine}</Text>
            </View>
          )}

          {item.horsepower && (
            <View style={styles.specRow}>
              <Ionicons name="flash-outline" size={16} color="#6B7280" />
              <Text style={styles.specText}>{item.horsepower} HP</Text>
            </View>
          )}

          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Notes:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          <Text style={styles.dateAdded}>
            Added {new Date(item.dateAdded).toLocaleDateString()}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
  const renderGarageVehicle = ({ item }: { item: UserGarageVehicle }) => (
    <TouchableOpacity 
      style={styles.garageVehicleCard}
      onPress={() => item.media && item.media.length > 0 ? openMediaViewer(item, 0) : null}
    >
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']}
        style={styles.garageVehicleGradient}
      >
        {/* Vehicle Image with Garage Lighting Effect - MULTIPLE PHOTOS SUPPORT */}
        <View style={styles.vehicleImageContainer}>
          {item.media && item.media.length > 0 ? (
            <>
              <Image 
                source={{ uri: `data:image/jpeg;base64,${item.media[0].image}` }}
                style={styles.garageVehicleImage}
              />
              {/* Photo counter badge */}
              {item.media.length > 1 && (
                <View style={styles.photoCounter}>
                  <Ionicons name="images" size={12} color="#FFFFFF" />
                  <Text style={styles.photoCountText}>{item.media.length}</Text>
                </View>
              )}
              {/* Caption preview */}
              {item.media[0].caption && (
                <View style={styles.captionPreview}>
                  <Text style={styles.captionPreviewText} numberOfLines={1}>
                    {item.media[0].caption}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderVehicle}>
              <Ionicons name="car-sport" size={40} color="#FFD700" />
              <Text style={styles.placeholderText}>Add Photos</Text>
            </View>
          )}
        </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.vehicleImageOverlay}
          />
        </View>
        
        {/* Vehicle Info with Garage Theme */}
        <View style={styles.garageVehicleInfo}>
          <Text style={styles.garageVehicleMake}>{item.make}</Text>
          <Text style={styles.garageVehicleModel}>{item.model}</Text>
          <Text style={styles.garageVehicleYear}>{item.year}</Text>
          
          {/* Performance Badge */}
          {item.horsepower && (
            <View style={styles.performanceBadge}>
              <Ionicons name="flash" size={12} color="#000000" />
              <Text style={styles.performanceText}>{item.horsepower}HP</Text>
            </View>
          )}
        </View>
        
        {/* Garage Actions */}
        <View style={styles.garageActions}>
          <TouchableOpacity 
            style={styles.garageActionButton}
            onPress={() => openPhotoModal(item)}
          >
            <Ionicons name="camera" size={16} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.garageActionButton}
            onPress={() => removeVehicleFromGarage(item.id)}
          >
            <Ionicons name="build" size={16} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
  const renderAvailableVehicle = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity 
      style={styles.availableVehicleCard}
      onPress={() => setSelectedVehicle(item)}
    >
      <View style={styles.availableVehicleInfo}>
        <Text style={styles.availableVehicleMake}>{item.make}</Text>
        <Text style={styles.availableVehicleModel}>{item.model} {item.year}</Text>
        <Text style={styles.availableVehicleType}>{item.type}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#1E3A8A" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1E3A8A', '#3B82F6']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>My Garage</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your garage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Garage Header with Tools */}
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']}
        style={styles.garageHeader}
      >
        <View style={styles.garageTools}>
          <Text style={styles.garageTitle}>MY GARAGE</Text>
        </View>
        
        {/* Username centered under garage title */}
        <View style={styles.usernameSection}>
          <Text style={styles.usernameText}>{username ? `@${username}` : "@username"}</Text>
        </View>
      </LinearGradient>

      {userVehicles.length === 0 ? (
        <View style={styles.emptyGarage}>
          {/* Empty Garage Illustration */}
          <View style={styles.emptyGarageIllustration}>
            <View style={styles.garageFloor} />
            <View style={styles.garageDoor}>
              <View style={styles.garageDoorHandle} />
            </View>
            <View style={styles.garageRoof} />
            <Ionicons name="car-sport-outline" size={80} color="#333333" style={styles.emptyCar} />
          </View>
          
          <Text style={styles.emptyTitle}>Your Garage is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Start building your dream collection!
          </Text>
          
          <TouchableOpacity 
            style={styles.addFirstVehicleButton}
            onPress={() => setShowAddModal(true)}
          >
            <LinearGradient
              colors={['#FFD700', '#F59E0B']}
              style={styles.addFirstVehicleGradient}
            >
              <Ionicons name="add-circle" size={24} color="#000000" />
              <Text style={styles.addFirstVehicleText}>Add Your Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.garageFloorContainer}>
          {/* Garage Floor Pattern */}
          <View style={styles.floorPattern} />
          
          <FlatList
            data={userVehicles}
            renderItem={renderGarageVehicle}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#FFD700"
              />
            }
            contentContainerStyle={styles.vehicleGrid}
            numColumns={2}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
      {/* Add Vehicle Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Vehicle to Garage</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a vehicle..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <FlatList
            data={filteredVehicles}
            renderItem={renderAvailableVehicle}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.availableVehiclesList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

      {/* Vehicle Details Modal */}
      <Modal
        visible={selectedVehicle !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedVehicle && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setSelectedVehicle(null)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add to Garage</Text>
                <View style={styles.placeholder} />
              </View>

              <View style={styles.vehicleDetailsModal}>
                <Text style={styles.detailVehicleMake}>{selectedVehicle.make}</Text>
                <Text style={styles.detailVehicleModel}>
                  {selectedVehicle.model} {selectedVehicle.year}
                </Text>
                
                {selectedVehicle.engine && (
                  <Text style={styles.detailSpec}>Engine: {selectedVehicle.engine}</Text>
                )}
                
                {selectedVehicle.horsepower && (
                  <Text style={styles.detailSpec}>Power: {selectedVehicle.horsepower} HP</Text>
                )}

                <TouchableOpacity 
                  style={styles.confirmAddButton}
                  onPress={() => addVehicleToGarage(selectedVehicle)}
                >
                  <LinearGradient
                    colors={['#FCD34D', '#F59E0B']}
                    style={styles.confirmAddGradient}
                  >
                    <Text style={styles.confirmAddText}>Add to My Garage</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Photo Upload Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalContainer}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                Add Photo/Video
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPhotoModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.photoModalSubtitle}>
              {selectedGarageVehicle ? 
                `${selectedGarageVehicle.make} ${selectedGarageVehicle.model} (${selectedGarageVehicle.year})` 
                : 'Vehicle'}
            </Text>

            {/* Caption Input */}
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption... (optional)"
                placeholderTextColor="#666666"
                value={photoCaption}
                onChangeText={setPhotoCaption}
                multiline
                maxLength={200}
              />
              <Text style={styles.captionCounter}>{photoCaption.length}/200</Text>
            </View>

            <View style={styles.photoOptions}>
              <TouchableOpacity 
                style={styles.photoOptionButton}
                onPress={() => pickImage('camera')}
              >
                <LinearGradient
                  colors={['#FFD700', '#F59E0B']}
                  style={styles.photoOptionGradient}
                >
                  <Ionicons name="camera" size={32} color="#000000" />
                  <Text style={styles.photoOptionText}>Take Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoOptionButton}
                onPress={() => pickImage('library')}
              >
                <LinearGradient
                  colors={['#FFD700', '#F59E0B']}
                  style={styles.photoOptionGradient}
                >
                  <Ionicons name="images" size={32} color="#000000" />
                  <Text style={styles.photoOptionText}>Choose from Library</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.photoModalNote}>
              📸 Photos and videos will be displayed on your vehicle card
            </Text>
          </View>
        </View>
      </Modal>

      {/* Media Viewer Modal - FULL SCREEN PHOTO/VIDEO GALLERY */}
      <Modal
        visible={showMediaViewer}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowMediaViewer(false)}
      >
        <View style={styles.mediaViewerContainer}>
          <View style={styles.mediaViewerHeader}>
            <TouchableOpacity 
              onPress={() => setShowMediaViewer(false)}
              style={styles.mediaCloseButton}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaVehicleTitle}>
                {selectedGarageVehicle ? 
                  `${selectedGarageVehicle.make} ${selectedGarageVehicle.model} (${selectedGarageVehicle.year})` 
                  : 'Vehicle'}
              </Text>
              <Text style={styles.mediaCounter}>
                {selectedGarageVehicle?.media ? 
                  `${selectedMediaIndex + 1} of ${selectedGarageVehicle.media.length}` 
                  : ''}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                if (selectedGarageVehicle?.media && selectedGarageVehicle.media[selectedMediaIndex]) {
                  Alert.alert(
                    'Delete Photo',
                    'Are you sure you want to delete this photo?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: () => deleteVehiclePhoto(
                          selectedGarageVehicle.id, 
                          selectedGarageVehicle.media[selectedMediaIndex].id
                        )
                      }
                    ]
                  );
                }
              }}
              style={styles.mediaDeleteButton}
            >
              <Ionicons name="trash" size={24} color="#FF4444" />
            </TouchableOpacity>
          </View>

          {selectedGarageVehicle?.media && selectedGarageVehicle.media.length > 0 && (
            <ScrollView 
              horizontal 
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setSelectedMediaIndex(index);
              }}
              contentOffset={{ x: selectedMediaIndex * width, y: 0 }}
            >
              {selectedGarageVehicle.media.map((media, index) => (
                <View key={media.id} style={styles.mediaSlide}>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${media.image}` }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                  {media.caption && (
                    <View style={styles.fullscreenCaption}>
                      <Text style={styles.fullscreenCaptionText}>
                        {media.caption}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Add more photos button */}
          <TouchableOpacity 
            style={styles.addMorePhotosButton}
            onPress={() => {
              setShowMediaViewer(false);
              setTimeout(() => openPhotoModal(selectedGarageVehicle!), 100);
            }}
          >
            <LinearGradient
              colors={['#FFD700', '#F59E0B']}
              style={styles.addMorePhotosGradient}
            >
              <Ionicons name="camera" size={20} color="#000000" />
              <Text style={styles.addMorePhotosText}>Add More Photos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#FCD34D',
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstVehicleButton: {
    marginTop: 16,
  },
  addFirstVehicleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  addFirstVehicleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginLeft: 8,
  },
  vehiclesList: {
    padding: 16,
  },
  vehicleCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vehicleCardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  vehicleDetails: {
    padding: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleMake: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  vehicleType: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  specText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  notesSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  dateAdded: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  placeholder: {
    width: 24,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  availableVehiclesList: {
    padding: 16,
  },
  availableVehicleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  availableVehicleInfo: {
    flex: 1,
  },
  availableVehicleMake: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  availableVehicleModel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  availableVehicleType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  vehicleDetailsModal: {
    flex: 1,
    padding: 20,
  },
  detailVehicleMake: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  detailVehicleModel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  detailSpec: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  confirmAddButton: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  confirmAddGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmAddText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  // New Garage Theme Styles
  garageHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  garageTools: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  garageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
  },
  addVehicleIcon: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  garageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  usernameSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  userSection: {
    alignItems: 'center',
  },
  usernameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#444444',
  },
  emptyGarage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F5F5',
  },
  emptyGarageIllustration: {
    position: 'relative',
    width: 200,
    height: 120,
    marginBottom: 30,
  },
  garageFloor: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 20,
    backgroundColor: '#CCCCCC',
    borderRadius: 4,
  },
  garageDoor: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 80,
    backgroundColor: '#999999',
    borderRadius: 8,
  },
  garageDoorHandle: {
    position: 'absolute',
    right: 10,
    top: '50%',
    width: 8,
    height: 20,
    backgroundColor: '#666666',
    borderRadius: 4,
  },
  garageRoof: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 30,
    backgroundColor: '#888888',
    borderRadius: 8,
  },
  emptyCar: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  garageFloorContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  floorPattern: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#D0D0D0',
  },
  vehicleGrid: {
    padding: 16,
  },
  garageVehicleCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  garageVehicleGradient: {
    padding: 12,
    minHeight: 180,
  },
  vehicleImageContainer: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  garageVehicleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderVehicle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333333',
  },
  vehicleImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  garageVehicleInfo: {
    flex: 1,
  },
  garageVehicleMake: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  garageVehicleModel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  garageVehicleYear: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 2,
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  performanceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 2,
  },
  garageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  garageActionButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 16,
    padding: 6,
  },
  // New garage tools styles
  toolButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 16,
    padding: 6,
  },
  activeToolButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
  },
  garageToolsPanel: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  toolOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  toolOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  // Photo Modal Styles
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  photoModalSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoOptions: {
    gap: 16,
    marginBottom: 24,
  },
  photoOptionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  photoModalNote: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Caption input styles
  captionContainer: {
    marginBottom: 20,
  },
  captionInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#444444',
  },
  captionCounter: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  // Multiple photos support styles
  photoCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  captionPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  captionPreviewText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  placeholderText: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 4,
    fontWeight: '500',
  },
});
