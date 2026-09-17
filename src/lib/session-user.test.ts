import { describe, expect, it } from "vitest";
import { getUserId } from "./session-user";

describe("getUserId", () => {
  it("returns the user id when a session is present", () => {
    expect(getUserId({ user: { id: "user_123" } })).toBe("user_123");
  });

  it("returns null when the session is null", () => {
    expect(getUserId(null)).toBeNull();
  });

  it("returns null when the session is undefined", () => {
    expect(getUserId(undefined)).toBeNull();
  });
});
