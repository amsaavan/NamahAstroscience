const fs = require('fs');
const PLANETS = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

const PLANET_FULL = {
  Su: "Sun", Mo: "Moon", Ma: "Mars", Me: "Mercury",
  Ju: "Jupiter", Ve: "Venus", Sa: "Saturn", Ra: "Rahu", Ke: "Ketu",
};

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purvashadha", "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const NAKSHATRA_LORDS = [
  "Ke", "Ve", "Su", "Mo", "Ma", "Ra",
  "Ju", "Sa", "Me", "Ke", "Ve", "Su",
  "Mo", "Ma", "Ra", "Ju", "Sa", "Me",
  "Ke", "Ve", "Su", "Mo", "Ma", "Ra",
  "Ju", "Sa", "Me",
];

const DASHA_YEARS = {
  Ke: 7, Ve: 20, Su: 6, Mo: 10, Ma: 7, Ra: 18, Ju: 16, Sa: 19, Me: 17,
};

const DASHA_ORDER = ["Ke", "Ve", "Su", "Mo", "Ma", "Ra", "Ju", "Sa", "Me"];

const COMBUST_ORB = {
  Mo: 12, Ma: 17, Me: 14, Ju: 11, Ve: 10, Sa: 15,
};

const EXALTED_SIGN = {
  Su: 0, Mo: 1, Ma: 9, Me: 5, Ju: 3, Ve: 11, Sa: 6, Ra: 1, Ke: 7,
};

const DEBILITATED_SIGN = {
  Su: 6, Mo: 7, Ma: 3, Me: 11, Ju: 9, Ve: 5, Sa: 0, Ra: 7, Ke: 1,
};

const J2000 = 2451545.0;

function n360(d) { return ((d % 360) + 360) % 360; }
function r(d) { return d * Math.PI / 180; }
function deg(x) { return x * 180 / Math.PI; }

function julianDay(y, m, d, hour = 12) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn + (hour - 12) / 24;
}

function lahiriAyanamsa(jd) {
  return 23.8531 + (jd - J2000) / 365.25 * 0.013969;
}

function keplerE(M_deg, e) {
  let E = r(M_deg);
  const M = r(M_deg);
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

const OE = {
  Ea: [100.46435, 36000.76983, 102.94719, 0.30929, 0.01671022, -0.00004204, 1.000000],
  Me: [252.25084, 149472.6741, 77.45779, 0.15595, 0.20563069, -0.000028, 0.387098],
  Ve: [181.97973, 58517.8154, 131.56377, 0.05660, 0.00677323, -0.000047, 0.723330],
  Ma: [355.45332, 19140.2993, 336.04084, 0.44320, 0.09341233, 0.000089, 1.523688],
  Ju: [34.40438, 3034.9057, 14.27495, 0.18160, 0.04839266, -0.000163, 5.203363],
  Sa: [49.94432, 1222.1138, 92.86136, 0.54220, 0.05415060, -0.000244, 9.537070],
};

function heliocentric(id, T) {
  const [L0, L1, w0, w1, e0, e1, a] = OE[id];
  const L = n360(L0 + L1 * T);
  const w = n360(w0 + w1 * T);
  const e = Math.max(0, e0 + e1 * T);
  const M = n360(L - w);
  const E = keplerE(M, e);
  const nu = deg(2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)));
  const radius = a * (1 - e * Math.cos(E));
  return { lon: n360(nu + w), r: radius };
}

function helioToGeo(pLon, pR, eLon, eR) {
  const px = pR * Math.cos(r(pLon)) - eR * Math.cos(r(eLon));
  const py = pR * Math.sin(r(pLon)) - eR * Math.sin(r(eLon));
  return n360(deg(Math.atan2(py, px)));
}

function computePositions(jd) {
  const T = (jd - J2000) / 36525;
  const ay = lahiriAyanamsa(jd);

  const L0s = n360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const Ms = n360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Ms_r = r(Ms);
  const Cs = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Ms_r)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Ms_r)
    + 0.000289 * Math.sin(3 * Ms_r);
  const sunTrop = n360(L0s + Cs);
  const Su = n360(sunTrop - ay);

  const earthLon = n360(sunTrop + 180);
  const earthR = heliocentric("Ea", T).r;

  const Lm = n360(218.3165 + 481267.8813 * T);
  const Mm = n360(134.9634 + 477198.8676 * T);
  const D = n360(297.8502 + 445267.1115 * T);
  const F = n360(93.2721 + 483202.0175 * T);
  const dL = -1.2739 * Math.sin(r(Mm - 2 * D))
    + 0.6583 * Math.sin(r(2 * D))
    + 0.2136 * Math.sin(r(Mm))
    - 0.1858 * Math.sin(r(Ms))
    - 0.0594 * Math.sin(r(2 * Mm - 2 * D))
    - 0.0571 * Math.sin(r(Mm - 2 * D + Ms))
    + 0.0533 * Math.sin(r(Mm + 2 * D))
    + 0.0458 * Math.sin(r(2 * D - Ms))
    + 0.0409 * Math.sin(r(Mm - Ms))
    - 0.0347 * Math.sin(r(D))
    - 0.0306 * Math.sin(r(Mm + Ms))
    - 0.0148 * Math.sin(r(2 * F - 2 * D))
    + 0.0111 * Math.sin(r(Mm - 4 * D));
  const Mo = n360(Lm + dL - ay);

  function geo(id) {
    const h = heliocentric(id, T);
    return n360(helioToGeo(h.lon, h.r, earthLon, earthR) - ay);
  }

  const rahuTrop = n360(125.0445 - 1934.1362 * T + 0.0020708 * T * T);
  const Ra = n360(rahuTrop - ay);
  const Ke = n360(Ra + 180);

  return { Su, Mo, Ma: geo("Ma"), Me: geo("Me"), Ju: geo("Ju"), Ve: geo("Ve"), Sa: geo("Sa"), Ra, Ke };
}

