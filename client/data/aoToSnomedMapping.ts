// AO/OTA Code to SNOMED CT Diagnosis Mapping
// Maps AO fracture codes to suggested SNOMED CT search terms

export interface SnomedSuggestion {
  searchTerm: string;
  displayName: string;
}

// Maps AO family codes to SNOMED search terms
export function getAoToSnomedSuggestion(aoCode: string): SnomedSuggestion {
  // Parse the AO code to determine bone type
  const familyCode = aoCode.substring(0, 2);

  // Carpal bones
  if (familyCode === "71") {
    return {
      searchTerm: "fracture lunate",
      displayName: "Fracture of lunate bone",
    };
  }
  if (familyCode === "72") {
    // Check for qualification
    if (aoCode.includes("(a)")) {
      return {
        searchTerm: "fracture scaphoid proximal pole",
        displayName: "Fracture of proximal pole of scaphoid",
      };
    }
    if (aoCode.includes("(b)")) {
      return {
        searchTerm: "fracture scaphoid waist",
        displayName: "Fracture of waist of scaphoid",
      };
    }
    if (aoCode.includes("(c)")) {
      return {
        searchTerm: "fracture scaphoid distal pole",
        displayName: "Fracture of distal pole of scaphoid",
      };
    }
    return {
      searchTerm: "fracture scaphoid",
      displayName: "Fracture of scaphoid bone",
    };
  }
  if (familyCode === "73") {
    return {
      searchTerm: "fracture capitate",
      displayName: "Fracture of capitate bone",
    };
  }
  if (familyCode === "74") {
    if (aoCode.includes("A")) {
      return {
        searchTerm: "fracture hamate hook",
        displayName: "Fracture of hook of hamate",
      };
    }
    return {
      searchTerm: "fracture hamate",
      displayName: "Fracture of hamate bone",
    };
  }
  if (familyCode === "75") {
    return {
      searchTerm: "fracture trapezium",
      displayName: "Fracture of trapezium bone",
    };
  }

  // Other carpal bones (76.x.X)
  if (familyCode === "76") {
    const subBoneMatch = aoCode.match(/^76\.([123])/);
    if (subBoneMatch) {
      const subBone = subBoneMatch[1];
      if (subBone === "1")
        return {
          searchTerm: "fracture pisiform",
          displayName: "Fracture of pisiform bone",
        };
      if (subBone === "2")
        return {
          searchTerm: "fracture triquetrum",
          displayName: "Fracture of triquetral bone",
        };
      if (subBone === "3")
        return {
          searchTerm: "fracture trapezoid",
          displayName: "Fracture of trapezoid bone",
        };
    }
    return {
      searchTerm: "fracture carpal",
      displayName: "Fracture of carpal bone",
    };
  }

  // Metacarpals (77.finger.segment + type)
  if (familyCode === "77") {
    const metacarpalMatch = aoCode.match(/^77\.([1-5])/);
    if (metacarpalMatch) {
      const finger = metacarpalMatch[1];
      const fingerNames: Record<string, string> = {
        "1": "first",
        "2": "second",
        "3": "third",
        "4": "fourth",
        "5": "fifth",
      };
      const fingerLabels: Record<string, string> = {
        "1": "thumb (1st)",
        "2": "index (2nd)",
        "3": "middle (3rd)",
        "4": "ring (4th)",
        "5": "little (5th)",
      };
      // Check for base fractures (Bennett's, Rolando's for thumb)
      if (finger === "1" && aoCode.includes(".1")) {
        if (aoCode.endsWith("B")) {
          return {
            searchTerm: "bennett fracture",
            displayName: "Bennett's fracture-dislocation of thumb",
          };
        }
        if (aoCode.endsWith("C")) {
          return {
            searchTerm: "rolando fracture",
            displayName: "Rolando fracture of thumb",
          };
        }
      }
      // Check for boxer's fracture (5th metacarpal neck/head)
      if (finger === "5" && aoCode.includes(".3")) {
        return {
          searchTerm: "boxer fracture",
          displayName: "Boxer's fracture of 5th metacarpal",
        };
      }
      return {
        searchTerm: `fracture ${fingerNames[finger!] ?? "unknown"} metacarpal`,
        displayName: `Fracture of ${fingerLabels[finger!] ?? "unknown"} metacarpal bone`,
      };
    }
    return {
      searchTerm: "fracture metacarpal",
      displayName: "Fracture of metacarpal bone",
    };
  }

  // Phalanges (78.finger.phalanx.segment + type)
  if (familyCode === "78") {
    const phalanxMatch = aoCode.match(/^78\.([1-5])\.([1-3])/);
    if (phalanxMatch) {
      const finger = phalanxMatch[1];
      const phalanx = phalanxMatch[2];
      const fingerNames: Record<string, string> = {
        "1": "thumb",
        "2": "index finger",
        "3": "middle finger",
        "4": "ring finger",
        "5": "little finger",
      };
      const phalanxNames: Record<string, string> = {
        "1": "proximal phalanx",
        "2": "middle phalanx",
        "3": "distal phalanx",
      };
      // Check for mallet finger (distal phalanx avulsion)
      if (phalanx === "3" && aoCode.includes(".1A")) {
        return {
          searchTerm: "mallet finger",
          displayName: "Mallet finger injury",
        };
      }
      return {
        searchTerm: `fracture ${phalanxNames[phalanx!] ?? "unknown"} ${fingerNames[finger!] ?? "unknown"}`,
        displayName: `Fracture of ${phalanxNames[phalanx!] ?? "unknown"} of ${fingerNames[finger!] ?? "unknown"}`,
      };
    }
    return {
      searchTerm: "fracture phalanx finger",
      displayName: "Fracture of phalanx of finger",
    };
  }

  // Crush/multiple (79)
  if (familyCode === "79") {
    return {
      searchTerm: "crush injury hand fracture",
      displayName: "Crush injury of hand with fractures",
    };
  }

  // Default fallback
  return { searchTerm: "fracture hand", displayName: "Fracture of hand" };
}

// Get more specific SNOMED search terms based on fracture type
export function getDetailedSnomedSearch(
  aoCode: string,
  boneName: string,
): string {
  const type = aoCode.match(/[ABC]$/)?.[0];

  let typeQualifier = "";
  if (type === "A") typeQualifier = "simple";
  else if (type === "B") typeQualifier = "wedge";
  else if (type === "C") typeQualifier = "comminuted multifragmentary";

  const suggestion = getAoToSnomedSuggestion(aoCode);
  if (typeQualifier) {
    return `${typeQualifier} ${suggestion.searchTerm}`;
  }
  return suggestion.searchTerm;
}
