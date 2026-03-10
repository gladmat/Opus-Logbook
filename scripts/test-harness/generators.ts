import type {
  CaseDefinition,
  NestedCaseProcedureInput,
  NestedFlapInput,
} from "./types";

// ── Shared generators ─────────────────────────────────────────────────────────

const FACILITIES = [
  "Waikato Hospital",
  "Auckland City Hospital",
  "Middlemore Hospital",
  "Christchurch Hospital",
  "Wellington Hospital",
  "Dunedin Hospital",
];

function nhi(index: number): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l1 = letters[Math.floor(index / 676) % 24]!;
  const l2 = letters[Math.floor(index / 26) % 24]!;
  const l3 = letters[index % 24]!;
  const num = String(1000 + index).slice(-4);
  return `${l1}${l2}${l3}${num}`;
}

function randomDate(): string {
  const now = Date.now();
  const twoYearsAgo = now - 730 * 24 * 60 * 60 * 1000;
  const d = new Date(twoYearsAgo + Math.random() * (now - twoYearsAgo));
  return d.toISOString().split("T")[0]!;
}

function randomTimes(): { startTime: string; endTime: string } {
  const hour = 7 + Math.floor(Math.random() * 10);
  const startMin = Math.floor(Math.random() * 60);
  const durationMin = 15 + Math.floor(Math.random() * 240);
  const endHour = hour + Math.floor((startMin + durationMin) / 60);
  const endMin = (startMin + durationMin) % 60;
  const date = randomDate();
  return {
    startTime: `${date}T${String(hour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00Z`,
    endTime: `${date}T${String(Math.min(endHour, 23)).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00Z`,
  };
}

function randomASA(): number {
  const weights = [0.15, 0.4, 0.3, 0.12, 0.03];
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i]!;
    if (r < cum) return i + 1;
  }
  return 2;
}

function randomBMI(): number {
  return Math.round((18 + Math.random() * 22) * 10) / 10;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomRole(): string {
  return pick(["primary", "primary", "primary", "first_assistant", "second_assistant", "observer"]);
}

function randomUrgency(
  weights?: number[],
): "elective" | "urgent" | "emergency" | "expedited" {
  const urgencies = ["elective", "urgent", "emergency", "expedited"] as const;
  const w = weights ?? [0.65, 0.2, 0.1, 0.05];
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < w.length; i++) {
    cum += w[i]!;
    if (r < cum) return urgencies[i]!;
  }
  return "elective";
}

// ── Helper: build a case procedure entry ──────────────────────────────────────

function proc(
  name: string,
  snomed?: string,
  opts?: { role?: string; seq?: number; specialty?: string },
): NestedCaseProcedureInput {
  return {
    sequenceOrder: opts?.seq ?? 1,
    procedureName: name,
    specialty: opts?.specialty,
    snomedCtCode: snomed,
    snomedCtDisplay: name,
    surgeonRole: opts?.role ?? "primary",
  };
}

// ── Helper: build a flap with anastomoses ─────────────────────────────────────

function freeFlap(
  displayName: string,
  opts: {
    side?: string;
    composition?: string;
    recipientSite?: string;
    recipientSiteRegion?: string;
    ischemiaTimeMinutes?: number;
    arterialRecipient?: string;
    venousRecipient?: string;
    arterialMethod?: string;
    venousMethod?: string;
    couplerSize?: string;
  },
): NestedFlapInput {
  const anastomoses = [];
  if (opts.arterialRecipient) {
    anastomoses.push({
      vesselType: "artery",
      recipientVesselName: opts.arterialRecipient,
      donorVesselName: displayName.includes("ALT")
        ? "Descending branch of LCFA"
        : displayName.includes("DIEP")
          ? "Deep inferior epigastric artery"
          : displayName.includes("fibula")
            ? "Peroneal artery"
            : "Pedicle artery",
      couplingMethod: opts.arterialMethod ?? "hand_sewn",
      configuration: "end_to_end",
      sutureType: "Nylon",
      sutureSize: "9-0",
      patencyConfirmed: true,
    });
  }
  if (opts.venousRecipient) {
    anastomoses.push({
      vesselType: "vein",
      recipientVesselName: opts.venousRecipient,
      donorVesselName: displayName.includes("ALT")
        ? "Venae comitantes of LCFA"
        : displayName.includes("DIEP")
          ? "Deep inferior epigastric vein"
          : displayName.includes("fibula")
            ? "Peroneal vein"
            : "Pedicle vein",
      couplingMethod: opts.venousMethod ?? "coupler",
      couplerSizeMm: opts.couplerSize ?? "2.5",
      configuration: "end_to_end",
      patencyConfirmed: true,
    });
  }

  return {
    flapDisplayName: displayName,
    flapCommonName: displayName,
    side: opts.side,
    composition: opts.composition ?? "fasciocutaneous",
    recipientSite: opts.recipientSite,
    recipientSiteRegion: opts.recipientSiteRegion,
    ischemiaTimeMinutes: opts.ischemiaTimeMinutes,
    flapWidthCm: String(6 + Math.floor(Math.random() * 10)),
    flapLengthCm: String(8 + Math.floor(Math.random() * 15)),
    perforatorCount: 1 + Math.floor(Math.random() * 3),
    anastomoses,
  };
}

// ── Case definition data ──────────────────────────────────────────────────────

