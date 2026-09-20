import { expect, it } from "vitest";
import { errorKey } from "../src/core/i18n";

it("does not label programming or server errors as connectivity failures", () => {
  expect(errorKey(new TypeError("Cannot read properties of undefined"))).toBe("unexpectedError");
  expect(errorKey({ code: "42501", message: "permission denied" })).toBe("unexpectedError");
  expect(errorKey(new Error("constructor"))).toBe("unexpectedError");
});

it("distinguishes network, browser storage, expired auth, and domain errors", () => {
  expect(errorKey(new TypeError("Failed to fetch"))).toBe("networkError");
  expect(errorKey({ name: "QuotaExceededError" })).toBe("storageError");
  expect(errorKey({ name: "SecurityError" })).toBe("storageError");
  expect(errorKey({ status: 401 })).toBe("sessionExpired");
  expect(errorKey({ code: "PGRST301" })).toBe("sessionExpired");
  expect(errorKey(new Error("photoInvalid"))).toBe("photoInvalid");
});
