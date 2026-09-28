import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema, refreshTokenSchema } from "../../src/validations/auth.validation.js";
import { holdTicketSchema } from "../../src/validations/ticket.validation.js";
import { orderIdParamSchema, checkInParamSchema } from "../../src/validations/order.validation.js";

describe("Unit Tests: Zod Validation Schemas", () => {
  describe("registerSchema", () => {
    it("should accept valid registration input", () => {
      const input = {
        body: {
          email: "customer@example.com",
          username: "valid_user_123",
          password: "password123",
          name: "Test Customer",
        },
      };
      const result = registerSchema.safeParse(input);
      assert.equal(result.success, true);
    });

    it("should reject invalid email format", () => {
      const input = {
        body: {
          email: "not-an-email",
          username: "valid_user",
          password: "password123",
        },
      };
      const result = registerSchema.safeParse(input);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some((i) => i.path.includes("email")));
      }
    });

    it("should reject usernames shorter than 3 characters or with invalid symbols", () => {
      const shortInput = {
        body: {
          email: "test@example.com",
          username: "ab",
          password: "password123",
        },
      };
      assert.equal(registerSchema.safeParse(shortInput).success, false);

      const symbolInput = {
        body: {
          email: "test@example.com",
          username: "user@name!",
          password: "password123",
        },
      };
      assert.equal(registerSchema.safeParse(symbolInput).success, false);
    });

    it("should reject password shorter than 6 characters", () => {
      const input = {
        body: {
          email: "test@example.com",
          username: "valid_user",
          password: "123",
        },
      };
      const result = registerSchema.safeParse(input);
      assert.equal(result.success, false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login input", () => {
      const input = {
        body: {
          email: "test@example.com",
          password: "anypassword",
        },
      };
      assert.equal(loginSchema.safeParse(input).success, true);
    });

    it("should reject empty password", () => {
      const input = {
        body: {
          email: "test@example.com",
          password: "",
        },
      };
      assert.equal(loginSchema.safeParse(input).success, false);
    });
  });

  describe("refreshTokenSchema", () => {
    it("should accept non-empty refresh token", () => {
      const input = {
        body: {
          refreshToken: "sample-refresh-token-string",
        },
      };
      assert.equal(refreshTokenSchema.safeParse(input).success, true);
    });

    it("should reject missing or empty refresh token", () => {
      assert.equal(refreshTokenSchema.safeParse({ body: { refreshToken: "" } }).success, false);
      assert.equal(refreshTokenSchema.safeParse({ body: {} }).success, false);
    });
  });

  describe("holdTicketSchema", () => {
    it("should accept valid ticket hold input with UUID and valid quantity", () => {
      const input = {
        body: {
          ticketTierId: "123e4567-e89b-12d3-a456-426614174000",
          quantity: 2,
        },
      };
      assert.equal(holdTicketSchema.safeParse(input).success, true);
    });

    it("should reject non-UUID ticketTierId", () => {
      const input = {
        body: {
          ticketTierId: "invalid-uuid",
          quantity: 1,
        },
      };
      assert.equal(holdTicketSchema.safeParse(input).success, false);
    });

    it("should reject zero or negative quantities", () => {
      const input = {
        body: {
          ticketTierId: "123e4567-e89b-12d3-a456-426614174000",
          quantity: 0,
        },
      };
      assert.equal(holdTicketSchema.safeParse(input).success, false);
    });

    it("should reject quantity exceeding maximum limit per order", () => {
      const input = {
        body: {
          ticketTierId: "123e4567-e89b-12d3-a456-426614174000",
          quantity: 99,
        },
      };
      const result = holdTicketSchema.safeParse(input);
      assert.equal(result.success, false);
    });
  });

  describe("orderIdParamSchema & checkInParamSchema", () => {
    it("should accept valid UUID for orderIdParam", () => {
      const input = { params: { id: "123e4567-e89b-12d3-a456-426614174000" } };
      assert.equal(orderIdParamSchema.safeParse(input).success, true);
    });

    it("should accept ticket code or uuid for checkInParam", () => {
      assert.equal(checkInParamSchema.safeParse({ params: { id: "TKT-202609-ABCD-01" } }).success, true);
      assert.equal(checkInParamSchema.safeParse({ params: { id: "123e4567-e89b-12d3-a456-426614174000" } }).success, true);
      assert.equal(checkInParamSchema.safeParse({ params: { id: "   " } }).success, false);
    });
  });
});