function handCases(): CaseDefinition[] {
  const cases: CaseDefinition[] = [];

  // Fractures (H001-H020)
  const fractures: [string, string, string, string, string, string, string][] = [
    ["H001", "Distal radius ORIF volar plate", "Distal radius fracture", "263102004", "Distal radius ORIF", "360046007", "left"],
    ["H002", "Distal radius ORIF dorsal approach", "Distal radius fracture", "263102004", "Distal radius ORIF", "360046007", "right"],
    ["H003", "Distal radius CRIF + K-wire", "Distal radius fracture", "263102004", "Distal radius CRIF", "79733001", "left"],
    ["H004", "Distal radius CRIF pediatric", "Distal radius fracture", "263102004", "Distal radius CRIF", "79733001", "right"],
    ["H005", "5th metacarpal neck fracture", "Metacarpal fracture", "65966004", "Metacarpal CRIF", "79733001", "right"],
    ["H006", "3rd metacarpal shaft ORIF", "Metacarpal fracture", "65966004", "Metacarpal ORIF", "360046007", "left"],
    ["H007", "Proximal phalanx ORIF index", "Phalangeal fracture", "263171006", "Phalanx ORIF", "360046007", "right"],
    ["H008", "Middle phalanx CRIF ring", "Phalangeal fracture", "263171006", "Phalanx CRIF", "79733001", "left"],
    ["H009", "Scaphoid ORIF headless screw", "Scaphoid fracture", "21947006", "Scaphoid ORIF", "360046007", "right"],
    ["H010", "Scaphoid percutaneous fixation", "Scaphoid fracture", "21947006", "Scaphoid percutaneous", "79733001", "left"],
    ["H011", "Bennett fracture-dislocation ORIF", "Bennett's fracture", "20527002", "Bennett's ORIF", "360046007", "right"],
    ["H012", "Rolando fracture ORIF", "Rolando's fracture", "30400005", "Rolando's ORIF", "360046007", "left"],
    ["H013", "Scaphoid nonunion bone graft", "Scaphoid nonunion", "73936003", "Scaphoid nonunion repair", "360046007", "right"],
    ["H014", "Corrective osteotomy malunited DR", "Malunion hand/wrist", "128308003", "Corrective osteotomy", "360046007", "left"],
    ["H015", "Distal radius ORIF + CTR", "Distal radius fracture", "263102004", "Distal radius ORIF", "360046007", "right"],
    ["H016", "4th metacarpal base ORIF", "Metacarpal fracture", "65966004", "Metacarpal ORIF", "360046007", "left"],
    ["H017", "Multiple metacarpal fractures ORIF", "Metacarpal fracture", "65966004", "Metacarpal ORIF", "360046007", "right"],
    ["H018", "Distal phalanx tuft K-wire", "Phalangeal fracture", "263171006", "Phalanx CRIF", "79733001", "left"],
    ["H019", "Distal radius ORIF elderly ASA3", "Distal radius fracture", "263102004", "Distal radius ORIF", "360046007", "right"],
    ["H020", "Intra-articular DR ORIF + bone graft", "Distal radius fracture", "263102004", "Distal radius ORIF", "360046007", "left"],
  ];

  for (const [id, scenario, _dx, _dxSnomed, procName, procSnomed, lat] of fractures) {
    const cp: NestedCaseProcedureInput[] = [proc(procName, procSnomed)];
    // H015: multi-procedure — add CTR
    if (id === "H015") {
      cp.push(proc("Carpal tunnel release (open)", "11921000210102", { seq: 2 }));
    }
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      procedureSnomedCode: procSnomed,
      laterality: lat,
      urgency: id === "H003" || id === "H017" ? "emergency" : "urgent",
      asaScore: id === "H019" ? 3 : undefined,
      caseProcedures: cp,
    });
  }

  // Tendon surgery (H021-H032)
  const tendons: [string, string, string, string, string][] = [
    ["H021", "FDP repair zone II ring", "Flexor tendon repair", "283588004", "right"],
    ["H022", "FDP + FDS repair zone II middle", "Flexor tendon repair", "283588004", "left"],
    ["H023", "FPL repair zone I thumb", "FPL repair", "283588004", "right"],
    ["H024", "Extensor repair zone IV index", "Extensor tendon repair", "283589007", "left"],
    ["H025", "Extensor repair zone VI multiple", "Extensor tendon repair", "283589007", "right"],
    ["H026", "EPL rupture — EIP transfer", "EPL rupture repair", "48188001", "left"],
    ["H027", "Flexor tendon graft staged", "Tendon graft", "283588004", "right"],
    ["H028", "Tendon transfer radial nerve palsy", "Tendon transfer", "31986005", "left"],
    ["H029", "Flexor tenolysis zone II", "Tenolysis", "283588004", "right"],
    ["H030", "Mallet finger K-wire", "Mallet finger repair", "75903009", "left"],
    ["H031", "Boutonniere reconstruction", "Boutonniere repair", "43265003", "right"],
    ["H032", "Swan neck correction", "Swan neck repair", "30714006", "left"],
  ];

  for (const [id, scenario, procName, snomed, lat] of tendons) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: ["H021", "H022", "H023", "H025"].includes(id) ? "emergency" : id === "H024" || id === "H030" ? "urgent" : "elective",
      caseProcedures: [proc(procName, snomed)],
    });
  }

  // Nerve surgery (H033-H040)
  const nerves: [string, string, string, string, string][] = [
    ["H033", "Digital nerve repair radial index", "Digital nerve repair", "283597005", "right"],
    ["H034", "Digital nerve repair ulnar little", "Digital nerve repair", "283597005", "left"],
    ["H035", "Median nerve repair at wrist", "Median nerve repair", "37151006", "right"],
    ["H036", "Ulnar nerve repair at wrist", "Ulnar nerve repair", "68312009", "left"],
    ["H037", "Nerve graft to median nerve", "Nerve graft", "37151006", "right"],
    ["H038", "Nerve conduit digital nerve", "Nerve conduit", "283597005", "left"],
    ["H039", "Neuroma excision painful stump", "Neuroma excision", "47578009", "right"],
    ["H040", "Nerve transfer AIN to ulnar motor", "Nerve transfer", "68312009", "left"],
  ];

  for (const [id, scenario, procName, snomed, lat] of nerves) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: ["H033", "H034", "H035", "H036"].includes(id) ? "emergency" : "elective",
      caseProcedures: [proc(procName, snomed)],
    });
  }

  // Joint procedures (H041-H050)
  const joints: [string, string, string, string][] = [
    ["H041", "Trapeziectomy + LRTI", "Trapeziectomy + LRTI", "right"],
    ["H042", "Trapeziectomy + suture button", "Trapeziectomy", "left"],
    ["H043", "PIP arthroplasty silicone", "PIP arthroplasty", "right"],
    ["H044", "MCP arthroplasty RA", "MCP arthroplasty", "left"],
    ["H045", "DIP arthrodesis OA", "DIP arthrodesis", "right"],
    ["H046", "PIP arthrodesis post-trauma", "PIP arthrodesis", "left"],
    ["H047", "Wrist arthroscopy diagnostic", "Wrist arthroscopy", "right"],
    ["H048", "Proximal row carpectomy", "PRC", "left"],
    ["H049", "Wrist arthrodesis RA", "Wrist arthrodesis", "right"],
    ["H050", "Wrist denervation", "Wrist denervation", "left"],
  ];

  for (const [id, scenario, procName, lat] of joints) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: "elective",
      caseProcedures: [proc(procName)],
    });
  }

  // Compression neuropathies (H051-H060)
  const compression: [string, string, string, string][] = [
    ["H051", "Open CTR", "CTR open", "right"],
    ["H052", "Open CTR", "CTR open", "left"],
    ["H053", "Endoscopic CTR", "CTR endoscopic", "right"],
    ["H054", "Cubital tunnel decompression", "Cubital tunnel decompression", "left"],
    ["H055", "Cubital tunnel transposition", "Cubital tunnel transposition", "right"],
    ["H056", "Bilateral CTR", "CTR open", "bilateral"],
    ["H057", "De Quervain's release", "De Quervain's release", "right"],
    ["H058", "Trigger finger release ring", "Trigger finger release", "left"],
    ["H059", "Trigger thumb release", "Trigger thumb release", "right"],
    ["H060", "Guyon's canal release", "Guyon's canal release", "left"],
  ];

  for (const [id, scenario, procName, lat] of compression) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: "elective",
      caseProcedures: [proc(procName)],
    });
  }

  // Dupuytren's (H061-H066)
  const dupuytrens: [string, string, string, string][] = [
    ["H061", "Limited fasciectomy ring", "Limited fasciectomy", "right"],
    ["H062", "Limited fasciectomy little + ring", "Limited fasciectomy", "left"],
    ["H063", "Dermofasciectomy + FTSG little", "Dermofasciectomy", "right"],
    ["H064", "Needle fasciotomy", "Needle fasciotomy", "left"],
    ["H065", "Radical fasciectomy", "Radical fasciectomy", "right"],
    ["H066", "Collagenase injection", "Collagenase injection", "left"],
  ];

  for (const [id, scenario, procName, lat] of dupuytrens) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: "elective",
      caseProcedures: [proc(procName)],
    });
  }

  // Soft tissue coverage (H067-H072)
  const softTissue: [string, string, string, string, string][] = [
    ["H067", "Cross-finger flap volar index", "Cross-finger flap", "right", "urgent"],
    ["H068", "Moberg advancement thumb tip", "Moberg flap", "left", "urgent"],
    ["H069", "FDMA flap", "FDMA flap", "right", "urgent"],
    ["H070", "Digital replantation ring", "Digital replantation", "left", "emergency"],
    ["H071", "Nail bed repair + K-wire", "Nail bed repair", "right", "emergency"],
    ["H072", "Homodigital island flap middle", "Homodigital island flap", "left", "urgent"],
  ];

  for (const [id, scenario, procName, lat, urg] of softTissue) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: urg,
      caseProcedures: [proc(procName)],
    });
  }

  // Congenital (H073-H076)
  const congenital: [string, string, string, string][] = [
    ["H073", "Syndactyly release 3rd web", "Syndactyly release", "right"],
    ["H074", "Polydactyly excision radial", "Polydactyly excision", "left"],
    ["H075", "Thumb hypoplasia reconstruction", "Thumb hypoplasia repair", "right"],
    ["H076", "Clinodactyly correction osteotomy", "Clinodactyly correction", "left"],
  ];

  for (const [id, scenario, procName, lat] of congenital) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: "elective",
      caseProcedures: [proc(procName)],
    });
  }

  // Other hand (H077-H080)
  const other: [string, string, string, string, string][] = [
    ["H077", "Ganglion excision dorsal wrist", "Ganglion excision", "right", "elective"],
    ["H078", "Giant cell tumour excision", "GCT excision", "left", "elective"],
    ["H079", "Ray amputation index", "Ray amputation", "right", "urgent"],
    ["H080", "Steroid injection trigger finger", "Steroid injection", "left", "elective"],
  ];

  for (const [id, scenario, procName, lat, urg] of other) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "hand_wrist",
      procedureDisplayName: procName,
      laterality: lat,
      urgency: urg,
      caseProcedures: [proc(procName)],
    });
  }

  return cases;
}

