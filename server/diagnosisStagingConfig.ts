/**
 * Diagnosis Staging Configuration System
 * Maps SNOMED CT diagnosis codes to their staging/classification options
 *
 * This file is designed to be easily extensible as new diagnoses are encountered
 */

export interface StagingOption {
  value: string;
  label: string;
  description?: string;
}

export interface StagingSystem {
  name: string;
  description?: string;
  options: StagingOption[];
}

export interface DiagnosisStagingConfig {
  snomedCtCodes: string[]; // Multiple codes can map to same staging
  keywords: string[]; // Fallback matching by keyword in diagnosis name
  stagingSystems: StagingSystem[];
}

/**
 * Diagnosis staging configurations
 * Add new configurations here as you encounter cases
 */
export const diagnosisStagingConfigs: DiagnosisStagingConfig[] = [
  // NOTE: Dupuytren's staging (Tubiana) removed — now auto-calculated
  // client-side via DupuytrenAssessment per-ray joint measurements.

  // Open Fractures (Gustilo-Anderson Classification)
  {
    snomedCtCodes: [
      "397181002", // Open fracture (disorder)
      "22640007", // Open fracture of tibia
      "46866001", // Open fracture of femur
      "263225007", // Open fracture of humerus
      "46199005", // Open fracture of radius
      "64665009", // Open fracture of ulna
    ],
    keywords: ["open fracture", "compound fracture", "gustilo"],
    stagingSystems: [
      {
        name: "Gustilo-Anderson Classification",
        description: "Classification of open fractures",
        options: [
          {
            value: "I",
            label: "Type I",
            description: "Wound <1cm, minimal contamination, simple fracture",
          },
          {
            value: "II",
            label: "Type II",
            description:
              "Wound 1-10cm, moderate soft tissue damage, adequate bone coverage",
          },
          {
            value: "IIIa",
            label: "Type IIIa",
            description:
              "Wound >10cm, high-energy, adequate soft tissue coverage",
          },
          {
            value: "IIIb",
            label: "Type IIIb",
            description:
              "Extensive soft tissue loss, periosteal stripping, requires flap",
          },
          {
            value: "IIIc",
            label: "Type IIIc",
            description: "Arterial injury requiring repair",
          },
        ],
      },
    ],
  },

  // Melanoma (Breslow Thickness & Clark Level)
  {
    snomedCtCodes: [
      "93655004", // Malignant melanoma of skin
      "189758001", // Melanoma in situ
      "254730000", // Superficial spreading malignant melanoma of skin
      "254731001", // Nodular malignant melanoma of skin
      "302837001", // Lentigo maligna melanoma
      "254732008", // Acral lentiginous malignant melanoma of skin
      "403924008", // Desmoplastic malignant melanoma
      "276751004", // Amelanotic malignant melanoma of skin
      "1295234004", // Spitz malignant melanoma
      "302836005", // Lentigo maligna
    ],
    keywords: ["melanoma", "lentigo maligna"],
    stagingSystems: [
      {
        name: "Breslow Thickness",
        description: "Depth of invasion in millimeters",
        options: [
          {
            value: "in_situ",
            label: "In situ",
            description: "Confined to epidermis",
          },
          { value: "≤1.0", label: "≤1.0 mm", description: "Thin melanoma" },
          {
            value: "1.01-2.0",
            label: "1.01-2.0 mm",
            description: "Intermediate",
          },
          { value: "2.01-4.0", label: "2.01-4.0 mm", description: "Thick" },
          { value: ">4.0", label: ">4.0 mm", description: "Very thick" },
        ],
      },
      {
        name: "Ulceration",
        description: "Presence of ulceration",
        options: [
          { value: "no", label: "No ulceration" },
          { value: "yes", label: "Ulcerated" },
        ],
      },
    ],
  },

  // Carpal Tunnel Syndrome
  {
    snomedCtCodes: [
      "57406009", // Carpal tunnel syndrome
    ],
    keywords: ["carpal tunnel"],
    stagingSystems: [
      {
        name: "Severity",
        description: "Clinical severity grading",
        options: [
          {
            value: "mild",
            label: "Mild",
            description: "Intermittent symptoms, normal sensation",
          },
          {
            value: "moderate",
            label: "Moderate",
            description: "Persistent symptoms, reduced sensation",
          },
          {
            value: "severe",
            label: "Severe",
            description: "Constant numbness, thenar atrophy",
          },
        ],
      },
      {
        name: "EMG Grade",
        description: "Electrodiagnostic severity (if performed)",
        options: [
          { value: "normal", label: "Normal", description: "No abnormality" },
          {
            value: "mild",
            label: "Mild",
            description: "Prolonged sensory latency only",
          },
          {
            value: "moderate",
            label: "Moderate",
            description: "Prolonged motor and sensory latencies",
          },
          {
            value: "severe",
            label: "Severe",
            description: "Absent sensory response, reduced motor amplitude",
          },
          {
            value: "very_severe",
            label: "Very Severe",
            description: "Absent motor and sensory responses",
          },
        ],
      },
    ],
  },

  // Trigger Finger
  {
    snomedCtCodes: [
      "1539003", // Trigger finger
      "42786005", // Snapping thumb
    ],
    keywords: ["trigger finger", "trigger thumb", "stenosing tenosynovitis"],
    stagingSystems: [
      {
        name: "Quinnell Grade",
        description: "Grading of trigger finger severity",
        options: [
          { value: "0", label: "Grade 0", description: "Normal movement" },
          { value: "1", label: "Grade I", description: "Uneven movement" },
          {
            value: "2",
            label: "Grade II",
            description: "Actively correctable triggering",
          },
          {
            value: "3",
            label: "Grade III",
            description: "Passively correctable triggering",
          },
          {
            value: "4",
            label: "Grade IV",
            description: "Fixed flexion contracture",
          },
        ],
      },
    ],
  },

  // Breast Cancer
  {
    snomedCtCodes: [
      "254837009", // Malignant neoplasm of breast
      "188168008", // Carcinoma of breast
    ],
    keywords: ["breast cancer", "breast carcinoma", "mammary carcinoma"],
    stagingSystems: [
      {
        name: "TNM T Stage",
        description: "Tumor size",
        options: [
          { value: "Tis", label: "Tis", description: "Carcinoma in situ" },
          { value: "T1", label: "T1", description: "≤2 cm" },
          { value: "T2", label: "T2", description: ">2 cm to ≤5 cm" },
          { value: "T3", label: "T3", description: ">5 cm" },
          {
            value: "T4",
            label: "T4",
            description: "Chest wall or skin involvement",
          },
        ],
      },
      {
        name: "TNM N Stage",
        description: "Nodal involvement",
        options: [
          {
            value: "N0",
            label: "N0",
            description: "No regional lymph node metastasis",
          },
          { value: "N1", label: "N1", description: "1-3 axillary nodes" },
          { value: "N2", label: "N2", description: "4-9 axillary nodes" },
          {
            value: "N3",
            label: "N3",
            description: "≥10 axillary or infraclavicular nodes",
          },
        ],
      },
    ],
  },

  // Pressure Ulcer/Injury
  {
    snomedCtCodes: [
      "399912005", // Pressure ulcer
      "420324007", // Pressure injury
    ],
    keywords: [
      "pressure ulcer",
      "pressure injury",
      "pressure sore",
      "decubitus",
    ],
    stagingSystems: [
      {
        name: "NPUAP Stage",
        description: "National Pressure Ulcer Advisory Panel staging",
        options: [
          {
            value: "1",
            label: "Stage 1",
            description: "Non-blanchable erythema of intact skin",
          },
          {
            value: "2",
            label: "Stage 2",
            description: "Partial thickness skin loss with dermis exposed",
          },
          {
            value: "3",
            label: "Stage 3",
            description: "Full thickness skin loss",
          },
          {
            value: "4",
            label: "Stage 4",
            description: "Full thickness skin and tissue loss",
          },
          {
            value: "unstageable",
            label: "Unstageable",
            description: "Obscured by slough/eschar",
          },
          {
            value: "deep_tissue",
            label: "Deep Tissue",
            description: "Persistent non-blanchable deep red/purple",
          },
        ],
      },
    ],
  },

  // Burns
  {
    snomedCtCodes: [
      "48333001", // Burn injury
      "125666000", // Burn of skin
    ],
    keywords: ["burn", "scald", "thermal injury"],
    stagingSystems: [
      {
        name: "Depth",
        description: "Burn depth classification",
        options: [
          {
            value: "superficial",
            label: "Superficial",
            description: "Epidermis only, erythema, painful",
          },
          {
            value: "superficial_partial",
            label: "Superficial Partial",
            description: "Epidermis + superficial dermis, blisters",
          },
          {
            value: "deep_partial",
            label: "Deep Partial",
            description: "Epidermis + deep dermis, less painful",
          },
          {
            value: "full_thickness",
            label: "Full Thickness",
            description: "All skin layers, painless, waxy",
          },
        ],
      },
      {
        name: "TBSA %",
        description: "Total Body Surface Area percentage",
        options: [
          { value: "<10", label: "<10%" },
          { value: "10-20", label: "10-20%" },
          { value: "20-30", label: "20-30%" },
          { value: "30-50", label: "30-50%" },
          { value: ">50", label: ">50%" },
        ],
      },
    ],
  },

  // Capsular Contracture (Baker Classification)
  {
    snomedCtCodes: [
      "236507001", // Capsular contracture of breast implant
    ],
    keywords: ["capsular contracture", "baker"],
    stagingSystems: [
      {
        name: "Baker Classification",
        description: "Baker grading of capsular contracture severity",
        options: [
          {
            value: "I",
            label: "Grade I",
            description: "Breast looks and feels natural",
          },
          {
            value: "II",
            label: "Grade II",
            description:
              "Minimal contracture; breast feels slightly firm but looks normal",
          },
          {
            value: "III",
            label: "Grade III",
            description:
              "Moderate contracture; breast feels firm and looks abnormal",
          },
          {
            value: "IV",
            label: "Grade IV",
            description:
              "Severe contracture; breast is hard, painful, and looks abnormal",
          },
        ],
      },
    ],
  },

  // Hidradenitis Suppurativa (Hurley Stage)
  {
    snomedCtCodes: [
      "59393003", // Hidradenitis suppurativa
    ],
    keywords: ["hidradenitis", "acne inversa", "hurley"],
    stagingSystems: [
      {
        name: "Hurley Stage",
        description: "Hurley clinical staging of hidradenitis suppurativa",
        options: [
          {
            value: "I",
            label: "Stage I",
            description:
              "Abscess formation (single or multiple) without sinus tracts or scarring",
          },
          {
            value: "II",
            label: "Stage II",
            description:
              "Recurrent abscesses with sinus tracts and scarring; single or multiple widely separated lesions",
          },
          {
            value: "III",
            label: "Stage III",
            description:
              "Diffuse involvement with multiple interconnected sinus tracts and abscesses across entire area",
          },
        ],
      },
    ],
  },

  // Lymphoedema (ISL Stage)
  {
    snomedCtCodes: [
      "234097001", // Lymphedema
    ],
    keywords: ["lymphoedema", "lymphedema", "isl stage"],
    stagingSystems: [
      {
        name: "ISL Stage",
        description: "International Society of Lymphology staging",
        options: [
          {
            value: "I",
            label: "Stage I",
            description:
              "Reversible; pitting oedema that subsides with elevation",
          },
          {
            value: "II",
            label: "Stage II",
            description:
              "Spontaneously irreversible; pitting oedema that does not resolve with elevation alone",
          },
          {
            value: "IIb",
            label: "Stage IIb (late II)",
            description: "Non-pitting; tissue fibrosis evident",
          },
          {
            value: "III",
            label: "Stage III",
            description:
              "Lymphostatic elephantiasis; non-pitting with skin changes (acanthosis, fat deposits)",
          },
        ],
      },
    ],
  },

  // Wagner Classification — Diabetic Foot
  {
    snomedCtCodes: ["280137006"],
    keywords: [
      "diabetic foot",
      "diabetic ulcer",
      "Wagner",
      "neuropathic ulcer",
    ],
    stagingSystems: [
      {
        name: "Wagner Grade",
        description:
          "Diabetic foot ulcer classification — guides surgical management",
        options: [
          {
            value: "0",
            label: "Grade 0",
            description: "Intact skin; bony deformity (pre-ulcerative)",
          },
          {
            value: "1",
            label: "Grade 1",
            description: "Superficial ulcer (epidermis + dermis)",
          },
          {
            value: "2",
            label: "Grade 2",
            description: "Deep ulcer to tendon / bone / joint",
          },
          {
            value: "3",
            label: "Grade 3",
            description: "Deep ulcer + abscess / osteomyelitis",
          },
          {
            value: "4",
            label: "Grade 4",
            description: "Partial foot gangrene (toe / forefoot)",
          },
          {
            value: "5",
            label: "Grade 5",
            description: "Whole foot gangrene — amputation usually required",
          },
        ],
      },
    ],
  },

  // Le Fort Classification — Midface Fractures
  {
    snomedCtCodes: ["263175007"],
    keywords: ["Le Fort", "LeFort", "midface fracture", "maxillary fracture"],
    stagingSystems: [
      {
        name: "Le Fort Classification",
        description: "Midface fracture pattern classification",
        options: [
          {
            value: "I",
            label: "Le Fort I",
            description: "Horizontal maxillary — alveolar process separation",
          },
          {
            value: "II",
            label: "Le Fort II",
            description:
              "Pyramidal — maxilla + nasal bones; infraorbital involvement",
          },
          {
            value: "III",
            label: "Le Fort III",
            description:
              "Craniofacial disjunction — complete separation of facial skeleton from cranial base",
          },
        ],
      },
    ],
  },

  // Facial Nerve Palsy (House-Brackmann Grade)
  {
    snomedCtCodes: [
      "280816001", // Facial nerve palsy (unspecified)
      "193093009", // Bell's palsy
      "283195000", // Traumatic facial nerve injury
      "429473009", // Post-parotidectomy / post-surgical palsy
      "95822006", // Congenital facial palsy
      "47038005", // Moebius syndrome
      "186524009", // Ramsay Hunt syndrome
      "95666006", // Facial synkinesis
    ],
    keywords: [
      "facial nerve palsy",
      "bell's palsy",
      "facial palsy",
      "house-brackmann",
      "facial nerve injury",
      "synkinesis",
      "ramsay hunt",
      "moebius",
    ],
    stagingSystems: [
      {
        name: "House-Brackmann Grade",
        description: "House-Brackmann facial nerve grading system",
        options: [
          {
            value: "I",
            label: "Grade I",
            description: "Normal; normal facial function in all areas",
          },
          {
            value: "II",
            label: "Grade II",
            description:
              "Mild dysfunction; slight weakness noticeable on close inspection",
          },
          {
            value: "III",
            label: "Grade III",
            description:
              "Moderate dysfunction; obvious but not disfiguring difference; complete eye closure with effort",
          },
          {
            value: "IV",
            label: "Grade IV",
            description:
              "Moderately severe dysfunction; obvious weakness and/or disfiguring asymmetry; incomplete eye closure",
          },
          {
            value: "V",
            label: "Grade V",
            description:
              "Severe dysfunction; barely perceptible motion; incomplete eye closure",
          },
          {
            value: "VI",
            label: "Grade VI",
            description: "Total paralysis; no movement",
          },
        ],
      },
    ],
  },
  // Septic Flexor Tenosynovitis — Kanavel Signs
  {
    snomedCtCodes: ["18165001"],
    keywords: [
      "flexor sheath infection",
      "septic tenosynovitis",
      "Kanavel",
      "pyogenic tenosynovitis",
    ],
    stagingSystems: [
      {
        name: "Kanavel Signs",
        description: "Cardinal signs of pyogenic flexor tenosynovitis",
        options: [
          {
            value: "0",
            label: "0/4",
            description: "No Kanavel signs",
          },
          {
            value: "1",
            label: "1/4",
            description: "One sign present",
          },
          {
            value: "2",
            label: "2/4",
            description: "Two signs present",
          },
          {
            value: "3",
            label: "3/4",
            description: "Three signs present",
          },
          {
            value: "4",
            label: "4/4",
            description: "All four signs present",
          },
        ],
      },
    ],
  },

  // CMC1 Osteoarthritis (Eaton-Littler Classification)
  {
    snomedCtCodes: [
      "37895003", // Osteoarthritis of first carpometacarpal joint
    ],
    keywords: ["CMC1", "thumb base", "Eaton", "trapeziometacarpal"],
    stagingSystems: [
      {
        name: "Eaton-Littler Stage",
        description: "Radiographic staging of thumb CMC osteoarthritis",
        options: [
          {
            value: "1",
            label: "Stage I",
            description:
              "Normal joint contour, widened joint space (synovitis)",
          },
          {
            value: "2",
            label: "Stage II",
            description:
              "Joint space narrowing, osteophytes <2mm, slight subluxation",
          },
          {
            value: "3",
            label: "Stage III",
            description:
              "Marked narrowing, osteophytes >2mm, subluxation, sclerosis",
          },
          {
            value: "4",
            label: "Stage IV",
            description: "Stage III + STT joint involvement",
          },
        ],
      },
    ],
  },

  // Scaphoid Non-Union (Herbert Classification)
  {
    snomedCtCodes: [
      "263225007", // Non-union of fracture of scaphoid
    ],
    keywords: ["scaphoid non-union", "scaphoid pseudarthrosis", "Herbert"],
    stagingSystems: [
      {
        name: "Herbert Classification",
        description: "Classification of scaphoid non-union",
        options: [
          {
            value: "D1",
            label: "D1 — Fibrous union",
            description: "Stable fibrous non-union",
          },
          {
            value: "D2",
            label: "D2 — Pseudarthrosis",
            description: "Unstable non-union, no sclerosis",
          },
          {
            value: "D3",
            label: "D3 — Sclerotic",
            description: "Sclerotic non-union",
          },
          {
            value: "D4",
            label: "D4 — AVN",
            description: "Avascular necrosis of proximal pole",
          },
          {
            value: "D5",
            label: "D5 — SNAC",
            description: "Non-union with secondary arthritis",
          },
        ],
      },
    ],
  },

  // Kienböck's Disease (Lichtman Classification)
  {
    snomedCtCodes: [
      "787484007", // Kienbock disease
    ],
    keywords: ["Kienbock", "Lichtman", "lunate AVN", "lunate necrosis"],
    stagingSystems: [
      {
        name: "Lichtman Stage",
        description: "Staging of Kienböck's disease (lunate AVN)",
        options: [
          {
            value: "1",
            label: "Stage I",
            description: "Normal X-ray, MRI shows AVN",
          },
          {
            value: "2",
            label: "Stage II",
            description: "Lunate sclerosis, no collapse",
          },
          {
            value: "3a",
            label: "Stage IIIA",
            description: "Lunate collapse, no carpal malalignment",
          },
          {
            value: "3b",
            label: "Stage IIIB",
            description: "Lunate collapse + fixed scaphoid rotation",
          },
          {
            value: "4",
            label: "Stage IV",
            description: "Generalised degenerative changes",
          },
        ],
      },
    ],
  },

  // ─── Cleft & Craniofacial Classifications ──────────────────────────────────

  // Veau Classification — Cleft Palate
  {
    snomedCtCodes: [
      "47563007", // Cleft soft palate
      "63567004", // Cleft hard and soft palate
      "87979003", // Cleft lip and palate (unilateral)
      "70241007", // Bilateral cleft lip and palate
    ],
    keywords: ["veau", "cleft palate", "cleft lip and palate"],
    stagingSystems: [
      {
        name: "Veau Classification",
        description: "Classification of cleft palate extent",
        options: [
          {
            value: "I",
            label: "Veau I — Soft palate only",
            description: "Cleft of soft palate only",
          },
          {
            value: "II",
            label: "Veau II — Hard and soft palate",
            description: "Cleft extending through hard and soft palate",
          },
          {
            value: "III",
            label: "Veau III — Unilateral complete CLP",
            description:
              "Unilateral complete cleft of lip, alveolus, and palate",
          },
          {
            value: "IV",
            label: "Veau IV — Bilateral complete CLP",
            description:
              "Bilateral complete cleft of lip, alveolus, and palate",
          },
          {
            value: "submucous",
            label: "Submucous",
            description: "Submucous cleft palate",
          },
        ],
      },
    ],
  },

  // Pittsburgh Fistula Classification — Oronasal Fistula
  {
    snomedCtCodes: [
      "118947004", // Oronasal fistula
    ],
    keywords: ["pittsburgh", "oronasal fistula", "palatal fistula"],
    stagingSystems: [
      {
        name: "Pittsburgh Fistula Classification",
        description: "Classification of palatal fistula location",
        options: [
          {
            value: "I",
            label: "Type I — Bifid uvula",
            description: "Bifid uvula",
          },
          {
            value: "II",
            label: "Type II — Soft palate",
            description: "Fistula in soft palate",
          },
          {
            value: "III",
            label: "Type III — Junction of hard/soft palate",
            description: "Fistula at junction of hard and soft palate",
          },
          {
            value: "IV",
            label: "Type IV — Hard palate",
            description: "Fistula in hard palate",
          },
          {
            value: "V",
            label: "Type V — Junction primary/secondary palate",
            description:
              "Fistula at junction of primary and secondary palate",
          },
          {
            value: "VI",
            label: "Type VI — Lingual-alveolar",
            description: "Lingual-alveolar fistula",
          },
          {
            value: "VII",
            label: "Type VII — Labial-alveolar",
            description: "Labial-alveolar fistula",
          },
        ],
      },
    ],
  },

  // Whitaker Classification — Craniosynostosis Revision Outcomes
  {
    snomedCtCodes: [
      "57219006", // Secondary / revision craniosynostosis
    ],
    keywords: ["whitaker", "secondary craniosynostosis", "re-synostosis"],
    stagingSystems: [
      {
        name: "Whitaker Classification",
        description:
          "Outcome classification for craniosynostosis revision surgery",
        options: [
          {
            value: "I",
            label: "Category I — No revision indicated",
            description:
              "No refinements or surgical revisions considered necessary",
          },
          {
            value: "II",
            label: "Category II — Minor refinement desirable",
            description:
              "Soft tissue or minor bony work that would improve the result",
          },
          {
            value: "III",
            label: "Category III — Major osteotomy required",
            description:
              "Major alternative osteotomy or bone grafting procedure needed",
          },
          {
            value: "IV",
            label: "Category IV — Equivalent to original surgery",
            description:
              "A major procedure equivalent to the original operation is needed",
          },
        ],
      },
    ],
  },

  // ─── Head & Neck Cancer — TNM Staging (AJCC 8th Edition) ─────────────────
  {
    snomedCtCodes: [
      "363505006", // Malignant neoplasm of oral cavity
      "363462002", // Carcinoma of tongue
      "363479009", // Carcinoma of floor of mouth
      "363484005", // Carcinoma of buccal mucosa
      "363471001", // Malignant neoplasm of oropharynx
      "93832008", // Malignant neoplasm of mandible
      "93833003", // Malignant neoplasm of maxilla
      "254585009", // Maxillary sinus carcinoma
      "363401002", // Malignant neoplasm of pharynx
      "363353009", // Malignant neoplasm of larynx
      "15611004", // Mucoepidermoid carcinoma
      "3839000", // Adenoid cystic carcinoma
      "53654007", // Acinic cell carcinoma
      "93871006", // Malignant neoplasm of submandibular gland
    ],
    keywords: [
      "oral cavity cancer",
      "tongue cancer",
      "floor of mouth",
      "oropharyngeal",
      "mandible tumour",
      "maxilla tumour",
      "pharyngeal cancer",
      "laryngeal cancer",
      "head and neck cancer",
      "salivary gland carcinoma",
    ],
    stagingSystems: [
      {
        name: "TNM T Stage (AJCC 8th Ed)",
        description: "Primary tumour extent",
        options: [
          {
            value: "Tx",
            label: "Tx",
            description: "Primary tumour cannot be assessed",
          },
          {
            value: "T0",
            label: "T0",
            description: "No evidence of primary tumour",
          },
          {
            value: "Tis",
            label: "Tis",
            description: "Carcinoma in situ",
          },
          {
            value: "T1",
            label: "T1",
            description: "Tumour ≤2 cm in greatest dimension",
          },
          {
            value: "T2",
            label: "T2",
            description: "Tumour >2 cm but ≤4 cm in greatest dimension",
          },
          {
            value: "T3",
            label: "T3",
            description: "Tumour >4 cm in greatest dimension",
          },
          {
            value: "T4a",
            label: "T4a",
            description:
              "Moderately advanced local disease — invasion of adjacent structures",
          },
          {
            value: "T4b",
            label: "T4b",
            description:
              "Very advanced local disease — invasion of masticator space, pterygoid plates, skull base, or encases carotid artery",
          },
        ],
      },
      {
        name: "TNM N Stage (AJCC 8th Ed)",
        description: "Regional lymph node involvement",
        options: [
          {
            value: "Nx",
            label: "Nx",
            description: "Regional lymph nodes cannot be assessed",
          },
          {
            value: "N0",
            label: "N0",
            description: "No regional lymph node metastasis",
          },
          {
            value: "N1",
            label: "N1",
            description:
              "Single ipsilateral node ≤3 cm without extranodal extension",
          },
          {
            value: "N2a",
            label: "N2a",
            description:
              "Single ipsilateral node >3 cm but ≤6 cm without extranodal extension",
          },
          {
            value: "N2b",
            label: "N2b",
            description:
              "Multiple ipsilateral nodes, none >6 cm, without extranodal extension",
          },
          {
            value: "N2c",
            label: "N2c",
            description:
              "Bilateral or contralateral nodes, none >6 cm, without extranodal extension",
          },
          {
            value: "N3a",
            label: "N3a",
            description: "Any node >6 cm without extranodal extension",
          },
          {
            value: "N3b",
            label: "N3b",
            description:
              "Any node(s) with clinically overt extranodal extension",
          },
        ],
      },
      {
        name: "TNM M Stage",
        description: "Distant metastasis",
        options: [
          {
            value: "M0",
            label: "M0",
            description: "No distant metastasis",
          },
          {
            value: "M1",
            label: "M1",
            description: "Distant metastasis present",
          },
        ],
      },
      {
        name: "Overall Stage (AJCC 8th Ed)",
        description: "Combined AJCC 8th Edition stage grouping",
        options: [
          {
            value: "0",
            label: "Stage 0",
            description: "Tis N0 M0",
          },
          {
            value: "I",
            label: "Stage I",
            description: "T1 N0 M0",
          },
          {
            value: "II",
            label: "Stage II",
            description: "T2 N0 M0",
          },
          {
            value: "III",
            label: "Stage III",
            description: "T3 N0 M0; or T1–T3 N1 M0",
          },
          {
            value: "IVA",
            label: "Stage IVA",
            description: "T4a N0–N1 M0; or T1–T4a N2 M0",
          },
          {
            value: "IVB",
            label: "Stage IVB",
            description: "T4b any N M0; or any T N3 M0",
          },
          {
            value: "IVC",
            label: "Stage IVC",
            description: "Any T any N M1",
          },
        ],
      },
    ],
  },
];

/**
 * Find staging configuration for a diagnosis
 * First tries exact SNOMED code match, then falls back to keyword matching
 */
export function getStagingForDiagnosis(
  snomedCode?: string,
  diagnosisName?: string,
): DiagnosisStagingConfig | null {
  // First try exact SNOMED code match
  if (snomedCode) {
    const exactMatch = diagnosisStagingConfigs.find((config) =>
      config.snomedCtCodes.includes(snomedCode),
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  // Fallback to keyword matching
  if (diagnosisName) {
    const lowerName = diagnosisName.toLowerCase();
    const keywordMatch = diagnosisStagingConfigs.find((config) =>
      config.keywords.some((keyword) =>
        lowerName.includes(keyword.toLowerCase()),
      ),
    );
    if (keywordMatch) {
      return keywordMatch;
    }
  }

  return null;
}

/**
 * Get all available staging configurations (for admin/reference)
 */
export function getAllStagingConfigs(): DiagnosisStagingConfig[] {
  return diagnosisStagingConfigs;
}
