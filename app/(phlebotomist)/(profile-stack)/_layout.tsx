import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../src/theme/theme';

export default function ProfileStackLayout() {
  const router = useRouter();

  const backButton = () => (
    <TouchableOpacity onPress={() => router.navigate('/(phlebotomist)/profile')} style={{ marginLeft: 4 }}>
      <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const commonOptions = {
    headerLeft: backButton,
    headerBackVisible: false,
  };

  return (
    <Stack>
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile', ...commonOptions }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', ...commonOptions }} />
      <Stack.Screen name="availability" options={{ title: 'Availability', ...commonOptions }} />
      <Stack.Screen name="my-branch" options={{ title: 'My Branch', ...commonOptions }} />
      <Stack.Screen name="ratings" options={{ title: 'Ratings', ...commonOptions }} />
      <Stack.Screen name="legal" options={{ title: 'Legal', ...commonOptions }} />
    </Stack>
  );
}
