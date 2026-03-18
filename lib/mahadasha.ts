// @ts-ignore
import { julian, moonposition } from 'astronomia';

// Constants
const NAKSHATRA_SIZE = 13.3333333333; // degrees
const YEAR_DAYS = 365.25; // Vedic solar year (Julian year)

export type PlanetInfo = {
  planet: string;
  years: number;
};

// Mahadasha sequence
export const DASHAS: PlanetInfo[] = [
  { planet: "Ketu", years: 7 },
  { planet: "Venus", years: 20 },
  { planet: "Sun", years: 6 },
  { planet: "Moon", years: 10 },
  { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn", years: 19 },
  { planet: "Mercury", years: 17 }
];

// Nakshatra lord mapping (index % 9)
function getNakshatraLord(index: number): PlanetInfo {
  return DASHAS[index % 9];
}

// Normalize angle 0–360
function normalize(deg: number): number {
  return (deg % 360 + 360) % 360;
}

// Convert date to Julian Day
function toJulian(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  // Convert standard date to Julian Day
  const jd = julian.CalendarGregorianToJD(y, m, d + h / 24);
  return jd;
}

// Calculate approximate Lahiri Ayanamsa for a given Julian Day
function getAyanamsa(jd: number): number {
  // Rough Lahiri approximation. 
  // J2000 epoch is JD 2451545.0
  // Value at J2000 is ~23.85 degrees. Rate is ~0.0139697 deg/year (50.29 arcsec/yr)
  const yearsSinceJ2000 = (jd - 2451545.0) / 365.25;
  return 23.856 + (0.0139697 * yearsSinceJ2000);
}

// Get Moon sidereal longitude
function getMoonSidereal(jd: number): number {
  const pos = moonposition.position(jd); // returns { lon, lat, range } in radians
  const moonTropicalDeg = normalize(pos.lon * (180 / Math.PI));
  
  const ayanamsa = getAyanamsa(jd);
  return normalize(moonTropicalDeg - ayanamsa);
}

// Compute remaining Mahadasha balance
function getRemainingFraction(moonSidereal: number) {
  const nakIndex = Math.floor(moonSidereal / NAKSHATRA_SIZE);
  const start = nakIndex * NAKSHATRA_SIZE;
  const progress = moonSidereal - start;

  const fractionElapsed = progress / NAKSHATRA_SIZE;
  return {
    nakIndex,
    remainingFraction: 1 - fractionElapsed
  };
}

// Add years to date using calendar arithmetic for accuracy
// Whole years added via setFullYear (respects leap years),
// fractional remainder converted using 365.25 days/year (Vedic solar year)
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const wholeYears = Math.floor(years);
  const fractionalYears = years - wholeYears;

  result.setFullYear(result.getFullYear() + wholeYears);
  const fractionalDays = fractionalYears * YEAR_DAYS;
  result.setTime(result.getTime() + fractionalDays * 86400000);

  return result;
}

export type DashaPeriod = {
  planet: string;
  start: Date;
  end: Date;
  antardasha?: DashaPeriod[];
};

// Generate Antardasha
function generateAntardasha(mahaPlanet: string, mahaYears: number, startDate: Date): DashaPeriod[] {
  const result: DashaPeriod[] = [];
  let current = new Date(startDate);

  const startIndex = DASHAS.findIndex(d => d.planet === mahaPlanet);

  for (let i = 0; i < 9; i++) {
    const sub = DASHAS[(startIndex + i) % 9];

    const durationYears = (mahaYears * sub.years) / 120;
    const end = addYears(current, durationYears);

    result.push({
      planet: sub.planet,
      start: current,
      end: end
    });

    current = end;
  }

  return result;
}

// Main function
export function calculateMahadasha(birthDate: Date): DashaPeriod[] {
  const jd = toJulian(birthDate);
  const moonSidereal = getMoonSidereal(jd);

  const { nakIndex, remainingFraction } = getRemainingFraction(moonSidereal);
  const startDasha = getNakshatraLord(nakIndex);

  const timeline: DashaPeriod[] = [];
  let currentDate = new Date(birthDate);

  // First (partial) Mahadasha
  const remainingYears = startDasha.years * remainingFraction;
  let endDate = addYears(currentDate, remainingYears);

  timeline.push({
    planet: startDasha.planet,
    start: currentDate,
    end: endDate,
    antardasha: generateAntardasha(
      startDasha.planet,
      remainingYears,
      currentDate
    )
  });

  currentDate = endDate;
  let currentIndex = DASHAS.findIndex(d => d.planet === startDasha.planet);

  // Full Mahadashas
  while (timeline.length < 9) {
    currentIndex = (currentIndex + 1) % 9;
    const dasha = DASHAS[currentIndex];

    // Note: in a true complete Mahadasha we would stop after 120 years,
    // but here we just loop exactly 9 times to get all full dashas after the first partial one 
    // Wait, the while condition `timeline.length < 9` ensures exactly 9 dashas are produced.
    endDate = addYears(currentDate, dasha.years);

    timeline.push({
      planet: dasha.planet,
      start: currentDate,
      end: endDate,
      antardasha: generateAntardasha(
        dasha.planet,
        dasha.years,
        currentDate
      )
    });

    currentDate = endDate;
  }

  return timeline;
}
