import { describe, it, expect } from "vitest";
import { normalizeIndianLocation, matchesLocationFilter } from "@/server/jobs/locations";

describe("Indian Location Normalization", () => {
  it("normalizes Bengaluru aliases correctly", () => {
    const loc1 = normalizeIndianLocation("Bengaluru, Karnataka");
    expect(loc1.normalizedCity).toBe("Bengaluru");
    expect(loc1.normalizedState).toBe("Karnataka");

    const loc2 = normalizeIndianLocation("Bangalore Urban");
    expect(loc2.normalizedCity).toBe("Bengaluru");

    const loc3 = normalizeIndianLocation("BLR Office");
    expect(loc3.normalizedCity).toBe("Bengaluru");
  });

  it("normalizes Gurugram and Gurgaon correctly", () => {
    const loc1 = normalizeIndianLocation("Gurgaon, Haryana");
    expect(loc1.normalizedCity).toBe("Gurugram");
    expect(loc1.normalizedState).toBe("Haryana");

    const loc2 = normalizeIndianLocation("Cyber City, Gurugram");
    expect(loc2.normalizedCity).toBe("Gurugram");
  });

  it("handles colonial names: Bombay, Madras, Calcutta, Poona", () => {
    expect(normalizeIndianLocation("Bombay").normalizedCity).toBe("Mumbai");
    expect(normalizeIndianLocation("Madras").normalizedCity).toBe("Chennai");
    expect(normalizeIndianLocation("Calcutta").normalizedCity).toBe("Kolkata");
    expect(normalizeIndianLocation("Poona").normalizedCity).toBe("Pune");
  });

  it("distinguishes Greater Noida from Noida", () => {
    const grNoida = normalizeIndianLocation("Greater Noida, Knowledge Park");
    expect(grNoida.normalizedCity).toBe("Greater Noida");

    const noida = normalizeIndianLocation("Noida Sector 62");
    expect(noida.normalizedCity).toBe("Noida");
  });

  it("handles Kochi and Cochin", () => {
    expect(normalizeIndianLocation("Cochin, Kerala").normalizedCity).toBe("Kochi");
    expect(normalizeIndianLocation("Infopark Kochi").normalizedCity).toBe("Kochi");
  });

  it("detects remote eligibility within India and worldwide", () => {
    const indRemote = normalizeIndianLocation("India Remote (Anywhere in India)");
    expect(indRemote.isIndiaRemote).toBe(true);
    expect(indRemote.isWorldwideRemote).toBe(false);

    const worldRemote = normalizeIndianLocation("Worldwide Remote");
    expect(worldRemote.isWorldwideRemote).toBe(true);
    expect(worldRemote.isIndiaRemote).toBe(true);
  });

  it("handles empty and unresolved locations safely", () => {
    const empty = normalizeIndianLocation("");
    expect(empty.isUnresolved).toBe(true);
    expect(empty.normalizedCity).toBeNull();

    const unknown = normalizeIndianLocation("Some Unknown Place In Space");
    expect(unknown.isUnresolved).toBe(true);
  });

  describe("matchesLocationFilter", () => {
    it("matches Delhi NCR for Delhi, Noida, Greater Noida, and Gurugram", () => {
      expect(matchesLocationFilter({ city: "Delhi" }, "Delhi NCR")).toBe(true);
      expect(matchesLocationFilter({ city: "Noida" }, "Delhi NCR")).toBe(true);
      expect(matchesLocationFilter({ city: "Greater Noida" }, "Delhi NCR")).toBe(true);
      expect(matchesLocationFilter({ city: "Gurugram" }, "Delhi NCR")).toBe(true);
      expect(matchesLocationFilter({ city: "Bengaluru" }, "Delhi NCR")).toBe(false);
    });

    it("matches city aliases when filtering", () => {
      expect(matchesLocationFilter({ city: "Bengaluru", original: "Bengaluru" }, "Bangalore")).toBe(true);
      expect(matchesLocationFilter({ city: "Gurugram", original: "Gurugram" }, "Gurgaon")).toBe(true);
      expect(matchesLocationFilter({ city: "Mumbai", original: "Mumbai" }, "Bombay")).toBe(true);
    });

    it("matches 'All India' to any location", () => {
      expect(matchesLocationFilter({ city: "Kochi" }, "All India")).toBe(true);
      expect(matchesLocationFilter({ city: null }, "All India")).toBe(true);
    });
  });
});
