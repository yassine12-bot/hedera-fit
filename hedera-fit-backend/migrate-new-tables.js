const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🔧 Ajout des tables pour la nouvelle structure...\n');

db.serialize(() => {
  
  // Table pour les appareils connectés (smart shoes)
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      deviceId TEXT NOT NULL,
      deviceType TEXT CHECK(deviceType IN ('smart_shoe', 'smartwatch', 'phone')),
      lastSync DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(deviceId)
    )
  `, (err) => {
    if (err) console.error('❌ devices:', err.message);
    else console.log('✅ Table devices créée');
  });

  // Table pour les workouts/activités
  db.run(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      deviceId TEXT,
      steps INTEGER DEFAULT 0,
      distance REAL DEFAULT 0,
      calories REAL DEFAULT 0,
      workoutDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ workouts:', err.message);
    else console.log('✅ Table workouts créée');
  });

  // Table pour les récompenses
  db.run(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT CHECK(type IN ('encouragement', 'best_comment', 'referral', 'daily_steps', 'challenge')),
      amount INTEGER NOT NULL,
      referenceId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ rewards:', err.message);
    else console.log('✅ Table rewards créée');
  });

  // Ajouter des colonnes manquantes dans users si besoin
  db.run(`
    ALTER TABLE users ADD COLUMN totalSteps INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ totalSteps:', err.message);
    } else if (!err) {
      console.log('✅ Colonne totalSteps ajoutée');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN fitBalance INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ fitBalance:', err.message);
    } else if (!err) {
      console.log('✅ Colonne fitBalance ajoutée');
    }
  });

  console.log('\n✅ Migration terminée!');
  db.close();
});