function skinCancerCases(): CaseDefinition[] {
  const cases: CaseDefinition[] = [];

  // BCC (SC001-SC020)
  const bcc: [string, string, string][] = [
    ["SC001", "BCC nose tip direct closure", "midline"],
    ["SC002", "BCC forehead direct closure", "midline"],
    ["SC003", "BCC temple + rotation flap", "left"],
    ["SC004", "BCC nasal ala + bilobed flap", "right"],
    ["SC005", "BCC ear helix wedge", "left"],
    ["SC006", "BCC upper lip + advancement", "midline"],
    ["SC007", "BCC trunk elliptical excision", "midline"],
    ["SC008", "BCC forearm excision + FTSG", "right"],
    ["SC009", "BCC scalp excision + rotation flap", "left"],
    ["SC010", "BCC eyelid + reconstruction", "right"],
    ["SC011", "BCC chest wall wide excision", "midline"],
    ["SC012", "BCC shoulder excision + SSG", "left"],
    ["SC013", "Recurrent BCC nose + forehead flap", "midline"],
    ["SC014", "BCC periorbital + cervicofacial", "left"],
    ["SC015", "BCC leg elliptical", "right"],
    ["SC016", "BCC hand dorsum", "left"],
    ["SC017", "BCC neck excision + direct", "right"],
    ["SC018", "Multi-focal BCC nose 2 lesions", "midline"],
    ["SC019", "BCC postauricular", "left"],
    ["SC020", "BCC incomplete re-excision", "right"],
  ];

  for (const [id, scenario, lat] of bcc) {
    const cp: NestedCaseProcedureInput[] = [proc("BCC excision", "177164001")];
    // Multi-procedure cases
    if (["SC003", "SC009"].includes(id)) cp.push(proc("Rotation flap", undefined, { seq: 2 }));
    if (id === "SC004") cp.push(proc("Bilobed flap", undefined, { seq: 2 }));
    if (id === "SC006") cp.push(proc("Advancement flap", undefined, { seq: 2 }));
    if (id === "SC008") cp.push(proc("Full thickness skin graft", undefined, { seq: 2 }));
    if (id === "SC012") cp.push(proc("Split thickness skin graft", undefined, { seq: 2 }));
    if (id === "SC013") cp.push(proc("Forehead flap", undefined, { seq: 2 }));

    cases.push({
      caseId: id,
      scenario,
      specialty: "skin_cancer",
      procedureDisplayName: "BCC excision",
      procedureSnomedCode: "177164001",
      laterality: lat,
      urgency: "elective",
      caseProcedures: cp,
    });
  }

  // SCC (SC021-SC035)
  const scc: [string, string, string][] = [
    ["SC021", "SCC dorsum hand + FTSG", "right"],
    ["SC022", "SCC scalp wide excision + SSG", "left"],
    ["SC023", "SCC lower lip wedge excision", "midline"],
    ["SC024", "SCC ear wedge excision", "left"],
    ["SC025", "SCC forearm excision", "right"],
    ["SC026", "SCC temple + rotation flap", "left"],
    ["SC027", "SCC nose + forehead flap", "midline"],
    ["SC028", "SCC leg + direct closure", "right"],
    ["SC029", "SCC preauricular + cervicofacial", "left"],
    ["SC030", "SCC trunk", "midline"],
    ["SC031", "SCC finger amputation", "right"],
    ["SC032", "SCC in situ Bowen's", "left"],
    ["SC033", "SCC parotidectomy + neck dissection", "right"],
    ["SC034", "SCC incomplete re-excision", "left"],
    ["SC035", "SCC + sentinel lymph node biopsy", "right"],
  ];

  for (const [id, scenario, lat] of scc) {
    const cp: NestedCaseProcedureInput[] = [proc("SCC excision", "177164001")];
    if (id === "SC021") cp.push(proc("FTSG", undefined, { seq: 2 }));
    if (id === "SC022") cp.push(proc("SSG", undefined, { seq: 2 }));
    if (id === "SC026") cp.push(proc("Rotation flap", undefined, { seq: 2 }));
    if (id === "SC027") cp.push(proc("Forehead flap", undefined, { seq: 2 }));
    if (id === "SC033") {
      cp.push(proc("Parotidectomy", undefined, { seq: 2 }));
      cp.push(proc("Neck dissection", undefined, { seq: 3 }));
    }
    if (id === "SC035") cp.push(proc("Sentinel lymph node biopsy", undefined, { seq: 2 }));

    cases.push({
      caseId: id,
      scenario,
      specialty: "skin_cancer",
      procedureDisplayName: "SCC excision",
      laterality: lat,
      urgency: "elective",
      caseProcedures: cp,
    });
  }

  // Melanoma (SC036-SC050)
  const melanoma: [string, string, string][] = [
    ["SC036", "Melanoma in situ back", "midline"],
    ["SC037", "Thin melanoma arm", "right"],
    ["SC038", "Melanoma 0.9mm leg + SLNB", "left"],
    ["SC039", "Melanoma 1.2mm back + SLNB", "midline"],
    ["SC040", "Melanoma 2.1mm arm + SLNB", "right"],
    ["SC041", "Melanoma 3.5mm leg + SLNB", "left"],
    ["SC042", "Melanoma 5.0mm trunk + SLNB", "midline"],
    ["SC043", "Melanoma 1.0mm face WLE", "right"],
    ["SC044", "Subungual melanoma + amputation", "right"],
    ["SC045", "Desmoplastic melanoma", "left"],
    ["SC046", "Melanoma head + SLNB + rotation flap", "left"],
    ["SC047", "Recurrent melanoma WLE", "right"],
    ["SC048", "Melanoma with satellite WLE", "left"],
    ["SC049", "Amelanotic melanoma", "right"],
    ["SC050", "Lentigo maligna face", "left"],
  ];

  for (const [id, scenario, lat] of melanoma) {
    const cp: NestedCaseProcedureInput[] = [proc("Wide local excision melanoma", "177164001")];
    const needsSLNB = ["SC038", "SC039", "SC040", "SC041", "SC042", "SC043", "SC044", "SC045", "SC046", "SC048", "SC049"];
    if (needsSLNB.includes(id)) cp.push(proc("SLNB", undefined, { seq: 2 }));
    if (id === "SC044") cp[0] = proc("Amputation for melanoma", undefined);
    if (id === "SC046") cp.push(proc("Rotation flap", undefined, { seq: 3 }));

    cases.push({
      caseId: id,
      scenario,
      specialty: "skin_cancer",
      procedureDisplayName: "WLE melanoma",
      laterality: lat,
      urgency: "elective",
      caseProcedures: cp,
    });
  }

  // Other/Benign/Mohs (SC051-SC065)
  const otherSkin: [string, string, string][] = [
    ["SC051", "Merkel cell carcinoma face", "right"],
    ["SC052", "DFSP trunk", "midline"],
    ["SC053", "Atypical fibroxanthoma scalp", "left"],
    ["SC054", "Keratoacanthoma forearm", "right"],
    ["SC055", "Sebaceous carcinoma eyelid", "left"],
    ["SC056", "Benign naevus excision face", "right"],
    ["SC057", "Lipoma excision back", "midline"],
    ["SC058", "Epidermal cyst excision scalp", "left"],
    ["SC059", "Seborrhoeic keratosis biopsy", "right"],
    ["SC060", "Pyogenic granuloma finger", "left"],
    ["SC061", "Post-Mohs nose bilobed flap", "midline"],
    ["SC062", "Post-Mohs cheek cervicofacial", "right"],
    ["SC063", "Post-Mohs forehead FTSG", "midline"],
    ["SC064", "Post-Mohs eyelid Tenzel flap", "left"],
    ["SC065", "Post-Mohs ear wedge closure", "right"],
  ];

  for (const [id, scenario, lat] of otherSkin) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "skin_cancer",
      procedureDisplayName: scenario.includes("Post-Mohs") ? "Mohs defect reconstruction" : "Lesion excision",
      laterality: lat,
      urgency: "elective",
      caseProcedures: [proc(scenario.includes("Post-Mohs") ? "Mohs defect reconstruction" : "Lesion excision")],
    });
  }

  return cases;
}

