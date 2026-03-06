export interface Hospital {
  name: string;
  city: string;
  country: string;
}

export const HOSPITALS: Hospital[] = [
  // NZ
  { name: "Waikato Hospital", city: "Hamilton", country: "NZ" },
  { name: "Auckland City Hospital", city: "Auckland", country: "NZ" },
  { name: "Middlemore Hospital", city: "Auckland", country: "NZ" },
  { name: "Christchurch Hospital", city: "Christchurch", country: "NZ" },
  { name: "Wellington Hospital", city: "Wellington", country: "NZ" },
  // Australia
  { name: "Royal Melbourne Hospital", city: "Melbourne", country: "AU" },
  { name: "Royal Prince Alfred Hospital", city: "Sydney", country: "AU" },
  {
    name: "Royal Brisbane and Women's Hospital",
    city: "Brisbane",
    country: "AU",
  },
  { name: "Fiona Stanley Hospital", city: "Perth", country: "AU" },
  { name: "Royal Adelaide Hospital", city: "Adelaide", country: "AU" },
  // UK
  {
    name: "St Andrew's Centre for Plastic Surgery, Broomfield Hospital",
    city: "Chelmsford",
    country: "UK",
  },
  { name: "Queen Victoria Hospital", city: "East Grinstead", country: "UK" },
  {
    name: "Canniesburn Plastic Surgery Unit",
    city: "Glasgow",
    country: "UK",
  },
  { name: "Stoke Mandeville Hospital", city: "Aylesbury", country: "UK" },
  { name: "Salisbury District Hospital", city: "Salisbury", country: "UK" },
  // DACH
  { name: "Universitätsspital Zürich", city: "Zürich", country: "CH" },
  { name: "Inselspital Bern", city: "Bern", country: "CH" },
  {
    name: "Charité – Universitätsmedizin Berlin",
    city: "Berlin",
    country: "DE",
  },
  { name: "BG Unfallklinik Ludwigshafen", city: "Ludwigshafen", country: "DE" },
  { name: "Medizinische Universität Wien", city: "Wien", country: "AT" },
];
