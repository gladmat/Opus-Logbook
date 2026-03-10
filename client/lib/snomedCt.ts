import { Specialty, CountryCode, ProcedureCode } from "@/types/case";

/** Procedure sub-categories used for SNOMED lookup grouping */
export type ProcedureSubcategory = Specialty | "free_flap" | "hand_trauma";

export interface SnomedProcedure {
  snomedCtCode: string;
  snomedCtDisplay: string;
  specialty: ProcedureSubcategory;
  commonName: string;
  countryMappings: Partial<Record<CountryCode, CountryProcedureMapping>>;
}

export interface CountryProcedureMapping {
  localCode: string;
  localDisplay: string;
  localSystem: string;
}

export const COUNTRY_CODING_SYSTEMS: Record<CountryCode, string> = {
  CH: "CHOP (Swiss Classification of Surgical Interventions)",
  GB: "OPCS-4 (Classification of Interventions and Procedures)",
  PL: "ICD-9-CM-PL (Polish Procedure Classification)",
  AU: "ACHI (Australian Classification of Health Interventions)",
  NZ: "ACHI-NZ (NZ Classification of Health Interventions)",
  US: "CPT (Current Procedural Terminology)",
};

export const PROFILE_COUNTRY_TO_CODE: Record<string, CountryCode> = {
  new_zealand: "NZ",
  australia: "AU",
  united_kingdom: "GB",
  united_states: "US",
  poland: "PL",
  switzerland: "CH",
};

export function getCountryCodeFromProfile(
  profileCountry: string | null | undefined,
): CountryCode {
  if (!profileCountry) return "NZ";
  return PROFILE_COUNTRY_TO_CODE[profileCountry] || "NZ";
}

export function getCodingSystemForProfile(
  profileCountry: string | null | undefined,
): string {
  const countryCode = getCountryCodeFromProfile(profileCountry);
  return COUNTRY_CODING_SYSTEMS[countryCode];
}