function breastCases(): CaseDefinition[] {
  const cases: CaseDefinition[] = [];

  // Free flap breast (B001-B015)
  const breastFlaps: [string, string, string, string, string, string | undefined, number, string?][] = [
    ["B001", "DIEP L breast", "DIEP flap", "IMA", "IMA vein", "3.0", 55, "left"],
    ["B002", "DIEP R breast", "DIEP flap", "IMA", "IMA vein", "2.5", 48, "right"],
    ["B003", "DIEP bilateral", "DIEP flap", "IMA", "IMA vein", "3.0", 62, "bilateral"],
    ["B004", "MS-TRAM L breast", "MS-TRAM flap", "TD artery", "TD vein", "3.0", 45, "left"],
    ["B005", "Free TRAM R breast", "Free TRAM flap", "IMA", "IMA vein", "3.0", 50, "right"],
    ["B006", "SIEA L breast", "SIEA flap", "IMA", "IMA vein", "2.5", 42, "left"],
    ["B007", "PAP R breast", "PAP flap", "IMA", "IMA vein", "2.5", 65, "right"],
    ["B008", "TUG L breast", "TUG flap", "IMA", "IMA vein", "2.5", 52, "left"],
    ["B009", "LAP R breast", "LAP flap", "IMA", "IMA vein", "2.5", 58, "right"],
    ["B010", "SGAP L breast", "SGAP flap", "TD artery", "TD vein", undefined, 70, "left"],
    ["B011", "IGAP R breast", "IGAP flap", "IMA", "IMA vein", "2.5", 68, "right"],
    ["B012", "DIEP + implant stacked", "DIEP flap", "IMA", "IMA vein", "3.0", 55, "left"],
    ["B013", "Free latissimus dorsi", "Latissimus dorsi free flap", "TD artery", "TD vein", undefined, 40, "right"],
    ["B014", "DIEP delayed reconstruction", "DIEP flap", "IMA", "IMA vein", "3.0", 52, "left"],
    ["B015", "DIEP with venous congestion", "DIEP flap", "IMA", "IMA vein", "3.0", 60, "right"],
  ];

  for (const [id, scenario, flapName, artRecip, venRecip, coupler, isch, side] of breastFlaps) {
    const flaps: NestedFlapInput[] = [
      freeFlap(flapName, {
        side,
        composition: "fasciocutaneous",
        recipientSite: "Breast",
        recipientSiteRegion: "Chest",
        ischemiaTimeMinutes: isch,
        arterialRecipient: artRecip,
        venousRecipient: venRecip,
        arterialMethod: "hand_sewn",
        venousMethod: coupler ? "coupler" : "hand_sewn",
        couplerSize: coupler,
      }),
    ];

    // B003 bilateral: add second flap
    if (id === "B003") {
      flaps.push(
        freeFlap(flapName, {
          side: "right",
          composition: "fasciocutaneous",
          recipientSite: "Breast",
          recipientSiteRegion: "Chest",
          ischemiaTimeMinutes: 58,
          arterialRecipient: artRecip,
          venousRecipient: venRecip,
          arterialMethod: "hand_sewn",
          venousMethod: "coupler",
          couplerSize: coupler,
        }),
      );
    }

    cases.push({
      caseId: id,
      scenario,
      specialty: "breast",
      procedureDisplayName: `Free flap breast reconstruction — ${flapName}`,
      laterality: side,
      urgency: "elective",
      caseProcedures: [proc(`Free flap breast reconstruction — ${flapName}`)],
      flaps,
    });
  }

  // Implant-based (B016-B027)
  const implantBased: [string, string][] = [
    ["B016", "Direct-to-implant post-mastectomy"],
    ["B017", "Tissue expander placement"],
    ["B018", "Expander to implant exchange"],
    ["B019", "Pre-pectoral implant ADM"],
    ["B020", "Bilateral implant reconstruction"],
    ["B021", "Implant + contralateral symmetry"],
    ["B022", "Failed implant → DIEP salvage"],
    ["B023", "Expander fill outpatient"],
    ["B024", "Latissimus dorsi + implant"],
    ["B025", "Implant-based + PMRT planned"],
    ["B026", "Capsulectomy + implant exchange"],
    ["B027", "Bilateral prophylactic mastectomy + implants"],
  ];

  for (const [id, scenario] of implantBased) {
    const flaps: NestedFlapInput[] | undefined =
      id === "B022"
        ? [
            freeFlap("DIEP flap", {
              side: "left",
              recipientSite: "Breast",
              recipientSiteRegion: "Chest",
              ischemiaTimeMinutes: 55,
              arterialRecipient: "IMA",
              venousRecipient: "IMA vein",
              venousMethod: "coupler",
              couplerSize: "3.0",
            }),
          ]
        : undefined;

    cases.push({
      caseId: id,
      scenario,
      specialty: "breast",
      procedureDisplayName: scenario,
      urgency: "elective",
      caseProcedures: [proc(scenario)],
      flaps,
    });
  }

  // Oncoplastic/nipple/aesthetic/revision (B028-B055)
  const rest: [string, string][] = [
    ["B028", "Therapeutic mammoplasty"],
    ["B029", "WLE + volume displacement"],
    ["B030", "Batwing mastopexy excision"],
    ["B031", "Round block technique"],
    ["B032", "Level II oncoplastic rotation flap"],
    ["B033", "LICAP/AICAP perforator flap"],
    ["B034", "Oncoplastic reduction + contralateral symmetry"],
    ["B035", "Wise pattern therapeutic mammoplasty"],
    ["B036", "Contralateral symmetrisation mastopexy"],
    ["B037", "Contralateral symmetrisation reduction"],
    ["B038", "Nipple reconstruction CV flap"],
    ["B039", "Nipple reconstruction skate flap"],
    ["B040", "Areola tattoo"],
    ["B041", "Nipple-sparing mastectomy"],
    ["B042", "Inverted nipple correction"],
    ["B043", "Augmentation mammoplasty dual plane"],
    ["B044", "Mastopexy Wise pattern"],
    ["B045", "Breast reduction Wise pattern"],
    ["B046", "Fat grafting to breast"],
    ["B047", "Implant malposition correction"],
    ["B048", "Dog-ear revision"],
    ["B049", "Scar revision post-mastectomy"],
    ["B050", "Capsulectomy BIA-ALCL concern"],
    ["B051", "Implant removal en-bloc"],
    ["B052", "Autologous fat transfer serial 2nd"],
    ["B053", "Flap debulking"],
    ["B054", "Flap revision + liposuction"],
    ["B055", "Pedicled TRAM flap"],
  ];

  for (const [id, scenario] of rest) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "breast",
      procedureDisplayName: scenario,
      urgency: "elective",
      caseProcedures: [proc(scenario)],
    });
  }

  return cases;
}

