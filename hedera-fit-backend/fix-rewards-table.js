const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🔧 Nettoyage et correction de la table rewards...\n');

db.serialize(() => {
  
  // Étape 1: Supprimer rewards_new si elle existe
  console.log('🧹 Nettoyage des tables temporaires...');
  db.run('DROP TABLE IF EXISTS rewards_new', (err) => {
    if (err) {
      console.error('❌ Erreur nettoyage:', err);
      db.close();
      return;
    }
    
    console.log('✅ Nettoyage OK\n');
    
    // Étape 2: Créer la nouvelle table
    console.log('🔄 Création de la nouvelle structure...');
    db.run(`
      CREATE TABLE rewards_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        type TEXT,
        amount INTEGER NOT NULL,
        referenceId INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erreur création:', err);
        db.close();
        return;
      }
      
      console.log('✅ Nouvelle table créée\n');
      
      // Étape 3: Copier les données
      console.log('🔄 Migration des données...');
      db.run(`
        INSERT INTO rewards_new (id, userId, type, amount, createdAt)
        SELECT id, userId, type, CAST(tokens AS INTEGER), date FROM rewards
      `, (err) => {
        if (err) {
          console.error('❌ Erreur copie:', err);
          db.close();
          return;
        }
        
        console.log('✅ Données migrées\n');
        
        // Étape 4: Supprimer ancienne table
        console.log('🔄 Remplacement de l\'ancienne table...');
        db.run('DROP TABLE rewards', (err) => {
          if (err) {
            console.error('❌ Erreur suppression:', err);
            db.close();
            return;
          }
          
          // Étape 5: Renommer
          db.run('ALTER TABLE rewards_new RENAME TO rewards', (err) => {
            if (err) {
              console.error('❌ Erreur renommage:', err);
              db.close();
              return;
            }
            
            console.log('✅ Table renommée\n');
            console.log('═'.repeat(50));
            console.log('🎉 MIGRATION RÉUSSIE!');
            console.log('═'.repeat(50));
            console.log('\n📊 Changements:');
            console.log('   ✓ tokens (REAL) → amount (INTEGER)');
            console.log('   ✓ date → createdAt (DATETIME)');
            console.log('   ✓ Ajout de referenceId (INTEGER)');
            console.log('\n✅ La table rewards est maintenant compatible!\n');
            
            db.close();
          });
        });
      });
    });
  });
});