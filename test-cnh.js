const { Origin, Horoscope } = require('circular-natal-horoscope-js');

const origin = new Origin({
  year: 2000,
  month: 0, // 0 = January
  date: 1,
  hour: 12,
  minute: 0,
  latitude: 23.0,
  longitude: 72.0
});

const horoscope = new Horoscope({
  origin: origin,
  houseSystem: 'placidus',
  zodiac: 'sidereal'
});

console.log('Houses', horoscope.Houses.slice(0, 2).map(h => h.ChartPosition.Ecliptic.DecimalDegrees));
