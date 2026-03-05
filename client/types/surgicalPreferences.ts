// ═══════════════════════════════════════════════════════════════════════════
// SURGICAL PREFERENCES — Protocol bundles and preference types
// ═══════════════════════════════════════════════════════════════════════════

// ── Anticoagulation Protocols ────────────────────────────────────────────

export type AnticoagulationProtocolId =
  | "none"
  | "aspirin_only"
  | "heparin_flush_only"
  | "aspirin_plus_heparin_flush"
  | "aspirin_plus_lmwh"
  | "modified_buncke"
  | "full_anticoagulation"
  | "institutional_custom";

export interface AnticoagulationProtocol {
  id: AnticoagulationProtocolId;
  label: string;
  description: string;
  components: string[];
}

export const ANTICOAGULATION_PROTOCOLS: AnticoagulationProtocol[] = [
  {
    id: "none",
    label: "No Anticoagulation",
    description:
      "No perioperative anticoagulation beyond standard DVT prophylaxis",
    components: [],
  },
  {
    id: "aspirin_only",
    label: "Aspirin Only",
    description: "Oral aspirin perioperatively",
    components: ["Aspirin (75\u2013325 mg daily)"],
  },
  {
    id: "heparin_flush_only",
    label: "Heparin Flush Only",
    description:
      "Local heparinised saline flush during anastomosis, no systemic anticoagulation",
    components: ["Heparin flush (100 IU/mL saline, local)"],
  },
  {
    id: "aspirin_plus_heparin_flush",
    label: "Aspirin + Heparin Flush",
    description:
      "Oral aspirin combined with intraoperative local heparin flush",
    components: ["Aspirin (75\u2013325 mg daily)", "Heparin flush (local)"],
  },
  {
    id: "aspirin_plus_lmwh",
    label: "Aspirin + LMWH",
    description:
      "Oral aspirin with postoperative low-molecular-weight heparin",
    components: [
      "Aspirin (75\u2013325 mg daily)",
      "LMWH (e.g., enoxaparin 40 mg daily)",
    ],
  },
  {
    id: "modified_buncke",
    label: "Modified Buncke Protocol",
    description:
      "Classic microsurgery protocol: aspirin, heparin flush, dextran 40 postop",
    components: [
      "Aspirin (325 mg daily)",
      "Heparin flush (local, intraoperative)",
      "Dextran 40 (500 mL over 24h \u00d7 3\u20135 days postop)",
    ],
  },
  {
    id: "full_anticoagulation",
    label: "Full Systemic Anticoagulation",
    description:
      "IV heparin postoperatively, typically for high-risk anastomoses or re-explorations",
    components: [
      "IV unfractionated heparin (target aPTT 1.5\u20132\u00d7)",
      "\u00b1 Bridge to warfarin/DOAC",
    ],
  },
  {
    id: "institutional_custom",
    label: "Institutional Protocol",
    description:
      "Custom institutional protocol \u2014 details documented in operative note",
    components: [],
  },
];

// ── Flap Monitoring Protocols ────────────────────────────────────────────

export type FlapMonitoringProtocolId =
  | "clinical_only"
  | "clinical_plus_handheld_doppler"
  | "implantable_doppler"
  | "implantable_doppler_plus_spo2"
  | "icg_fluorescence_plus_clinical"
  | "tissue_oximetry"
  | "ai_camera_monitoring"
  | "institutional_custom";

export interface FlapMonitoringProtocol {
  id: FlapMonitoringProtocolId;
  label: string;
  description: string;
  components: string[];
}

export const FLAP_MONITORING_PROTOCOLS: FlapMonitoringProtocol[] = [
  {
    id: "clinical_only",
    label: "Clinical Observation Only",
    description:
      "Visual and palpation assessment of colour, turgor, temperature, capillary refill",
    components: [
      "Clinical observation (colour, cap refill, turgor, temperature)",
    ],
  },
  {
    id: "clinical_plus_handheld_doppler",
    label: "Clinical + Handheld Doppler",
    description:
      "Clinical observation supplemented by handheld Doppler checks",
    components: [
      "Clinical observation",
      "Handheld Doppler (perforator/pedicle signal)",
    ],
  },
  {
    id: "implantable_doppler",
    label: "Implantable Doppler",
    description:
      "Cook-Swartz or Synovis implantable venous Doppler with clinical observation",
    components: [
      "Implantable Doppler probe (venous signal)",
      "Clinical observation",
    ],
  },
  {
    id: "implantable_doppler_plus_spo2",
    label: "Implantable Doppler + SpO\u2082 Probe",
    description:
      "Combined continuous monitoring with implantable Doppler and tissue oximetry",
    components: [
      "Implantable Doppler probe",
      "SpO\u2082 / tissue oximetry probe",
      "Clinical observation",
    ],
  },
  {
    id: "icg_fluorescence_plus_clinical",
    label: "ICG Fluorescence + Clinical",
    description:
      "Indocyanine green fluorescence angiography for perfusion assessment with clinical monitoring",
    components: [
      "ICG fluorescence angiography (serial postop assessments)",
      "Clinical observation",
    ],
  },
  {
    id: "tissue_oximetry",
    label: "Tissue Oximetry (NIRS)",
    description:
      "Continuous near-infrared spectroscopy monitoring of flap tissue oxygenation",
    components: [
      "NIRS tissue oximetry (e.g., ViOptix, T.Ox)",
      "Clinical observation",
    ],
  },
  {
    id: "ai_camera_monitoring",
    label: "AI Camera Monitoring",
    description:
      "Automated AI-based visual monitoring system for continuous flap surveillance",
    components: ["AI camera monitoring system", "Clinical observation"],
  },
  {
    id: "institutional_custom",
    label: "Institutional Protocol",
    description: "Custom institutional monitoring protocol",
    components: [],
  },
];

// ── Surgical Preferences Interfaces ──────────────────────────────────────

export interface MicrosurgeryPreferences {
  anticoagulationProtocol?: AnticoagulationProtocolId;
  monitoringProtocol?: FlapMonitoringProtocolId;
}

export interface SurgicalPreferences {
  microsurgery?: MicrosurgeryPreferences;
  // Future domains (zero schema changes):
  // skinCancer?: SkinCancerPreferences;
  // handSurgery?: HandSurgeryPreferences;
  // breast?: BreastPreferences;
  // burns?: BurnsPreferences;
}
