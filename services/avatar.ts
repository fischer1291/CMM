import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { apiFetch } from '../utils/api';

/**
 * Let the user take or choose a square photo. Returns the local URI, or null
 * if they cancelled or denied access.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const source = await new Promise<'camera' | 'library' | null>((resolve) => {
    const options = ['Foto aufnehmen', 'Aus Galerie wählen', 'Abbrechen'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (i) =>
        resolve(i === 0 ? 'camera' : i === 1 ? 'library' : null)
      );
    } else {
      Alert.alert('Profilbild', undefined, [
        { text: options[0], onPress: () => resolve('camera') },
        { text: options[1], onPress: () => resolve('library') },
        { text: options[2], style: 'cancel', onPress: () => resolve(null) },
      ]);
    }
  });
  if (!source) return null;

  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Zugriff benötigt',
      source === 'camera'
        ? 'Erlaube den Kamerazugriff in den Einstellungen, um ein Foto aufzunehmen.'
        : 'Erlaube den Zugriff auf deine Fotos in den Einstellungen.'
    );
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [1, 1], quality: 0.7 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  return !result.canceled && result.assets[0] ? result.assets[0].uri : null;
}

/**
 * Upload a local image as the user's avatar; returns the hosted URL or null.
 * No Content-Type header: fetch sets multipart/form-data with the boundary.
 */
export async function uploadAvatar(imageUri: string, userPhone: string | null): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('avatar', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
    // Only read by backends without token auth
    if (userPhone) formData.append('phone', userPhone);

    const response = await apiFetch('/upload/avatar', { method: 'POST', body: formData }, 20000);
    const data = await response.json();
    return data.success && data.avatarUrl ? data.avatarUrl : null;
  } catch (error) {
    console.error('Avatar upload error:', error);
    return null;
  }
}
