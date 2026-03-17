const fs = require('fs');

const file = fs.readFileSync('e:\\Jinesh bhai\\namah-astroscience\\test-dasha-2.js', 'utf8');
const modified = file.replace('fs.writeFileSync', 'console.log("Moon Lon:", moon.longitude);\nfs.writeFileSync');
fs.writeFileSync('e:\\Jinesh bhai\\namah-astroscience\\test-dasha-2.js', modified);
