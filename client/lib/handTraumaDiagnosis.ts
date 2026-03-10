import { PHALANX_NAMES } from "@/data/aoHandClassification";
import type {
  CoverageZone,
  CoverageSize,
  DigitId,
  DislocationEntry,
  FractureEntry,
  HandTraumaCompleteness,
  HandTraumaDetails,
  HandTraumaStructure,
  Laterality,
  PerfusionStatusEntry,
  SoftTissueDescriptor,
  DiagnosisGroup,
} from "@/types/case";

export type RomanDigit = DigitId;
export type DiagnosisRenderMode =
  | "shorthand_english"
  | "full_english"
  | "latin_medical";
export type DiagnosisVerbosity = "short" | "long";

export interface HandTraumaDiagnosisSelection {
  laterality?: Laterality;
  injuryMechanism?: string;
  injuryMechanismOther?: string;
  affectedDigits?: DigitId[];
  fractures?: FractureEntry[];
  dislocations?: DislocationEntry[];
  injuredStructures?: HandTraumaStructure[];
  perfusionStatuses?: PerfusionStatusEntry[];
  softTissueDescriptors?: SoftTissueDescriptor[];
  isHighPressureInjection?: boolean;
  isFightBite?: boolean;
  isCompartmentSyndrome?: boolean;
  isRingAvulsion?: boolean;
  digitAmputations?: import("@/types/case").DigitAmputation[];
  amputationLevel?: HandTraumaDetails["amputationLevel"];
  amputationType?: HandTraumaDetails["amputationType"];
  isReplantable?: boolean;
}

export interface FractureInjury {
  id: string;
  boneId: string;
  boneName: string;
  aoCode: string;
  familyCode: string;
  ray?: DigitId;
  digit?: DigitId;
  phalanx?: string;
  segment?: string;
  openStatus?: "open" | "closed";
  isComminuted?: boolean;
}

export interface JointInjury {
  joint: DislocationEntry["joint"];
  digit?: DigitId;
  direction?: DislocationEntry["direction"];
  hasFracture?: boolean;
  isComplex?: boolean;
}

export interface TendonInjury {
  category: "flexor_tendon" | "extensor_tendon";
  digit: DigitId;
  structures: string[];
  zone?: string;
  completeness?: HandTraumaCompleteness;
}

export interface NerveInjury {
  structureId: string;
  digit?: DigitId;
  side?: "radial" | "ulnar";
}

export interface VesselInjury {
  structureId: string;
  digit?: DigitId;
  side?: "radial" | "ulnar";
}

export interface SoftTissueInjury {
  type:
    | "defect"
    | "loss"
    | "degloving"
    | "contamination"
    | "nail_bed"
    | "volar_plate"
    | "ligament"
    | "high_pressure_injection"
    | "fight_bite"
    | "compartment_syndrome"
    | "ring_avulsion";
  digits?: DigitId[];
  surfaces?: ("palmar" | "dorsal")[];
  structureId?: string;
  zone?: CoverageZone;
  size?: CoverageSize;
}

export interface AmputationInjury {
  digits: DigitId[];
  level: NonNullable<HandTraumaDetails["amputationLevel"]>;
  type?: HandTraumaDetails["amputationType"];
  isReplantable?: boolean;
}

export interface MachineSummary {
  side: "left" | "right";
  mechanism?: string;
  digits: RomanDigit[];
  rays: RomanDigit[];
  fractures: FractureInjury[];
  dislocations: JointInjury[];
  tendons: TendonInjury[];
  nerves: NerveInjury[];
  vessels: VesselInjury[];
  perfusion: PerfusionStatusEntry[];
  softTissue: SoftTissueInjury[];
  amputations: AmputationInjury[];
}

export interface HandTraumaDiagnosisOutput {
  headerLine: string;
  diagnosisTextShort: string;
  diagnosisTextLong: string;
  machineSummary: MachineSummary;
}

const DIGIT_ORDER: DigitId[] = ["I", "II", "III", "IV", "V"];
const DIGIT_INDEX: Record<DigitId, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
};

const ORDINAL_DIGITS: Record<string, string> = {
  "1": "first",
  "2": "second",
  "3": "third",
  "4": "fourth",
  "5": "fifth",
};

const SEGMENT_LABELS: Record<string, string> = {
  "1": "base",
  "2": "shaft",
  "3": "head",
};

const PHALANX_LONG_LABELS: Record<string, string> = {
  "1": "proximal phalanx",
  "2": "middle phalanx",
  "3": "distal phalanx",
};

const LEVEL_LABELS: Record<
  NonNullable<HandTraumaDetails["amputationLevel"]>,
  string
> = {
  fingertip: "fingertip",
  distal_phalanx: "distal phalanx",
  middle_phalanx: "middle phalanx",
  proximal_phalanx: "proximal phalanx",
  mcp: "MCP level",
  ray: "ray level",
  hand_wrist: "hand/wrist level",
};

const MECHANISM_LABELS: Record<string, string> = {
  fall: "fall",
  crush: "crush",
  saw_blade: "saw/blade",
  punch_assault: "punch/assault",
  sports: "sports",
  mva: "motor vehicle accident",
  work_related: "work-related",
  other: "other",
};

const LATIN = {
  side: { left: "sinistra", right: "dextra" },
  sideGenitive: { left: "sinistrae", right: "dextrae" },
  hand: "manus",
  injury: "laesio",
  handInjury: "laesio manus",
  fracture: "Fractura",
  fractures: "Fracturae",
  open: "aperta",
  closed: "clausa",
  comminuted: "comminutiva",
  dislocation: "Luxatio",
  fractureDislocation: "Luxatio cum fractura",
  complete: "completa",
  partial: "partialis",
  perfusionImpaired: "perfusione imminuta",
  perfusionAbsent: "perfusione absente",
  softTissueDefect: "Defectus textuum mollium",
  contaminationGross: "Contaminatio magna",
  amputation: "Amputatio",
  replantable: "replantationi idoneus",
  nonReplantable: "Laesio non replantabilis",
  circularSaw: "serrae circularis",
  crush: "contusionis",
  fall: "casus",
};

const LATIN_LEVEL_LABELS: Record<
  NonNullable<HandTraumaDetails["amputationLevel"]>,
  string
> = {
  fingertip: "apicem digiti",
  distal_phalanx: "phalangem distalem",
  middle_phalanx: "phalangem mediam",
  proximal_phalanx: "phalangem proximalem",
  mcp: "articulationem metacarpophalangeam",
  ray: "radium",
  hand_wrist: "manum/carpum",
};