function detectRetrograde(jd) {
  const p1 = computePositions(jd - 0.5);
  const p2 = computePositions(jd + 0.5);
  const retro = {};
  for (const p of PLANETS) {
    let diff = p2[p] - p1[p];
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    retro[p] = diff < 0;
  }
  return retro;
}

function computeAscendant(jd, latDeg, lonDeg) {
  const T = (jd - J2000) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T;
  const lst = n360(gmst + lonDeg);
  const eps = 23.439291 - 0.013004 * T;
  const lstR = r(lst);
  const epsR = r(eps);
  const latR = r(latDeg);
  const ascRad = Math.atan2(Math.cos(lstR), -Math.sin(lstR) * Math.cos(epsR) - Math.tan(latR) * Math.sin(epsR));
  const ascTrop = n360(deg(ascRad));
  return n360(ascTrop - lahiriAyanamsa(jd));
}

function computeChart(birthDate, birthTime, latDeg, lonDeg) {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [h = 12, min = 0] = (birthTime || "12:00").split(":").map(Number);
  const localHour = h + min / 60;

  let tzOffset = Math.round(lonDeg / 15);
  if (lonDeg >= 68 && lonDeg <= 97 && latDeg >= 5 && latDeg <= 37) {
    tzOffset = 5.5;
  } else if (Math.abs(lonDeg / 15 - Math.round(lonDeg / 15 * 2) / 2) < 0.25) {
    tzOffset = Math.round(lonDeg / 15 * 2) / 2;
  }

  const utHour = localHour - tzOffset;
  const jd = julianDay(y, m, d, utHour);

  const ascLon = computeAscendant(jd, latDeg, lonDeg);
  const ascSignIdx = Math.floor(ascLon / 30);
  const positions = computePositions(jd);
  const retrogrades = detectRetrograde(jd);
  const sunLon = positions["Su"];

  const planets = PLANETS.map((planet) => {
    const longitude = positions[planet];
    const signIdx = Math.floor(longitude / 30);
    const degInSign = longitude % 30;
    const nakshatraIdx = Math.floor(longitude / (360 / 27)) % 27;
    const pada = Math.min(Math.floor((longitude % (360 / 27)) / (360 / 108)) + 1, 4);
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

    return {
      planet, longitude, signIdx, degInSign, nakshatraIdx, pada,
      nakshatraName: NAKSHATRAS[nakshatraIdx], retrograde: retrogrades[planet], combust, exalted, debilitated, house
    };
  });

  const houses = {};
  for (let i = 1; i <= 12; i++) houses[i] = [];
  for (const pd of planets) houses[pd.house].push(pd);

  return { ascendant: ascSignIdx, ascLongitude: ascLon, jd, planets, houses };
}

function computeDasha(moonLongitude, birthJd) {
  const nakshatraIdx = Math.floor(moonLongitude / (360 / 27)) % 27;
  const lordPlanet = NAKSHATRA_LORDS[nakshatraIdx];

  const nakshatraSpan = 360 / 27;
  const posInNakshatra = (moonLongitude % nakshatraSpan) / nakshatraSpan;
  const balanceFraction = 1 - posInNakshatra;
  const balanceYears = DASHA_YEARS[lordPlanet] * balanceFraction;

  const unixMs = (birthJd - 2440587.5) * 86400000;
  const birthDt = new Date(unixMs);
  const now = new Date();

  const startIdx = DASHA_ORDER.indexOf(lordPlanet);
  const periods = [];
  
  // FIXED INCORRECT LOGIC HERE FOR TESTING:
  // The first dasha starts BEFORE birth. The time elapsed is (Total - Balance)
  const elapsedYears = DASHA_YEARS[lordPlanet] - balanceYears;
  const elapsedMs = elapsedYears * 365.2425 * 24 * 3600 * 1000;
  // So the first period started at:
  let cursor = new Date(birthDt.getTime() - elapsedMs);

  for (let i = 0; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const planet = DASHA_ORDER[idx];
    const years = DASHA_YEARS[planet]; // Just use full years for all blocks!
    const ms = years * 365.2425 * 24 * 3600 * 1000;
    const end = new Date(cursor.getTime() + ms);
    periods.push({
      planet,
      startDate: new Date(cursor),
      endDate: end,
      isCurrent: cursor <= now && now < end,
    });
    cursor = end;
  }

  return { moonLongitude, balanceYears, elapsedYears, periods };
}

const chart = computeChart("2000-01-01", "12:00", 28.6139, 77.2090);
const moon = chart.planets.find(p => p.planet === "Mo");
const dasha = computeDasha(moon.longitude, chart.jd);

const out = {
  moonLongitude: moon.longitude,
  nakshatra: moon.nakshatraName,
  jd: chart.jd,
  dasha
};

fs.writeFileSync("e:\\Jinesh bhai\\namah-astroscience\\test-dasha-2.json", JSON.stringify(out, null, 2));
console.log("Written test-dasha-2.json");
