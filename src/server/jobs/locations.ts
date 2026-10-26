/**
 * Centralized Indian Location and City Normalization
 * Supports major tech hubs, spelling variants, colonial aliases, and regional groupings (e.g. Delhi NCR).
 */

export interface LocationInfo {
  original: string | null;
  normalizedCity: string | null;
  normalizedState: string | null;
  country: string;
  isIndiaRemote: boolean;
  isWorldwideRemote: boolean;
  isUnresolved: boolean;
}

interface CityMapping {
  canonicalCity: string;
  state: string;
  aliases: string[];
}

export const INDIAN_CITY_MAPPINGS: CityMapping[] = [
  {
    canonicalCity: "Bengaluru",
    state: "Karnataka",
    aliases: ["bengaluru", "bangalore", "blr", "banglore"],
  },
  {
    canonicalCity: "Mumbai",
    state: "Maharashtra",
    aliases: ["mumbai", "bombay", "navi mumbai", "thane"],
  },
  {
    canonicalCity: "Pune",
    state: "Maharashtra",
    aliases: ["pune", "poona", "pcmc", "hinjawadi", "hinjewadi"],
  },
  {
    canonicalCity: "Hyderabad",
    state: "Telangana",
    aliases: ["hyderabad", "secunderabad", "cyberabad", "hitec city"],
  },
  {
    canonicalCity: "Chennai",
    state: "Tamil Nadu",
    aliases: ["chennai", "madras"],
  },
  {
    canonicalCity: "Delhi",
    state: "Delhi",
    aliases: ["delhi", "new delhi", "dilli"],
  },
  {
    canonicalCity: "Noida",
    state: "Uttar Pradesh",
    aliases: ["noida"],
  },
  {
    canonicalCity: "Greater Noida",
    state: "Uttar Pradesh",
    aliases: ["greater noida", "gr noida"],
  },
  {
    canonicalCity: "Gurugram",
    state: "Haryana",
    aliases: ["gurugram", "gurgaon"],
  },
  {
    canonicalCity: "Kolkata",
    state: "West Bengal",
    aliases: ["kolkata", "calcutta"],
  },
  {
    canonicalCity: "Ahmedabad",
    state: "Gujarat",
    aliases: ["ahmedabad", "amdavad"],
  },
  {
    canonicalCity: "Jaipur",
    state: "Rajasthan",
    aliases: ["jaipur"],
  },
  {
    canonicalCity: "Indore",
    state: "Madhya Pradesh",
    aliases: ["indore"],
  },
  {
    canonicalCity: "Kochi",
    state: "Kerala",
    aliases: ["kochi", "cochin", "ernakulam"],
  },
  {
    canonicalCity: "Nashik",
    state: "Maharashtra",
    aliases: ["nashik", "nasik"],
  },
  {
    canonicalCity: "Chandigarh",
    state: "Chandigarh",
    aliases: ["chandigarh", "mohali", "panchkula"],
  },
  {
    canonicalCity: "Thiruvananthapuram",
    state: "Kerala",
    aliases: ["thiruvananthapuram", "trivandrum"],
  },
  {
    canonicalCity: "Coimbatore",
    state: "Tamil Nadu",
    aliases: ["coimbatore", "kovai"],
  },
  {
    canonicalCity: "Nagpur",
    state: "Maharashtra",
    aliases: ["nagpur"],
  },
  {
    canonicalCity: "Bhubaneswar",
    state: "Odisha",
    aliases: ["bhubaneswar", "bhubaneshwar"],
  },
  {
    canonicalCity: "Lucknow",
    state: "Uttar Pradesh",
    aliases: ["lucknow"],
  },
];

// Delhi NCR grouping covers Delhi, Noida, Greater Noida, and Gurugram
export const DELHI_NCR_CITIES = ["Delhi", "Noida", "Greater Noida", "Gurugram"];

/**
 * Normalizes an Indian location string.
 */
