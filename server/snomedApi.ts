/**
 * SNOMED CT API Client using CSIRO Ontoserver FHIR API
 * 
 * Uses the Australian National Clinical Terminology Service's public FHIR endpoint
 * which provides access to SNOMED CT International Edition
 * 
 * API Documentation: https://r4.ontoserver.csiro.au/fhir
 */

const ONTOSERVER_BASE_URL = "https://r4.ontoserver.csiro.au/fhir";
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// SNOMED CT Concept IDs for key hierarchies (used in ECL expressions)
const SNOMED_HIERARCHIES = {
  PROCEDURE: "71388002",        // Procedure (procedure)
  CLINICAL_FINDING: "404684003", // Clinical finding (finding)
  BODY_STRUCTURE: "123037004",  // Body structure (body structure)
};

export interface SnomedSearchResult {
  conceptId: string;
  term: string;
  fsn: string;
  active: boolean;
  semanticTag?: string;
}

export interface SnomedConceptDetail {
  conceptId: string;
  fsn: string;
  preferredTerm: string;
  synonyms: string[];
  parents: { conceptId: string; term: string }[];
  children: { conceptId: string; term: string }[];
}

/**
 * Extract semantic tag from FSN (e.g., "Diabetes mellitus (disorder)" -> "disorder")
 */
function extractSemanticTag(fsn: string): string | undefined {
  const match = fsn.match(/\(([^)]+)\)$/);
  return match ? match[1] : undefined;
}

/** FHIR ValueSet expansion item */
interface FhirExpansionItem {
  code: string;
  display: string;
  system?: string;
}

/** FHIR ValueSet expansion response */
interface FhirExpansionResponse {
  expansion?: {
    contains?: FhirExpansionItem[];
  };
}

/** FHIR Parameters part element */
interface FhirParameterPart {
  name: string;
  valueString?: string;
  valueCode?: string;
  valueCoding?: { code: string; display?: string };
  valueBoolean?: boolean;
}

/** FHIR Parameters response element */
interface FhirParameter {
  name: string;
  valueString?: string;
  valueBoolean?: boolean;
  part?: FhirParameterPart[];
}

/** FHIR Parameters response */
interface FhirParametersResponse {
  parameter?: FhirParameter[];
}

/**
 * Parse FHIR ValueSet expansion response into our format
 */
function parseFhirExpansion(data: FhirExpansionResponse): SnomedSearchResult[] {
  if (!data.expansion?.contains) {
    return [];
  }

  return data.expansion.contains.map((item) => ({
    conceptId: item.code,
    term: item.display,
    fsn: item.display, // FHIR doesn't always include FSN separately
    active: true,
    semanticTag: extractSemanticTag(item.display),
  }));
}

/**
 * Search SNOMED CT for procedures using FHIR ValueSet/$expand
 */
export async function searchProcedures(
  query: string,
  specialty?: string,
  limit: number = 20
): Promise<SnomedSearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // ECL expression for procedures: <<71388002 (all descendants of Procedure)
    const ecl = `<<${SNOMED_HIERARCHIES.PROCEDURE}`;
    const eclEncoded = encodeURIComponent(ecl);
    
    const url = `${ONTOSERVER_BASE_URL}/ValueSet/$expand?` + 
      `url=http://snomed.info/sct?fhir_vs=ecl/${eclEncoded}` +
      `&filter=${encodeURIComponent(query)}` +
      `&count=${limit}`;

    console.log("SNOMED procedure search:", query);

    const response = await fetchWithTimeout(url, {
      headers: {
        "Accept": "application/fhir+json",
      },
    });

    if (!response.ok) {
      console.error("SNOMED API error:", response.status, await response.text());
      return [];
    }

    const data = await response.json() as FhirExpansionResponse;
    const results = parseFhirExpansion(data);
    
    console.log(`SNOMED procedures found: ${results.length}`);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("SNOMED procedure search timed out");
    } else {
      console.error("Error searching SNOMED procedures:", error);
    }
    return [];
  }
}

