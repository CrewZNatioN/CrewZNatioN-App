import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import axios from 'axios';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  color?: string;
  description?: string;
  images: string[];
  modifications?: string;
  created_at: string;
}

export default function GarageScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vehicles/my`);
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load your vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleAddVehicle = () => {
    Alert.alert(
      'Add Vehicle',
      'Vehicle creation form will be implemented next!',
      [{ text: 'OK' }]
    );
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Edit Vehicle',
      `Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => console.log('Edit vehicle:', vehicle.id) }
      ]
    );
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'car':
        return 'car';
      case 'motorcycle':
        return 'bicycle';
      case 'truck':
        return 'bus';
      default:
        return 'car';
    }
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <TouchableOpacity
      key={vehicle.id}
      style={styles.vehicleCard}
      onPress={() => handleEditVehicle(vehicle)}
    >
      <View style={styles.vehicleImageContainer}>
        {vehicle.images.length > 0 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${vehicle.images[0]}` }}
            style={styles.vehicleImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons 
              name={getVehicleTypeIcon(vehicle.type)} 
              size={40} 
              color={Colors.textMuted} 
            />
          </View>
        )}
        <View style={styles.vehicleTypeIndicator}>
          <Ionicons 
            name={getVehicleTypeIcon(vehicle.type)} 
            size={16} 
            color={Colors.primary} 
          />
        </View>
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Text>
        
        {vehicle.color && (
          <View style={styles.vehicleDetail}>
            <Ionicons name="color-palette" size={14} color={Colors.textMuted} />
            <Text style={styles.vehicleDetailText}>{vehicle.color}</Text>
          </View>
        )}

        {vehicle.modifications && (
          <View style={styles.vehicleDetail}>
            <Ionicons name="build" size={14} color={Colors.secondary} />
            <Text style={styles.vehicleDetailText} numberOfLines={1}>
              {vehicle.modifications}
            </Text>
          </View>
        )}

        {vehicle.description && (
          <Text style={styles.vehicleDescription} numberOfLines={2}>
            {vehicle.description}
          </Text>
        )}

        <View style={styles.vehicleFooter}>
          <Text style={styles.vehicleType}>{vehicle.type.toUpperCase()}</Text>
          {vehicle.images.length > 0 && (
            <View style={styles.imageCount}>
              <Ionicons name="images" size={12} color={Colors.textMuted} />
              <Text style={styles.imageCountText}>{vehicle.images.length}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your garage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Garage</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-sport-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Your Garage is Empty</Text>
            <Text style={styles.emptyDescription}>
              Add your first vehicle to start building your collection and sharing with the community!
            </Text>
            <TouchableOpacity style={styles.addFirstVehicleButton} onPress={handleAddVehicle}>
              <Ionicons name="add-circle" size={20} color={Colors.text} />
              <Text style={styles.addFirstVehicleText}>Add Your First Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vehiclesContainer}>
            <View style={styles.garageStats}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{vehicles.length}</Text>
                <Text style={styles.statLabel}>Vehicles</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {vehicles.filter(v => v.type === 'car').length}
                </Text>
                <Text style={styles.statLabel}>Cars</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {vehicles.filter(v => v.type === 'motorcycle').length}
                </Text>
                <Text style={styles.statLabel}>Bikes</Text>
              </View>
            </View>

            <View style={styles.vehiclesList}>
              {vehicles.map(renderVehicleCard)}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  vehiclesContainer: {
    padding: 16,
  },
  garageStats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  vehiclesList: {
    gap: 16,
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleImageContainer: {
    position: 'relative',
  },
  vehicleImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.card,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleTypeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleInfo: {
    flex: 1,
    padding: 16,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  vehicleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  vehicleDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  vehicleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  vehicleType: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  imageCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addFirstVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addFirstVehicleText: {
    color: Colors.text,
    fontWeight: '600',
    marginLeft: 8,
  },
});
