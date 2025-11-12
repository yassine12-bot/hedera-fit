const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🛒 Création de la table Marketplace...\n');

db.serialize(() => {
  
  // Créer la table products
  console.log('📦 Création table products...');
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT CHECK(category IN ('supplement', 'protein', 'equipment', 'apparel', 'service')),
      priceTokens INTEGER NOT NULL,
      stock INTEGER DEFAULT 100,
      imageUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur:', err.message);
      return;
    }
    console.log('✅ Table products créée');
    
    // Ajouter des produits de démo
    console.log('\n📦 Ajout des produits...');
    
    const products = [
      {
        name: 'Barre Protéinée Whey',
        description: '20g de protéines, saveur chocolat',
        category: 'protein',
        priceTokens: 15,
        stock: 50
      },
      {
        name: 'Créatine Monohydrate 500g',
        description: 'Améliore la performance musculaire',
        category: 'supplement',
        priceTokens: 40,
        stock: 30
      },
      {
        name: 'BCAA 2:1:1',
        description: 'Récupération musculaire optimale',
        category: 'supplement',
        priceTokens: 35,
        stock: 40
      },
      {
        name: 'Poudre Protéine Whey 1kg',
        description: '80% de protéines, vanille',
        category: 'protein',
        priceTokens: 60,
        stock: 25
      },
      {
        name: 'Pre-Workout Energy',
        description: 'Boost énergie pour entraînement intense',
        category: 'supplement',
        priceTokens: 45,
        stock: 35
      },
      {
        name: 'Shaker Premium',
        description: 'Shaker anti-fuites 700ml',
        category: 'equipment',
        priceTokens: 10,
        stock: 100
      },
      {
        name: 'Gants Musculation',
        description: 'Protection mains, grip renforcé',
        category: 'equipment',
        priceTokens: 25,
        stock: 60
      },
      {
        name: 'T-Shirt Fitness',
        description: 'Respirant, séchage rapide',
        category: 'apparel',
        priceTokens: 30,
        stock: 80
      }
    ];
    
    let completed = 0;
    
    products.forEach((product, index) => {
      db.run(`
        INSERT INTO products (name, description, category, priceTokens, stock)
        VALUES (?, ?, ?, ?, ?)
      `, [
        product.name,
        product.description,
        product.category,
        product.priceTokens,
        product.stock
      ], (err) => {
        if (err && !err.message.includes('UNIQUE')) {
          console.error(`❌ ${product.name}:`, err.message);
        } else {
          console.log(`✅ ${product.name} - ${product.priceTokens} FIT`);
        }
        
        completed++;
        if (completed === products.length) {
          console.log('\n' + '═'.repeat(50));
          console.log('🎉 MARKETPLACE PRÊT!');
          console.log('═'.repeat(50));
          console.log(`\n📊 ${products.length} produits ajoutés`);
          console.log('💰 Prix: 10 FIT à 60 FIT');
          console.log('🛒 Catégories: protein, supplement, equipment, apparel\n');
          db.close();
        }
      });
    });
  });
});