export const SNOMED_PROCEDURES: SnomedProcedure[] = [
  {
    snomedCtCode: "234298008",
    snomedCtDisplay: "Free anterolateral thigh flap transfer",
    specialty: "free_flap",
    commonName: "ALT Flap",
    countryMappings: {
      CH: {
        localCode: "85.92.11",
        localDisplay: "Freier anterolateraler Oberschenkellappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S062",
        localDisplay: "Free anterolateral thigh flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45760-00",
        localDisplay: "Free anterolateral thigh flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "234294006",
    snomedCtDisplay: "Free deep inferior epigastric perforator flap transfer",
    specialty: "free_flap",
    commonName: "DIEP Flap",
    countryMappings: {
      CH: {
        localCode: "85.74.11",
        localDisplay: "Freier DIEP-Lappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S065",
        localDisplay: "Free DIEP flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45548-00",
        localDisplay: "Free deep inferior epigastric perforator flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "234289004",
    snomedCtDisplay: "Free radial forearm flap transfer",
    specialty: "free_flap",
    commonName: "Radial Forearm Flap",
    countryMappings: {
      CH: {
        localCode: "85.92.12",
        localDisplay: "Freier radialer Unterarmlappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S061",
        localDisplay: "Free radial forearm flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45542-00",
        localDisplay: "Free radial forearm flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "234291007",
    snomedCtDisplay: "Free fibula osteocutaneous flap transfer",
    specialty: "free_flap",
    commonName: "Fibula Flap",
    countryMappings: {
      CH: {
        localCode: "85.92.13",
        localDisplay: "Freier Fibulalappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S067",
        localDisplay: "Free fibula flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45554-00",
        localDisplay: "Free fibula osteocutaneous flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "234288007",
    snomedCtDisplay: "Free latissimus dorsi myocutaneous flap transfer",
    specialty: "free_flap",
    commonName: "Latissimus Dorsi Flap",
    countryMappings: {
      CH: {
        localCode: "85.92.14",
        localDisplay: "Freier Latissimus-dorsi-Lappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S063",
        localDisplay: "Free latissimus dorsi flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45551-00",
        localDisplay: "Free latissimus dorsi myocutaneous flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "234295007",
    snomedCtDisplay: "Free gracilis muscle flap transfer",
    specialty: "free_flap",
    commonName: "Gracilis Flap",
    countryMappings: {
      CH: {
        localCode: "85.92.15",
        localDisplay: "Freier Gracilis-Lappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S064",
        localDisplay: "Free gracilis flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45557-00",
        localDisplay: "Free gracilis muscle flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "234296008",
    snomedCtDisplay:
      "Free superficial circumflex iliac perforator flap transfer",
    specialty: "free_flap",
    commonName: "SCIP Flap",
    countryMappings: {
      CH: {
        localCode: "85.92.16",
        localDisplay: "Freier SCIP-Lappen",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S068",
        localDisplay: "Free SCIP flap",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45560-00",
        localDisplay: "Free SCIP flap",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "78548000",
    snomedCtDisplay: "Repair of tendon of hand",
    specialty: "hand_trauma",
    commonName: "Tendon Repair",
    countryMappings: {
      CH: {
        localCode: "82.45",
        localDisplay: "Sehnennaht der Hand",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "T691",
        localDisplay: "Primary repair of flexor tendon",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "46426-00",
        localDisplay: "Repair of flexor tendon of hand",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "239590009",
    snomedCtDisplay: "Amputation of finger (procedure)",
    specialty: "hand_trauma",
    commonName: "Nerve Repair",
    countryMappings: {
      CH: {
        localCode: "04.79",
        localDisplay: "Nervennaht",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "A571",
        localDisplay: "Primary repair of peripheral nerve",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "39321-00",
        localDisplay: "Repair of peripheral nerve",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "77343006",
    snomedCtDisplay: "Replantation of digit",
    specialty: "hand_trauma",
    commonName: "Replantation",
    countryMappings: {
      CH: {
        localCode: "84.22",
        localDisplay: "Replantation von Finger",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "X091",
        localDisplay: "Replantation of digit",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "44364-00",
        localDisplay: "Replantation of digit",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "10847001",
    snomedCtDisplay: "Revascularization procedure",
    specialty: "hand_trauma",
    commonName: "Revascularization",
    countryMappings: {
      CH: {
        localCode: "39.59",
        localDisplay: "Revaskularisation",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "L291",
        localDisplay: "Revascularisation of digit",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "32503-00",
        localDisplay: "Revascularisation",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "72310004",
    snomedCtDisplay: "Abdominoplasty",
    specialty: "body_contouring",
    commonName: "Abdominoplasty",
    countryMappings: {
      CH: {
        localCode: "86.83",
        localDisplay: "Abdominoplastik",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S021",
        localDisplay: "Abdominoplasty",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "30165-00",
        localDisplay: "Abdominoplasty",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "119954001",
    snomedCtDisplay: "Brachioplasty",
    specialty: "body_contouring",
    commonName: "Brachioplasty",
    countryMappings: {
      CH: {
        localCode: "86.83.11",
        localDisplay: "Brachioplastik",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S031",
        localDisplay: "Brachioplasty",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45500-00",
        localDisplay: "Brachioplasty",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "62961003",
    snomedCtDisplay: "Rhinoplasty",
    specialty: "aesthetics",
    commonName: "Rhinoplasty",
    countryMappings: {
      CH: {
        localCode: "21.87",
        localDisplay: "Rhinoplastik",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "E024",
        localDisplay: "Rhinoplasty",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "41680-00",
        localDisplay: "Rhinoplasty",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "75732000",
    snomedCtDisplay: "Blepharoplasty",
    specialty: "aesthetics",
    commonName: "Blepharoplasty",
    countryMappings: {
      CH: {
        localCode: "08.44",
        localDisplay: "Blepharoplastik",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "C121",
        localDisplay: "Blepharoplasty",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "42503-00",
        localDisplay: "Blepharoplasty",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "86088008",
    snomedCtDisplay: "Skin graft to burn",
    specialty: "burns",
    commonName: "Skin Grafting",
    countryMappings: {
      CH: {
        localCode: "86.69",
        localDisplay: "Hauttransplantation bei Verbrennung",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S381",
        localDisplay: "Split thickness skin graft",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45439-00",
        localDisplay: "Split skin graft to burn",
        localSystem: "ACHI",
      },
    },
  },
  {
    snomedCtCode: "13130007",
    snomedCtDisplay: "Escharotomy",
    specialty: "burns",
    commonName: "Escharotomy",
    countryMappings: {
      CH: {
        localCode: "86.28",
        localDisplay: "Escharotomie",
        localSystem: "CHOP",
      },
      GB: {
        localCode: "S411",
        localDisplay: "Escharotomy",
        localSystem: "OPCS-4",
      },
      AU: {
        localCode: "45015-00",
        localDisplay: "Escharotomy",
        localSystem: "ACHI",
      },
    },
  },
];

export function findSnomedProcedure(
  commonName: string,
  specialty: Specialty,
): SnomedProcedure | undefined {
  return SNOMED_PROCEDURES.find(
    (p) =>
      p.commonName.toLowerCase() === commonName.toLowerCase() &&
      p.specialty === specialty,
  );
}

export function findSnomedProcedureByCode(
  snomedCtCode: string,
): SnomedProcedure | undefined {
  return SNOMED_PROCEDURES.find((p) => p.snomedCtCode === snomedCtCode);
}

export function getProcedureCodeForCountry(
  procedure: SnomedProcedure,
  countryCode: CountryCode,
): ProcedureCode {
  const countryMapping = procedure.countryMappings[countryCode];

  return {
    snomedCtCode: procedure.snomedCtCode,
    snomedCtDisplay: procedure.snomedCtDisplay,
    localCode: countryMapping?.localCode,
    localDisplay: countryMapping?.localDisplay,
    localSystem: countryMapping?.localSystem,
  };
}

export function getProceduresForSpecialty(
  specialty: Specialty,
): SnomedProcedure[] {
  return SNOMED_PROCEDURES.filter((p) => p.specialty === specialty);
}

export function getProcedureDisplayName(
  procedure: SnomedProcedure,
  countryCode: CountryCode,
  preferLocal: boolean = true,
): string {
  if (preferLocal) {
    const countryMapping = procedure.countryMappings[countryCode];
    if (countryMapping?.localDisplay) {
      return countryMapping.localDisplay;
    }
  }
  return procedure.commonName;
}

export function getProcedureCode(
  procedure: SnomedProcedure,
  countryCode: CountryCode,
): string {
  const countryMapping = procedure.countryMappings[countryCode];
  if (countryMapping?.localCode) {
    return `${countryMapping.localCode} (${countryMapping.localSystem})`;
  }
  return procedure.snomedCtCode;
}

export function formatProcedureForExport(
  procedure: SnomedProcedure,
  countryCode: CountryCode,
): {
  snomedCt: { code: string; display: string };
  local?: { code: string; display: string; system: string };
} {
  const result: {
    snomedCt: { code: string; display: string };
    local?: { code: string; display: string; system: string };
  } = {
    snomedCt: {
      code: procedure.snomedCtCode,
      display: procedure.snomedCtDisplay,
    },
  };

  const countryMapping = procedure.countryMappings[countryCode];
  if (countryMapping) {
    result.local = {
      code: countryMapping.localCode,
      display: countryMapping.localDisplay,
      system: countryMapping.localSystem,
    };
  }

  return result;
}
