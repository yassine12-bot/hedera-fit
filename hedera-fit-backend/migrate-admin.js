const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');
const bcrypt = require('bcryptjs');

console.log('🔧 Création Admin Dashboard Tables...\n');

db.serialize(() => {
  
  // 1. Ajouter colonne isAdmin aux users
  console.log('👤 Ajout colonne isAdmin...');
  db.run(`
    ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ isAdmin:', err.message);
    } else if (!err) {
      console.log('✅ Colonne isAdmin ajoutée');
    } else {
      console.log('⏭️  isAdmin existe déjà');
    }
  });
  
  // 2. Créer table challenges
  console.log('\n🏆 Création table challenges...');
  db.run(`
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT CHECK(type IN ('steps', 'distance', 'streak', 'comments', 'custom')),
      target INTEGER NOT NULL,
      reward INTEGER NOT NULL,
      isActive INTEGER DEFAULT 1,
      startDate DATETIME,
      endDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur:', err.message);
      return;
    }
    console.log('✅ Table challenges créée');
    
    // Ajouter des challenges de démo
    console.log('\n🏅 Ajout challenges de démo...');
    
    const challenges = [
      {
        title: 'Marcheur du Jour',
        description: 'Atteins 5,000 pas en une journée',
        type: 'steps',
        target: 5000,
        reward: 20
      },
      {
        title: 'Champion 10K',
        description: 'Cours 10,000 pas en une session',
        type: 'steps',
        target: 10000,
        reward: 50
      },
      {
        title: 'Série de 7 Jours',
        description: 'Marche 5K par jour pendant 7 jours consécutifs',
        type: 'streak',
        target: 7,
        reward: 100
      },
      {
        title: 'Distance Marathon',
        description: 'Parcours 42km au total',
        type: 'distance',
        target: 42000,
        reward: 200
      },
      {
        title: 'Commentateur Positif',
        description: 'Poste 20 commentaires positifs',
        type: 'comments',
        target: 20,
        reward: 30
      }
    ];
    
    let completed = 0;
    
    challenges.forEach((challenge) => {
      db.run(`
        INSERT INTO challenges (title, description, type, target, reward)
        VALUES (?, ?, ?, ?, ?)
      `, [
        challenge.title,
        challenge.description,
        challenge.type,
        challenge.target,
        challenge.reward
      ], (err) => {
        if (err && !err.message.includes('UNIQUE')) {
          console.error(`❌ ${challenge.title}:`, err.message);
        } else {
          console.log(`✅ ${challenge.title} - ${challenge.reward} FIT`);
        }
        
        completed++;
        if (completed === challenges.length) {
          
          // 3. Créer un compte admin de test
          console.log('\n👨‍💼 Création compte admin...');
          
          const adminEmail = 'admin@hederafit.com';
          const adminPassword = 'admin123';
          
          bcrypt.hash(adminPassword, 10, (err, hash) => {
            if (err) {
              console.error('❌ Erreur hash:', err);
              db.close();
              return;
            }
            
            db.run(`
              INSERT OR IGNORE INTO users (name, email, password, isAdmin)
              VALUES (?, ?, ?, 1)
            `, ['Admin', adminEmail, hash], (err) => {
              if (err) {
                console.error('❌ Erreur admin:', err.message);
              } else {
                console.log('✅ Compte admin créé');
                console.log('   📧 Email: admin@hederafit.com');
                console.log('   🔑 Password: admin123');
              }
              
              console.log('\n' + '═'.repeat(50));
              console.log('🎉 ADMIN DASHBOARD PRÊT!');
              console.log('═'.repeat(50));
              console.log(`\n📊 ${challenges.length} challenges ajoutés`);
              console.log('👤 1 compte admin créé');
              console.log('🏆 Table challenges créée\n');
              
              db.close();
            });
          });
        }
      });
    });
  });
});