/**
 * Search SNOMED CT for diagnoses (clinical findings) using FHIR ValueSet/$expand
 */
export async function searchDiagnoses(
  query: string,
  specialty?: string,
  limit: number = 20
): Promise<SnomedSearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // ECL expression for clinical findings: <<404684003 (all descendants of Clinical finding)
    const ecl = `<<${SNOMED_HIERARCHIES.CLINICAL_FINDING}`;
    const eclEncoded = encodeURIComponent(ecl);
    
    const url = `${ONTOSERVER_BASE_URL}/ValueSet/$expand?` + 
      `url=http://snomed.info/sct?fhir_vs=ecl/${eclEncoded}` +
      `&filter=${encodeURIComponent(query)}` +
      `&count=${limit}`;

    console.log("SNOMED diagnosis search:", query);

    const response = await fetchWithTimeout(url, {
      headers: {
        "Accept": "application/fhir+json",
      },
    });

    if (!response.ok) {
      console.error("SNOMED API error:", response.status, await response.text());
      return [];
    }

    const data = await response.json() as FhirExpansionResponse;
    const results = parseFhirExpansion(data);
    
    console.log(`SNOMED diagnoses found: ${results.length}`);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("SNOMED diagnosis search timed out");
    } else {
      console.error("Error searching SNOMED diagnoses:", error);
    }
    return [];
  }
}

/**
 * Get concept details by ID using FHIR CodeSystem/$lookup
 */
export async function getConceptDetails(conceptId: string): Promise<SnomedConceptDetail | null> {
  try {
    const url = `${ONTOSERVER_BASE_URL}/CodeSystem/$lookup?` +
      `system=http://snomed.info/sct` +
      `&code=${conceptId}`;

    const response = await fetchWithTimeout(url, {
      headers: {
        "Accept": "application/fhir+json",
      },
    });

    if (!response.ok) {
      console.error("SNOMED API error:", response.status);
      return null;
    }

    const data = await response.json() as FhirParametersResponse;

    // Parse FHIR Parameters response
    let display = "";
    let fsn = "";
    const synonyms: string[] = [];
    const parents: { conceptId: string; term: string }[] = [];
    const children: { conceptId: string; term: string }[] = [];

    for (const param of data.parameter || []) {
      if (param.name === "display") {
        display = param.valueString ?? "";
      }
      if (param.name === "designation") {
        const parts = param.part || [];
        const usePart = parts.find((p) => p.name === "use");
        const valuePart = parts.find((p) => p.name === "value");

        if (valuePart?.valueString) {
          if (usePart?.valueCoding?.code === "900000000000003001") {
            fsn = valuePart.valueString;
          } else {
            synonyms.push(valuePart.valueString);
          }
        }
      }
      if (param.name === "property") {
        const parts = param.part || [];
        const codePart = parts.find((p) => p.name === "code");
        const valuePart = parts.find((p) => p.name === "value");

        if (codePart?.valueCode === "parent" && valuePart?.valueCode) {
          parents.push({ conceptId: valuePart.valueCode, term: "" });
        }
        if (codePart?.valueCode === "child" && valuePart?.valueCode) {
          children.push({ conceptId: valuePart.valueCode, term: "" });
        }
      }
    }

    return {
      conceptId,
      fsn: fsn || display,
      preferredTerm: display,
      synonyms: [...new Set(synonyms)],
      parents,
      children,
    };
  } catch (error) {
    console.error("Error fetching SNOMED concept details:", error);
    return null;
  }
}

/**
 * Validate a SNOMED CT code exists
 */
export async function validateCode(conceptId: string): Promise<boolean> {
  try {
    const url = `${ONTOSERVER_BASE_URL}/CodeSystem/$validate-code?` +
      `system=http://snomed.info/sct` +
      `&code=${conceptId}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/fhir+json",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as FhirParametersResponse;

    // Find the "result" parameter
    const resultParam = data.parameter?.find((p) => p.name === "result");
    return resultParam?.valueBoolean === true;
  } catch (error) {
    console.error("Error validating SNOMED code:", error);
    return false;
  }
}
