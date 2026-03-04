export interface MasterFacility {
  id: string;
  name: string;
  region: string;
  type: "public" | "private";
  country: string;
}

export const FACILITY_REGIONS_NZ = [
  "Northern",
  "Midland",
  "Central",
  "South Island",
] as const;

export type FacilityRegionNZ = (typeof FACILITY_REGIONS_NZ)[number];

export const MASTER_FACILITIES_NZ: MasterFacility[] = [
  // Northern Region - Public (Te Whatu Ora)
  {
    id: "nz-whangarei-hospital",
    name: "Whangārei Hospital",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-north-shore-hospital",
    name: "North Shore Hospital",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-waitakere-hospital",
    name: "Waitakere Hospital",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-auckland-city-hospital",
    name: "Auckland City Hospital",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-starship-hospital",
    name: "Starship Children's Hospital",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-greenlane-clinical",
    name: "Greenlane Clinical Centre",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-middlemore-hospital",
    name: "Middlemore Hospital",
    region: "Northern",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-manukau-surgery",
    name: "Manukau Surgery Centre",
    region: "Northern",
    type: "public",
    country: "NZ",
  },

  // Northern Region - Private
  {
    id: "nz-kensington-hospital",
    name: "Kensington Hospital (Whangārei)",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-north-harbour",
    name: "Southern Cross Hospital (North Harbour)",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-mercyascot",
    name: "MercyAscot (Epsom & Remuera)",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-brightside-hospital",
    name: "Brightside Hospital (Southern Cross)",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-gillies-hospital",
    name: "Gillies Hospital (Southern Cross)",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-ormiston-hospital",
    name: "Ormiston Hospital",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-franklin-hospital",
    name: "Franklin Hospital (Pukekohe)",
    region: "Northern",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-rodney-surgical",
    name: "Rodney Surgical Centre",
    region: "Northern",
    type: "private",
    country: "NZ",
  },

  // Midland Region - Public (Te Whatu Ora)
  {
    id: "nz-waikato-hospital",
    name: "Waikato Hospital (Hamilton)",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-thames-hospital",
    name: "Thames Hospital",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-tauranga-hospital",
    name: "Tauranga Hospital",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-whakatane-hospital",
    name: "Whakatāne Hospital",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-rotorua-hospital",
    name: "Rotorua Hospital",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-taupo-hospital",
    name: "Taupō Hospital",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-taranaki-base",
    name: "Taranaki Base Hospital (New Plymouth)",
    region: "Midland",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-gisborne-hospital",
    name: "Gisborne Hospital",
    region: "Midland",
    type: "public",
    country: "NZ",
  },

  // Midland Region - Private
  {
    id: "nz-braemar-hospital",
    name: "Braemar Hospital (Hamilton)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-anglesea-hospital",
    name: "Anglesea Hospital (Hamilton)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-hamilton",
    name: "Southern Cross Hospital (Hamilton)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-grace-hospital",
    name: "Grace Hospital (Tauranga)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-rotorua",
    name: "Southern Cross Hospital (Rotorua)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-new-plymouth",
    name: "Southern Cross Hospital (New Plymouth)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-chelsea-hospital",
    name: "Chelsea Hospital (Gisborne)",
    region: "Midland",
    type: "private",
    country: "NZ",
  },

  // Central Region - Public (Te Whatu Ora)
  {
    id: "nz-hawkes-bay-hospital",
    name: "Hawke's Bay Fallen Soldiers' Memorial Hospital (Hastings)",
    region: "Central",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-whanganui-hospital",
    name: "Whanganui Hospital",
    region: "Central",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-palmerston-north-hospital",
    name: "Palmerston North Hospital",
    region: "Central",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-wairarapa-hospital",
    name: "Wairarapa Hospital (Masterton)",
    region: "Central",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-hutt-valley-hospital",
    name: "Hutt Valley Hospital",
    region: "Central",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-wellington-regional",
    name: "Wellington Regional Hospital",
    region: "Central",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-kenepuru-hospital",
    name: "Kenepuru Hospital",
    region: "Central",
    type: "public",
    country: "NZ",
  },

  // Central Region - Private
  {
    id: "nz-royston-hospital",
    name: "Royston Hospital (Hastings)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-kaweka-hospital",
    name: "Kaweka Hospital (Hastings)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-belverdale-hospital",
    name: "Belverdale Hospital (Whanganui)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-crest-hospital",
    name: "Crest Hospital (Palmerston North)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-bowen-hospital",
    name: "Bowen Hospital (Wellington)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-wakefield-hospital",
    name: "Wakefield Hospital (Wellington)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-wellington",
    name: "Southern Cross Hospital (Wellington)",
    region: "Central",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-boulcott-hospital",
    name: "Boulcott Hospital (Lower Hutt)",
    region: "Central",
    type: "private",
    country: "NZ",
  },

  // South Island Region - Public (Te Whatu Ora)
  {
    id: "nz-nelson-hospital",
    name: "Nelson Hospital",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-wairau-hospital",
    name: "Wairau Hospital (Blenheim)",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-grey-base-hospital",
    name: "Grey Base Hospital (Greymouth)",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-christchurch-hospital",
    name: "Christchurch Hospital",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-burwood-hospital",
    name: "Burwood Hospital",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-timaru-hospital",
    name: "Timaru Hospital",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-dunedin-hospital",
    name: "Dunedin Public Hospital",
    region: "South Island",
    type: "public",
    country: "NZ",
  },
  {
    id: "nz-southland-hospital",
    name: "Southland Hospital (Invercargill)",
    region: "South Island",
    type: "public",
    country: "NZ",
  },

  // South Island Region - Private
  {
    id: "nz-manuka-street-hospital",
    name: "Manuka Street Hospital (Nelson)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-st-georges-hospital",
    name: "St George's Hospital (Christchurch)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-christchurch",
    name: "Southern Cross Hospital (Christchurch)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-forte-health",
    name: "Forte Health (Christchurch)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-bidwill-trust-hospital",
    name: "Bidwill Trust Hospital (Timaru)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-mercy-hospital-dunedin",
    name: "Mercy Hospital (Dunedin)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
  {
    id: "nz-southern-cross-invercargill",
    name: "Southern Cross Hospital (Invercargill)",
    region: "South Island",
    type: "private",
    country: "NZ",
  },
];

export const SUPPORTED_COUNTRIES = [
  { code: "NZ", name: "New Zealand" },
] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRIES)[number]["code"];

export function getFacilitiesByCountry(countryCode: string): MasterFacility[] {
  switch (countryCode) {
    case "NZ":
      return MASTER_FACILITIES_NZ;
    default:
      return [];
  }
}

export function getFacilityById(id: string): MasterFacility | undefined {
  return MASTER_FACILITIES_NZ.find((f) => f.id === id);
}

export function searchFacilities(
  query: string,
  countryCode: string,
  filters?: { region?: string; type?: "public" | "private" },
): MasterFacility[] {
  let facilities = getFacilitiesByCountry(countryCode);

  if (filters?.region) {
    facilities = facilities.filter((f) => f.region === filters.region);
  }

  if (filters?.type) {
    facilities = facilities.filter((f) => f.type === filters.type);
  }

  if (query.trim()) {
    const lowerQuery = query.toLowerCase();
    facilities = facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.region.toLowerCase().includes(lowerQuery),
    );
  }

  return facilities;
}