function headNeckCases(): CaseDefinition[] {
  const cases: CaseDefinition[] = [];

  // Facial fractures (HN001-HN015)
  const fractures: [string, string, string][] = [
    ["HN001", "Mandible fracture ORIF angle", "emergency"],
    ["HN002", "Mandible fracture ORIF symphysis", "emergency"],
    ["HN003", "Mandible fracture ORIF condyle", "emergency"],
    ["HN004", "ZMC fracture ORIF", "emergency"],
    ["HN005", "Orbital floor fracture repair + mesh", "urgent"],
    ["HN006", "Orbital blow-out observation then ORIF", "expedited"],
    ["HN007", "Le Fort I fracture ORIF", "emergency"],
    ["HN008", "Le Fort II fracture ORIF", "emergency"],
    ["HN009", "NOE fracture repair", "emergency"],
    ["HN010", "Frontal sinus fracture repair", "emergency"],
    ["HN011", "Zygomatic arch fracture Gillies lift", "urgent"],
    ["HN012", "Panfacial fracture staged", "emergency"],
    ["HN013", "Nasal fracture MUA", "urgent"],
    ["HN014", "Mandible fracture MMF only", "urgent"],
    ["HN015", "Orbital floor late repair + calvarial graft", "elective"],
  ];

  for (const [id, scenario, urg] of fractures) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "head_neck",
      procedureDisplayName: scenario,
      urgency: urg,
      caseProcedures: [proc(scenario)],
    });
  }

  // Free flap H&N (HN016-HN025)
  const hnFlaps: [string, string, string, string, string, number][] = [
    ["HN016", "Free ALT mandible SCC", "ALT flap", "Facial artery", "External jugular vein", 65],
    ["HN017", "Free radial forearm floor of mouth", "Radial forearm flap", "Facial artery", "External jugular vein", 50],
    ["HN018", "Free fibula mandible recon", "Fibula osteocutaneous flap", "Facial artery", "External jugular vein", 75],
    ["HN019", "Free scapula maxillary recon", "Scapula flap", "STA", "External jugular vein", 80],
    ["HN020", "Free ALT pharyngeal defect", "ALT flap", "STA", "IJV", 60],
    ["HN021", "Free gracilis facial reanimation", "Gracilis flap", "Facial artery", "Facial vein", 55],
    ["HN022", "Free fibula + skin paddle", "Fibula flap", "Facial artery", "Facial vein", 85],
    ["HN023", "Free jejunum pharyngo-oesophageal", "Jejunum flap", "STA", "IJV", 45],
    ["HN024", "Free SCIP scalp defect", "SCIP flap", "STA", "STV", 50],
    ["HN025", "Free latissimus dorsi scalp", "Latissimus dorsi flap", "STA", "STV", 70],
  ];

  for (const [id, scenario, flapName, artRecip, venRecip, isch] of hnFlaps) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "head_neck",
      procedureDisplayName: `Free flap H&N — ${flapName}`,
      urgency: "elective",
      caseProcedures: [proc(`Free flap H&N — ${flapName}`)],
      flaps: [
        freeFlap(flapName, {
          side: pick(["left", "right"]),
          recipientSite: "Head and neck",
          recipientSiteRegion: "Head & Neck",
          ischemiaTimeMinutes: isch,
          arterialRecipient: artRecip,
          venousRecipient: venRecip,
          arterialMethod: "hand_sewn",
          venousMethod: "hand_sewn",
        }),
      ],
    });
  }

  // Other H&N (HN026-HN055)
  const otherHN: [string, string][] = [
    ["HN026", "Cross-face nerve graft stage 1"],
    ["HN027", "Free gracilis transfer stage 2"],
    ["HN028", "Temporalis muscle transfer"],
    ["HN029", "Static facial sling"],
    ["HN030", "Brow lift for facial palsy"],
    ["HN031", "Forehead flap nose stage 1"],
    ["HN032", "Forehead flap division stage 2"],
    ["HN033", "Nasolabial flap"],
    ["HN034", "Cervicofacial flap cheek"],
    ["HN035", "Full-thickness eyelid reconstruction"],
    ["HN036", "Lower lip Karapandzic"],
    ["HN037", "Upper lip Abbe"],
    ["HN038", "Ear reconstruction Nagata stage 1"],
    ["HN039", "Ear reconstruction elevation stage 2"],
    ["HN040", "Total nose reconstruction"],
    ["HN041", "Superficial parotidectomy"],
    ["HN042", "Total parotidectomy + nerve dissection"],
    ["HN043", "Neck dissection selective"],
    ["HN044", "Neck dissection modified radical"],
    ["HN045", "Auriculectomy partial"],
    ["HN046", "Rhinectomy partial"],
    ["HN047", "Temporal bone resection"],
    ["HN048", "Dermoid cyst excision"],
    ["HN049", "Branchial cleft cyst excision"],
    ["HN050", "Sialendoscopy"],
    ["HN051", "Submandibular gland excision"],
    ["HN052", "TMJ arthroscopy"],
    ["HN053", "Facial implant chin"],
    ["HN054", "Buccal fat pad removal"],
    ["HN055", "Scar revision facial"],
  ];

  for (const [id, scenario] of otherHN) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "head_neck",
      procedureDisplayName: scenario,
      urgency: "elective",
      caseProcedures: [proc(scenario)],
    });
  }

  return cases;
}

