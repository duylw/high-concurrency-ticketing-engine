import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateFlashSaleWindow,
  generateTicketCode,
  validateGateAdmission,
  computeAggregatedOrderStatus,
} from "../../src/utils/ticket-domain.util.js";
import { BadRequestError, ConflictError } from "../../src/errors/AppError.js";

describe("Unit Tests: Core Ticketing & Gate Admission Domain Rules (Imported from src/utils/ticket-domain.util.ts)", () => {
  describe("validateFlashSaleWindow()", () => {
    it("should allow ticket holding when event is PUBLISHED and within sale window", () => {
      const now = new Date("2026-09-28T12:00:00Z");
      const event = {
        status: "PUBLISHED",
        saleStartTime: new Date("2026-09-28T10:00:00Z"),
        saleEndTime: new Date("2026-09-28T14:00:00Z"),
      };

      assert.doesNotThrow(() => {
        validateFlashSaleWindow(event, now);
      });
    });

    it("should reject ticket holding with BadRequestError before saleStartTime", () => {
      const now = new Date("2026-09-28T09:59:59Z");
      const event = {
        status: "PUBLISHED",
        saleStartTime: new Date("2026-09-28T10:00:00Z"),
        saleEndTime: new Date("2026-09-28T14:00:00Z"),
      };

      assert.throws(
        () => validateFlashSaleWindow(event, now),
        (err: unknown) => {
          assert.ok(err instanceof BadRequestError);
          assert.match((err as BadRequestError).message, /has not started yet/);
          return true;
        }
      );
    });

    it("should reject ticket holding with BadRequestError past saleEndTime", () => {
      const now = new Date("2026-09-28T14:00:01Z");
      const event = {
        status: "PUBLISHED",
        saleStartTime: new Date("2026-09-28T10:00:00Z"),
        saleEndTime: new Date("2026-09-28T14:00:00Z"),
      };

      assert.throws(
        () => validateFlashSaleWindow(event, now),
        (err: unknown) => {
          assert.ok(err instanceof BadRequestError);
          assert.match((err as BadRequestError).message, /window has closed/);
          return true;
        }
      );
    });

    it("should reject ticket holding with ConflictError when event is CANCELLED or DRAFT", () => {
      assert.throws(
        () => validateFlashSaleWindow({ status: "DRAFT" }),
        (err: unknown) => {
          assert.ok(err instanceof ConflictError);
          assert.match((err as ConflictError).message, /draft/);
          return true;
        }
      );

      assert.throws(
        () => validateFlashSaleWindow({ status: "CANCELLED" }),
        (err: unknown) => {
          assert.ok(err instanceof ConflictError);
          assert.match((err as ConflictError).message, /cancelled/);
          return true;
        }
      );
    });
  });

  describe("generateTicketCode() Itemized Ticket Formatting", () => {
    it("should format ticket codes with standard TKT-YYYYMM-XXXX-Index pattern", () => {
      const orderId = "b91f604c-6d55-4e59-0029-6395c0314b82";
      const fixedDate = new Date("2026-09-28T12:00:00Z");

      const code1 = generateTicketCode(orderId, 1, fixedDate);
      const code2 = generateTicketCode(orderId, 2, fixedDate);

      assert.equal(code1, "TKT-202609-B91F604C-01");
      assert.equal(code2, "TKT-202609-B91F604C-02");
    });
  });

  describe("validateGateAdmission() & Anti-Passback Defense", () => {
    it("should allow entry for valid ISSUED ticket belonging to COMPLETED order", () => {
      const ticket = { status: "ISSUED" };
      assert.doesNotThrow(() => {
        validateGateAdmission(ticket, "COMPLETED");
      });
    });

    it("should block entry with ConflictError alarm if ticket is already CHECKED_IN", () => {
      const ticket = {
        status: "CHECKED_IN",
        checkedInAt: new Date("2026-09-28T10:00:00Z"),
      };

      assert.throws(
        () => validateGateAdmission(ticket, "COMPLETED"),
        (err: unknown) => {
          assert.ok(err instanceof ConflictError);
          assert.match((err as ConflictError).message, /ALREADY been used/);
          return true;
        }
      );
    });

    it("should block entry with BadRequestError if ticket is REVOKED", () => {
      const ticket = { status: "REVOKED" };

      assert.throws(
        () => validateGateAdmission(ticket, "COMPLETED"),
        (err: unknown) => {
          assert.ok(err instanceof BadRequestError);
          assert.match((err as BadRequestError).message, /REVOKED/);
          return true;
        }
      );
    });

    it("should block entry if parent order was CANCELLED or EXPIRED", () => {
      const ticket = { status: "ISSUED" };

      assert.throws(
        () => validateGateAdmission(ticket, "EXPIRED"),
        (err: unknown) => {
          assert.ok(err instanceof BadRequestError);
          assert.match((err as BadRequestError).message, /Only COMPLETED orders/);
          return true;
        }
      );

      assert.throws(
        () => validateGateAdmission(ticket, "CANCELLED"),
        (err: unknown) => {
          assert.ok(err instanceof BadRequestError);
          assert.match((err as BadRequestError).message, /Only COMPLETED orders/);
          return true;
        }
      );
    });
  });

  describe("computeAggregatedOrderStatus() Staggered Arrivals", () => {
    it("should return CHECKED_IN when remaining unchecked tickets is 0", () => {
      assert.equal(computeAggregatedOrderStatus(0), "CHECKED_IN");
    });

    it("should return PARTIALLY_CHECKED_IN when remaining unchecked tickets is greater than 0", () => {
      assert.equal(computeAggregatedOrderStatus(1), "PARTIALLY_CHECKED_IN");
      assert.equal(computeAggregatedOrderStatus(3), "PARTIALLY_CHECKED_IN");
    });
  });
});
