/**
 * SAMHSA Treatment Locator client — TypeScript port.
 *
 * Ported from the Python SAMHSA MCP server's `locator_client.py`.
 * Direct HTTP client to findtreatment.gov API — no MCP overhead.
 * See ARD-008, decisions.md #15.
 *
 * Original source: samhsa-treatment-locator-mcp/src/samhsa_treatment_locator_mcp/locator_client.py
 * Uses native `fetch` (Node.js 18+, no additional dependency).
 *
 * @module services/samhsa-locator
 */

import type { Facility } from "../types";

// ---------------------------------------------------------------------------
// Constants (ported from locator_client.py)
// ---------------------------------------------------------------------------

const BASE_URL = "https://findtreatment.gov/locator/listing";

/** Map user-friendly service types to SAMHSA API sType values. */
export const SERVICE_TYPE_MAP: Record<string, string> = {
  substance_abuse: "SA",
  mental_health: "MH",
  both: "BOTH",
} as const;

/** Map user-friendly service names to SAMHSA filter parameter keys. */
export const SERVICE_FILTER_MAP: Record<string, string> = {
  detox: "sF1",
  hospital_inpatient: "sF2",
  residential: "sF3",
  partial_hospitalization: "sF4",
  outpatient: "sF5",
  intensive_outpatient: "sF6",
  telehealth: "sTlHlth",
} as const;

/** Map payment type names to SAMHSA filter parameter keys. */
export const PAYMENT_FILTER_MAP: Record<string, string> = {
  medicaid: "sPay1",
  medicare: "sPay2",
  state_funded: "sPay3",
  sliding_scale: "sPay4",
  free: "sPay5",
  private_insurance: "sPay6",
  military: "sPay7",
  ihs_tribal: "sPay8",
} as const;

/** MAT medication filter keys. */
export const MAT_FILTER_MAP: Record<string, string[]> = {
  buprenorphine: ["sMat1"],
  methadone: ["sMat2"],
  naltrexone: ["sMat3"],
  any: ["sMat1", "sMat2", "sMat3"],
} as const;

export const SAMHSA_HELPLINE =
  "For immediate help, call SAMHSA's National Helpline at 1-800-662-4357 (free, confidential, 24/7).";

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

interface FindFacilitiesOptions {
  /** Street address or ZIP code to search near. */
  address: string;
  /** One of "substance_abuse", "mental_health", or "both". */
  serviceType?: string;
  /** Additional SAMHSA filter parameters. */
  filters?: Record<string, string | number>;
  /** Maximum number of facilities to return. */
  maxResults?: number;
  /** Search radius in miles. */
  radiusMiles?: number;
}

/**
 * Parse a raw facility object from the SAMHSA API into a typed Facility.
 */
function parseFacility(raw: Record<string, unknown>): Facility {
  const nameParts = [raw.name1 ?? "", raw.name2 ?? ""].filter(Boolean);
  const name = (nameParts as string[]).join(" - ").trim();

  const addressParts = [raw.street1 ?? "", raw.street2 ?? ""].filter(Boolean);
  const address = (addressParts as string[]).join(", ").trim();

  return {
    name,
    address,
    city: (raw.city as string) ?? "",
    state: (raw.state as string) ?? "",
    zip: (raw.zip as string) ?? "",
    phone: (raw.phone as string) ?? "",
    website: (raw.website as string) ?? "",
    latitude: (raw.latitude as number) ?? null,
    longitude: (raw.longitude as number) ?? null,
    services: (raw.services as string[]) ?? [],
    payment: (raw.payment as string[]) ?? [],
    specialPrograms: (raw.specialPrograms as string[]) ?? [],
    languages: (raw.languages as string[]) ?? [],
    facilityType: (raw.typeCode as string) ?? "",
  };
}

/**
 * Fetch treatment facilities from the SAMHSA findtreatment.gov API.
 * Paginates automatically until maxResults facilities are collected.
 *
 * @param options - Search parameters
 * @returns Array of typed Facility objects
 * @throws Error if the API is unreachable (caller should handle gracefully)
 */
export async function findFacilities(
  options: FindFacilitiesOptions
): Promise<Facility[]> {
  const {
    address,
    serviceType = "both",
    filters = {},
    maxResults = 10,
    radiusMiles = 25,
  } = options;

  const sType = SERVICE_TYPE_MAP[serviceType.toLowerCase()] ?? "BOTH";
  const pageSize = Math.min(maxResults, 50);
  const collected: Facility[] = [];
  let page = 1;

  const baseParams: Record<string, string> = {
    sAddr: address,
    sType: sType,
    pageSize: String(pageSize),
    sRadius: String(radiusMiles),
  };

  // Merge in any additional filters
  for (const [key, value] of Object.entries(filters)) {
    baseParams[key] = String(value);
  }

  while (collected.length < maxResults) {
    const params = new URLSearchParams({
      ...baseParams,
      page: String(page),
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(15_000), // 15s timeout, matching Python client
    });

    if (!response.ok) {
      throw new Error(
        `SAMHSA API returned ${response.status}: ${response.statusText}`
      );
    }

    const data: unknown = await response.json();

    // The API may return a dict with rows/results key or a bare list
    let rows: Record<string, unknown>[];
    if (Array.isArray(data)) {
      rows = data as Record<string, unknown>[];
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      rows = (obj.rows ?? obj.results ?? []) as Record<string, unknown>[];
    } else {
      rows = [];
    }

    if (rows.length === 0) break;

    for (const row of rows) {
      if (collected.length >= maxResults) break;
      collected.push(parseFacility(row));
    }

    if (rows.length < pageSize) break;
    page++;
  }

  return collected;
}

// ---------------------------------------------------------------------------
// Convenience Functions (matching MCP tool equivalents)
// ---------------------------------------------------------------------------

/**
 * Find MAT (Medication-Assisted Treatment) providers.
 */
export async function findMATProviders(
  address: string,
  medication: string = "any",
  maxResults: number = 10
): Promise<Facility[]> {
  const matKeys = MAT_FILTER_MAP[medication.toLowerCase()] ?? MAT_FILTER_MAP.any;
  const filters: Record<string, string> = {};
  for (const key of matKeys) {
    filters[key] = "1";
  }

  return findFacilities({
    address,
    serviceType: "substance_abuse",
    filters,
    maxResults,
  });
}

/**
 * Find crisis and emergency behavioral health services.
 */
export async function findCrisisServices(
  address: string,
  maxResults: number = 5
): Promise<Facility[]> {
  return findFacilities({
    address,
    serviceType: "both",
    filters: { [SERVICE_FILTER_MAP.hospital_inpatient]: "1" },
    maxResults,
  });
}
