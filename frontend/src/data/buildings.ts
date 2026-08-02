// Real GPS coordinates + display names for UCSD buildings referenced by the
// mock course data. Keyed by the room-code prefix (e.g. "CENTR 109" -> "CENTR").

export const BLDG_LATLNG: Record<string, [number, number]> = {
  CENTR:  [32.8778, -117.2376],
  WLH:    [32.8820, -117.2330],
  EBU3B:  [32.8822, -117.2336],
  HSS:    [32.8784, -117.2392],
  PETER:  [32.8769, -117.2381],
  SOLIS:  [32.8810, -117.2362],
  YORK:   [32.8793, -117.2388],
  GEISEL: [32.8810, -117.2378],
  PRICE:  [32.8799, -117.2368],
  COGSC:  [32.8817, -117.2354],
};

export const BLDG_NAMES: Record<string, string> = {
  CENTR:  "Center Hall",      WLH:   "Warren Lect. Hall",
  EBU3B:  "CSE / Jacobs",     HSS:   "Humanities & Soc Sci",
  PETER:  "Peterson Hall",    SOLIS: "Solis Hall",
  YORK:   "York Hall",        GEISEL:"Geisel Library",
  PRICE:  "Price Center",     COGSC: "Cognitive Science",
};

export const UCSD_CENTER: [number, number] = [32.8801, -117.2340];

export function buildingFromRoom(room: string): string {
  return room.split(" ")[0];
}
