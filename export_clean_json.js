// export_clean_json.js
const fs = require('fs');
const path = require('path');

global.window = {};
require('./mock_utf8.js');

const db = global.window.DB;
if (!db) {
  console.error("Failed to load window.DB");
  process.exit(1);
}

const outputPath = path.resolve(__dirname, 'scenario_database_utf8.json');
fs.writeFileSync(outputPath, JSON.stringify(db, null, 2), 'utf-8');

console.log("Successfully generated scenario_database_utf8.json!");
console.log("Scenes count:", db.scenes.length);
console.log("Scene 1 title:", db.scenes[0].title);
