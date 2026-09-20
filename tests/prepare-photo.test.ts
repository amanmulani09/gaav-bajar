import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ manipulate: vi.fn(), os: "web", fileSize: 100 }));
vi.mock("react-native", () => ({ Platform: { get OS() { return mocks.os; } } }));
vi.mock("expo-file-system", () => ({ File: class { size = mocks.fileSize; } }));
vi.mock("expo-image-manipulator", () => ({ manipulateAsync: mocks.manipulate, SaveFormat: { JPEG: "jpeg" } }));
import { prepareListingPhoto } from "../src/core/marketplace/prepare-photo";
const asset = { uri: "blob:photo", width: 4000, height: 3000, fileSize: 10 * 1024 * 1024 };
beforeEach(() => {
  mocks.os = "web";
  mocks.manipulate.mockReset().mockResolvedValue({ uri: "converted.jpg", base64: "AAAA" });
});
it.each(["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif", "image/gif", "image/svg+xml"])("allows a decodable %s image at exactly 10 MiB", async (mimeType) => {
  await expect(prepareListingPhoto({ ...asset, mimeType })).resolves.toHaveProperty("uri", "converted.jpg");
});
it("rejects inputs above 10 MiB before conversion", async () => {
  await expect(prepareListingPhoto({ ...asset, fileSize: asset.fileSize + 1 })).rejects.toThrow("photoTooLarge");
  expect(mocks.manipulate).not.toHaveBeenCalled();
});
it("uses original web File size before picker metadata", async () => {
  await expect(prepareListingPhoto({ ...asset, file: { size: asset.fileSize + 1 } as File })).rejects.toThrow("photoTooLarge");
});
it("checks native file size when picker metadata is absent", async () => {
  mocks.os = "android";
  await expect(prepareListingPhoto({ ...asset, fileSize: undefined })).resolves.toHaveProperty("base64");
});
it("keeps optimizing large outputs instead of rejecting valid inputs after two attempts", async () => {
  const large = { base64: "A".repeat(600000) };
  mocks.manipulate.mockResolvedValueOnce(large).mockResolvedValueOnce(large);
  await expect(prepareListingPhoto(asset)).resolves.toHaveProperty("base64", "AAAA");
  expect(mocks.manipulate).toHaveBeenCalledTimes(3);
  expect(mocks.manipulate.mock.calls[2][1]).toEqual([{ resize: { width: 300 } }]);
});
it("reports decoder failures", async () => {
  mocks.manipulate.mockRejectedValue(new Error("decoder failed"));
  await expect(prepareListingPhoto(asset)).rejects.toThrow("photoInvalid");
});
