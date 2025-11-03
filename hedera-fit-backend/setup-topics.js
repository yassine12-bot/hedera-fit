const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🔧 Création des tables Topics & Chat...');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      creatorId INTEGER NOT NULL,
      isPrivate INTEGER DEFAULT 0,
      memberCount INTEGER DEFAULT 1,
      imageUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creatorId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS topic_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topicId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(topicId, userId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS topic_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topicId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      message TEXT NOT NULL,
      messageType TEXT CHECK(messageType IN ('text', 'event', 'training', 'announcement')) DEFAULT 'text',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS topic_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topicId INTEGER NOT NULL,
      creatorId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      eventDate DATETIME NOT NULL,
      location TEXT,
      participantsCount INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (creatorId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      status TEXT CHECK(status IN ('going', 'interested', 'not_going')) DEFAULT 'interested',
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eventId) REFERENCES topic_events(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(eventId, userId)
    )
  `);

  console.log('✅ Tables Topics & Chat créées!');
  db.close();
});