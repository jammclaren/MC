/** Province → owning JTF, confirmed with the user for the barangay
 * categorization import and reused wherever a province's AOR needs to stay
 * consistent across features. Provinces outside this map (not yet tracked
 * anywhere in the app) get no default JTF. */
export const PROVINCE_TO_JTF: Record<string, string> = {
  "Maguindanao del Norte": "JTF CENTRAL",
  "Maguindanao del Sur": "JTF CENTRAL",
  "Cotabato City": "JTF CENTRAL",
  "SGA-BARMM": "JTF CENTRAL",
  "Lanao del Sur": "JTF ZAMPELAN",
  Basilan: "JTF ORION",
  "Tawi-Tawi": "JTF POSEIDON",
};
