import { Platform } from "react-native";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import { photoResize, validatePhotoSize } from "./photos";

// The input limit is 10 MB. This smaller output budget keeps three local draft
// photos inside Android AsyncStorage's row limit; users do not resize manually.
const draftPhotoBytes = 384 * 1024;

export async function prepareListingPhoto(asset: ImagePickerAsset) {
  const size = asset.file?.size ?? asset.fileSize ?? (Platform.OS === "web"
    ? (await (await fetch(asset.uri)).blob()).size
    : new File(asset.uri).size);
  validatePhotoSize(size);
  let edge = 1200;
  for (;;) {
    const photo = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: photoResize(asset.width, asset.height, edge) }],
      { compress: edge === 1200 ? 0.65 : 0.4, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    ).catch(() => { throw new Error("photoInvalid"); });
    if (!photo.base64) throw new Error("photoInvalid");
    if (photo.base64.length * 0.75 <= draftPhotoBytes) return photo;
    if (edge === 1) throw new Error("photoInvalid");
    edge = Math.max(1, Math.floor(edge / 2));
  }
}
