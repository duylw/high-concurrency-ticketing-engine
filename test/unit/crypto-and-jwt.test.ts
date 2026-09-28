import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { hashToken } from "../../src/utils/crypto.util.js";
import { hashPassword, comparePassword } from "../../src/utils/password.util.js";
import { generateAuthTokens, verifyAccessToken, verifyRefreshToken } from "../../src/utils/jwt.util.js";
import { Role } from "@prisma/client";

describe("Unit Tests: Cryptography & JWT Utilities", () => {
  before(() => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-123456789012345678901234567890";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-123456789012345678901234567890";
  });

  describe("hashToken", () => {
    it("should produce deterministic SHA-256 hex string", () => {
      const token = "sample-plain-refresh-token";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64); // SHA-256 hex length
      assert.match(hash1, /^[0-9a-f]{64}$/);
    });

    it("should throw error when invalid or empty token is passed", () => {
      assert.throws(() => hashToken(""), /Invalid token/);
      // @ts-expect-error test invalid types
      assert.throws(() => hashToken(null), /Invalid token/);
    });
  });

  describe("hashPassword & comparePassword", () => {
    it("should hash a password and correctly verify the original password", async () => {
      const rawPassword = "StrongPassword123!";
      const hashed = await hashPassword(rawPassword);

      assert.notEqual(hashed, rawPassword);
      assert.ok(hashed.startsWith("$2a$") || hashed.startsWith("$2b$"));

      const isMatch = await comparePassword(rawPassword, hashed);
      assert.equal(isMatch, true);

      const isMismatch = await comparePassword("WrongPassword!", hashed);
      assert.equal(isMismatch, false);
    });
  });

  describe("JWT Generation & Verification", () => {
    it("should generate valid token pair and successfully verify payload", () => {
      const user = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        role: "USER" as Role,
      };

      const tokens = generateAuthTokens(user);
      assert.ok(tokens.accessToken);
      assert.ok(tokens.refreshToken);

      const accessPayload = verifyAccessToken(tokens.accessToken) as { id: string; email: string; role: string };
      assert.equal(accessPayload.id, user.id);
      assert.equal(accessPayload.email, user.email);
      assert.equal(accessPayload.role, user.role);

      const refreshPayload = verifyRefreshToken(tokens.refreshToken) as { id: string; jti: string };
      assert.equal(refreshPayload.id, user.id);
      assert.ok(refreshPayload.jti);
    });
  });
});
