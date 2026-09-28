import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "../../src/errors/AppError.js";
import { ApiResponse } from "../../src/utils/apiResponse.js";
import type { Response } from "express";

describe("Unit Tests: AppError Hierarchy & ApiResponse", () => {
  describe("AppError Classes", () => {
    it("should instantiate Base AppError with defaults", () => {
      const err = new AppError("Base operational error");
      assert.equal(err.message, "Base operational error");
      assert.equal(err.statusCode, 500);
      assert.equal(err.status, "error");
      assert.equal(err.isOperational, true);
    });

    it("should instantiate BadRequestError with 400 and fail status", () => {
      const details = [{ field: "email", error: "invalid" }];
      const err = new BadRequestError("Invalid payload", details);
      assert.equal(err.statusCode, 400);
      assert.equal(err.status, "fail");
      assert.deepEqual(err.errors, details);
    });

    it("should instantiate UnauthorizedError (401) and ForbiddenError (403)", () => {
      const unauth = new UnauthorizedError("Session expired");
      assert.equal(unauth.statusCode, 401);
      assert.equal(unauth.status, "fail");

      const forbidden = new ForbiddenError("Organizer role required");
      assert.equal(forbidden.statusCode, 403);
      assert.equal(forbidden.status, "fail");
    });

    it("should instantiate NotFoundError (404) and ConflictError (409)", () => {
      const notFound = new NotFoundError("Event not found");
      assert.equal(notFound.statusCode, 404);
      assert.equal(notFound.status, "fail");

      const conflict = new ConflictError("Email already registered");
      assert.equal(conflict.statusCode, 409);
      assert.equal(conflict.status, "fail");
    });

    it("should instantiate InternalServerError with 500 and error status", () => {
      const err = new InternalServerError("Database disk full");
      assert.equal(err.statusCode, 500);
      assert.equal(err.status, "error");
    });
  });

  describe("ApiResponse Formatter", () => {
    const createMockRes = () => {
      const res: Partial<Response> & { statusCodeSent?: number; jsonSent?: unknown } = {};
      res.status = (code: number) => {
        res.statusCodeSent = code;
        return res as Response;
      };
      res.json = (data: unknown) => {
        res.jsonSent = data;
        return res as Response;
      };
      return res as Response & { statusCodeSent?: number; jsonSent?: unknown };
    };

    it("should format ApiResponse.success with HTTP 200 and standard payload", () => {
      const mockRes = createMockRes();
      ApiResponse.success(mockRes, "Operation succeeded", { count: 5 });

      assert.equal(mockRes.statusCodeSent, 200);
      assert.deepEqual(mockRes.jsonSent, {
        success: true,
        message: "Operation succeeded",
        data: { count: 5 },
      });
    });

    it("should format ApiResponse.created with HTTP 201", () => {
      const mockRes = createMockRes();
      ApiResponse.created(mockRes, "Item created", { id: "new-id" });

      assert.equal(mockRes.statusCodeSent, 201);
      assert.deepEqual(mockRes.jsonSent, {
        success: true,
        message: "Item created",
        data: { id: "new-id" },
      });
    });
  });
});
