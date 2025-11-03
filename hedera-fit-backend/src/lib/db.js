const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../../data.db');

// Créer la connexion
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erreur connexion DB:', err.message);
  } else {
    console.log('✅ Base de données connectée');
  }
});

// Promisifier les fonctions DB
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialiser les tables
const initDatabase = async () => {
  try {
    // Table users
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        wallet TEXT,
        totalSteps INTEGER DEFAULT 0,
        fitBalance REAL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table posts
    await dbRun(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        caption TEXT,
        mediaType TEXT CHECK(mediaType IN ('image', 'video')),
        mediaUrl TEXT NOT NULL,
        thumbnail TEXT,
        likesCount INTEGER DEFAULT 0,
        commentsCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Table comments
    await dbRun(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        text TEXT NOT NULL,
        sentiment REAL,
        sentimentLabel TEXT,
        isFiltered INTEGER DEFAULT 0,
        filterReason TEXT,
        likesCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Table likes
    await dbRun(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        postId INTEGER,
        commentId INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE,
        UNIQUE(userId, postId),
        UNIQUE(userId, commentId)
      )
    `);

    // Table rewards
    await dbRun(`
      CREATE TABLE IF NOT EXISTS rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        type TEXT NOT NULL,
        tokens REAL NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Créer les index pour améliorer les performances
    await dbRun('CREATE INDEX IF NOT EXISTS idx_posts_userId ON posts(userId)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt DESC)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment DESC)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_likes_postId ON likes(postId)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_likes_commentId ON likes(commentId)');

    console.log('✅ Tables créées avec succès');
  } catch (error) {
    console.error('❌ Erreur création tables:', error.message);
  }
};

module.exports = {
  db,
  run: dbRun,
  get: dbGet,
  all: dbAll,
  initDatabase
};