function generalCases(): CaseDefinition[] {
  const defs: [string, string][] = [
    ["G001", "STSG meshed lower leg chronic wound"],
    ["G002", "STSG unmeshed hand dorsum"],
    ["G003", "FTSG nasal defect"],
    ["G004", "FTSG fingertip"],
    ["G005", "FTSG eyelid"],
    ["G006", "STSG large scalp defect"],
    ["G007", "Integra + SSG 2 stage"],
    ["G008", "SSG burn donor site"],
    ["G009", "Matriderm + SSG"],
    ["G010", "FTSG penis hypospadias"],
    ["G011", "NPWT application"],
    ["G012", "NPWT change"],
    ["G013", "Surgical debridement diabetic foot"],
    ["G014", "Surgical debridement chronic wound"],
    ["G015", "Wound closure delayed primary"],
    ["G016", "Debridement + NPWT"],
    ["G017", "Wound exploration + washout"],
    ["G018", "Larval therapy application"],
    ["G019", "NPWT with instillation"],
    ["G020", "Wound bed prep + graft"],
    ["G021", "Sacral pressure sore debridement"],
    ["G022", "Ischial pressure sore flap"],
    ["G023", "Trochanteric pressure sore TFL flap"],
    ["G024", "Sacral V-Y advancement"],
    ["G025", "Ischial posterior thigh flap"],
    ["G026", "Heel pressure sore debridement"],
    ["G027", "Recurrent sacral re-advancement"],
    ["G028", "Trochanteric ALT pedicled"],
    ["G029", "V-Y advancement fingertip"],
    ["G030", "Limberg rhomboid flap trunk"],
    ["G031", "Keystone flap lower leg"],
    ["G032", "Z-plasty scar contracture"],
    ["G033", "W-plasty facial scar"],
    ["G034", "Propeller flap lower leg"],
    ["G035", "Bilobed flap nasal dorsum"],
    ["G036", "Advancement flap trunk"],
    ["G037", "HS excision axillary + SSG"],
    ["G038", "HS excision groin + NPWT"],
    ["G039", "HS deroofing axillary"],
    ["G040", "HS excision perianal + flap"],
    ["G041", "Venous malformation excision"],
    ["G042", "AVM excision + reconstruction"],
    ["G043", "Lymphatic malformation sclerotherapy"],
    ["G044", "Top surgery bilateral mastectomy"],
    ["G045", "Breast augmentation MTF"],
    ["G046", "Tracheal shave"],
    ["G047", "Keloid excision + steroid injection"],
    ["G048", "Hypertrophic scar revision"],
    ["G049", "Skin tag removal multiple"],
    ["G050", "Foreign body removal"],
  ];

  return defs.map(([id, scenario]) => ({
    caseId: id,
    scenario,
    specialty: "general",
    procedureDisplayName: scenario,
    urgency: randomUrgency([0.5, 0.3, 0.15, 0.05]),
    caseProcedures: [proc(scenario)],
  }));
}

function aestheticsCases(): CaseDefinition[] {
  const defs: [string, string][] = [
    ["A001", "Deep plane facelift"],
    ["A002", "SMAS facelift"],
    ["A003", "Mini facelift short scar"],
    ["A004", "Neck lift isolated"],
    ["A005", "Facelift + fat grafting"],
    ["A006", "Upper blepharoplasty bilateral"],
    ["A007", "Lower blepharoplasty bilateral"],
    ["A008", "Combined upper + lower blepharoplasty"],
    ["A009", "Upper bleph + brow lift"],
    ["A010", "Endoscopic brow lift"],
    ["A011", "Direct brow lift"],
    ["A012", "Open rhinoplasty cosmetic"],
    ["A013", "Closed rhinoplasty"],
    ["A014", "Revision rhinoplasty"],
    ["A015", "Septorhinoplasty functional + aesthetic"],
    ["A016", "Rhinoplasty + alar reduction"],
    ["A017", "Pinnaplasty bilateral"],
    ["A018", "Earlobe repair"],
    ["A019", "Earlobe reduction"],
    ["A020", "Botulinum toxin glabella"],
    ["A021", "Botulinum toxin crow's feet"],
    ["A022", "Botulinum toxin forehead"],
    ["A023", "Dermal filler nasolabial"],
    ["A024", "Dermal filler lips"],
    ["A025", "Dermal filler cheek volumisation"],
    ["A026", "Dermal filler tear trough"],
    ["A027", "PRP therapy face"],
    ["A028", "Chemical peel TCA medium depth"],
    ["A029", "CO2 laser resurfacing"],
    ["A030", "Erbium YAG laser"],
    ["A031", "Microneedling"],
    ["A032", "IPL treatment"],
    ["A033", "FUE hair transplant"],
    ["A034", "FUT strip harvest"],
    ["A035", "Eyebrow transplant"],
    ["A036", "Brachioplasty"],
    ["A037", "Thigh lift"],
    ["A038", "Labiaplasty"],
    ["A039", "Thread lift"],
    ["A040", "Fat transfer facial rejuvenation"],
  ];

  return defs.map(([id, scenario]) => ({
    caseId: id,
    scenario,
    specialty: "aesthetics",
    procedureDisplayName: scenario,
    urgency: "elective" as const,
    stayType: id >= "A020" && id <= "A032" ? "outpatient" : undefined,
    caseProcedures: [proc(scenario)],
  }));
}

