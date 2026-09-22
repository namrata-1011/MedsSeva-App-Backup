import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** iOS requires photo library permission; Android uses the system photo picker. */
export async function ensurePhotosPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return true;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}
