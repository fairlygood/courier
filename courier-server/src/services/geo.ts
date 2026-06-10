/**
 * Geo service — distance-based delivery delay calculation.
 *
 * Uses capital-city centroids as approximate locations for each country,
 * the Haversine formula for great-circle distance, and a configurable
 * delay curve (default: 1 hour per 200 km, minimum 1 hour).
 *
 * The COUNTRY_COORDS map uses ISO 3166-1 alpha-2 codes as keys.
 * Users self-report their country code on registration / profile edit;
 * no IP geolocation is performed.
 */

// ── Country centroids (capital coordinates) ──────────────────────────

const COUNTRY_COORDS: Record<string, [number, number]> = {
  AD: [42.5063, 1.5218], // Andorra la Vella
  AE: [24.4539, 54.3773], // Abu Dhabi
  AF: [34.5553, 69.2075], // Kabul
  AG: [17.1175, -61.8456], // St. John's
  AL: [41.3275, 19.8187], // Tirana
  AM: [40.1872, 44.5152], // Yerevan
  AO: [-8.8399, 13.2894], // Luanda
  AR: [-34.6037, -58.3816], // Buenos Aires
  AT: [48.2082, 16.3738], // Vienna
  AU: [-35.2809, 149.1300], // Canberra
  AZ: [40.4093, 49.8671], // Baku
  BA: [43.8563, 18.4131], // Sarajevo
  BB: [13.0974, -59.6187], // Bridgetown
  BD: [23.8103, 90.4125], // Dhaka
  BE: [50.8503, 4.3517], // Brussels
  BF: [12.3714, -1.5197], // Ouagadougou
  BG: [42.6977, 23.3219], // Sofia
  BH: [26.2285, 50.5860], // Manama
  BI: [-3.3822, 29.3629], // Bujumbura
  BJ: [6.4969, 2.6283], // Porto-Novo
  BN: [4.9424, 114.9481], // Bandar Seri Begawan
  BO: [-16.5000, -68.1500], // La Paz
  BR: [-15.7939, -47.8828], // Brasília
  BS: [25.0443, -77.3504], // Nassau
  BT: [27.4728, 89.6390], // Thimphu
  BW: [-24.6282, 25.9231], // Gaborone
  BY: [53.9006, 27.5590], // Minsk
  BZ: [17.2510, -88.7590], // Belmopan
  CA: [45.4215, -75.6972], // Ottawa
  CD: [-4.3217, 15.3120], // Kinshasa
  CF: [4.3947, 18.5582], // Bangui
  CG: [-4.2661, 15.2832], // Brazzaville
  CH: [46.9480, 7.4474], // Bern
  CI: [6.8205, -5.2789], // Yamoussoukro
  CL: [-33.4489, -70.6693], // Santiago
  CM: [3.8480, 11.5021], // Yaoundé
  CN: [39.9042, 116.4074], // Beijing
  CO: [4.7110, -74.0721], // Bogotá
  CR: [9.9281, -84.0907], // San José
  CU: [23.1330, -82.3830], // Havana
  CV: [14.9177, -23.5091], // Praia
  CY: [35.1856, 33.3823], // Nicosia
  CZ: [50.0755, 14.4378], // Prague
  DE: [52.5200, 13.4050], // Berlin
  DJ: [11.5806, 43.1425], // Djibouti City
  DK: [55.6761, 12.5683], // Copenhagen
  DM: [15.2976, -61.3879], // Roseau
  DO: [18.4861, -69.9312], // Santo Domingo
  DZ: [36.7538, 3.0588], // Algiers
  EC: [-0.1807, -78.4678], // Quito
  EE: [59.4370, 24.7536], // Tallinn
  EG: [30.0444, 31.2357], // Cairo
  ER: [15.3315, 38.9323], // Asmara
  ES: [40.4168, -3.7038], // Madrid
  ET: [9.0320, 38.7469], // Addis Ababa
  FI: [60.1699, 24.9384], // Helsinki
  FJ: [-18.1248, 178.4501], // Suva
  FR: [48.8566, 2.3522], // Paris
  GA: [0.4162, 9.4673], // Libreville
  GB: [51.5074, -0.1278], // London
  GD: [12.0560, -61.7488], // St. George's
  GE: [41.7151, 44.8271], // Tbilisi
  GH: [5.6037, -0.1870], // Accra
  GM: [13.4495, -16.5775], // Banjul
  GN: [9.6412, -13.5784], // Conakry
  GQ: [3.7500, 8.7833], // Malabo
  GR: [37.9838, 23.7275], // Athens
  GT: [14.6349, -90.5069], // Guatemala City
  GW: [11.8636, -15.5846], // Bissau
  GY: [6.8013, -58.1551], // Georgetown
  HN: [14.0723, -87.1921], // Tegucigalpa
  HR: [45.8150, 15.9819], // Zagreb
  HT: [18.5944, -72.3074], // Port-au-Prince
  HU: [47.4979, 19.0402], // Budapest
  ID: [-6.2088, 106.8456], // Jakarta
  IE: [53.3498, -6.2603], // Dublin
  IL: [31.7683, 35.2137], // Jerusalem
  IN: [28.6139, 77.2090], // New Delhi
  IQ: [33.3152, 44.3661], // Baghdad
  IR: [35.6892, 51.3890], // Tehran
  IS: [64.1466, -21.9426], // Reykjavík
  IT: [41.9028, 12.4964], // Rome
  JM: [17.9712, -76.7936], // Kingston
  JO: [31.9539, 35.9106], // Amman
  JP: [35.6762, 139.6503], // Tokyo
  KE: [-1.2921, 36.8219], // Nairobi
  KG: [42.8746, 74.5698], // Bishkek
  KH: [11.5564, 104.9282], // Phnom Penh
  KI: [1.3280, 172.9766], // South Tarawa
  KM: [-11.7172, 43.2473], // Moroni
  KP: [39.0392, 125.7625], // Pyongyang
  KR: [37.5665, 126.9780], // Seoul
  KW: [29.3759, 47.9774], // Kuwait City
  KZ: [51.1605, 71.4704], // Astana
  LA: [17.9757, 102.6331], // Vientiane
  LB: [33.8938, 35.5018], // Beirut
  LC: [14.0096, -60.9879], // Castries
  LI: [47.1410, 9.5215], // Vaduz
  LK: [6.9271, 79.8612], // Colombo
  LR: [6.3004, -10.7962], // Monrovia
  LS: [-29.3151, 27.4863], // Maseru
  LT: [54.6872, 25.2797], // Vilnius
  LU: [49.6117, 6.1300], // Luxembourg City
  LV: [56.9496, 24.1052], // Riga
  LY: [32.8872, 13.1913], // Tripoli
  MA: [34.0209, -6.8416], // Rabat
  MC: [43.7384, 7.4246], // Monaco
  MD: [47.0105, 28.8638], // Chișinău
  ME: [42.4416, 19.2626], // Podgorica
  MG: [-18.8792, 47.5079], // Antananarivo
  MK: [41.9973, 21.4280], // Skopje
  ML: [12.6392, -8.0029], // Bamako
  MM: [19.7633, 96.0785], // Naypyidaw
  MN: [47.8864, 106.9057], // Ulaanbaatar
  MR: [18.0858, -15.9785], // Nouakchott
  MT: [35.8997, 14.5147], // Valletta
  MU: [-20.1609, 57.5012], // Port Louis
  MV: [4.1755, 73.5093], // Malé
  MW: [-13.9626, 33.7741], // Lilongwe
  MX: [19.4326, -99.1332], // Mexico City
  MY: [3.1390, 101.6869], // Kuala Lumpur
  MZ: [-25.9692, 32.5732], // Maputo
  NA: [-22.5609, 17.0658], // Windhoek
  NE: [13.5127, 2.1126], // Niamey
  NG: [9.0765, 7.3986], // Abuja
  NI: [12.1364, -86.2514], // Managua
  NL: [52.3676, 4.9041], // Amsterdam
  NO: [59.9139, 10.7522], // Oslo
  NP: [27.7172, 85.3240], // Kathmandu
  NR: [-0.5477, 166.9209], // Yaren
  NZ: [-41.2865, 174.7762], // Wellington
  OM: [23.5880, 58.3829], // Muscat
  PA: [8.9824, -79.5199], // Panama City
  PE: [-12.0464, -77.0428], // Lima
  PG: [-9.4438, 147.1803], // Port Moresby
  PH: [14.5995, 120.9842], // Manila
  PK: [33.6844, 73.0479], // Islamabad
  PL: [52.2297, 21.0122], // Warsaw
  PT: [38.7223, -9.1393], // Lisbon
  PY: [-25.2637, -57.5759], // Asunción
  QA: [25.2854, 51.5310], // Doha
  RO: [44.4268, 26.1025], // Bucharest
  RS: [44.8125, 20.4612], // Belgrade
  RU: [55.7558, 37.6173], // Moscow
  RW: [-1.9441, 30.0619], // Kigali
  SA: [24.7136, 46.6753], // Riyadh
  SB: [-9.4300, 159.9499], // Honiara
  SC: [-4.6191, 55.4513], // Victoria
  SD: [15.5007, 32.5599], // Khartoum
  SE: [59.3293, 18.0686], // Stockholm
  SG: [1.3521, 103.8198], // Singapore
  SI: [46.0569, 14.5058], // Ljubljana
  SK: [48.1486, 17.1077], // Bratislava
  SL: [8.4844, -13.2344], // Freetown
  SM: [43.9424, 12.4578], // San Marino
  SN: [14.6937, -17.4441], // Dakar
  SO: [2.0469, 45.3182], // Mogadishu
  SR: [5.8520, -55.2038], // Paramaribo
  SS: [4.8594, 31.5713], // Juba
  ST: [0.3360, 6.7313], // São Tomé
  SV: [13.6929, -89.2182], // San Salvador
  SY: [33.5138, 36.2765], // Damascus
  SZ: [-26.3200, 31.1332], // Mbabane
  TD: [12.1348, 15.0557], // N'Djamena
  TG: [6.1319, 1.2224], // Lomé
  TH: [13.7563, 100.5018], // Bangkok
  TJ: [38.5598, 68.7870], // Dushanbe
  TL: [-8.5569, 125.5603], // Dili
  TM: [37.9601, 58.3794], // Ashgabat
  TN: [36.8065, 10.1815], // Tunis
  TO: [-21.1393, -175.2049], // Nukuʻalofa
  TR: [39.9334, 32.8597], // Ankara
  TT: [10.6549, -61.5019], // Port of Spain
  TV: [-8.5211, 179.1965], // Funafuti
  TW: [25.0330, 121.5654], // Taipei
  TZ: [-6.7924, 39.2083], // Dodoma
  UA: [50.4501, 30.5234], // Kyiv
  UG: [0.3476, 32.5825], // Kampala
  US: [38.9072, -77.0369], // Washington DC
  UY: [-34.9011, -56.1645], // Montevideo
  UZ: [41.2995, 69.2401], // Tashkent
  VA: [41.9029, 12.4534], // Vatican City
  VC: [13.1580, -61.2248], // Kingstown
  VE: [10.4806, -66.9036], // Caracas
  VN: [21.0278, 105.8342], // Hanoi
  VU: [-17.7404, 168.3158], // Port Vila
  WS: [-13.8333, -171.7666], // Apia
  XK: [42.6629, 21.1655], // Pristina
  YE: [15.3694, 44.1910], // Sana'a
  ZA: [-25.7479, 28.2293], // Pretoria
  ZM: [-15.4167, 28.2833], // Lusaka
  ZW: [-17.8252, 31.0335], // Harare
};

