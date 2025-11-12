const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🔧 Ajout des colonnes Hedera Wallet aux users...\n');

db.serialize(() => {
  
  // Ajouter hederaAccountId
  db.run(`
    ALTER TABLE users ADD COLUMN hederaAccountId TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ hederaAccountId:', err.message);
    } else if (!err) {
      console.log('✅ Colonne hederaAccountId ajoutée');
    } else {
      console.log('⏭️  hederaAccountId existe déjà');
    }
  });

  // Ajouter hederaPrivateKey (encrypté!)
  db.run(`
    ALTER TABLE users ADD COLUMN hederaPrivateKeyEncrypted TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ hederaPrivateKeyEncrypted:', err.message);
    } else if (!err) {
      console.log('✅ Colonne hederaPrivateKeyEncrypted ajoutée');
    } else {
      console.log('⏭️  hederaPrivateKeyEncrypted existe déjà');
    }
  });

  // Ajouter walletCreatedAt
  db.run(`
    ALTER TABLE users ADD COLUMN walletCreatedAt DATETIME
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ walletCreatedAt:', err.message);
    } else if (!err) {
      console.log('✅ Colonne walletCreatedAt ajoutée');
    } else {
      console.log('⏭️  walletCreatedAt existe déjà');
    }
    
    console.log('\n✅ Migration terminée!');
    console.log('\n📊 Nouvelles colonnes:');
    console.log('   • hederaAccountId (TEXT) - Account ID public');
    console.log('   • hederaPrivateKeyEncrypted (TEXT) - Private key encrypté');
    console.log('   • walletCreatedAt (DATETIME) - Date de création');
    console.log('\n🔒 Sécurité: Les private keys seront encryptées!');
    
    db.close();
  });
});