export function normalizeIndianLocation(rawLocation?: string | null): LocationInfo {
  if (!rawLocation || typeof rawLocation !== "string") {
    return {
      original: null,
      normalizedCity: null,
      normalizedState: null,
      country: "India",
      isIndiaRemote: false,
      isWorldwideRemote: false,
      isUnresolved: true,
    };
  }

  const trimmed = rawLocation.trim();
  if (!trimmed) {
    return {
      original: "",
      normalizedCity: null,
      normalizedState: null,
      country: "India",
      isIndiaRemote: false,
      isWorldwideRemote: false,
      isUnresolved: true,
    };
  }

  const lower = trimmed.toLowerCase();

  // Check explicit remote indicators
  const isWorldwideRemote =
    lower.includes("worldwide remote") ||
    lower.includes("remote worldwide") ||
    lower.includes("global remote") ||
    lower.includes("anywhere in the world");

  const isIndiaRemote =
    isWorldwideRemote ||
    lower.includes("india remote") ||
    lower.includes("remote in india") ||
    lower.includes("remote - india") ||
    lower.includes("india - remote") ||
    lower.includes("anywhere in india") ||
    lower.includes("pan india") ||
    lower.includes("remote india") ||
    lower.includes("remote (india)") ||
    lower === "remote";

  // Check city matches (sort longer aliases first so "greater noida" matches before "noida")
  let matchedCity: string | null = null;
  let matchedState: string | null = null;

  // Prioritize multi-word aliases first
  const sortedMappings = [...INDIAN_CITY_MAPPINGS].sort((a, b) => {
    const maxLenA = Math.max(...a.aliases.map((al) => al.length));
    const maxLenB = Math.max(...b.aliases.map((al) => al.length));
    return maxLenB - maxLenA;
  });

  for (const mapping of sortedMappings) {
    for (const alias of mapping.aliases) {
      // Use regex word boundary check when possible
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
      if (regex.test(lower) || lower === alias) {
        matchedCity = mapping.canonicalCity;
        matchedState = mapping.state;
        break;
      }
    }
    if (matchedCity) break;
  }

  // Check state match if no city matched
  if (!matchedCity) {
    const stateList: [string, string][] = [
      ["karnataka", "Karnataka"],
      ["maharashtra", "Maharashtra"],
      ["telangana", "Telangana"],
      ["tamil nadu", "Tamil Nadu"],
      ["haryana", "Haryana"],
      ["uttar pradesh", "Uttar Pradesh"],
      ["rajasthan", "Rajasthan"],
      ["gujarat", "Gujarat"],
      ["madhya pradesh", "Madhya Pradesh"],
      ["kerala", "Kerala"],
      ["west bengal", "West Bengal"],
    ];
    for (const [stateKey, canonicalState] of stateList) {
      if (lower.includes(stateKey)) {
        matchedState = canonicalState;
        break;
      }
    }
  }

  return {
    original: trimmed,
    normalizedCity: matchedCity,
    normalizedState: matchedState,
    country: "India",
    isIndiaRemote,
    isWorldwideRemote,
    isUnresolved: !matchedCity && !matchedState && !isIndiaRemote && !isWorldwideRemote,
  };
}

/**
 * Checks whether a job's normalized location satisfies a user-selected location filter.
 */
export function matchesLocationFilter(
  jobLocation: {
    city?: string | null;
    state?: string | null;
    original?: string | null;
    isIndiaRemote?: boolean;
    workArrangement?: string;
  },
  selectedFilter: string
): boolean {
  const filter = selectedFilter.trim().toLowerCase();
  if (!filter || filter === "all" || filter === "all india") {
    return true;
  }

  const city = (jobLocation.city || "").toLowerCase();
  const state = (jobLocation.state || "").toLowerCase();
  const original = (jobLocation.original || "").toLowerCase();

  // Special Delhi NCR Grouping
  if (filter === "delhi ncr") {
    return (
      DELHI_NCR_CITIES.map((c) => c.toLowerCase()).includes(city) ||
      original.includes("delhi ncr") ||
      original.includes("ncr")
    );
  }

  // Remote filter check
  if (filter === "remote" || filter === "remote within india") {
    return (
      jobLocation.workArrangement === "remote" ||
      jobLocation.isIndiaRemote === true ||
      original.includes("remote")
    );
  }

  // Check if selected filter corresponds to a canonical city or any of its aliases
  for (const mapping of INDIAN_CITY_MAPPINGS) {
    const isTargetMapping =
      mapping.canonicalCity.toLowerCase() === filter ||
      mapping.aliases.includes(filter);

    if (isTargetMapping) {
      // Check if job city is this canonical city
      if (city === mapping.canonicalCity.toLowerCase()) {
        return true;
      }
      // Check if original location contains any of the city's aliases
      for (const alias of mapping.aliases) {
        if (original.includes(alias)) {
          return true;
        }
      }
      return false;
    }
  }

  // Direct substring fallback on city, state, or original string
  return (
    city.includes(filter) ||
    state.includes(filter) ||
    original.includes(filter)
  );
}