// ── Constants ────────────────────────────────────────────────────────

/** Earth's mean radius in kilometres. */
const EARTH_RADIUS_KM = 6371;

/** Kilometres per hour of delivery delay. */
const KM_PER_HOUR = 200;

// ── Haversine distance ───────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two [lat, lng] points in kilometres.
 */
export function haversineDistance(
  a: [number, number],
  b: [number, number],
): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a[0])) *
      Math.cos(toRad(b[0])) *
      sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

// ── Delay calculation ────────────────────────────────────────────────

/**
 * Compute the delivery delay in hours between two countries.
 *
 * Uses capital-city centroids and the Haversine formula to compute
 * great-circle distance, then divides by `KM_PER_HOUR` (200 km/h).
 * The result is clamped to a minimum of 1 hour.
 *
 * Falls back to 1 hour when either country code is unknown or when
 * sender and recipient are in the same country.
 *
 * @param senderCountry    ISO 3166-1 alpha-2 code of the sender.
 * @param recipientCountry ISO 3166-1 alpha-2 code of the recipient.
 * @returns                Delivery delay in whole hours (≥ 1).
 */
export function computeDeliveryDelay(
  senderCountry: string,
  recipientCountry: string,
): number {
  // Same country → minimum delay
  if (senderCountry === recipientCountry) return 1;

  const sender = COUNTRY_COORDS[senderCountry.toUpperCase()];
  const recipient = COUNTRY_COORDS[recipientCountry.toUpperCase()];

  // Unknown country → fall back to minimum
  if (!sender || !recipient) return 1;

  const km = haversineDistance(sender, recipient);
  return Math.max(1, Math.round(km / KM_PER_HOUR));
}

/**
 * Return the underlying country-coordinates map (read-only).
 * Useful for exposing country lists to the client (e.g. a country picker).
 */
export function getCountryList(): Readonly<Record<string, [number, number]>> {
  return COUNTRY_COORDS;
}
