import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

export type LocalCardImagePickResult =
  | { status: "selected"; uri: string }
  | { status: "cancelled" }
  | { status: "permissionDenied" };

export async function pickAndCopyLocalCardImage(): Promise<LocalCardImagePickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { status: "permissionDenied" };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: ["images"],
    quality: 0.9,
  });

  if (result.canceled || result.assets.length === 0) {
    return { status: "cancelled" };
  }

  return {
    status: "selected",
    uri: copyPickedImageToAppStorage(result.assets[0]),
  };
}

function copyPickedImageToAppStorage(asset: ImagePicker.ImagePickerAsset) {
  const imageDirectory = new Directory(Paths.document, "card-images");
  imageDirectory.create({ idempotent: true, intermediates: true });

  const targetFile = new File(
    imageDirectory,
    `card-image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${getImageExtension(asset)}`,
  );

  new File(asset.uri).copy(targetFile);
  return targetFile.uri;
}

function getImageExtension(asset: ImagePicker.ImagePickerAsset) {
  const fileNameExtension = asset.fileName?.match(/\.[a-z0-9]+$/i)?.[0];
  if (fileNameExtension) {
    return fileNameExtension.toLowerCase();
  }

  if (asset.mimeType === "image/png") return ".png";
  if (asset.mimeType === "image/webp") return ".webp";
  if (asset.mimeType === "image/gif") return ".gif";
  return ".jpg";
}
