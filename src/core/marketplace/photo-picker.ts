import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "gallery";

export async function pickListingPhoto(source: PhotoSource) {
  if (source === "gallery") {
    return ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  }
  // Web must open the picker during the click, before any permission awaits.
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("cameraPermissionRequired");
  }
  return ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    cameraType: ImagePicker.CameraType.back,
  });
}
