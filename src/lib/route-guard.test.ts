import { describe, it, expect } from "vitest";
import { shouldRedirectToLogin } from "./route-guard";

describe("shouldRedirectToLogin", () => {
  it("redirects when there is no session cookie", () => {
    expect(shouldRedirectToLogin(undefined)).toBe(true);
  });

  it("redirects when the session cookie is an empty string", () => {
    expect(shouldRedirectToLogin(null)).toBe(true);
  });

  it("does not redirect when a session cookie is present", () => {
    expect(shouldRedirectToLogin("some-cookie-value")).toBe(false);
  });
});