function orthoplasticCases(): CaseDefinition[] {
  const cases: CaseDefinition[] = [];

  // Flap cases
  const flapCases: [string, string, string, string, string, number][] = [
    ["O001", "Free ALT open tibial fracture GA IIIB", "ALT flap", "Anterior tibial artery", "Vena comitans", 65],
    ["O002", "Free ALT foot defect", "ALT flap", "Dorsalis pedis artery", "Great saphenous vein", 70],
    ["O003", "Free latissimus dorsi exposed hardware", "Latissimus dorsi flap", "Posterior tibial artery", "Vena comitans", 55],
    ["O004", "Free gracilis small defect knee", "Gracilis flap", "Geniculate artery", "Geniculate vein", 45],
    ["O005", "Free scapular flap heel defect", "Scapula flap", "Posterior tibial artery", "Vena comitans", 75],
    ["O018", "Free fibula tibial defect", "Fibula flap", "Anterior tibial artery", "Vena comitans", 80],
    ["O019", "Free ALT thigh defect post-sarcoma", "ALT flap", "Femoral artery branch", "Great saphenous vein", 60],
    ["O023", "Free TDAP flap upper limb", "TDAP flap", "Radial artery", "Cephalic vein", 55],
    ["O032", "Free flap + bone transport", "ALT flap", "Posterior tibial artery", "Vena comitans", 85],
    ["O035", "Free medial femoral condyle scaphoid", "Medial femoral condyle flap", "Radial artery", "Cephalic vein", 50],
  ];

  for (const [id, scenario, flapName, artRecip, venRecip, isch] of flapCases) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "orthoplastic",
      procedureDisplayName: `Free flap — ${flapName}`,
      urgency: id === "O001" ? "emergency" : "elective",
      caseProcedures: [proc(`Free flap — ${flapName}`)],
      flaps: [
        freeFlap(flapName, {
          side: pick(["left", "right"]),
          recipientSite: "Lower limb",
          recipientSiteRegion: "Lower Limb",
          ischemiaTimeMinutes: isch,
          arterialRecipient: artRecip,
          venousRecipient: venRecip,
          arterialMethod: "hand_sewn",
          venousMethod: "hand_sewn",
        }),
      ],
    });
  }

  // Non-flap cases
  const nonFlap: [string, string, string?][] = [
    ["O006", "Pedicled gastrocnemius flap proximal tibia"],
    ["O007", "Pedicled soleus flap mid tibia"],
    ["O008", "Pedicled sural artery flap ankle"],
    ["O009", "Propeller flap lower leg defect"],
    ["O010", "Cross-leg flap staged"],
    ["O011", "STSG meshed leg wound"],
    ["O012", "Dermal substitute + SSG staged"],
    ["O013", "NPWT open fracture"],
    ["O014", "NPWT change + debridement"],
    ["O015", "Fasciotomy compartment syndrome", "emergency"],
    ["O016", "Fasciotomy closure delayed primary"],
    ["O017", "Surgical debridement open fracture", "emergency"],
    ["O020", "Ilizarov frame wound care"],
    ["O021", "Pedicled ALT groin thigh"],
    ["O022", "STSG fasciotomy wounds"],
    ["O024", "Pedicled radial forearm flap hand"],
    ["O025", "Keystone flap lower leg"],
    ["O026", "V-Y advancement pretibial laceration"],
    ["O027", "Vacuum closure + SSG"],
    ["O028", "Amputation below knee"],
    ["O029", "Amputation through knee"],
    ["O030", "Amputation above knee"],
    ["O031", "Stump revision"],
    ["O033", "Distally-based peroneal artery flap"],
    ["O034", "Medial plantar artery flap heel"],
  ];

  for (const [id, scenario, urgOverride] of nonFlap) {
    cases.push({
      caseId: id,
      scenario,
      specialty: "orthoplastic",
      procedureDisplayName: scenario,
      urgency: urgOverride ?? randomUrgency([0.4, 0.35, 0.15, 0.1]),
      caseProcedures: [proc(scenario)],
    });
  }

  return cases;
}

function bodyContouringCases(): CaseDefinition[] {
  const defs: [string, string][] = [
    ["BC001", "Full abdominoplasty + liposuction flanks"],
    ["BC002", "Full abdominoplasty diastasis repair"],
    ["BC003", "Mini abdominoplasty"],
    ["BC004", "Reverse abdominoplasty"],
    ["BC005", "Fleur-de-lis abdominoplasty"],
    ["BC006", "Abdominoplasty + umbilical hernia repair"],
    ["BC007", "Lipoabdominoplasty"],
    ["BC008", "Liposuction abdomen VASER"],
    ["BC009", "Liposuction flanks bilateral"],
    ["BC010", "Liposuction thighs bilateral"],
    ["BC011", "Liposuction arms bilateral"],
    ["BC012", "Liposuction chin submental"],
    ["BC013", "BBL fat transfer to buttocks"],
    ["BC014", "Buttock implants"],
    ["BC015", "Buttock lift"],
    ["BC016", "Lower body lift"],
    ["BC017", "Upper body lift"],
    ["BC018", "Brachioplasty bilateral"],
    ["BC019", "Medial thigh lift bilateral"],
    ["BC020", "Lateral thigh lift"],
    ["BC021", "Panniculectomy"],
    ["BC022", "Monsplasty"],
    ["BC023", "Belt lipectomy"],
    ["BC024", "Gynecomastia excision"],
    ["BC025", "Rib removal waist contouring"],
    ["BC026", "Calf implants"],
    ["BC027", "Pectoral implants"],
    ["BC028", "Abdominoplasty revision dog ear"],
    ["BC029", "Liposuction male chest"],
    ["BC030", "Post-bariatric total body staged stage 1"],
  ];

  return defs.map(([id, scenario]) => ({
    caseId: id,
    scenario,
    specialty: "body_contouring",
    procedureDisplayName: scenario,
    urgency: "elective" as const,
    caseProcedures: [proc(scenario)],
  }));
}

function burnsCases(): CaseDefinition[] {
  const cases: CaseDefinition[] = [];

  const defs: [string, string, string][] = [
    ["BU001", "Partial thickness burn hand dressings", "urgent"],
    ["BU002", "Full thickness burn forearm tangential excision + SSG", "emergency"],
    ["BU003", "Flash burn face conservative", "urgent"],
    ["BU004", "Scald burn child torso dressings", "emergency"],
    ["BU005", "Full thickness burn leg excision + SSG", "emergency"],
    ["BU006", "Contact burn hand SSG", "urgent"],
    ["BU007", "Chemical burn hand irrigation + debridement", "emergency"],
    ["BU008", "Electrical burn hand debridement", "emergency"],
    ["BU009", "Major burn escharotomy chest 30% TBSA", "emergency"],
    ["BU010", "Major burn escharotomy limbs 25% TBSA", "emergency"],
    ["BU011", "Burns Biobrane application", "urgent"],
    ["BU012", "Burns ReCell spray skin", "urgent"],
    ["BU013", "Burns serial SSG harvests 40% TBSA", "emergency"],
    ["BU014", "Burns Integra application 15% TBSA", "emergency"],
    ["BU015", "Perineal burn specialised dressing", "emergency"],
    ["BU016", "Burn contracture release neck + SSG", "elective"],
    ["BU017", "Burn contracture release axilla + Z-plasty", "elective"],
    ["BU018", "Burn contracture release elbow + flap", "elective"],
    ["BU019", "Burn scar revision face", "elective"],
    ["BU020", "Burn scar revision hand", "elective"],
    ["BU021", "Web space release burn syndactyly", "elective"],
    ["BU022", "Eyelid release ectropion from burn", "elective"],
    ["BU023", "Microstomia release", "elective"],
    ["BU024", "Burn alopecia tissue expansion scalp", "elective"],
    ["BU025", "Burn alopecia scalp flap", "elective"],
    ["BU026", "Free ALT flap burn reconstruction", "elective"],
    ["BU027", "Acute burn NPWT application", "emergency"],
    ["BU028", "Burns cultured epithelial autograft 45% TBSA", "emergency"],
    ["BU029", "Burn wound serial debridement 2nd", "emergency"],
    ["BU030", "Minor burn outpatient dressings only", "urgent"],
  ];

  for (const [id, scenario, urg] of defs) {
    const flaps: NestedFlapInput[] | undefined =
      id === "BU026"
        ? [
            freeFlap("ALT flap", {
              side: "left",
              recipientSite: "Upper limb",
              recipientSiteRegion: "Upper Limb",
              ischemiaTimeMinutes: 60,
              arterialRecipient: "Radial artery",
              venousRecipient: "Cephalic vein",
              arterialMethod: "hand_sewn",
              venousMethod: "hand_sewn",
            }),
          ]
        : undefined;

    cases.push({
      caseId: id,
      scenario,
      specialty: "burns",
      procedureDisplayName: scenario,
      urgency: urg,
      caseProcedures: [proc(scenario)],
      flaps,
    });
  }

  return cases;
}

