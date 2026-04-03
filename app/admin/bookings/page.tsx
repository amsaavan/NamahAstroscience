"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import AdminInactivityGuard from "@/components/admin-inactivity-guard";
import { moonposition } from "astronomia";

// ─── Types ──────────────────────────────────────────────────────────────────

type BookingRecord = {
  fullName: string;
  email: string;
  whatsapp: string;
  notes: string;
  date: string;
  slot: string;
  createdAt: string;
  feesPaid: boolean;
  completed?: boolean;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLat?: number;
  birthLon?: number;
  birthTimezone?: string;
  billedAmount?: string;
  currency?: string;
};

type BookingsResponse = {
  bookings?: BookingRecord[];
  error?: string;
};

type GeoResult = { lat: number; lon: number; displayName: string } | null;

// ─── Vedic Astrology Data ───────────────────────────────────────────────────

const PLANETS = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"] as const;
type Planet = (typeof PLANETS)[number];

const PLANET_FULL: Record<Planet, string> = {
  Su: "Sun",
  Mo: "Moon",
  Ma: "Mars",
  Me: "Mercury",
  Ju: "Jupiter",
  Ve: "Venus",
  Sa: "Saturn",
  Ra: "Rahu",
  Ke: "Ketu",
};

const RASHI_NAMES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const RASHI_SHORT = [
  "Ari",
  "Tau",
  "Gem",
  "Can",
  "Leo",
  "Vir",
  "Lib",
  "Sco",
  "Sag",
  "Cap",
  "Aqu",
  "Pis",
];

// 27 Nakshatras (each spans 13°20' = 13.333...°)
const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purvashadha",
  "Uttarashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

// Nakshatra lords for Vimshottari Dasha (same order as NAKSHATRAS)
const NAKSHATRA_LORDS: Planet[] = [
  "Ke",
  "Ve",
  "Su",
  "Mo",
  "Ma",
  "Ra",
  "Ju",
  "Sa",
  "Me",
  "Ke",
  "Ve",
  "Su",
  "Mo",
  "Ma",
  "Ra",
  "Ju",
  "Sa",
  "Me",
  "Ke",
  "Ve",
  "Su",
  "Mo",
  "Ma",
  "Ra",
  "Ju",
  "Sa",
  "Me",
];

// Vimshottari Dasha years for each planet
const DASHA_YEARS: Record<Planet, number> = {
  Ke: 7,
  Ve: 20,
  Su: 6,
  Mo: 10,
  Ma: 7,
  Ra: 18,
  Ju: 16,
  Sa: 19,
  Me: 17,
};

// Planets must go in Vimshottari order
const DASHA_ORDER: Planet[] = [
  "Ke",
  "Ve",
  "Su",
  "Mo",
  "Ma",
  "Ra",
  "Ju",
  "Sa",
  "Me",
];

// Approximate combust orbs (degrees)
const COMBUST_ORB: Partial<Record<Planet, number>> = {
  Mo: 12,
  Ma: 17,
  Me: 14,
  Ju: 11,
  Ve: 10,
  Sa: 15,
};

// ─── Astronomical Calculations (Jean Meeus + Lahiri Ayanamsa) ───────────────

const J2000 = 2451545.0;

function n360(d: number) {
  return ((d % 360) + 360) % 360;
}
function r(d: number) {
  return (d * Math.PI) / 180;
}
function deg(x: number) {
  return (x * 180) / Math.PI;
}

function julianDay(y: number, m: number, d: number, hour = 12): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045;
  return jdn + (hour - 12) / 24;
}

/** Lahiri (Chitra-Paksha) ayanamsa in degrees for a given Julian Day */
function lahiriAyanamsa(jd: number): number {
  // At JD 2451545.0 (J2000.0) ayanamsa ≈ 23.8531°
  // Precession rate ≈ 50.288" / year = 0.013969° / year
  return 23.8531 + ((jd - J2000) / 365.25) * 0.013969;
}

/** Solve Kepler's equation M = E - e·sin(E) iteratively */
function keplerE(M_deg: number, e: number): number {
  let E = r(M_deg);
  const M = r(M_deg);
  for (let i = 0; i < 8; i++)
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

// Orbital elements at J2000.0 [L0, L1(°/century), w0, w1, e0, e1, a(AU)]
const OE: Record<
  string,
  [number, number, number, number, number, number, number]
> = {
  Ea: [
    100.46435, 36000.76983, 102.94719, 0.30929, 0.01671022, -0.00004204, 1.0,
  ],
  Me: [
    252.25084, 149472.6741, 77.45779, 0.15595, 0.20563069, -0.000028, 0.387098,
  ],
  Ve: [
    181.97973, 58517.8154, 131.56377, 0.0566, 0.00677323, -0.000047, 0.72333,
  ],
  Ma: [
    355.45332, 19140.2993, 336.04084, 0.4432, 0.09341233, 0.000089, 1.523688,
  ],
  Ju: [34.40438, 3034.9057, 14.27495, 0.1816, 0.04839266, -0.000163, 5.203363],
  Sa: [49.94432, 1222.1138, 92.86136, 0.5422, 0.0541506, -0.000244, 9.53707],
};

/** Heliocentric ecliptic longitude (tropical) and radius (AU) for a planet */
function heliocentric(id: string, T: number): { lon: number; r: number } {
  const [L0, L1, w0, w1, e0, e1, a] = OE[id];
  const L = n360(L0 + L1 * T);
  const w = n360(w0 + w1 * T);
  const e = Math.max(0, e0 + e1 * T);
  const M = n360(L - w);
  const E = keplerE(M, e);
  const nu = deg(
    2 *
      Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2),
      ),
  );
  const radius = a * (1 - e * Math.cos(E));
  return { lon: n360(nu + w), r: radius };
}

/** Convert heliocentric → geocentric ecliptic longitude */
function helioToGeo(
  pLon: number,
  pR: number,
  eLon: number,
  eR: number,
): number {
  const px = pR * Math.cos(r(pLon)) - eR * Math.cos(r(eLon));
  const py = pR * Math.sin(r(pLon)) - eR * Math.sin(r(eLon));
  return n360(deg(Math.atan2(py, px)));
}

/** Compute geocentric sidereal longitudes for all planets at a given JD */
function computePositions(jd: number): Record<Planet, number> {
  const T = (jd - J2000) / 36525;
  const ay = lahiriAyanamsa(jd);

  // ── Sun (Meeus Ch.25, accuracy ±0.01°) ──────────────────────────────────
  const L0s = n360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const Ms = n360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Ms_r = r(Ms);
  const Cs =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Ms_r) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Ms_r) +
    0.000289 * Math.sin(3 * Ms_r);
  const sunTrop = n360(L0s + Cs); // Tropical (geocentric)
  const Su = n360(sunTrop - ay); // Sidereal (Vedic)

  // Earth heliocentric (needed to convert other planets to geocentric)
  const earthLon = n360(sunTrop + 180); // Earth opp. Sun (tropical)
  const earthR = heliocentric("Ea", T).r;

  // ── Moon (astronomia precise ELP-2000/82) ───────────────────────────────
  const moonPos = moonposition.position(jd);
  const MoTrop = n360(deg(moonPos.lon));
  const Mo = n360(MoTrop - ay);

  // ── Planets via Kepler + heliocentric→geocentric ─────────────────────────
  function geo(id: string): number {
    const h = heliocentric(id, T);
    return n360(helioToGeo(h.lon, h.r, earthLon, earthR) - ay);
  }

  // ── Rahu mean node (tropical→sidereal) ───────────────────────────────────
  const rahuTrop = n360(125.0445 - 1934.1362 * T + 0.0020708 * T * T);
  const Ra = n360(rahuTrop - ay);
  const Ke = n360(Ra + 180);

  return {
    Su,
    Mo,
    Ma: geo("Ma"),
    Me: geo("Me"),
    Ju: geo("Ju"),
    Ve: geo("Ve"),
    Sa: geo("Sa"),
    Ra,
    Ke,
  };
}

