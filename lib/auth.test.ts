import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { checkPassword, createSession, verifySession } from "./auth";

const SECRET = "test-secret-test-secret-test-secret!";

beforeEach(() => {
  process.env.APP_PASSWORD = "correct horse";
  process.env.SESSION_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.APP_PASSWORD;
  delete process.env.SESSION_SECRET;
});

describe("checkPassword", () => {
  test("accepts the correct password", () => {
    expect(checkPassword("correct horse")).toBe(true);
  });

  test("rejects a wrong password", () => {
    expect(checkPassword("wrong")).toBe(false);
  });

  test("fails closed when APP_PASSWORD is unset, even for an empty input", () => {
    delete process.env.APP_PASSWORD;
    expect(checkPassword("")).toBe(false);
    expect(checkPassword("anything")).toBe(false);
  });

  test("fails closed when APP_PASSWORD is empty", () => {
    process.env.APP_PASSWORD = "";
    expect(checkPassword("")).toBe(false);
  });
});

describe("sessions", () => {
  test("a token from createSession verifies", async () => {
    expect(await verifySession(await createSession())).toBe(true);
  });

  test("a tampered token fails", async () => {
    const token = await createSession();
    const last = token.slice(-1) === "A" ? "B" : "A";
    expect(await verifySession(token.slice(0, -1) + last)).toBe(false);
  });

  test("an expired token fails", async () => {
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(expired)).toBe(false);
  });

  test("a token signed with a different secret fails", async () => {
    const token = await createSession();
    process.env.SESSION_SECRET = "another-secret-another-secret-another!";
    expect(await verifySession(token)).toBe(false);
  });

  test("a missing token fails", async () => {
    expect(await verifySession(undefined)).toBe(false);
  });

  test("with SESSION_SECRET unset, verify is false and create throws", async () => {
    const token = await createSession();
    delete process.env.SESSION_SECRET;
    expect(await verifySession(token)).toBe(false);
    await expect(createSession()).rejects.toThrow();
  });
});