function cleftCranioCases(): CaseDefinition[] {
  const defs: [string, string][] = [
    ["CC001", "Unilateral cleft lip repair Millard"],
    ["CC002", "Bilateral cleft lip repair"],
    ["CC003", "Cleft palate repair von Langenbeck"],
    ["CC004", "Cleft palate repair Furlow double Z"],
    ["CC005", "Cleft palate Veau-Wardill-Kilner push back"],
    ["CC006", "Alveolar bone graft iliac crest"],
    ["CC007", "Pharyngoplasty sphincter"],
    ["CC008", "Pharyngeal flap"],
    ["CC009", "Cleft lip revision secondary"],
    ["CC010", "Cleft nasal correction primary"],
    ["CC011", "Cleft rhinoplasty secondary"],
    ["CC012", "Fistula repair palatal"],
    ["CC013", "Presurgical NAM"],
    ["CC014", "Sagittal synostosis strip craniectomy"],
    ["CC015", "Sagittal synostosis pi plasty"],
    ["CC016", "Metopic synostosis FOA"],
    ["CC017", "Unicoronal synostosis FOA"],
    ["CC018", "Bicoronal synostosis FOA"],
    ["CC019", "Posterior vault distraction"],
    ["CC020", "Le Fort III advancement Crouzon"],
    ["CC021", "Monobloc advancement Apert"],
    ["CC022", "Spring-assisted cranioplasty"],
    ["CC023", "Calvarial vault remodelling"],
    ["CC024", "Orbital hypertelorism correction"],
    ["CC025", "Hemifacial microsomia distraction"],
  ];

  return defs.map(([id, scenario]) => ({
    caseId: id,
    scenario,
    specialty: "cleft_cranio",
    procedureDisplayName: scenario,
    urgency: "elective" as const,
    caseProcedures: [proc(scenario)],
  }));
}

function peripheralNerveCases(): CaseDefinition[] {
  const defs: [string, string, string][] = [
    ["PN001", "Brachial plexus exploration + neurolysis", "urgent"],
    ["PN002", "Brachial plexus nerve graft sural", "elective"],
    ["PN003", "Brachial plexus nerve transfer Oberlin", "elective"],
    ["PN004", "Brachial plexus SAN to suprascapular", "elective"],
    ["PN005", "Intercostal to musculocutaneous transfer", "elective"],
    ["PN006", "Common peroneal nerve decompression", "elective"],
    ["PN007", "Common peroneal nerve repair", "urgent"],
    ["PN008", "Posterior tibial nerve repair", "urgent"],
    ["PN009", "Sciatic nerve neurolysis", "elective"],
    ["PN010", "Radial nerve repair mid-humerus", "urgent"],
    ["PN011", "Median nerve neurolysis forearm", "elective"],
    ["PN012", "Ulnar nerve neurolysis Guyon's", "elective"],
    ["PN013", "Nerve allograft large gap", "elective"],
    ["PN014", "TMR post-amputation", "elective"],
    ["PN015", "RPNI post-amputation", "elective"],
    ["PN016", "Neuroma excision + TMR", "elective"],
    ["PN017", "Nerve conduit 3cm gap", "elective"],
    ["PN018", "Supercharged end-to-side transfer", "elective"],
    ["PN019", "Obstetric brachial plexus nerve graft", "elective"],
    ["PN020", "Obstetric brachial plexus Sunderland transfer", "elective"],
  ];

  return defs.map(([id, scenario, urg]) => ({
    caseId: id,
    scenario,
    specialty: "peripheral_nerve",
    procedureDisplayName: scenario,
    urgency: urg,
    caseProcedures: [proc(scenario)],
  }));
}

function lymphoedemaCases(): CaseDefinition[] {
  const defs: [string, string][] = [
    ["LY001", "LVA upper limb post-mastectomy"],
    ["LY002", "LVA upper limb secondary"],
    ["LY003", "LVA lower limb"],
    ["LY004", "VLNT groin to axilla"],
    ["LY005", "VLNT submental to axilla"],
    ["LY006", "VLNT omental to axilla"],
    ["LY007", "VLNT groin to ankle"],
    ["LY008", "Liposuction for lymphoedema arm"],
    ["LY009", "Liposuction for lymphoedema leg"],
    ["LY010", "Charles procedure leg"],
    ["LY011", "Combined LVA + VLNT"],
    ["LY012", "SAPL modified technique"],
    ["LY013", "Lymphoedema surgery genital"],
    ["LY014", "LVA secondary redo"],
    ["LY015", "VLNT lateral thoracic to groin"],
  ];

  return defs.map(([id, scenario]) => ({
    caseId: id,
    scenario,
    specialty: "lymphoedema",
    procedureDisplayName: scenario,
    urgency: "elective" as const,
    caseProcedures: [proc(scenario)],
  }));
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateAllCases(): CaseDefinition[] {
  const all = [
    ...handCases(), // 80
    ...skinCancerCases(), // 65
    ...breastCases(), // 55
    ...headNeckCases(), // 55
    ...generalCases(), // 50
    ...aestheticsCases(), // 40
    ...orthoplasticCases(), // 35
    ...bodyContouringCases(), // 30
    ...burnsCases(), // 30
    ...cleftCranioCases(), // 25
    ...peripheralNerveCases(), // 20
    ...lymphoedemaCases(), // 15
  ];

  console.log(`Generated ${all.length} case definitions`);
  return all;
}

/**
 * Convert a CaseDefinition into the API payload for POST /api/procedures
 */
export function toApiPayload(def: CaseDefinition, index: number) {
  const times = randomTimes();
  return {
    patientIdentifierHash: nhi(index),
    procedureDate: randomDate(),
    facility: pick(FACILITIES),
    specialty: def.specialty,
    procedureSnomedCode: def.procedureSnomedCode,
    procedureDisplayName: def.procedureDisplayName,
    asaScore: String(def.asaScore ?? randomASA()),
    bmi: String(def.bmi ?? randomBMI()),
    smoker: (def.smoker ?? Math.random() < 0.15) ? "yes" : "no",
    diabetes: def.diabetes ?? false,
    startTime: times.startTime,
    endTime: times.endTime,
    caseProcedures: def.caseProcedures.map((cp) => ({
      ...cp,
      surgeonRole: cp.surgeonRole ?? randomRole(),
    })),
    flaps: def.flaps,
  };
}
