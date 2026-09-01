import fs from "node:fs";
import path from "node:path";

export interface BarangayIndex {
  provinces: string[];
  municipalitiesByProvince: Record<string, string[]>;
  barangaysByMunicipality: Record<string, string[]>;
}

let cached: BarangayIndex | null = null;

/**
 * Province/municipality/barangay name suggestions sourced from the same
 * GeoJSON boundary file the Situation Map matches ElectionArea rows
 * against — a manually-typed name that drifts even slightly from this
 * (a spelling variant, an extra "Poblacion", a stray hyphen) silently
 * fails to match its polygon: the barangay renders gray/uncategorized on
 * the map even with a hotspot category on file, or — if lat/lng is also
 * set — as a redundant circle marker floating separately from its real
 * boundary. Server-only (reads the file from disk); pass the result down
 * to client form components rather than importing this there directly.
 */
export function getBarangayIndex(): BarangayIndex {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "public", "barmm-barangays.geojson");
  const raw = fs.readFileSync(filePath, "utf8");
  const geojson = JSON.parse(raw) as {
    features: { properties: { province?: string; municipality?: string; barangay?: string } }[];
  };

  const provinceSet = new Set<string>();
  const municipalitiesByProvince = new Map<string, Set<string>>();
  const barangaysByMunicipality = new Map<string, Set<string>>();

  for (const feature of geojson.features) {
    const { province, municipality, barangay } = feature.properties;
    if (!province) continue;
    provinceSet.add(province);
    if (!municipality) continue;

    const municipalities = municipalitiesByProvince.get(province) ?? new Set();
    municipalities.add(municipality);
    municipalitiesByProvince.set(province, municipalities);

    if (!barangay) continue;
    const key = `${province}||${municipality}`;
    const barangays = barangaysByMunicipality.get(key) ?? new Set();
    barangays.add(barangay);
    barangaysByMunicipality.set(key, barangays);
  }

  cached = {
    provinces: Array.from(provinceSet).sort(),
    municipalitiesByProvince: Object.fromEntries(
      Array.from(municipalitiesByProvince.entries()).map(([k, v]) => [k, Array.from(v).sort()])
    ),
    barangaysByMunicipality: Object.fromEntries(
      Array.from(barangaysByMunicipality.entries()).map(([k, v]) => [k, Array.from(v).sort()])
    ),
  };
  return cached;
}
