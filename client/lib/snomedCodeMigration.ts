interface SnomedMigrationEntry {
  newCode: string;
  newDisplay: string;
}

export const OLD_TO_NEW_SNOMED: Record<string, SnomedMigrationEntry> = {
  "428191000124101": {
    newCode: "442695005",
    newDisplay: "Injection of botulinum toxin (procedure)",
  },
  "13413003": {
    newCode: "787876008",
    newDisplay: "Injection of dermal filler (procedure)",
  },
  "36777000": {
    newCode: "89658006",
    newDisplay: "Treatment of burn (procedure)",
  },
  "234296008": {
    newCode: "234281001",
    newDisplay: "Pedicled latissimus dorsi flap (procedure)",
  },
  "15257006": {
    newCode: "847251000168106",
    newDisplay:
      "Open reduction internal fixation of fracture of phalanx of hand (procedure)",
  },
  "302441008": {
    newCode: "72310004",
    newDisplay: "Abdominoplasty (procedure)",
  },
  "174295000": {
    newCode: "69794004",
    newDisplay: "Aspiration procedure (procedure)",
  },
  "122465003": {
    newCode: "418024000",
    newDisplay: "Mohs surgery (procedure)",
  },
  "239248002": {
    newCode: "199044008",
    newDisplay: "Repair of mallet finger (procedure)",
  },
  "54516008": {
    newCode: "286553006",
    newDisplay: "Plastic operation on face (procedure)",
  },
  "212978003": {
    newCode: "284003005",
    newDisplay: "Injury of finger (disorder)",
  },
  "422413001": {
    newCode: "53441006",
    newDisplay: "Dermatochalasis (disorder)",
  },
  "236507001": {
    newCode: "267639000",
    newDisplay: "Capsular contracture of breast (disorder)",
  },
  "62480006": { newCode: "62961003", newDisplay: "Rhinoplasty (procedure)" },
  "41899006": {
    newCode: "75732000",
    newDisplay: "Blepharoplasty of upper eyelid (procedure)",
  },

  // ── Hand & wrist SNOMED CT-AU fixes (validated against Ontoserver Feb 2026) ──

  // Diagnosis codes — fractures
  "263102004": {
    newCode: "263199001",
    newDisplay: "Fracture of distal end of radius (disorder)",
  },
  "65966004": {
    newCode: "208393000",
    newDisplay: "Fracture of metacarpal bone (disorder)",
  },
  "263171006": {
    newCode: "18171007",
    newDisplay: "Fracture of phalanx of finger (disorder)",
  },
  "21947006": {
    newCode: "31975004",
    newDisplay: "Fracture of scaphoid bone (disorder)",
  },
  "20527002": {
    newCode: "208390002",
    newDisplay: "Fracture of first metacarpal bone (disorder)",
  },
  "30400005": {
    newCode: "208390002",
    newDisplay: "Fracture of first metacarpal bone (disorder)",
  },
  "73936003": {
    newCode: "302941001",
    newDisplay: "Nonunion of fracture (disorder)",
  },
  "128308003": {
    newCode: "287075005",
    newDisplay: "Fracture malunion - Loss of alignment (disorder)",
  },

  // Diagnosis codes — tendon injuries
  "283588004": {
    newCode: "439052006",
    newDisplay: "Injury of flexor tendon of hand (disorder)",
  },
  "283589007": {
    newCode: "441885003",
    newDisplay: "Injury of extensor tendon of hand (disorder)",
  },
  "48574002": {
    newCode: "209775008",
    newDisplay: "Mallet finger (disorder)",
  },
  "29750009": {
    newCode: "43234007",
    newDisplay: "Boutonniere deformity (disorder)",
  },

  // Diagnosis codes — nerve injuries
  "283013008": {
    newCode: "52011008",
    newDisplay: "Injury of finger (disorder)",
  },
  "283018004": {
    newCode: "52011008",
    newDisplay: "Injury of finger (disorder)",
  },
  "283019007": {
    newCode: "52011008",
    newDisplay: "Injury of finger (disorder)",
  },
  "283020001": {
    newCode: "52011008",
    newDisplay: "Injury of finger (disorder)",
  },
  "283028008": {
    newCode: "446314003",
    newDisplay: "Laceration of nail bed of finger (disorder)",
  },
  "283593005": {
    newCode: "52011008",
    newDisplay: "Injury of finger (disorder)",
  },

  // Diagnosis codes — dislocations & elective
  "239166008": {
    newCode: "263027009",
    newDisplay: "Dislocation of distal radioulnar joint (disorder)",
  },
  "202363001": {
    newCode: "37895003",
    newDisplay: "Osteoarthritis of first carpometacarpal joint (disorder)",
  },
  "30886002": {
    newCode: "787484007",
    newDisplay: "Progressive avascular necrosis of lunate (disorder)",
  },
  "79426006": {
    newCode: "274142002",
    newDisplay: "Dupuytren contracture of finger (disorder)",
  },
  "60849009": {
    newCode: "1539003",
    newDisplay: "Trigger finger (disorder)",
  },
  "202855006": {
    newCode: "42786005",
    newDisplay: "Snapping thumb (disorder)",
  },
  "55473002": {
    newCode: "21794005",
    newDisplay: "Radial styloid tenosynovitis (disorder)",
  },
  "72764000": {
    newCode: "230631009",
    newDisplay: "Ulnar nerve entrapment at elbow (disorder)",
  },
  "33981008": {
    newCode: "445008009",
    newDisplay: "Ganglion cyst (disorder)",
  },
  "134372003": {
    newCode: "703704008",
    newDisplay: "Giant cell tumour of tendon sheath (disorder)",
  },
  "239185009": {
    newCode: "202231009",
    newDisplay: "Carpal instability (disorder)",
  },
  "239184008": {
    newCode: "202333005",
    newDisplay: "Triangular fibrocartilage complex tear (disorder)",
  },
  "367418001": {
    newCode: "367506006",
    newDisplay: "Polydactyly (disorder)",
  },

  // Procedure codes — fracture fixation
  "73994004": {
    newCode: "2811000032106",
    newDisplay:
      "Open reduction internal fixation of fracture of radius (procedure)",
  },
  "263136000": {
    newCode: "781341000168104",
    newDisplay: "Closed reduction internal fixation of fracture (procedure)",
  },
  "178730002": {
    newCode: "199044008",
    newDisplay: "Repair of mallet finger (procedure)",
  },

  // Procedure codes — tendon surgery
  "53363003": {
    newCode: "18701002",
    newDisplay: "Tendon graft (procedure)",
  },
  "28778006": {
    newCode: "1197603005",
    newDisplay: "Transfer of tendon (procedure)",
  },
  "240360007": {
    newCode: "5419008",
    newDisplay: "Lysis of adhesions of tendon (procedure)",
  },

  // Procedure codes — nerve surgery
  "69505002": {
    newCode: "231070009",
    newDisplay: "Repair of digital nerve (procedure)",
  },
  "44946003": {
    newCode: "273999003",
    newDisplay: "Repair of nerve (procedure)",
  },
  "51825000": {
    newCode: "273999003",
    newDisplay: "Repair of nerve (procedure)",
  },
  "74561000": {
    newCode: "273999003",
    newDisplay: "Repair of nerve (procedure)",
  },
  "7428004": {
    newCode: "307253003",
    newDisplay: "Nerve graft (procedure)",
  },
  "56625009": {
    newCode: "840681000168101",
    newDisplay: "Transfer of nerve (procedure)",
  },
  "81003001": {
    newCode: "231075004",
    newDisplay: "Excision of neuroma (procedure)",
  },

  // Procedure codes — joint procedures
  "60645001": {
    newCode: "239342001",
    newDisplay: "Trapeziectomy (procedure)",
  },
  "15484003": {
    newCode: "178850001",
    newDisplay: "Proximal row carpectomy (procedure)",
  },
  "34508009": {
    newCode: "1346451000168107",
    newDisplay: "Denervation of wrist joint (procedure)",
  },
  "3953006": {
    newCode: "447062007",
    newDisplay: "Anterior transposition of ulnar nerve (procedure)",
  },
  "78617001": {
    newCode: "3713005",
    newDisplay: "Release of tendon sheath of hand (procedure)",
  },

  // Procedure codes — Dupuytren
  "43107005": {
    newCode: "398211002",
    newDisplay: "Fasciectomy (procedure)",
  },
  "446701009": {
    newCode: "442527002",
    newDisplay: "Percutaneous needle fasciotomy (procedure)",
  },
  "450509001": {
    newCode: "708981007",
    newDisplay: "Injection of collagenase (procedure)",
  },

  // Procedure codes — vascular
  "3490005": {
    newCode: "39096005",
    newDisplay: "Repair of artery (procedure)",
  },
  "27523000": {
    newCode: "1136291000168107",
    newDisplay: "Repair of radial artery (procedure)",
  },
  "74994001": {
    newCode: "88309008",
    newDisplay: "Repair of blood vessel (procedure)",
  },
  "36989005": {
    newCode: "88309008",
    newDisplay: "Repair of blood vessel (procedure)",
  },

  // Procedure codes — soft tissue & reconstruction
  "7131001": {
    newCode: "405734007",
    newDisplay: "Repair of nail bed (procedure)",
  },
  "14413003": {
    newCode: "699265004",
    newDisplay: "Skin graft (procedure)",
  },
  "31946009": {
    newCode: "25232002",
    newDisplay: "Reconstruction of thumb with toe (procedure)",
  },
  "22169001": {
    newCode: "441462007",
    newDisplay: "Pollicisation of digit of hand (procedure)",
  },
  "81723002": {
    newCode: "239590009",
    newDisplay: "Amputation of finger (procedure)",
  },
  "51975008": {
    newCode: "180097006",
    newDisplay: "Excision of supernumerary digit (procedure)",
  },
  "24837003": {
    newCode: "448132001",
    newDisplay: "Excision of lesion (procedure)",
  },
  "43289009": {
    newCode: "444544004",
    newDisplay: "Irrigation of joint (procedure)",
  },

  // Procedure codes — other hand
  "91602001": {
    newCode: "231274008",
    newDisplay: "Injection of corticosteroid (procedure)",
  },
  "81121007": {
    newCode: "397737001",
    newDisplay: "Fasciotomy (procedure)",
  },
  "68526006": {
    newCode: "405706000",
    newDisplay: "Removal of foreign body (procedure)",
  },
  "274026004": {
    newCode: "241012007",
    newDisplay: "Drainage of paronychia (procedure)",
  },
  "174796008": {
    newCode: "430704003",
    newDisplay: "Incision and drainage of abscess of finger (procedure)",
  },
  "116244007": {
    newCode: "239460000",
    newDisplay: "Drainage of joint (procedure)",
  },
  "71906001": {
    newCode: "34685000",
    newDisplay: "Ray amputation of finger (procedure)",
  },

  // ── Craniofacial SNOMED CT fixes (validated against Ontoserver March 2026) ──

  // Diagnosis codes — cleft & craniofacial
  "253983005": {
    newCode: "65404009",
    newDisplay: "Cleft lip, unilateral (disorder)",
  },
  "253986002": {
    newCode: "763108005",
    newDisplay: "Submucous cleft palate (disorder)",
  },
  "253982000": {
    newCode: "445306000",
    newDisplay: "Cleft of alveolar ridge of maxilla (disorder)",
  },
  "253985003": {
    newCode: "27299009",
    newDisplay: "Congenital maxillary hypoplasia (disorder)",
  },

  // Procedure codes — cleft lip repair
  "278578005": {
    newCode: "234647001",
    newDisplay: "Repair of cleft lip (procedure)",
  },
  "82371002": {
    newCode: "71917006",
    newDisplay: "Repair of lip (procedure)",
  },

  // Procedure codes — palate repair
  "73682005": {
    newCode: "262267008",
    newDisplay: "Vomerine flap (procedure)",
  },
  "441790007": {
    newCode: "178493006",
    newDisplay: "Alveolar bone graft (procedure)",
  },
  "239404006": {
    newCode: "178406005",
    newDisplay: "Alveolar bone graft to maxilla (procedure)",
  },
  "174580009": {
    newCode: "276184008",
    newDisplay: "Repair of palate (procedure)",
  },
  "275023003": {
    newCode: "276184008",
    newDisplay: "Repair of palate (procedure)",
  },

  // Procedure codes — orthognathic & maxillary
  "360820005": {
    newCode: "58544004",
    newDisplay: "Le Fort I osteotomy (procedure)",
  },
  "36936005": {
    newCode: "256697007",
    newDisplay: "Buccal fat pad flap (procedure)",
  },

  // Procedure codes — craniosynostosis & craniofacial
  "429376006": {
    newCode: "178411007",
    newDisplay: "Frontofacial advancement (procedure)",
  },
  "89655001": {
    newCode: "64833008",
    newDisplay: "Costochondral graft to mandible (procedure)",
  },
  "31611004": {
    newCode: "303453000",
    newDisplay: "Orbital osteotomy (procedure)",
  },
  "63961008": {
    newCode: "231548001",
    newDisplay: "Correction of orbital hypertelorism (procedure)",
  },
  "48962002": {
    newCode: "25353009",
    newDisplay: "Craniotomy (procedure)",
  },
  "302301003": {
    newCode: "172605007",
    newDisplay: "Reconstruction of external ear (procedure)",
  },
  "173422003": {
    newCode: "112854004",
    newDisplay: "Fixation of tongue (procedure)",
  },
};

export function migrateSnomedCode(code: string): SnomedMigrationEntry | null {
  return OLD_TO_NEW_SNOMED[code] || null;
}
