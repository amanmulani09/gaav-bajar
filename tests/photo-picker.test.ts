import { beforeEach, expect, it, vi } from "vitest";

const picker = vi.hoisted(() => ({
  platform: { OS: "web" },
  camera: vi.fn(),
  gallery: vi.fn(),
  permission: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: picker.platform }));
vi.mock("expo-image-picker", () => ({
  launchCameraAsync: picker.camera,
  launchImageLibraryAsync: picker.gallery,
  requestCameraPermissionsAsync: picker.permission,
  CameraType: { back: "back" },
}));
import { pickListingPhoto } from "../src/core/marketplace/photo-picker";

beforeEach(() => {
  vi.resetAllMocks();
  picker.platform.OS = "web";
});

it("opens the web rear-camera picker synchronously within the user gesture", async () => {
  const result = { canceled: false, assets: [{ uri: "camera.jpg" }] };
  picker.camera.mockResolvedValue(result);
  const pending = pickListingPhoto("camera");
  expect(picker.camera).toHaveBeenCalledWith({ mediaTypes: ["images"], quality: 1, cameraType: "back" });
  expect(picker.permission).not.toHaveBeenCalled();
  expect(await pending).toBe(result);
});

it("requests native permission before opening the camera", async () => {
  picker.platform.OS = "android";
  picker.permission.mockResolvedValue({ granted: true });
  const pending = pickListingPhoto("camera");
  expect(picker.camera).not.toHaveBeenCalled();
  await pending;
  expect(picker.camera).toHaveBeenCalledOnce();
});

it("keeps gallery usable when camera permission is denied", async () => {
  picker.platform.OS = "android";
  picker.permission.mockResolvedValue({ granted: false });
  await expect(pickListingPhoto("camera")).rejects.toThrow("cameraPermissionRequired");
  expect(picker.camera).not.toHaveBeenCalled();
  await pickListingPhoto("gallery");
  expect(picker.gallery).toHaveBeenCalledWith({ mediaTypes: ["images"], quality: 1 });
  expect(picker.permission).toHaveBeenCalledOnce();
});

it("returns cancellation unchanged so the draft is not modified", async () => {
  const result = { canceled: true, assets: null };
  picker.camera.mockResolvedValue(result);
  expect(await pickListingPhoto("camera")).toBe(result);
});