const LATIN_SEGMENT_LABELS: Record<
  string,
  { singular: string; plural: string }
> = {
  "1": { singular: "basis", plural: "bases" },
  "2": { singular: "corpus", plural: "corpora" },
  "3": { singular: "caput", plural: "capita" },
};

const LATIN_PHALANX_LABELS: Record<string, string> = {
  "1": "phalangis proximalis",
  "2": "phalangis mediae",
  "3": "phalangis distalis",
};

const LATIN_TENDON_COMPONENTS: Record<string, string> = {
  FPL: "flexoris pollicis longi",
  FDP: "flexoris digitorum profundi",
  FDS: "flexoris digitorum superficialis",
  EDC: "extensoris digitorum communis",
  EIP: "extensoris indicis proprii",
  EDM: "extensoris digiti minimi",
  EPL: "extensoris pollicis longi",
  EPB: "extensoris pollicis brevis",
  APL: "abductoris pollicis longi",
};

const LATIN_NAMED_NERVE_LABELS: Record<string, string> = {
  median: "nervi mediani",
  ulnar: "nervi ulnaris",
  radial: "nervi radialis",
  pin: "nervi interossei posterioris",
  srn: "rami superficialis nervi radialis",
  dbun: "rami dorsalis nervi ulnaris",
};

const LATIN_PROXIMAL_VESSEL_LABELS: Record<string, string> = {
  radial_artery: "arteriae radialis",
  ulnar_artery: "arteriae ulnaris",
  superficial_arch: "arcus palmaris superficialis",
  deep_arch: "arcus palmaris profundi",
};

const LATIN_JOINT_LABELS: Record<JointInjury["joint"], string> = {
  pip: "articulationis interphalangeae proximalis",
  mcp: "articulationis metacarpophalangeae",
  cmc: "articulationis carpometacarpalis",
  thumb_cmc: "articulationis carpometacarpalis pollicis",
  druj: "articulationis radioulnaris distalis",
  perilunate: "perilunata",
  lunate: "lunati",
};

const DIGITAL_NERVE_LABELS: Record<
  string,
  { side: "radial" | "ulnar"; digit: DigitId }
> = {
  N1: { digit: "I", side: "radial" },
  N2: { digit: "I", side: "ulnar" },
  N3: { digit: "II", side: "radial" },
  N4: { digit: "II", side: "ulnar" },
  N5: { digit: "III", side: "radial" },
  N6: { digit: "III", side: "ulnar" },
  N7: { digit: "IV", side: "radial" },
  N8: { digit: "IV", side: "ulnar" },
  N9: { digit: "V", side: "radial" },
  N10: { digit: "V", side: "ulnar" },
};

const DIGITAL_ARTERY_LABELS: Record<
  string,
  { side: "radial" | "ulnar"; digit: DigitId }
> = {
  A1: { digit: "I", side: "radial" },
  A2: { digit: "I", side: "ulnar" },
  A3: { digit: "II", side: "radial" },
  A4: { digit: "II", side: "ulnar" },
  A5: { digit: "III", side: "radial" },
  A6: { digit: "III", side: "ulnar" },
  A7: { digit: "IV", side: "radial" },
  A8: { digit: "IV", side: "ulnar" },
  A9: { digit: "V", side: "radial" },
  A10: { digit: "V", side: "ulnar" },
};

function sortDigits(digits: readonly DigitId[]): DigitId[] {
  return Array.from(new Set(digits)).sort(
    (a, b) => DIGIT_INDEX[a] - DIGIT_INDEX[b],
  );
}

function sortByDigit(a: DigitId | undefined, b: DigitId | undefined): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return DIGIT_INDEX[a] - DIGIT_INDEX[b];
}

function buildRanges(digits: readonly DigitId[]): DigitId[][] {
  const sorted = sortDigits(digits);
  const ranges: DigitId[][] = [];

  for (const digit of sorted) {
    const current = ranges[ranges.length - 1];
    if (!current) {
      ranges.push([digit]);
      continue;
    }
    const last = current[current.length - 1];
    if (last && DIGIT_INDEX[digit] === DIGIT_INDEX[last] + 1) {
      current.push(digit);
    } else {
      ranges.push([digit]);
    }
  }

  return ranges;
}

function renderRange(range: readonly DigitId[]): string {
  if (range.length === 1) return range[0]!;
  return `${range[0]}–${range[range.length - 1]}`;
}

