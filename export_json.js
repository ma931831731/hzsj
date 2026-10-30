// export_json.js
const fs = require('fs');
const path = require('path');

// 模拟 window 对象环境
global.window = {};
require('./mock.js');

const db = global.window.DB;
if (!db) {
  console.error("Failed to load window.DB from mock.js");
  process.exit(1);
}

const outputPath = path.resolve(__dirname, 'scenario_database.json');
fs.writeFileSync(outputPath, JSON.stringify(db, null, 2), 'utf-8');

console.log("Successfully exported scenario_database.json!");
console.log("Roles count:", db.roles ? db.roles.length : 0);
console.log("Paths count:", db.paths ? db.paths.length : 0);
console.log("Scenes count:", db.scenes ? db.scenes.length : 0);