/** Detect retrograde by forward-differencing (t-0.5 vs t+0.5 days) */
function detectRetrograde(jd: number): Record<Planet, boolean> {
  const p1 = computePositions(jd - 0.5);
  const p2 = computePositions(jd + 0.5);
  const retro = {} as Record<Planet, boolean>;
  for (const p of PLANETS) {
    let diff = p2[p] - p1[p];
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    retro[p] = diff < 0;
  }
  return retro;
}

/** Compute the ascendant sidereal longitude and MC */
function computeAscAndMC(jd: number, latDeg: number, lonDeg: number): { asc: number; mc: number; ay: number } {
  const T = (jd - J2000) / 36525;
  const gmst =
    280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T;
  const lst = n360(gmst + lonDeg);
  const eps = 23.439291 - 0.013004 * T;
  const lstR = r(lst);
  const epsR = r(eps);
  const latR = r(latDeg);
  const ascRad = Math.atan2(
    Math.cos(lstR),
    -Math.sin(lstR) * Math.cos(epsR) - Math.tan(latR) * Math.sin(epsR),
  );
  const ascTrop = n360(deg(ascRad));

  // Midheaven (MC) perfectly in correct quadrant
  const mcRad = Math.atan2(Math.sin(lstR), Math.cos(lstR) * Math.cos(epsR));
  const mcTrop = n360(deg(mcRad));

  // Note: we'll run Horoscope.js below to get Placidus cusps
  const ay = lahiriAyanamsa(jd);
  return {
    asc: n360(ascTrop - ay),
    mc: n360(mcTrop - ay),
    ay: ay
  };
}


// STEP 2: Core interval check (circular-safe)
function inInterval(p: number, start: number, end: number) {
  p = n360(p);
  start = n360(start);
  end = n360(end);

  // Case A: normal interval (no wrap)
  if (start < end) {
    return p >= start && p < end;
  }

  // Case B: wrap-around interval (e.g., 350° → 20°)
  return p >= start || p < end;
}

// Map a planet directly into exact house cusps boundaries
function getChalitHouse(planetLongitude: number, cusps: number[]) {
  const p = n360(planetLongitude);
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];

    if (inInterval(p, start, end)) {
      return i + 1; // house number (1–12)
    }
  }
  return 1;
}

type PlanetData = {
  planet: Planet;
  longitude: number;
  signIdx: number;
  degInSign: number;
  navamsaSignIdx: number; // Added for D9
  nakshatraIdx: number;
  pada: number;
  nakshatraName: string;
  retrograde: boolean;
  combust: boolean;
  exalted: boolean;
  debilitated: boolean;
  house: number;       // standard Lagna house
  chalitHouse: number; // Equal House from Ascendant exact degree
};

// Navamsa calculation function
const NAVAMSA_SIZE = 3.3333333333;
function getNavamsaSign(longitude: number): number {
  const signIndex = Math.floor(longitude / 30);
  const degreeInSign = longitude % 30;
  const navamsaIndex = Math.floor(degreeInSign / NAVAMSA_SIZE);
  
  const movable = [0, 3, 6, 9];
  const fixed = [1, 4, 7, 10];
  
  let start;
  if (movable.includes(signIndex)) start = signIndex;
  else if (fixed.includes(signIndex)) start = (signIndex + 8) % 12;
  else start = (signIndex + 4) % 12;
  
  return (start + navamsaIndex) % 12;
}

// Signs 0-11 where planets are exalted
const EXALTED_SIGN: Record<Planet, number> = {
  Su: 0,
  Mo: 1,
  Ma: 9,
  Me: 5,
  Ju: 3,
  Ve: 11,
  Sa: 6,
  Ra: 1,
  Ke: 7,
};

// Signs 0-11 where planets are debilitated
const DEBILITATED_SIGN: Record<Planet, number> = {
  Su: 6,
  Mo: 7,
  Ma: 3,
  Me: 11,
  Ju: 9,
  Ve: 5,
  Sa: 0,
  Ra: 7,
  Ke: 1,
};

function computeChart(
  birthDate: string,
  birthTime: string,
  latDeg: number,
  lonDeg: number,
  forTransit: boolean = false,
): {
  ascendant: number;
  ascLongitude: number;
  jd: number;
  planets: PlanetData[];
  houses: Record<number, PlanetData[]>;
  cusps: number[];
} {
  let y, m, d, localHour;

  if (forTransit) {
    const now = new Date();
    y = now.getUTCFullYear();
    m = now.getUTCMonth() + 1;
    d = now.getUTCDate();
    localHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  } else {
    const partsDate = birthDate.split("-").map(Number);
    y = partsDate[0]; m = partsDate[1]; d = partsDate[2];
    const partsTime = (birthTime || "12:00").split(":").map(Number);
    localHour = partsTime[0] + (partsTime[1] || 0) / 60;
  }

  // Calculate Standard Timezone Offset (Local Time inputs are Standard Time, not Mean Time)
  let tzOffset = Math.round(lonDeg / 15);
  // Default to IST (+5.5) for India/South Asia
  if (!forTransit && lonDeg >= 68 && lonDeg <= 97 && latDeg >= 5 && latDeg <= 37) {
    tzOffset = 5.5;
  } else if (!forTransit && Math.abs(lonDeg / 15 - Math.round((lonDeg / 15) * 2) / 2) < 0.25) {
    // Snap to nearest half-hour timezone if appropriate (e.g. Iran, Afghanistan)
    tzOffset = Math.round((lonDeg / 15) * 2) / 2;
  }

  const utHour = forTransit ? localHour : localHour - tzOffset;
  const jd = julianDay(y, m, d, utHour);

  const { asc: ascLon, mc: mcLon, ay } = computeAscAndMC(jd, latDeg, lonDeg);
  const ascSignIdx = Math.floor(ascLon / 30);
  
  // Equal House cusps (Sripathi Paddhati / Vedic Bhava Chalit)
  // H1 midpoint = ascendant degree, so H1 cusp starts at Asc - 15°
  // Each house spans exactly 30°
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push(n360(ascLon - 15 + i * 30));
  }
  
    const positions = computePositions(jd);
  const retrogrades = detectRetrograde(jd);
  const sunLon = positions["Su"];

  const planets: PlanetData[] = PLANETS.map((planet) => {
    const longitude = positions[planet];
    const signIdx = Math.floor(longitude / 30);
    const degInSign = longitude % 30;
    const nakshatraIdx = Math.floor(longitude / (360 / 27)) % 27;
    const pada = Math.min(
      Math.floor((longitude % (360 / 27)) / (360 / 108)) + 1,
      4,
    );
    const house = ((signIdx - ascSignIdx + 12) % 12) + 1;
    const isNode = planet === "Ra" || planet === "Ke";

    let combust = false;
    const orb = COMBUST_ORB[planet];
    if (orb && !isNode && planet !== "Su") {
      let diff = Math.abs(longitude - sunLon);
      if (diff > 180) diff = 360 - diff;
      combust = diff < orb;
    }

    const exalted = signIdx === EXALTED_SIGN[planet];
    const debilitated = signIdx === DEBILITATED_SIGN[planet];

    // Chalit House assignment using actual sidereal house cusps
    const chalitHouse = getChalitHouse(longitude, cusps);

    return {
      planet,
      longitude,
      signIdx,
      degInSign,
      navamsaSignIdx: getNavamsaSign(longitude),
      nakshatraIdx,
      pada,
      nakshatraName: NAKSHATRAS[nakshatraIdx],
      retrograde: retrogrades[planet],
      combust,
      exalted,
      debilitated,
      house,
      chalitHouse,
    };
  });

  const houses: Record<number, PlanetData[]> = {};
  for (let i = 1; i <= 12; i++) houses[i] = [];
  for (const pd of planets) houses[pd.house].push(pd);

  return { ascendant: ascSignIdx, ascLongitude: ascLon, jd, planets, houses, cusps };
}

