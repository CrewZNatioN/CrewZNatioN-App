import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-vehicle" options={{ title: 'Add Vehicle', headerBackTitle: 'Back' }} />
        <Stack.Screen name="vehicle-details" options={{ title: 'Vehicle Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="create-post" options={{ title: 'Create Post', headerBackTitle: 'Back' }} />
      </Stack>
      <StatusBar style="light" backgroundColor="#000" />
    </AuthProvider>
  );
}