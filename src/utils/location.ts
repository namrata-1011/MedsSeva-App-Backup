import * as Location from 'expo-location';

export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    let location = await Location.getLastKnownPositionAsync({});
    if (!location) {
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