// ─── Transit (Gochar) ────────────────────────────────────────────────────────
// Transit chart mapped relatively to the user's natal lagna
function getTransit(natalAscendantSign: number) {
  const transitChart = computeChart("2000-01-01", "12:00", 0, 0, true);
  
  const transitHouses: Record<number, PlanetData[]> = {};
  for (let i = 1; i <= 12; i++) transitHouses[i] = [];
  
  for (const p of transitChart.planets) {
    const houseFromNatal = ((p.signIdx - natalAscendantSign + 12) % 12) + 1;
    const transitP = { ...p, house: houseFromNatal };
    transitHouses[houseFromNatal].push(transitP);
  }
  
  return transitHouses;
}

// ─── Vimshottari Dasha ───────────────────────────────────────────────────────

type DashaPeriod = {
  planet: Planet;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
};

/**
 * Add fractional years to a Date using calendar arithmetic.
 * Whole years are added via setFullYear for exact calendar alignment;
 * the fractional remainder is converted to days using 365.25 days/year
 * (traditional Vedic solar year used in Vimshottari Dasha).
 */
function addYearsCalendar(date: Date, years: number): Date {
  const result = new Date(date);
  const wholeYears = Math.floor(years);
  const fractionalYears = years - wholeYears;

  // Add whole years via calendar (respects leap years exactly)
  result.setFullYear(result.getFullYear() + wholeYears);

  // Add fractional remainder as days (365.25 days = 1 Vedic solar year)
  const fractionalDays = fractionalYears * 365.25;
  result.setTime(result.getTime() + fractionalDays * 86400000);

  return result;
}

function computeDasha(moonLongitude: number, birthJd: number): DashaPeriod[] {
  const nakshatraIdx = Math.floor(moonLongitude / (360 / 27)) % 27;
  const lordPlanet = NAKSHATRA_LORDS[nakshatraIdx];

  // Position within the nakshatra (0–1)
  const nakshatraSpan = 360 / 27;
  const posInNakshatra = (moonLongitude % nakshatraSpan) / nakshatraSpan;
  const balanceFraction = 1 - posInNakshatra;
  const balanceYears = DASHA_YEARS[lordPlanet] * balanceFraction;

  // Convert Julian Day back to exact Unix timestamp (JD 2440587.5 is 1970-01-01T00:00:00Z)
  const unixMs = (birthJd - 2440587.5) * 86400000;
  const birthDt = new Date(unixMs);
  const now = new Date();

  // Find starting index in DASHA_ORDER
  const startIdx = DASHA_ORDER.indexOf(lordPlanet);
  const periods: DashaPeriod[] = [];
  let cursor = new Date(birthDt);

  for (let i = 0; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const planet = DASHA_ORDER[idx];
    const years = i === 0 ? balanceYears : DASHA_YEARS[planet];
    // Calendar-based addition with 365.25 days/year (traditional Vedic solar year)
    const end = addYearsCalendar(cursor, years);
    periods.push({
      planet,
      startDate: new Date(cursor),
      endDate: end,
      isCurrent: cursor <= now && now < end,
    });
    cursor = end;
  }

  return periods;
}

// ─── North Indian Kundali Chart SVG ─────────────────────────────────────────
//
// Authentic NI style: boldly colored lines, rashi number shown in each house,
// diamond in center, planet abbreviations in coloured text.
// NI CCW house layout (4×4 grid perimeter, counter-clockwise from H1 at top):
//   H2  H1  H12 H11
//   H3       ─  H10
//   H4       ─  H9
//   H5  H6  H7  H8

