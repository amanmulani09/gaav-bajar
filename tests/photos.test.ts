import { expect, it } from "vitest";
import { photoResize } from "../src/core/marketplace/photos";

it("bounds the long edge for landscape and tall portrait compression", () => {
  expect(photoResize(4000, 3000, 1200)).toEqual({ width: 1200 });
  expect(photoResize(300, 1200, 800)).toEqual({ height: 800 });
});

it("never enlarges already-small images", () => {
  expect(photoResize(200, 100, 1200)).toEqual({ width: 200 });
  expect(photoResize(100, 200, 800)).toEqual({ height: 200 });
});

it("rejects images the browser could not decode", () => {
  expect(() => photoResize(0, 0, 1200)).toThrow("photoInvalid");
});
