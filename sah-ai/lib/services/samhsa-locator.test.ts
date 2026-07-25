/**
 * Tests for SAMHSA Treatment Locator Service — samhsa-locator.ts
 *
 * @module services/samhsa-locator.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { findFacilities, SERVICE_TYPE_MAP, SERVICE_FILTER_MAP } from "./samhsa-locator";

global.fetch = vi.fn();

describe("findFacilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports SERVICE_TYPE_MAP with SA, MH, and BOTH", () => {
    expect(SERVICE_TYPE_MAP.substance_abuse).toBe("SA");
    expect(SERVICE_TYPE_MAP.mental_health).toBe("MH");
    expect(SERVICE_TYPE_MAP.both).toBe("BOTH");
  });

  it("exports SERVICE_FILTER_MAP with detox and outpatient filters", () => {
    expect(SERVICE_FILTER_MAP.detox).toBe("sF1");
    expect(SERVICE_FILTER_MAP.outpatient).toBe("sF5");
  });

  it("returns parsed facilities when SAMHSA API responds with valid JSON array", async () => {
    const mockApiResponse = {
      rows: [
        {
          name1: "Hope Recovery Center",
          street1: "123 Main St",
          city: "Los Angeles",
          state: "CA",
          zip: "90001",
          phone: "555-0199",
          services: ["MAT", "Outpatient"],
          latitude: 34.05,
          longitude: -118.25,
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await findFacilities({ address: "90001" });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Hope Recovery Center");
    expect(result[0].phone).toBe("555-0199");
    expect(result[0].state).toBe("CA");
  });

  it("throws error on network failure for caller handling", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network timeout")
    );

    await expect(findFacilities({ address: "90001" })).rejects.toThrow(
      "Network timeout"
    );
  });
});