function KundaliChartSVG({
  houses,
  ascendant,
  cusps,
}: {
  houses: Record<number, PlanetData[]>;
  ascendant: number; // 0-11
  cusps?: number[]; // Placidus exact cusps (12 array)
}) {
  const SIZE = 368;
  const ORANGE = "#f97316";

  // Rashi number for each house (1-12, starting from ascendant)
  function rashiNum(h: number) {
    return ((ascendant + h - 1) % 12) + 1;
  }

  // Planet text directly centered in the geometrically widest part of each house region
  const CX: Record<number, number> = {
    1: 0.5,
    2: 0.25,
    3: 0.12,
    4: 0.25,
    5: 0.12,
    6: 0.25,
    7: 0.5,
    8: 0.75,
    9: 0.88,
    10: 0.75,
    11: 0.88,
    12: 0.75,
  };
  const CY: Record<number, number> = {
    1: 0.25,
    2: 0.12,
    3: 0.25,
    4: 0.5,
    5: 0.75,
    6: 0.88,
    7: 0.75,
    8: 0.88,
    9: 0.75,
    10: 0.5,
    11: 0.25,
    12: 0.12,
  };

  // Rashi number placements specifically positioned firmly near the inner corners
  const RX: Record<number, number> = {
    1: 0.5,
    2: 0.25,
    3: 0.19,
    4: 0.44,
    5: 0.19,
    6: 0.25,
    7: 0.5,
    8: 0.75,
    9: 0.81,
    10: 0.56,
    11: 0.81,
    12: 0.75,
  };
  const RY: Record<number, number> = {
    1: 0.44,
    2: 0.19,
    3: 0.26,
    4: 0.51,
    5: 0.76,
    6: 0.82,
    7: 0.58,
    8: 0.82,
    9: 0.76,
    10: 0.51,
    11: 0.26,
    12: 0.19,
  };

  // Semantic colours based on user image
  const PCOL: Record<Planet, string> = {
    Su: "#ef4444",
    Mo: "#818cf8",
    Ma: "#166534",
    Me: "#475569",
    Ju: "#c084fc",
    Ve: "#166534",
    Sa: "#b91c1c",
    Ra: "#b91c1c",
    Ke: "#b45309",
  };

  // Rashi number colours based on image style
  const RCOL: Record<number, string> = {
    1: "#ef4444",
    2: "#818cf8",
    3: "#166534",
    4: "#3b82f6",
    5: "#c084fc",
    6: "#166534",
    7: "#b91c1c",
    8: "#b91c1c",
    9: "#f59e0b",
    10: "#ef4444",
    11: "#0f172a",
    12: "#0f172a",
  };

  const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{
        maxWidth: "100%",
        height: "auto",
        background: "#ffffff",
        borderRadius: "4px",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Authentic NI Chart Geometry */}
      {/* Outer Square border */}
      <rect
        x={0}
        y={0}
        width={SIZE}
        height={SIZE}
        fill="none"
        stroke={ORANGE}
        strokeWidth={1.5}
      />

      {/* Corner-to-corner diagonals */}
      <line
        x1={0}
        y1={0}
        x2={SIZE}
        y2={SIZE}
        stroke={ORANGE}
        strokeWidth={1.5}
      />
      <line
        x1={0}
        y1={SIZE}
        x2={SIZE}
        y2={0}
        stroke={ORANGE}
        strokeWidth={1.5}
      />

      {/* Center diamond (connecting midpoints) */}
      <polygon
        points={`${SIZE / 2},0 0,${SIZE / 2} ${SIZE / 2},${SIZE} ${SIZE},${SIZE / 2}`}
        fill="none"
        stroke={ORANGE}
        strokeWidth={1.5}
      />

      {/* Houses: rashi number + planets */}
      {ALL.map((house) => {
        const cx = CX[house] * SIZE;
        const cy = CY[house] * SIZE;
        const rx = RX[house] * SIZE;
        const ry = RY[house] * SIZE;
        const plts = houses[house] ?? [];
        const rn = ((ascendant + house - 1) % 12) + 1; // This is the rashi *in* the house
        const pStart = cy - (plts.length - 1) * 7;

        return (
          <g key={house}>
            {/* Rashi number */}
            <text
              x={rx}
              y={ry}
              textAnchor="middle"
              fill={RCOL[rn] || "#1e293b"}
              fontSize={13}
              fontWeight="700"
              fontFamily="Arial,sans-serif"
            >
              {rn}
            </text>

            {/* Planets */}
            {plts.map((p, i) => {
              const pSign = (p.signIdx ?? 0) + 1;
              const isChalitShift = pSign !== rn;
              const displayText = isChalitShift ? `${pSign} ${p.planet}` : p.planet;

              return (
                <text
                  key={p.planet}
                  x={cx}
                  y={pStart + i * 16}
                  textAnchor="middle"
                  fill={isChalitShift ? "#ef4444" : PCOL[p.planet]}
                  fontSize={13}
                  fontWeight="700"
                  fontFamily="Arial,sans-serif"
                >
                  {displayText}
                  <tspan dy="-6" fontSize="9" fontWeight="600">
                    {Math.floor(p.degInSign)}
                  </tspan>
                  <tspan dy="6">
                    {p.retrograde && " *"}
                    {p.exalted && " ↑"}
                    {p.debilitated && " ↓"}
                    {p.combust && " ^"}
                  </tspan>
                </text>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Kundali Modal ───────────────────────────────────────────────────────────

function KundaliModal({
  booking,
  onClose,
  onUpdate,
}: {
  booking: BookingRecord;
  onClose: () => void;
  onUpdate: (updatedBooking: BookingRecord) => void;
}) {
  const [geo, setGeo] = useState<GeoResult>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [activeChartTab, setActiveChartTab] = useState<"D1" | "D9" | "Chalit" | "Gochar">("D1");

  // Editable birth details (local state)
  // Extract structured birth place if available (City | State | Country)
  const initialPlace = booking.birthPlace || "";
  const parts = initialPlace.split(" | ");
  
  const [editDate, setEditDate] = useState(booking.birthDate || "");
  const [editTime, setEditTime] = useState(booking.birthTime || "");
  const [editCity, setEditCity] = useState(parts[0] || "");
  const [editState, setEditState] = useState(parts[1] || "");
  const [editCountry, setEditCountry] = useState(parts[2] || "");
  
  const [editLat, setEditLat] = useState<number | undefined>(booking.birthLat);
  const [editLon, setEditLon] = useState<number | undefined>(booking.birthLon);
  const [editTimezone, setEditTimezone] = useState<string | undefined>(booking.birthTimezone);
  
  const editPlace = [editCity, editState, editCountry].filter(Boolean).join(" | ");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Default coordinates fallback
  const currentLat = editLat ?? 23.0;
  const currentLon = editLon ?? 72.0;


  // Track if anything changed
  const hasChanges =
    editDate !== (booking.birthDate || "") ||
    editTime !== (booking.birthTime || "") ||
    editPlace !== (booking.birthPlace || "") ||
    editLat !== booking.birthLat ||
    editLon !== booking.birthLon;

  // Geocode whenever birth details change
  useEffect(() => {
    const params = new URLSearchParams();
    if (editCity) params.append("city", editCity);
    if (editState) params.append("state", editState);
    if (editCountry) params.append("country", editCountry);
    // If no structured parts, try the whole string as fallback
    if (!editCity && !editState && !editCountry && editPlace) params.append("place", editPlace);
    
    if (params.toString() === "") { setGeo(null); return; }

    let cancelled = false;
    setGeoLoading(true);
    setGeoError("");
    fetch(`/api/geocode?${params.toString()}`)
      .then((r) => r.json())
      .then(
        (data: {
          lat?: number;
          lon?: number;
          displayName?: string;
          error?: string;
        }) => {
          if (cancelled) return;
          if (data.error || data.lat == null)
            setGeoError(data.error ?? "Could not resolve coordinates.");
          else
            setGeo({
              lat: data.lat!,
              lon: data.lon!,
              displayName: data.displayName!,
            });
            // Auto-update local edit state if coordinates were missing
            if (editLat === undefined || editLon === undefined) {
              setEditLat(data.lat);
              setEditLon(data.lon);
            }
          }
      )
      .catch(() => {
        if (!cancelled) setGeoError("Geocoding request failed.");
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editPlace]);

  const chart = useMemo(
    () =>
      computeChart(
        editDate || "2000-01-01",
        editTime || "12:00",
        currentLat,
        currentLon,
      ),
    [editDate, editTime, currentLat, currentLon],
  );

  const moonData = chart.planets.find((p) => p.planet === "Mo")!;
  const dasha = useMemo(
    () => computeDasha(moonData.longitude, chart.jd),
    [moonData.longitude, chart.jd],
  );

  const currentDasha = dasha.find((d) => d.isCurrent);

  function degStr(deg: number) {
    const d = Math.floor(deg);
    const mf = (deg - d) * 60;
    const mm = Math.floor(mf);
    const ss = Math.floor((mf - mm) * 60);
    return `${String(d).padStart(2, "0")}-${String(mm).padStart(2, "0")}-${String(ss).padStart(2, "0")}`;
  }

  function fmtDate(dt: Date) {
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const transitHouses = useMemo(
    () => getTransit(chart.ascendant),
    [chart.ascendant],
  );

  const ascRashi = RASHI_NAMES[chart.ascendant];

  // Helper function to build Navamsa houses mapping for the SVG
  const navamsaHouses = useMemo(() => {
    const nh: Record<number, PlanetData[]> = {};
    for (let i = 1; i <= 12; i++) nh[i] = [];
    
    // In D9, the "Ascendant" sign is the Navamsa sign of the D1 Ascendant degree
    const ascNavamsaSign = getNavamsaSign(chart.ascLongitude);

    chart.planets.forEach(p => {
      const houseFromNavLagna = ((p.navamsaSignIdx - ascNavamsaSign + 12) % 12) + 1;
      nh[houseFromNavLagna].push(p);
    });
    return { houses: nh, ascendant: ascNavamsaSign };
  }, [chart]);

  // Helper function to build Chalit houses mapping for the SVG
  const chalitChartHouses = useMemo(() => {
    const ch: Record<number, PlanetData[]> = {};
    for (let i = 1; i <= 12; i++) ch[i] = [];
    
    // Chalit still uses the D1 Ascendant Rashi as House 1's label
    chart.planets.forEach(p => {
      ch[p.chalitHouse].push(p);
    });
    return { houses: ch, ascendant: chart.ascendant, cusps: chart.cusps };
  }, [chart]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-6 pb-16 print-container"
      style={{ background: "rgba(6,11,26,0.94)", backdropFilter: "blur(6px)" }}
    >
      <div
        id="kundali-modal-content"
        className="relative mx-auto w-full max-w-4xl rounded-2xl border border-[#1e2a45] shadow-2xl"
        style={{ background: "#0d1526" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-8 py-5"
          style={{ background: "linear-gradient(135deg,#7a0000,#4a0000)" }}
        >
          <div>
            <p className="text-xs uppercase tracking-[3px] text-[#f4c430] mb-1">
              ॥ Shree Ganeshay Namah ॥
            </p>
            <h2 className="text-xl font-bold text-[#f4c430]">
              Kundali — {booking.fullName}
            </h2>
            <p className="text-xs text-[#e2c97e] mt-0.5">
              Namah Astroscience · Vedic Birth Chart
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#f4c430]/40 px-3 py-1.5 text-xs text-[#f4c430] hover:bg-[#f4c430]/10 transition print-hide"
          >
            ✕ Close
          </button>
        </div>

        {/* Birth Details Row — Editable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-6 sm:px-8 py-4 border-b border-[#1e2a45]">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[2px] text-white">
              Date of Birth
            </p>
            <input
              type="date"
              value={editDate}
              onChange={(e) => { setEditDate(e.target.value); setSaveMsg(""); }}
              className="w-full rounded-md border border-[#1e2a45] bg-[#0a1020] px-2 py-1.5 text-sm font-semibold text-[#e2e8f0] outline-none focus:border-[#f4c430]/50"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[2px] text-white">
              Time of Birth
            </p>
            <input
              type="time"
              value={editTime}
              onChange={(e) => { setEditTime(e.target.value); setSaveMsg(""); }}
              className="w-full rounded-md border border-[#1e2a45] bg-[#0a1020] px-2 py-1.5 text-sm font-semibold text-[#e2e8f0] outline-none focus:border-[#f4c430]/50"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[2px] text-white">City</p>
            <input
              type="text"
              placeholder="e.g. Talala"
              value={editCity}
              onChange={(e) => { setEditCity(e.target.value); setSaveMsg(""); }}
              className="w-full rounded-md border border-[#1e2a45] bg-[#0a1020] px-2 py-1.5 text-sm font-semibold text-[#e2e8f0] outline-none focus:border-[#f4c430]/50 placeholder:text-[#4b5563]"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[2px] text-white">State</p>
            <input
              type="text"
              placeholder="e.g. Gujarat"
              value={editState}
              onChange={(e) => { setEditState(e.target.value); setSaveMsg(""); }}
              className="w-full rounded-md border border-[#1e2a45] bg-[#0a1020] px-2 py-1.5 text-sm font-semibold text-[#e2e8f0] outline-none focus:border-[#f4c430]/50 placeholder:text-[#4b5563]"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[2px] text-white">Country</p>
            <input
              type="text"
              placeholder="e.g. India"
              value={editCountry}
              onChange={(e) => { setEditCountry(e.target.value); setSaveMsg(""); }}
              className="w-full rounded-md border border-[#1e2a45] bg-[#0a1020] px-2 py-1.5 text-sm font-semibold text-[#e2e8f0] outline-none focus:border-[#f4c430]/50 placeholder:text-[#4b5563]"
            />
          </div>
        </div>
        {/* Save bar */}
        {(hasChanges || saveMsg) && (
          <div className="px-8 py-2 border-b border-[#1e2a45] flex items-center gap-3 print-hide">
            {hasChanges && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setSaveMsg("");
                  try {
                    const r = await fetch("/api/bookings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        date: booking.date,
                        slot: booking.slot,
                         birthDate: editDate,
                        birthTime: editTime,
                        birthPlace: editPlace,
                        birthLat: editLat,
                        birthLon: editLon,
                        birthTimezone: editTimezone,
                      }),
                    });
                    if (!r.ok) {
                      setSaveMsg("Failed to save.");
                    } else {
                      const updated = {
                        ...booking,
                         birthDate: editDate,
                        birthTime: editTime,
                        birthPlace: editPlace,
                        birthLat: editLat,
                        birthLon: editLon,
                        birthTimezone: editTimezone,
                      };
                      onUpdate(updated);
                      setSaveMsg("✓ Saved");
                    }
                  } catch {
                    setSaveMsg("Failed to save.");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="rounded-md bg-[#f4c430] px-4 py-1.5 text-xs font-bold text-[#0d1526] hover:bg-[#e2b420] transition disabled:opacity-60"
              >
                {saving ? "Saving…" : "💾 Save Birth Details"}
              </button>
            )}
            {saveMsg && (
              <span className={`text-xs font-medium ${saveMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                {saveMsg}
              </span>
            )}
          </div>
        )}

         {/* Geo status */}
        <div className="px-8 py-2 border-b border-[#1e2a45] flex flex-wrap items-center gap-4 text-xs">
          {geoLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f4c430] animate-pulse inline-block" />
              <span className="text-white">Resolving location…</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full inline-block ${editLat && editLon ? "bg-green-500" : "bg-amber-500"}`} />
                <span className={`${editLat && editLon ? "text-green-400" : "text-amber-400"} font-medium`}>
                  📍 {editLat?.toFixed(4) ?? "23.0000"}°N, {editLon?.toFixed(4) ?? "72.0000"}°E
                </span>
              </div>
              
              <div className="flex items-center gap-2 ml-auto print-hide">
                 <button 
                  onClick={() => {
                    const newLat = prompt("Override Latitude:", editLat?.toString() || "23.0");
                    if (newLat) setEditLat(parseFloat(newLat));
                  }}
                  className="text-[10px] text-white/40 hover:text-[#f4c430]"
                >
                  Edit Lat
                 </button>
                 <button 
                  onClick={() => {
                    const newLon = prompt("Override Longitude:", editLon?.toString() || "72.0");
                    if (newLon) setEditLon(parseFloat(newLon));
                  }}
                  className="text-[10px] text-white/40 hover:text-[#f4c430]"
                >
                  Edit Lon
                 </button>
                 {geo && (
                   <button 
                    onClick={() => {
                      setEditLat(geo.lat);
                      setEditLon(geo.lon);
                    }}
                    className="text-[10px] text-[#f4c430] hover:underline"
                   >
                     Use Resolved ({geo.lat.toFixed(2)}, {geo.lon.toFixed(2)})
                   </button>
                 )}
              </div>
            </div>
          )}
        </div>

        {/* Ascendant + current dasha banner */}
        <div className="px-8 py-2.5 border-b border-[#1e2a45] flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-[2px] text-white">
              Ascendant (Lagna):
            </span>
            <span className="font-bold text-[#f4c430] text-sm">{ascRashi}</span>
          </div>
          {currentDasha && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-white">Current Mahadasha:</span>
              <span className="font-bold text-[#a78bfa]">
                {PLANET_FULL[currentDasha.planet]}
              </span>
              <span className="text-white">
                until {fmtDate(currentDasha.endDate)}
              </span>
            </div>
          )}
        </div>

        {/* Main: Chart + Planet Table */}
        <div className="flex flex-col gap-8 px-8 py-6">
          {/* Chart Header Tabs & Display */}
          <div className="flex flex-col gap-6">
            <div className="flex gap-6 border-b border-[#1e2a45]">
              <button
                type="button"
                onClick={() => setActiveChartTab("D1")}
                className={`pb-2 text-sm uppercase tracking-[2px] font-bold transition-colors ${activeChartTab === "D1" ? "border-b-2 border-[#f4c430] text-[#f4c430]" : "text-[#6b7280] hover:text-[#e2e8f0]"}`}
              >
                Lagna (D1)
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("D9")}
                className={`pb-2 text-sm uppercase tracking-[2px] font-bold transition-colors ${activeChartTab === "D9" ? "border-b-2 border-[#a78bfa] text-[#a78bfa]" : "text-[#6b7280] hover:text-[#e2e8f0]"}`}
              >
                Navamsa (D9)
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("Chalit")}
                className={`pb-2 text-sm uppercase tracking-[2px] font-bold transition-colors ${activeChartTab === "Chalit" ? "border-b-2 border-[#fb923c] text-[#fb923c]" : "text-[#6b7280] hover:text-[#e2e8f0]"}`}
              >
                Chalit (Bhava)
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("Gochar")}
                className={`pb-2 text-sm uppercase tracking-[2px] font-bold transition-colors ${activeChartTab === "Gochar" ? "border-b-2 border-green-400 text-green-400" : "text-[#6b7280] hover:text-[#e2e8f0]"}`}
              >
                Transit (Gochar)
              </button>
            </div>

            <div className="flex justify-center w-full">
              {activeChartTab === "D1" && (
                <div className="w-full max-w-sm">
                  <KundaliChartSVG
                    houses={chart.houses}
                    ascendant={chart.ascendant}
                  />
                </div>
              )}
              {activeChartTab === "D9" && (
                <div className="w-full max-w-sm" style={{ filter: "sepia(0.2)"}}>
                  <KundaliChartSVG
                    houses={navamsaHouses.houses}
                    ascendant={navamsaHouses.ascendant}
                  />
                </div>
              )}
              {activeChartTab === "Chalit" && (
                <div className="w-full max-w-sm" style={{ filter: "brightness(1.1) contrast(1.1)"}}>
                  <KundaliChartSVG
                    houses={chalitChartHouses.houses}
                    ascendant={chalitChartHouses.ascendant}
                    cusps={chalitChartHouses.cusps}
                  />
                </div>
              )}
              {activeChartTab === "Gochar" && (
                <div className="w-full max-w-sm" style={{ filter: "hue-rotate(90deg)"}}>
                  <KundaliChartSVG
                    houses={transitHouses}
                    ascendant={chart.ascendant} // Relative to natal lagna
                  />
                </div>
              )}
            </div>
          </div>
            
            {/* Planetary Positions Table */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[2px] text-white mb-2">
                Planetary Positions
              </p>
              <div className="rounded-xl border border-[#1e2a45] overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr style={{ background: "#0f1829" }}>
                      {[
                        "Planet",
                        "C",
                        "R",
                        "D1 Sign",
                        "D9 Sign",
                        "Longitude",
                        "Nakshatra",
                        "Pada",
                        "D1 House",
                        "Eq House",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-white font-normal uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Ascendant row */}
                  <tr
                    className="border-t border-[#1e2a45]"
                    style={{ background: "rgba(217,119,6,0.06)" }}
                  >
                    <td className="px-3 py-2 font-bold text-[#f4c430]">Asc</td>
                    <td className="px-3 py-2 text-[#4b5563]">—</td>
                    <td className="px-3 py-2 text-[#4b5563]">—</td>
                    <td className="px-3 py-2 text-[#e2e8f0]">
                      {RASHI_SHORT[chart.ascendant]}
                    </td>
                    <td className="px-3 py-2 text-[#a78bfa]">
                      {RASHI_SHORT[navamsaHouses.ascendant]}
                    </td>
                    <td className="px-3 py-2 text-[#9ca3af] font-mono">
                      {degStr(chart.ascLongitude % 30)}
                    </td>
                    <td className="px-3 py-2 text-[#e2e8f0]">
                      {
                        NAKSHATRAS[
                          Math.floor(chart.ascLongitude / (360 / 27)) % 27
                        ]
                      }
                    </td>
                    <td className="px-3 py-2 text-[#9ca3af]">
                      {Math.floor(
                        (chart.ascLongitude % (360 / 27)) / (360 / 108),
                      ) + 1}
                    </td>
                    <td className="px-3 py-2 text-[#f4c430]">1</td>
                    <td className="px-3 py-2 text-[#34d399]">1</td>
                  </tr>
                  {chart.planets.map((pd) => (
                    <tr
                      key={pd.planet}
                      className="border-t border-[#1e2a45]"
                      style={{ background: "#111a2e" }}
                    >
                      <td
                        className="px-3 py-2 font-bold"
                        style={{
                          color:
                            pd.planet === "Ra" || pd.planet === "Ke"
                              ? "#c084fc"
                              : pd.planet === "Su"
                                ? "#f59e0b"
                                : "#e2e8f0",
                        }}
                      >
                        {pd.planet}
                      </td>
                      <td className="px-3 py-2 text-red-400 font-bold">
                        {pd.combust ? "C" : ""}
                      </td>
                      <td className="px-3 py-2 text-blue-400 font-bold">
                        {pd.retrograde ? "R" : ""}
                      </td>
                      <td className="px-3 py-2 text-[#e2e8f0]">
                        {RASHI_SHORT[pd.signIdx]}
                      </td>
                      <td className="px-3 py-2 text-[#a78bfa]">
                        {RASHI_SHORT[pd.navamsaSignIdx]}
                      </td>
                      <td className="px-3 py-2 text-[#9ca3af] font-mono">
                        {degStr(pd.degInSign)}
                      </td>
                      <td className="px-3 py-2 text-[#e2e8f0]">
                        {pd.nakshatraName}
                      </td>
                      <td className="px-3 py-2 text-[#9ca3af]">{pd.pada}</td>
                      <td className="px-3 py-2 text-[#f4c430]">{pd.house}</td>
                      <td className="px-3 py-2 text-[#34d399]">{pd.chalitHouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white">
              <span>
                <span className="font-bold text-red-400">C</span> = Combust
              </span>
              <span>
                <span className="font-bold text-blue-400">R</span> = Retrograde
              </span>
              <span>
                Su=Sun, Mo=Moon, Ma=Mars, Me=Mercury, Ju=Jupiter, Ve=Venus, Sa=Saturn, Ra=Rahu, Ke=Ketu
              </span>
            </div>
          </div>
        </div>

        {/* Vimshottari Dasha */}
        <div className="px-8 pb-6">
          <p className="text-[10px] uppercase tracking-[2px] text-white mb-2">
            Vimshottari Dasha
            <span className="ml-2 normal-case tracking-normal text-white">
              — Balance at birth:{" "}
              {PLANET_FULL[NAKSHATRA_LORDS[moonData.nakshatraIdx]]}{" "}
              {(
                DASHA_YEARS[NAKSHATRA_LORDS[moonData.nakshatraIdx]] *
                (1 - (moonData.longitude % (360 / 27)) / (360 / 27))
              ).toFixed(2)}{" "}
              yrs
            </span>
          </p>
          <div className="rounded-xl border border-[#1e2a45] overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr style={{ background: "#0f1829" }}>
                  {["Mahadasha", "Period", "Start", "End"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-white font-normal uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dasha.map((d, i) => (
                  <tr
                    key={i}
                    className="border-t border-[#1e2a45]"
                    style={{
                      background: d.isCurrent
                        ? "rgba(167,139,250,0.12)"
                        : "#111a2e",
                    }}
                  >
                    <td
                      className="px-6 py-2 font-bold"
                      style={{ color: d.isCurrent ? "#a78bfa" : "#e2e8f0" }}
                    >
                      {d.isCurrent && "▶ "}
                      {PLANET_FULL[d.planet]}
                    </td>
                    <td className="px-3 py-2 text-[#9ca3af]">
                      {DASHA_YEARS[d.planet]} yrs
                    </td>
                    <td className="px-3 py-2 text-[#9ca3af]">
                      {fmtDate(d.startDate)}
                    </td>
                    <td className="px-3 py-2 text-[#9ca3af]">
                      {fmtDate(d.endDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-5 flex items-center justify-between gap-4 border-t border-[#1e2a45] pt-4">
          <p className="text-[10px] text-white max-w-sm">
            * Positions use mean planetary motion (Vedic approximation). For
            precise Kundali consult Jinesh Shah directly.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-[#f4c430] px-4 py-2 text-xs text-[#f4c430] hover:bg-[#f4c430]/10 transition print-hide"
          >
            🖨 Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────

function InvoiceModal({
  booking,
  onClose,
  onInvoiceSent,
}: {
  booking: BookingRecord;
  onClose: () => void;
  onInvoiceSent: (updatedBooking: BookingRecord) => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const currencies = [
    { symbol: "₹", label: "INR (₹)" },
    { symbol: "$", label: "USD ($)" },
    { symbol: "€", label: "EUR (€)" },
    { symbol: "£", label: "GBP (£)" },
    { symbol: "AED", label: "AED" },
    { symbol: "C$", label: "CAD (C$)" },
    { symbol: "A$", label: "AUD (A$)" },
    { symbol: "NZ$", label: "NZD (NZ$)" },
    { symbol: "CHF", label: "CHF" },
  ];

  const handleSend = async () => {
    if (!amount.trim()) {
      setError("Please enter a billed amount.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // 1. Update the booking status to completed and record the amount
      const updateRes = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: booking.date,
          slot: booking.slot,
          completed: true,
          billedAmount: amount,
          currency: currency,
        }),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update booking status.");
      }

      // 2. Trigger the invoice email
      const emailRes = await fetch("/api/bookings/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: booking.date,
          slot: booking.slot,
          type: "invoice",
          amount: amount,
          currency: currency,
        }),
      });

      if (!emailRes.ok) {
        throw new Error("Failed to send invoice email.");
      }

      onInvoiceSent({ ...booking, completed: true, billedAmount: amount, currency: currency });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#1e2a45] bg-[#0d1526] p-8 shadow-2xl">
        <h3 className="text-xl font-bold text-[#f4c430] mb-2">Invoicing - {booking.fullName}</h3>
        <p className="text-sm text-[#9ca3af] mb-6">Enter the total consultation fees to send an official invoice email to the client.</p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs uppercase tracking-wider text-[#e2c97e] mb-1.5 font-semibold">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-[#1e2a45] bg-[#0a1020] px-3 py-3 text-sm font-bold text-[#f4c430] outline-none focus:border-[#f4c430]/50 appearance-none"
              >
                {currencies.map(c => <option key={c.symbol} value={c.symbol}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#e2c97e] mb-1.5 font-semibold">Billed Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f4c430] font-bold">{currency}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className={`w-full rounded-xl border border-[#1e2a45] bg-[#0a1020] ${currency.length > 1 ? 'pl-12' : 'pl-8'} pr-4 py-3 text-lg font-bold text-[#f4c430] outline-none focus:border-[#f4c430]/50`}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#1e2a45] py-3 text-sm font-semibold text-[#9ca3af] hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={handleSend}
              className="flex-2 rounded-xl bg-[#f4c430] py-3 px-8 text-sm font-bold text-[#0d1526] hover:bg-[#e2b420] transition disabled:opacity-50"
            >
              {sending ? "Sending..." : "🚀 Send Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Bookings Page ─────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [cancellingKey, setCancellingKey] = useState("");
  const [togglingKey, setTogglingKey] = useState("");
  const [kundaliBooking, setKundaliBooking] = useState<BookingRecord | null>(
    null,
  );
  const [invoiceBooking, setInvoiceBooking] = useState<BookingRecord | null>(
    null,
  );
  const [remindingKey, setRemindingKey] = useState("");

  const endpoint = useMemo(() => {
    if (!selectedDate) return "/api/bookings";
    return `/api/bookings?date=${encodeURIComponent(selectedDate)}`;
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(endpoint, { signal: controller.signal });
        if (!r.ok) throw new Error("failed");
        const data = (await r.json()) as BookingsResponse;
        if (active) setBookings(data.bookings ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (active) {
          setBookings([]);
          setError("Could not load bookings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [endpoint]);

  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const activeBookings = bookings.filter((b) => !b.completed);
  const completedBookings = bookings.filter((b) => b.completed);

  const handleExportToExcel = () => {
    if (completedBookings.length === 0) return;

    // Flatten data for Excel
    const dataToExport = completedBookings.map((b) => ({
      "Consultation Date": b.date,
      "Full Name": b.fullName,
      Email: b.email,
      WhatsApp: b.whatsapp,
      "Birth Date": b.birthDate || "N/A",
      "Birth Time": b.birthTime || "N/A",
      "Birth Place": b.birthPlace || "N/A",
      "Fees Paid": b.feesPaid ? "Yes" : "No",
      "Booking Status": "Completed",
      "Created At": new Date(b.createdAt).toLocaleString(),
      Notes: b.notes || "",
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Completed Consultations");

    // Auto-size columns (basic)
    const maxWidths = dataToExport.reduce((acc, row) => {
      Object.entries(row).forEach(([key, val], idx) => {
        const len = String(val).length;
        if (!acc[idx] || len > acc[idx]) acc[idx] = len;
      });
      return acc;
    }, [] as number[]);
    worksheet["!cols"] = maxWidths.map(w => ({ wch: Math.min(Math.max(w, 10), 40) }));

    // Generate file and trigger download
    XLSX.writeFile(workbook, `Namah_Astroscience_Completed_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderTable = (list: BookingRecord[], isCompletedSection: boolean) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-[#d6c7b2] bg-white">
      <table className="min-w-full text-left text-sm text-[#2b1b12]">
        <thead className="bg-[#efe4d6] text-[#3b2417]">
          <tr>
            {[
              "Date",
              "Name",
              "Email",
              "WhatsApp",
              "Notes",
              "Created",
              "Fees",
              "Kundali",
              "Actions",
            ].map((h) => (
              <th key={h} className="px-4 py-3 align-bottom">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-[#6b4c3b] text-center" colSpan={10}>
                {isCompletedSection
                  ? "No completed consultations."
                  : "No active bookings found."}
              </td>
            </tr>
          ) : (
            list.map((booking) => {
              const rowKey = `${booking.date}|${booking.slot}|${booking.createdAt}`;
              const hasBirth = Boolean(booking.birthDate);
              return (
                <tr
                  key={`${booking.date}-${booking.slot}-${booking.createdAt}`}
                  className="border-t border-[#efe4d6] group hover:bg-[#faf6f0]"
                >
                  <td className="px-4 py-3 align-middle">{booking.date}</td>
                  <td className="px-4 py-3 align-middle font-medium">
                    {booking.fullName}
                  </td>
                  <td className="px-4 py-3 align-middle">{booking.email}</td>
                  <td className="px-4 py-3 align-middle">
                    <a
                      href={`https://wa.me/${booking.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 underline hover:text-green-900"
                    >
                      {booking.whatsapp}
                    </a>
                  </td>
                  <td
                    className="px-4 py-3 align-middle max-w-[200px] truncate"
                    title={booking.notes}
                  >
                    {booking.notes || "-"}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {new Date(booking.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <button
                      type="button"
                      disabled={togglingKey === rowKey}
                      onClick={async () => {
                        setTogglingKey(rowKey);
                        setError("");
                        try {
                          const r = await fetch("/api/bookings", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              date: booking.date,
                              slot: booking.slot,
                              feesPaid: !booking.feesPaid,
                            }),
                          });
                          if (!r.ok) {
                            setError(
                              ((await r.json()) as BookingsResponse).error ??
                                "Update failed.",
                            );
                            return;
                          }
                          setBookings((prev) =>
                            prev.map((item) =>
                              item.date === booking.date &&
                              item.slot === booking.slot
                                ? { ...item, feesPaid: !booking.feesPaid }
                                : item,
                            ),
                          );
                        } catch {
                          setError("Update failed.");
                        } finally {
                          setTogglingKey("");
                        }
                      }}
                      className={`flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-70 ${booking.feesPaid ? "bg-green-600 text-white hover:bg-green-800" : "bg-amber-100 text-amber-800 ring-1 ring-amber-400 hover:bg-amber-200"}`}
                    >
                      {togglingKey === rowKey
                        ? "..."
                        : booking.feesPaid
                          ? "✓ Paid"
                          : booking.billedAmount 
                            ? `${booking.currency || "₹"} ${booking.billedAmount} • Unpaid`
                            : "Unpaid"}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <button
                      type="button"
                      title={
                        hasBirth
                          ? "View Kundali chart"
                          : "Add birth details to generate Kundali"
                      }
                      onClick={() => setKundaliBooking(booking)}
                      className={`flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${hasBirth ? "bg-purple-700 text-white hover:bg-purple-900" : "bg-amber-100 text-amber-800 ring-1 ring-amber-400 hover:bg-amber-200"}`}
                    >
                      🔮 {hasBirth ? "View" : "Add Details"}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={cancellingKey === rowKey + "-done"}
                        onClick={async () => {
                          if (!isCompletedSection) {
                            // If marking as done, open the invoice modal
                            setInvoiceBooking(booking);
                            return;
                          }

                          const actionLabel = "Restore";
                          setError("");
                          setCancellingKey(rowKey + "-done");
                          try {
                            const r = await fetch("/api/bookings", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                date: booking.date,
                                slot: booking.slot,
                                completed: false,
                              }),
                            });
                            const d = (await r.json()) as BookingsResponse;
                            if (!r.ok) {
                              setError(d.error ?? `${actionLabel} failed.`);
                              return;
                            }
                            setBookings((prev) =>
                              prev.map((item) =>
                                item.date === booking.date &&
                                item.slot === booking.slot
                                  ? { ...item, completed: false }
                                  : item,
                              ),
                            );
                          } catch {
                            setError(`${actionLabel} failed.`);
                          } finally {
                            setCancellingKey("");
                          }
                        }}
                        className={`flex min-w-[85px] items-center justify-center rounded-md px-3 py-1.5 text-xs transition hover:-translate-y-0.5 disabled:opacity-70 whitespace-nowrap ${isCompletedSection ? "bg-gray-200 text-gray-800 ring-1 ring-gray-400 hover:bg-gray-300" : "bg-blue-100 font-medium text-blue-800 ring-1 ring-blue-400 hover:bg-blue-200"}`}
                      >
                        {cancellingKey === rowKey + "-done"
                          ? "..."
                          : isCompletedSection
                            ? "Restore"
                            : "Mark Done"}
                      </button>
                      {!isCompletedSection && (
                        <button
                          type="button"
                          disabled={cancellingKey === rowKey}
                          onClick={async () => {
                            setError("");
                            setCancellingKey(rowKey);
                            try {
                              const r = await fetch("/api/bookings", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  date: booking.date,
                                  slot: booking.slot,
                                }),
                              });
                              const d = (await r.json()) as BookingsResponse;
                              if (!r.ok) {
                                setError(d.error ?? "Cancel failed.");
                                return;
                              }
                              setBookings((prev) =>
                                prev.filter(
                                  (item) =>
                                    !(
                                      item.date === booking.date &&
                                      item.slot === booking.slot
                                    ),
                                ),
                              );
                            } catch {
                              setError("Cancel failed.");
                            } finally {
                              setCancellingKey("");
                            }
                          }}
                          className="flex min-w-[70px] items-center justify-center rounded-md bg-[#7a1c1c] px-3 py-1.5 text-xs text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414] disabled:opacity-70 whitespace-nowrap"
                        >
                          {cancellingKey === rowKey ? "..." : "Cancel"}
                        </button>
                      )}
                      
                      {isCompletedSection && !booking.feesPaid && (
                        <button
                          type="button"
                          disabled={remindingKey === rowKey}
                          onClick={async () => {
                            setError("");
                            setRemindingKey(rowKey);
                            try {
                              const r = await fetch("/api/bookings/invoice", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  date: booking.date,
                                  slot: booking.slot,
                                  type: "reminder",
                                  amount: booking.billedAmount || "0",
                                  currency: booking.currency || "₹",
                                }),
                              });
                              if (!r.ok) {
                                setError("Failed to send reminder.");
                                return;
                              }
                              alert(`Reminder sent to ${booking.fullName}`);
                            } catch {
                              setError("Failed to send reminder.");
                            } finally {
                              setRemindingKey("");
                            }
                          }}
                          className="flex min-w-[32px] items-center justify-center rounded-md bg-[#efe4d6] px-2 py-1.5 text-xs text-[#7a1c1c] ring-1 ring-[#7a1c1c]/30 transition hover:-translate-y-0.5 hover:bg-[#e8dac7] disabled:opacity-70"
                          title="Send Payment Reminder"
                        >
                          {remindingKey === rowKey ? "..." : "🔔"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5efe6] px-4 sm:px-6 py-8 sm:py-12 text-[#5a1e1e]">
      <AdminInactivityGuard />
      {kundaliBooking && (
        <KundaliModal
          booking={kundaliBooking}
          onClose={() => setKundaliBooking(null)}
          onUpdate={(updated) => {
            setBookings(prev => prev.map(b => (b.date === updated.date && b.slot === updated.slot) ? updated : b));
            setKundaliBooking(updated);
          }}
        />
      )}

      {invoiceBooking && (
        <InvoiceModal
          booking={invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
          onInvoiceSent={(updated) => {
            setBookings(prev => prev.map(b => (b.date === updated.date && b.slot === updated.slot) ? updated : b));
          }}
        />
      )}

      <div id="admin-dashboard-main" className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#7a1c1c]">
              Admin Bookings Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#6b4c3b]">
              View all booked slots, customer details, and Kundali charts.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-lg border border-[#7a1c1c] px-4 py-2 text-sm text-[#7a1c1c] transition hover:-translate-y-0.5 hover:bg-[#7a1c1c] hover:text-[#f5efe6]"
            >
              🏠 Home
            </Link>
            <button
              type="button"
              onClick={() => router.push("/admin/reviews")}
              className="rounded-lg border border-[#7a1c1c] px-4 py-2 text-sm text-[#7a1c1c] transition hover:-translate-y-0.5 hover:bg-[#7a1c1c] hover:text-[#f5efe6]"
            >
              Reviews
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await fetch("/api/admin/logout", { method: "POST" });
                } finally {
                  router.push("/admin/login");
                  router.refresh();
                }
              }}
              className="rounded-lg bg-[#7a1c1c] px-4 py-2 text-sm text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414] disabled:opacity-70"
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-[#d6c7b2] bg-white p-4">
          <div>
            <label className="mb-2 block text-sm text-[#6b4c3b]">
              Filter by date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-[#d6c7b2] bg-[#f9f4ec] px-3 py-2"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="rounded-lg bg-[#7a1c1c] px-4 py-2 text-sm text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414]"
          >
            Clear Filter
          </button>
          <span className="text-sm font-medium text-[#6b4c3b]">
            {loading
              ? "Loading..."
              : `${activeBookings.length} upcoming appointment(s)`}
          </span>
        </div>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        {/* Navigation Tabs */}
        <div className="mt-8 flex gap-4 border-b border-[#d6c7b2] pb-px">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-4 py-3 text-lg font-semibold transition-colors duration-200 border-b-[3px] ${activeTab === "active" ? "border-[#7a1c1c] text-[#7a1c1c]" : "border-transparent text-[#9a7b6b] hover:text-[#7a1c1c]"}`}
          >
            Upcoming / Active Consultations
            <span className="rounded-full bg-[#f9f4ec] px-2 py-0.5 text-xs text-[#7a1c1c] border border-[#e8dac7]">
              {activeBookings.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex items-center gap-2 px-4 py-3 text-lg font-semibold transition-colors duration-200 border-b-[3px] ${activeTab === "completed" ? "border-[#6b4c3b] text-[#6b4c3b]" : "border-transparent text-[#9a7b6b] hover:text-[#6b4c3b]"}`}
          >
            Completed Consultations
            <span className="rounded-full bg-[#f9f4ec] px-2 py-0.5 text-xs text-[#6b4c3b] border border-[#e8dac7]">
              {completedBookings.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-2 text-[#5a1e1e]">
          {activeTab === "active" && renderTable(activeBookings, false)}
          {activeTab === "completed" && (
            <>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleExportToExcel}
                  className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-green-800"
                >
                  📊 Export All Completed to Excel
                </button>
              </div>
              {renderTable(completedBookings, true)}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
