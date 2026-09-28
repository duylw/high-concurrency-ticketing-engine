import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateQrSvg } from "../../client/src/utils/qrcode.js";

describe("Unit Tests: ISO-18004 Vector SVG QR Code Generator", () => {
  it("should generate a valid SVG element string for plain text payload", () => {
    const payload = "TKT-202609-XYZ123-01";
    const svg = generateQrSvg(payload, 250);

    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.endsWith("</svg>"));
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes('width="250"'));
    assert.ok(svg.includes('height="250"'));
    assert.ok(svg.includes("<path"));
  });

  it("should generate valid SVG for structured JSON object payload", () => {
    const payload = {
      ticketCode: "TKT-202609-VIP888-02",
      orderId: "123e4567-e89b-12d3-a456-426614174000",
      tier: "VIP",
    };
    const svg = generateQrSvg(payload);

    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("viewBox="));
  });

  it("should gracefully handle empty or null payload without crashing", () => {
    // @ts-expect-error test edge case
    const svg = generateQrSvg(null);
    assert.ok(typeof svg === "string");
  });
});
