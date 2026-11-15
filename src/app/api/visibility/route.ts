import { NextResponse } from "next/server";
import { calculateGeometricVisibility } from "@/lib/server/visibility";
import { InsufficientDemCoverageError } from "@/lib/server/lola-horizon";

export const runtime = "nodejs";

interface VisibilityRequest {
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  startUtc: string;
  durationHours: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequest(value: unknown): VisibilityRequest | null {
  if (!isRecord(value) || !isRecord(value.location)) {
    return null;
  }
  const { location, startUtc, durationHours } = value;
  const { id, name, latitude, longitude } = location;

  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > 100 ||
    typeof name !== "string" ||
    name.length === 0 ||
    name.length > 120 ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > -75 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 360 ||
    typeof startUtc !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(startUtc) ||
    !Number.isFinite(Date.parse(startUtc)) ||
    typeof durationHours !== "number" ||
    !Number.isInteger(durationHours) ||
    durationHours < 1 ||
    durationHours > 48
  ) {
    return null;
  }

  return {
    location: { id, name, latitude, longitude },
    startUtc,
    durationHours,
  };
}

function errorResponse(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 8_192) {
    return errorResponse("request_too_large", "Request body exceeds 8 KB.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400);
  }

  const parsed = parseRequest(body);
  if (!parsed) {
    return errorResponse(
      "invalid_request",
      "Provide a south-polar site, a UTC start timestamp, and a duration from 1 to 48 hours.",
      400
    );
  }

  try {
    const result = await calculateGeometricVisibility(
      parsed.location,
      new Date(parsed.startUtc),
      parsed.durationHours
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InsufficientDemCoverageError) {
      return errorResponse("insufficient_dem_coverage", error.message, 422);
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return errorResponse(
        "upstream_timeout",
        "A required NASA data service timed out. No visibility result was calculated.",
        504
      );
    }

    if (error instanceof Error) {
      return errorResponse("visibility_calculation_failed", error.message, 502);
    }

    return errorResponse(
      "visibility_calculation_failed",
      "An unknown error prevented the visibility calculation.",
      502
    );
  }
}