function joinNatural(parts: string[], conjunction = "and"): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, ${conjunction} ${parts[parts.length - 1]}`;
}

export function groupDigits(
  digits: readonly DigitId[],
  mode: DiagnosisRenderMode = "shorthand_english",
): string {
  const ranges = buildRanges(digits).map(renderRange);
  const prefix = mode === "latin_medical" ? "dig." : "Dig.";
  return `${prefix} ${joinNatural(ranges, mode === "latin_medical" ? "et" : "and")}`;
}

export function groupRays(
  rays: readonly DigitId[],
  mode: DiagnosisRenderMode = "shorthand_english",
): string {
  const ranges = buildRanges(rays).map(renderRange);
  const label = mode === "latin_medical" ? "radii" : "rays";
  return `${label} ${joinNatural(ranges, mode === "latin_medical" ? "et" : "and")}`;
}

function latinDigitReference(digits: readonly DigitId[]): string {
  const ranges = buildRanges(digits).map(renderRange);
  return digits.length === 1
    ? `digiti ${digits[0]}`
    : `digitorum ${joinNatural(ranges, "et")}`;
}

function mechanismLabel(
  mechanism?: string,
  otherText?: string,
  mode: DiagnosisRenderMode = "shorthand_english",
): string | undefined {
  const raw =
    mechanism === "other"
      ? otherText?.trim()
      : mechanism && MECHANISM_LABELS[mechanism];
  if (!raw) return undefined;
  if (mode !== "latin_medical") return raw;
  if (mechanism === "saw_blade" || raw.toLowerCase().includes("saw")) {
    return LATIN.circularSaw;
  }
  if (mechanism === "crush" || raw.toLowerCase().includes("crush")) {
    return LATIN.crush;
  }
  if (mechanism === "fall") {
    return LATIN.fall;
  }
  return raw;
}

function fractureRay(entry: FractureEntry): DigitId | undefined {
  const finger = entry.details.finger;
  if (!finger) return undefined;
  return DIGIT_ORDER.find((digit) => String(DIGIT_INDEX[digit]) === finger);
}

function fractureDigit(entry: FractureEntry): DigitId | undefined {
  return fractureRay(entry);
}

function deriveAffectedDigits(
  selection: HandTraumaDiagnosisSelection,
): DigitId[] {
  const digits = new Set<DigitId>(selection.affectedDigits ?? []);

  for (const fracture of selection.fractures ?? []) {
    const digit = fractureDigit(fracture);
    if (digit) digits.add(digit);
  }
  for (const dislocation of selection.dislocations ?? []) {
    if (dislocation.digit) digits.add(dislocation.digit);
  }
  for (const structure of selection.injuredStructures ?? []) {
    if (structure.digit) digits.add(structure.digit);
  }
  for (const perfusion of selection.perfusionStatuses ?? []) {
    digits.add(perfusion.digit);
  }
  for (const descriptor of selection.softTissueDescriptors ?? []) {
    for (const digit of descriptor.digits ?? []) {
      digits.add(digit);
    }
  }

  return sortDigits(Array.from(digits));
}

export function deriveAffectedRays(
  selection: HandTraumaDiagnosisSelection,
): DigitId[] {
  const rays = new Set<DigitId>();

  for (const fracture of selection.fractures ?? []) {
    const ray = fractureRay(fracture);
    if (ray && fracture.details.familyCode === "77") {
      rays.add(ray);
    }
  }

  if (selection.amputationLevel === "ray") {
    for (const digit of selection.affectedDigits ?? []) {
      rays.add(digit);
    }
  }

  return sortDigits(Array.from(rays));
}

function normalizeFractures(fractures: FractureEntry[] = []): FractureInjury[] {
  return [...fractures]
    .map((fracture) => ({
      id: fracture.id,
      boneId: fracture.boneId,
      boneName: fracture.boneName,
      aoCode: fracture.aoCode,
      familyCode: fracture.details.familyCode,
      ray: fractureRay(fracture),
      digit: fractureDigit(fracture),
      phalanx: fracture.details.phalanx,
      segment: fracture.details.segment,
      openStatus: fracture.details.openStatus,
      isComminuted: fracture.details.isComminuted,
    }))
    .sort((a, b) => {
      if (a.familyCode !== b.familyCode)
        return a.familyCode.localeCompare(b.familyCode);
      return sortByDigit(a.digit ?? a.ray, b.digit ?? b.ray);
    });
}

function normalizeDislocations(
  dislocations: DislocationEntry[] = [],
): JointInjury[] {
  return [...dislocations]
    .map((entry) => ({
      joint: entry.joint,
      digit: entry.digit,
      direction: entry.direction,
      hasFracture: entry.hasFracture,
      isComplex: entry.isComplex,
    }))
    .sort((a, b) => {
      const digitOrder = sortByDigit(a.digit, b.digit);
      if (digitOrder !== 0) return digitOrder;
      return a.joint.localeCompare(b.joint);
    });
}

function normalizeTendons(
  structures: HandTraumaStructure[] = [],
): TendonInjury[] {
  const map = new Map<string, TendonInjury>();

  for (const structure of structures) {
    if (
      structure.category !== "flexor_tendon" &&
      structure.category !== "extensor_tendon"
    ) {
      continue;
    }
    if (!structure.digit) continue;

    const key = [
      structure.category,
      structure.digit,
      structure.zone ?? "",
      structure.completeness ?? "",
    ].join("|");

    const current = map.get(key);
    if (current) {
      current.structures = [
        ...current.structures,
        structure.structureId,
      ].sort();
      continue;
    }

    map.set(key, {
      category: structure.category,
      digit: structure.digit,
      structures: [structure.structureId],
      zone: structure.zone,
      completeness: structure.completeness,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const categoryOrder =
      a.category === b.category ? 0 : a.category === "flexor_tendon" ? -1 : 1;
    if (categoryOrder !== 0) return categoryOrder;
    return sortByDigit(a.digit, b.digit);
  });
}

function normalizeNerves(
  structures: HandTraumaStructure[] = [],
): NerveInjury[] {
  return structures
    .filter(
      (structure): structure is HandTraumaStructure & { category: "nerve" } =>
        structure.category === "nerve",
    )
    .map((structure) => ({
      structureId: structure.structureId,
      digit: structure.digit,
      side: structure.side,
    }))
    .sort((a, b) => {
      const digitOrder = sortByDigit(a.digit, b.digit);
      if (digitOrder !== 0) return digitOrder;
      if (a.side !== b.side) {
        return a.side === "radial" ? -1 : 1;
      }
      return a.structureId.localeCompare(b.structureId);
    });
}

function normalizeVessels(
  structures: HandTraumaStructure[] = [],
): VesselInjury[] {
  return structures
    .filter(
      (structure): structure is HandTraumaStructure & { category: "artery" } =>
        structure.category === "artery",
    )
    .map((structure) => ({
      structureId: structure.structureId,
      digit: structure.digit,
      side: structure.side,
    }))
    .sort((a, b) => {
      const digitOrder = sortByDigit(a.digit, b.digit);
      if (digitOrder !== 0) return digitOrder;
      if (a.side !== b.side) {
        return a.side === "radial" ? -1 : 1;
      }
      return a.structureId.localeCompare(b.structureId);
    });
}

function normalizeSoftTissue(
  selection: HandTraumaDiagnosisSelection,
): SoftTissueInjury[] {
  const injuries: SoftTissueInjury[] = [];

  for (const descriptor of selection.softTissueDescriptors ?? []) {
    injuries.push({
      type: descriptor.type,
      surfaces: descriptor.surfaces,
      digits: descriptor.digits,
      zone: descriptor.zone,
      size: descriptor.size,
    });
  }

  for (const structure of selection.injuredStructures ?? []) {
    if (structure.category === "other") {
      if (structure.structureId === "nail_bed") {
        injuries.push({
          type: "nail_bed",
          digits: structure.digit ? [structure.digit] : undefined,
          structureId: structure.structureId,
        });
      } else if (structure.structureId.startsWith("volar_plate_")) {
        injuries.push({
          type: "volar_plate",
          digits: structure.digit ? [structure.digit] : undefined,
          structureId: structure.structureId,
        });
      }
    }
    if (structure.category === "ligament") {
      injuries.push({
        type: "ligament",
        digits: structure.digit ? [structure.digit] : undefined,
        structureId: structure.structureId,
      });
    }
  }

  // Consolidate multiple per-digit nail_bed entries into one with combined digits
  const nailBedEntries = injuries.filter((i) => i.type === "nail_bed");
  if (nailBedEntries.length > 1) {
    const combinedDigits = nailBedEntries
      .flatMap((e) => e.digits ?? [])
      .filter((d, i, a) => a.indexOf(d) === i);
    // Remove all individual nail_bed entries
    const withoutNailBed = injuries.filter((i) => i.type !== "nail_bed");
    injuries.length = 0;
    injuries.push(...withoutNailBed, {
      type: "nail_bed",
      digits: combinedDigits.length > 0 ? combinedDigits : undefined,
      structureId: "nail_bed",
    });
  }

  if (selection.isHighPressureInjection) {
    injuries.push({ type: "high_pressure_injection" });
  }
  if (selection.isFightBite) {
    injuries.push({ type: "fight_bite" });
  }
  if (selection.isCompartmentSyndrome) {
    injuries.push({ type: "compartment_syndrome" });
  }
  if (selection.isRingAvulsion) {
    injuries.push({
      type: "ring_avulsion",
      digits: selection.affectedDigits
        ? sortDigits(selection.affectedDigits)
        : undefined,
    });
  }

  return injuries.sort((a, b) => {
    const digitOrder = sortByDigit(a.digits?.[0], b.digits?.[0]);
    if (digitOrder !== 0) return digitOrder;
    return a.type.localeCompare(b.type);
  });
}

function normalizeAmputations(
  selection: HandTraumaDiagnosisSelection,
): AmputationInjury[] {
  // Prefer per-digit amputations
  if (selection.digitAmputations && selection.digitAmputations.length > 0) {
    return selection.digitAmputations.map((da) => ({
      digits: [da.digit],
      level: da.level,
      type: da.type,
      isReplantable: da.isReplantable,
    }));
  }
  // Legacy fallback
  if (!selection.amputationLevel) return [];
  return [
    {
      digits: sortDigits(selection.affectedDigits ?? []),
      level: selection.amputationLevel,
      type: selection.amputationType,
      isReplantable: selection.isReplantable,
    },
  ];
}

export function normalizeSelection(
  selection: HandTraumaDiagnosisSelection,
): MachineSummary | null {
  const side =
    selection.laterality === "left" || selection.laterality === "right"
      ? selection.laterality
      : null;

  if (!side) return null;

  const digits = deriveAffectedDigits(selection);
  const rays = deriveAffectedRays(selection);
  const injuredStructures = selection.injuredStructures ?? [];

  return {
    side,
    mechanism: mechanismLabel(
      selection.injuryMechanism,
      selection.injuryMechanismOther,
    ),
    digits,
    rays,
    fractures: normalizeFractures(selection.fractures ?? []),
    dislocations: normalizeDislocations(selection.dislocations ?? []),
    tendons: normalizeTendons(injuredStructures),
    nerves: normalizeNerves(injuredStructures),
    vessels: normalizeVessels(injuredStructures),
    perfusion: [...(selection.perfusionStatuses ?? [])].sort((a, b) =>
      sortByDigit(a.digit, b.digit),
    ),
    softTissue: normalizeSoftTissue(selection),
    amputations: normalizeAmputations(selection),
  };
}

function labelSide(side: "left" | "right", mode: DiagnosisRenderMode): string {
  if (mode === "latin_medical") {
    return LATIN.side[side];
  }
  return side === "left" ? "Left" : "Right";
}

function buildTopographicSummary(
  normalized: MachineSummary,
  mode: DiagnosisRenderMode,
): string | undefined {
  if (normalized.amputations.length > 0) {
    const digits = normalized.amputations[0]?.digits ?? [];
    if (digits.length === 1 && digits[0] === "I") {
      return mode === "latin_medical" ? "pollicis" : "thumb";
    }
    if (digits.length > 0) {
      return groupDigits(digits, mode);
    }
    return mode === "latin_medical" ? "manus" : "hand";
  }

  const wristLevel =
    normalized.fractures.some(
      (fracture) => fracture.familyCode !== "77" && !fracture.digit,
    ) ||
    normalized.dislocations.some((entry) =>
      ["druj", "perilunate", "lunate"].includes(entry.joint),
    ) ||
    normalized.nerves.some((entry) => !entry.digit) ||
    normalized.vessels.some((entry) => !entry.digit);
  if (wristLevel) {
    return mode === "latin_medical" ? "carpi/manus" : "wrist/hand";
  }

  if (normalized.rays.length > 0) {
    return groupRays(normalized.rays, mode);
  }
  if (normalized.digits.length === 1 && normalized.digits[0] === "I") {
    return mode === "latin_medical" ? "pollex" : "thumb";
  }
  if (normalized.digits.length > 0) {
    return groupDigits(normalized.digits, mode);
  }
  return undefined;
}

export function buildHeaderLine(
  normalized: MachineSummary,
  mode: DiagnosisRenderMode = "shorthand_english",
): string {
  const side = labelSide(normalized.side, mode);
  const sideGenitive = LATIN.sideGenitive[normalized.side];
  const topographic = buildTopographicSummary(normalized, mode);
  const mechanism = normalized.mechanism;
  const amputation = normalized.amputations[0];

  if (mode === "latin_medical") {
    if (
      amputation &&
      amputation.digits.length === 1 &&
      amputation.digits[0] === "I"
    ) {
      return `Laesio amputationis pollicis ${side}`;
    }
    if (normalized.digits.length === 1 && !mechanism && topographic) {
      return `Laesio ${latinDigitReference(normalized.digits)} manus ${sideGenitive}`;
    }
    const base = mechanism
      ? `Manus ${side}, ${LATIN.injury} ${mechanism}`
      : `Laesio manus ${sideGenitive}`;
    return topographic ? `${base} - ${topographic}` : base;
  }

  if (
    amputation &&
    amputation.digits.length === 1 &&
    amputation.digits[0] === "I"
  ) {
    return `${side} thumb amputation injury`;
  }
  if (
    normalized.digits.length === 1 &&
    !mechanism &&
    topographic?.startsWith("Dig.")
  ) {
    return `${side} ${topographic} injury`;
  }
  if (topographic === "thumb" && !mechanism) {
    return `${side} thumb injury`;
  }

  const base = mechanism
    ? `${side} hand ${mechanism} injury`
    : `${side} hand injury`;

  return topographic ? `${base} - ${topographic}` : base;
}

function aoLabel(codes: string[]): string {
  return `(AO: ${codes.join(", ")})`;
}

function segmentLabel(segment?: string): string {
  return segment ? (SEGMENT_LABELS[segment] ?? segment) : "fracture";
}

function fractureQualifiers(
  fracture: Pick<FractureInjury, "openStatus" | "isComminuted">,
  mode: DiagnosisRenderMode,
  isPlural = false,
): string[] {
  const parts: string[] = [];
  if (fracture.openStatus === "open") {
    parts.push(
      mode === "latin_medical" ? (isPlural ? "apertae" : LATIN.open) : "Open",
    );
  } else if (fracture.openStatus === "closed") {
    parts.push(
      mode === "latin_medical"
        ? isPlural
          ? "clausae"
          : LATIN.closed
        : "Closed",
    );
  }
  if (fracture.isComminuted) {
    parts.push(
      mode === "latin_medical"
        ? isPlural
          ? "comminutivae"
          : LATIN.comminuted
        : "comminuted",
    );
  }
  return parts;
}

function metacarpalLabel(
  fracture: FractureInjury,
  mode: DiagnosisRenderMode,
): string {
  const ray = fracture.ray;
  if (!ray) return fracture.boneName;
  if (mode === "full_english") {
    return `${ORDINAL_DIGITS[String(DIGIT_INDEX[ray])]} metacarpal ${segmentLabel(fracture.segment)}`;
  }
  if (mode === "latin_medical") {
    const latinSegment =
      LATIN_SEGMENT_LABELS[fracture.segment ?? ""]?.singular ?? "pars";
    return `ossis metacarpalis ${ray} ${latinSegment}`;
  }
  return `MC ${ray} ${segmentLabel(fracture.segment)}`;
}

function phalanxLabel(
  fracture: FractureInjury,
  mode: DiagnosisRenderMode,
): string {
  const digit = fracture.digit;
  const phalanx = fracture.phalanx;
  const segment = segmentLabel(fracture.segment);
  if (!digit || !phalanx) return fracture.boneName;
  if (mode === "full_english") {
    return `${PHALANX_LONG_LABELS[phalanx] ?? fracture.boneName} of Dig. ${digit} ${segment}`;
  }
  if (mode === "latin_medical") {
    const latinSegment =
      LATIN_SEGMENT_LABELS[fracture.segment ?? ""]?.singular ?? "";
    return `${latinSegment ? `${latinSegment} ` : ""}${LATIN_PHALANX_LABELS[phalanx] ?? "phalangis"} digiti ${digit}`.trim();
  }
  return `${PHALANX_NAMES[phalanx] ?? "Phalanx"}, Dig. ${digit} ${segment}`;
}

export function buildFractureBullets(
  fractures: FractureInjury[],
  mode: DiagnosisRenderMode,
  verbosity: DiagnosisVerbosity,
): string[] {
  const grouped = new Map<string, FractureInjury[]>();

  for (const fracture of fractures) {
    const groupingKey =
      fracture.familyCode === "77"
        ? [
            "metacarpal",
            fracture.segment ?? "",
            fracture.openStatus ?? "",
            fracture.isComminuted ? "1" : "0",
          ].join("|")
        : [
            fracture.familyCode,
            fracture.phalanx ?? "",
            fracture.segment ?? "",
            fracture.openStatus ?? "",
            fracture.isComminuted ? "1" : "0",
            fracture.digit ?? "",
          ].join("|");

    const current = grouped.get(groupingKey);
    if (current) {
      current.push(fracture);
    } else {
      grouped.set(groupingKey, [fracture]);
    }
  }

  const bullets: string[] = [];

  for (const entry of grouped.values()) {
    const sample = entry[0]!;
    const qualifiers = fractureQualifiers(sample, mode, entry.length > 1);
    const qualifierText =
      qualifiers.length > 0 ? `${qualifiers.join(" ")} ` : "";
    const aoCodes = entry.map((fracture) => fracture.aoCode);

    if (sample.familyCode === "77" && entry.every((fracture) => fracture.ray)) {
      const rays = entry
        .map((fracture) => fracture.ray!)
        .sort((a, b) => DIGIT_INDEX[a] - DIGIT_INDEX[b]);
      const rayText =
        entry.length > 1
          ? groupRays(rays, mode)
          : metacarpalLabel(sample, mode);

      if (mode === "latin_medical") {
        const latinSegment =
          LATIN_SEGMENT_LABELS[sample.segment ?? ""]?.plural ?? "partes";
        bullets.push(
          `${
            entry.length > 1 ? LATIN.fractures : LATIN.fracture
          } ${qualifierText}${
            entry.length > 1
              ? `ossium metacarpalium ${groupRays(rays, mode).replace("radii ", "")} ${latinSegment}`
              : metacarpalLabel(sample, mode)
          } ${aoLabel(aoCodes)}`.trim(),
        );
        continue;
      }

      const noun = entry.length > 1 ? "fractures" : "fracture";
      bullets.push(
        `${qualifierText}${noun} of ${rayText}${entry.length > 1 ? ` ${segmentLabel(sample.segment)}s` : ""} ${aoLabel(aoCodes)}`.trim(),
      );
      continue;
    }

    const label =
      sample.familyCode === "78"
        ? phalanxLabel(sample, mode)
        : sample.familyCode === "77"
          ? metacarpalLabel(sample, mode)
          : sample.boneName;

    if (mode === "latin_medical") {
      bullets.push(
        `${LATIN.fracture} ${qualifierText}${label} ${aoLabel(aoCodes)}`.trim(),
      );
    } else {
      bullets.push(
        `${qualifierText}fracture of ${label} ${aoLabel(aoCodes)}`.trim(),
      );
    }
  }

  return bullets;
}

function jointLabel(injury: JointInjury, mode: DiagnosisRenderMode): string {
  const digitPart = injury.digit
    ? `, ${mode === "latin_medical" ? `dig. ${injury.digit}` : `Dig. ${injury.digit}`}`
    : "";

  if (injury.hasFracture) {
    if (mode === "latin_medical") {
      if (injury.joint === "perilunate") {
        return "Luxatio perilunata cum fractura";
      }
      return `Luxatio cum fractura ${
        LATIN_JOINT_LABELS[injury.joint]
      }${injury.digit ? ` digiti ${injury.digit}` : ""}`;
    }
    return `${injury.joint.toUpperCase()} fracture-dislocation${digitPart}`;
  }

  if (mode === "latin_medical") {
    if (injury.joint === "perilunate") {
      return "Luxatio perilunata";
    }
    if (injury.joint === "lunate") {
      return "Luxatio lunati";
    }
    return `Luxatio ${LATIN_JOINT_LABELS[injury.joint]}${
      injury.digit ? ` digiti ${injury.digit}` : ""
    }`;
  }
  return `${injury.joint.toUpperCase()} dislocation${digitPart}`;
}

export function buildDislocationBullets(
  dislocations: JointInjury[],
  mode: DiagnosisRenderMode,
  _verbosity: DiagnosisVerbosity,
): string[] {
  return dislocations.map((injury) => {
    if (
      injury.isComplex &&
      injury.joint === "mcp" &&
      mode !== "latin_medical"
    ) {
      return `Complex MCP dislocation${injury.digit ? `, Dig. ${injury.digit}` : ""}`;
    }
    return jointLabel(injury, mode);
  });
}

function tendonPatternLabel(
  injury: TendonInjury,
  mode: DiagnosisRenderMode,
  groupedDigits: DigitId[],
): string {
  const completeness =
    injury.completeness === "complete"
      ? mode === "latin_medical"
        ? LATIN.complete
        : "Complete"
      : injury.completeness === "partial"
        ? mode === "latin_medical"
          ? LATIN.partial
          : "Partial"
        : mode === "latin_medical"
          ? ""
          : "";
  const digitLabel =
    groupedDigits.length > 0
      ? groupedDigits.length === 1
        ? `${mode === "latin_medical" ? "dig." : "Dig."} ${groupedDigits[0]}`
        : groupDigits(groupedDigits, mode)
      : "";
  const zoneLabel = injury.zone ? ` Zone ${injury.zone}` : "";

  const structures = injury.structures.join("/");
  if (mode === "latin_medical") {
    const sortedStructures = [...injury.structures].sort();
    const isPlural = groupedDigits.length > 1 || sortedStructures.length > 1;
    const latinCompleteness =
      injury.completeness === "complete"
        ? isPlural
          ? "completae"
          : "completa"
        : injury.completeness === "partial"
          ? isPlural
            ? "partiales"
            : "partialis"
          : "";
    const noun = isPlural ? "Lacerationes" : "Laceratio";
    const latinDigitLabel =
      groupedDigits.length > 0 ? latinDigitReference(groupedDigits) : "";
    const latinZoneLabel = injury.zone ? ` zona ${injury.zone}` : "";

    let tendonBase = "";
    if (
      injury.category === "extensor_tendon" &&
      sortedStructures.length === 1 &&
      sortedStructures[0] === "EDC" &&
      groupedDigits.length > 1
    ) {
      tendonBase = "tendinum extensorum";
    } else if (
      injury.category === "flexor_tendon" &&
      sortedStructures.length === 2 &&
      sortedStructures.includes("FDS") &&
      sortedStructures.includes("FDP")
    ) {
      tendonBase = "tendinum flexorum superficialium et profundorum";
    } else if (sortedStructures.length === 1) {
      tendonBase = `tendinis ${
        LATIN_TENDON_COMPONENTS[sortedStructures[0]!] ?? sortedStructures[0]
      }`;
    } else {
      tendonBase = `tendinum ${joinNatural(
        sortedStructures.map(
          (structure) => LATIN_TENDON_COMPONENTS[structure] ?? structure,
        ),
        "et",
      )}`;
    }

    return `${noun} ${latinCompleteness} ${tendonBase}${
      latinDigitLabel ? ` ${latinDigitLabel}` : ""
    }${latinZoneLabel}`.trim();
  }

  if (injury.category === "extensor_tendon" && groupedDigits.length > 1) {
    return `${completeness} extensor tendon lacerations, ${digitLabel}${zoneLabel}`.trim();
  }

  if (injury.structures.length > 1) {
    return `${completeness} lacerations of ${structures}, ${digitLabel}${zoneLabel}`.trim();
  }

  return `${completeness} laceration of ${structures}, ${digitLabel}${zoneLabel}`.trim();
}

export function buildTendonBullets(
  tendons: TendonInjury[],
  mode: DiagnosisRenderMode,
  _verbosity: DiagnosisVerbosity,
): string[] {
  const grouped = new Map<string, TendonInjury[]>();

  for (const injury of tendons) {
    const key = [
      injury.category,
      injury.zone ?? "",
      injury.completeness ?? "",
      injury.structures.join("/"),
    ].join("|");
    const current = grouped.get(key);
    if (current) {
      current.push(injury);
    } else {
      grouped.set(key, [injury]);
    }
  }

  const bullets: string[] = [];
  for (const group of grouped.values()) {
    const sample = group[0]!;
    const digits = group.map((item) => item.digit);
    bullets.push(tendonPatternLabel(sample, mode, sortDigits(digits)));
  }
  return bullets;
}

function namedNerveLabel(
  structureId: string,
  mode: DiagnosisRenderMode,
): string {
  const base =
    structureId === "median"
      ? "Median nerve"
      : structureId === "ulnar"
        ? "Ulnar nerve"
        : structureId === "radial"
          ? "Radial nerve"
          : structureId === "pin"
            ? "Posterior interosseous nerve (PIN)"
            : structureId === "srn"
              ? "Superficial radial nerve (SRN)"
              : "Dorsal branch of ulnar nerve";

  if (mode === "latin_medical") {
    return LATIN_NAMED_NERVE_LABELS[structureId] ?? base;
  }
  return `${base} injury`;
}

export function buildNerveBullets(
  nerves: NerveInjury[],
  mode: DiagnosisRenderMode,
  _verbosity: DiagnosisVerbosity,
): string[] {
  const bullets: string[] = [];
  const digitalGroups = new Map<string, DigitId[]>();

  for (const injury of nerves) {
    const digital = DIGITAL_NERVE_LABELS[injury.structureId];
    if (!digital) {
      bullets.push(
        mode === "latin_medical"
          ? `Laceratio ${namedNerveLabel(injury.structureId, mode)} ad carpum`
          : `${namedNerveLabel(injury.structureId, mode)} at wrist level`,
      );
      continue;
    }

    const key = digital.side;
    const current = digitalGroups.get(key);
    if (current) {
      current.push(digital.digit);
    } else {
      digitalGroups.set(key, [digital.digit]);
    }
  }

  for (const [side, digits] of digitalGroups.entries()) {
    if (mode === "latin_medical") {
      const sortedDigits = sortDigits(digits);
      bullets.push(
        sortedDigits.length === 1
          ? `Laceratio nervi digitalis proprii partis ${
              side === "radial" ? "radialis" : "ulnaris"
            } digiti ${sortedDigits[0]}`
          : `Lacerationes nervorum digitalium propriorum partium ${
              side === "radial" ? "radialium" : "ulnarium"
            } ${latinDigitReference(sortedDigits)}`,
      );
    } else {
      bullets.push(
        `Proper digital nerve injuries, ${groupDigits(sortDigits(digits), mode)} ${side} sides`,
      );
    }
  }

  return bullets;
}

export function buildVesselBullets(
  vessels: VesselInjury[],
  perfusion: PerfusionStatusEntry[],
  mode: DiagnosisRenderMode,
  _verbosity: DiagnosisVerbosity,
): string[] {
  const bullets: string[] = [];
  const byDigit = new Map<DigitId, VesselInjury[]>();

  for (const vessel of vessels) {
    const digit =
      vessel.digit || DIGITAL_ARTERY_LABELS[vessel.structureId]?.digit;
    if (!digit) {
      const label =
        vessel.structureId === "radial_artery"
          ? "Radial artery injury"
          : vessel.structureId === "ulnar_artery"
            ? "Ulnar artery injury"
            : vessel.structureId === "superficial_arch"
              ? "Superficial palmar arch injury"
              : "Deep palmar arch injury";
      bullets.push(
        mode === "latin_medical"
          ? `Laesio ${
              LATIN_PROXIMAL_VESSEL_LABELS[vessel.structureId] ?? "arteriae"
            }`
          : label,
      );
      continue;
    }
    const current = byDigit.get(digit);
    if (current) {
      current.push(vessel);
    } else {
      byDigit.set(digit, [vessel]);
    }
  }

  for (const [digit, digitVessels] of byDigit.entries()) {
    const perfusionStatus = perfusion.find((entry) => entry.digit === digit);
    const hasBothDigital =
      digitVessels.some((entry) => entry.side === "radial") &&
      digitVessels.some((entry) => entry.side === "ulnar");

    if (perfusionStatus) {
      if (mode === "latin_medical") {
        bullets.push(
          `Laesio arteriae digitalis cum perfusione digiti ${digit} ${
            perfusionStatus.status === "absent" ? "absente" : "imminuta"
          }`,
        );
      } else {
        bullets.push(
          `Digital vessel injury with ${perfusionStatus.status} perfusion of Dig. ${digit}`,
        );
      }
      continue;
    }

    if (hasBothDigital) {
      bullets.push(
        mode === "latin_medical"
          ? `Lacerationes arteriarum digitalium radialium et ulnarium digiti ${digit}`
          : `Radial and ulnar digital artery injuries, Dig. ${digit}`,
      );
      continue;
    }

    bullets.push(
      mode === "latin_medical"
        ? `Laesio arteriae digitalis digiti ${digit}`
        : `Digital artery injury, Dig. ${digit}`,
    );
  }

  return bullets;
}

const ZONE_LABELS_EN: Record<CoverageZone, string> = {
  fingertip: "fingertip",
  digit_shaft: "digit",
  web_space: "web space",
  palm: "palmar",
  dorsum_hand: "dorsum of hand",
  wrist_forearm: "wrist/forearm",
};

const ZONE_LABELS_LATIN: Record<CoverageZone, string> = {
  fingertip: "apicis digiti",
  digit_shaft: "digiti",
  web_space: "spatii interdigitalis",
  palm: "palmae",
  dorsum_hand: "dorsi manus",
  wrist_forearm: "carpi et antebrachii",
};

function describeSoftTissueDescriptor(
  injury: SoftTissueInjury,
  mode: DiagnosisRenderMode,
): string {
  const digitsLabel =
    injury.digits && injury.digits.length > 0
      ? mode === "latin_medical"
        ? ` ${latinDigitReference(injury.digits)}`
        : `, ${groupDigits(injury.digits, mode)}`
      : "";
  const surfaces =
    injury.surfaces && injury.surfaces.length > 0
      ? injury.surfaces.map((surface) =>
          mode === "latin_medical"
            ? surface === "palmar"
              ? "volaris"
              : "dorsalis"
            : surface,
        )
      : undefined;
  const latinSurfaceLabel =
    surfaces && surfaces.length > 0 ? ` ${joinNatural(surfaces, "et")}` : "";

  switch (injury.type) {
    case "defect":
    case "loss": {
      const zoneEn = injury.zone ? ZONE_LABELS_EN[injury.zone] : undefined;
      const zoneLatin = injury.zone
        ? ZONE_LABELS_LATIN[injury.zone]
        : undefined;
      if (mode === "latin_medical") {
        return `${LATIN.softTissueDefect}${zoneLatin ? ` ${zoneLatin}` : ""}${latinSurfaceLabel}${digitsLabel}`;
      }
      const surfacePrefix =
        surfaces && surfaces.length > 0
          ? `${surfaces
              .map(
                (surface) => `${surface[0]!.toUpperCase()}${surface.slice(1)}`,
              )
              .join("/")} `
          : "";
      const zonePrefix = zoneEn ? `${zoneEn} ` : "";
      return `${surfacePrefix}${zonePrefix}soft-tissue ${injury.type}${digitsLabel}`;
    }
    case "degloving":
      return mode === "latin_medical"
        ? `Laesio deglovans${digitsLabel}`
        : `Degloving injury${digitsLabel}`;
    case "contamination":
      return mode === "latin_medical"
        ? LATIN.contaminationGross
        : "Gross contamination";
    case "nail_bed":
      return mode === "latin_medical"
        ? `Laceratio lecti unguis${digitsLabel}`
        : `Nail bed laceration${digitsLabel}`;
    case "volar_plate":
      return mode === "latin_medical"
        ? `Laesio laminae volaris${digitsLabel}`
        : `Volar plate injury${digitsLabel}`;
    case "ligament":
      if (mode === "latin_medical") {
        if (injury.structureId === "mcp1_ucl") {
          return "Laesio ligamenti collateralis ulnaris articulationis metacarpophalangeae pollicis";
        }
        if (injury.structureId === "mcp1_rcl") {
          return "Laesio ligamenti collateralis radialis articulationis metacarpophalangeae pollicis";
        }
        if (injury.structureId?.startsWith("pip_collateral_")) {
          return `Laesio ligamenti collateralis articulationis interphalangeae proximalis${digitsLabel}`;
        }
        return `Laesio ligamenti${digitsLabel}`;
      }
      return `Ligament injury${digitsLabel}`;
    case "high_pressure_injection":
      return mode === "latin_medical"
        ? "Laesio injectionis sub alta pressione"
        : "High-pressure injection injury";
    case "fight_bite":
      return mode === "latin_medical"
        ? "Vulnus morsu hominis super articulationem metacarpophalangeam"
        : "Fight bite";
    case "compartment_syndrome":
      return mode === "latin_medical"
        ? "Syndroma compartmenti manus"
        : "Compartment syndrome of hand";
    case "ring_avulsion":
      return mode === "latin_medical"
        ? `Laesio avulsionis anuli${digitsLabel}`
        : `Ring avulsion injury${digitsLabel}`;
    default:
      return mode === "latin_medical"
        ? "Laesio textuum mollium"
        : "Soft tissue injury";
  }
}

export function buildSoftTissueBullets(
  softTissue: SoftTissueInjury[],
  mode: DiagnosisRenderMode,
  _verbosity: DiagnosisVerbosity,
): string[] {
  return softTissue.map((injury) => describeSoftTissueDescriptor(injury, mode));
}

export function buildAmputationBullets(
  amputations: AmputationInjury[],
  mode: DiagnosisRenderMode,
  _verbosity: DiagnosisVerbosity,
): string[] {
  const bullets: string[] = [];

  for (const amputation of amputations) {
    const digitLabel =
      amputation.digits.length > 1
        ? mode === "latin_medical"
          ? latinDigitReference(amputation.digits)
          : groupDigits(amputation.digits, mode)
        : amputation.digits.length === 1
          ? mode === "latin_medical"
            ? `digiti ${amputation.digits[0]}`
            : `Dig. ${amputation.digits[0]}`
          : mode === "latin_medical"
            ? "manus"
            : "hand";
    const typeLabel =
      amputation.type === "subtotal"
        ? mode === "latin_medical"
          ? "subtotalis"
          : "Subtotal"
        : amputation.type === "complete"
          ? mode === "latin_medical"
            ? "completa"
            : "Complete"
          : mode === "latin_medical"
            ? ""
            : "";
    const levelLabel =
      mode === "latin_medical"
        ? LATIN_LEVEL_LABELS[amputation.level]
        : LEVEL_LABELS[amputation.level];

    if (mode === "latin_medical") {
      bullets.push(
        `${
          amputation.digits.length > 1
            ? "Amputationes multiplices"
            : LATIN.amputation
        } ${typeLabel} ${digitLabel} ad ${levelLabel}`.trim(),
      );
      if (amputation.isReplantable === true) {
        bullets.push(`Digitus ${LATIN.replantable}`);
      } else if (amputation.isReplantable === false) {
        bullets.push(LATIN.nonReplantable);
      }
      continue;
    }

    const base =
      amputation.digits.length > 1
        ? `${typeLabel} amputations of ${digitLabel}`
        : `${typeLabel} amputation of ${digitLabel}`;
    bullets.push(`${base.trim()} at ${levelLabel}`);
    if (amputation.isReplantable === true) {
      bullets.push("Digit viable for replantation");
    } else if (amputation.isReplantable === false) {
      bullets.push("Non-replantable injury");
    }
  }

  return bullets;
}

function renderBullets(lines: string[]): string[] {
  return lines.filter((line) => line.trim().length > 0);
}

export function generateDiagnosisText(
  normalized: MachineSummary,
  mode: DiagnosisRenderMode,
  verbosity: DiagnosisVerbosity,
): string[] {
  return renderBullets([
    ...buildFractureBullets(normalized.fractures, mode, verbosity),
    ...buildDislocationBullets(normalized.dislocations, mode, verbosity),
    ...buildTendonBullets(normalized.tendons, mode, verbosity),
    ...buildNerveBullets(normalized.nerves, mode, verbosity),
    ...buildVesselBullets(
      normalized.vessels,
      normalized.perfusion,
      mode,
      verbosity,
    ),
    ...buildSoftTissueBullets(normalized.softTissue, mode, verbosity),
    ...buildAmputationBullets(normalized.amputations, mode, verbosity),
  ]);
}

export function generateHandTraumaDiagnosis(
  selection: HandTraumaDiagnosisSelection,
  mode: DiagnosisRenderMode = "shorthand_english",
): HandTraumaDiagnosisOutput | null {
  const normalized = normalizeSelection(selection);
  if (!normalized) return null;

  const headerLine = buildHeaderLine(normalized, mode);
  const shortBullets = generateDiagnosisText(normalized, mode, "short");
  const longBullets = generateDiagnosisText(normalized, mode, "long");

  return {
    headerLine,
    diagnosisTextShort: [
      headerLine,
      ...shortBullets.map((line) => `- ${line}`),
    ].join("\n"),
    diagnosisTextLong: [
      headerLine,
      ...longBullets.map((line) => `- ${line}`),
    ].join("\n"),
    machineSummary: normalized,
  };
}

export function buildSelectionFromGroup(
  group: DiagnosisGroup,
): HandTraumaDiagnosisSelection | null {
  const details = group.diagnosisClinicalDetails;
  const handTrauma = details?.handTrauma;
  if (!handTrauma) return null;

  return {
    laterality: details?.laterality,
    injuryMechanism: details?.injuryMechanism ?? handTrauma.injuryMechanism,
    injuryMechanismOther: details?.injuryMechanismOther,
    affectedDigits: handTrauma.affectedDigits,
    fractures: group.fractures,
    dislocations: handTrauma.dislocations,
    injuredStructures: handTrauma.injuredStructures,
    perfusionStatuses: handTrauma.perfusionStatuses,
    softTissueDescriptors: handTrauma.softTissueDescriptors,
    isHighPressureInjection: handTrauma.isHighPressureInjection,
    isFightBite: handTrauma.isFightBite,
    isCompartmentSyndrome: handTrauma.isCompartmentSyndrome,
    isRingAvulsion: handTrauma.isRingAvulsion,
    amputationLevel: handTrauma.amputationLevel,
    amputationType: handTrauma.amputationType,
    isReplantable: handTrauma.isReplantable,
  };
}

export function getHandTraumaCaseTitle(
  group: DiagnosisGroup | undefined,
): string | null {
  if (!group) return null;
  const selection = buildSelectionFromGroup(group);
  if (!selection) return null;
  return (
    generateHandTraumaDiagnosis(selection, "shorthand_english")?.headerLine ??
    null
  );
}
