const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🔍 Vérification des tables de la base de données...\n');

const tablesToCheck = [
  'users',
  'posts',
  'comments',
  'likes',
  'topics',
  'topic_members',
  'topic_messages',
  'badges',
  'workouts',     // Nouvelle table
  'devices',      // Nouvelle table
  'rewards'       // Nouvelle table
];

let missingTables = [];

function checkTable(tableName) {
  return new Promise((resolve) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
      if (err) {
        console.error(`❌ Erreur lors de la vérification de ${tableName}:`, err.message);
        resolve(false);
      } else if (row) {
        console.log(`✅ Table "${tableName}" existe`);
        resolve(true);
      } else {
        console.log(`❌ Table "${tableName}" MANQUANTE`);
        missingTables.push(tableName);
        resolve(false);
      }
    });
  });
}

async function checkAllTables() {
  for (const table of tablesToCheck) {
    await checkTable(table);
  }

  console.log('\n' + '='.repeat(50));
  
  if (missingTables.length === 0) {
    console.log('✅ Toutes les tables sont présentes!');
  } else {
    console.log(`❌ ${missingTables.length} table(s) manquante(s):`);
    missingTables.forEach(table => console.log(`   - ${table}`));
    console.log('\n💡 Lance: node migrate-new-tables.js');
  }
  
  console.log('='.repeat(50));
  
  db.close();
}

checkAllTables();