const fs = require('fs');
const path = require('path');

console.log('🔧 Réorganisation de la structure backend...\n');

// Étape 1: Créer les nouveaux dossiers
const newFolders = [
  'src/api/ai',
  'src/api/rewards',
  'src/api/shoes',
  'src/api/workouts',
  'src/api/marketplace'
];

console.log('📁 Création des nouveaux dossiers...\n');
newFolders.forEach(folder => {
  const fullPath = path.join(__dirname, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('✅ Créé:', folder);
  } else {
    console.log('⏭️  Existe:', folder);
  }
});

console.log('\n✅ Dossiers créés!\n');

// Étape 2: Créer les fichiers README pour guider
const readmes = {
  'src/api/ai/README.md': `# AI Module

**Responsable:** Système (utilisé par tous)

## Fichiers:
- \`commentFilter.js\` - Filtre les commentaires négatifs
- \`coach.js\` - IA Coach personnel
- \`kindnessEvaluator.js\` - Évalue la gentillesse

## Usage:
\`\`\`javascript
const aiFilter = require('./api/ai/commentFilter');
const result = await aiFilter.analyzeComment(text);
\`\`\`
`,

  'src/api/rewards/README.md': `# Rewards Module

**Responsable:** Backend Team

## Fichiers:
- \`encouragement.js\` - +2 FIT pour commentaire positif
- \`bestComment.js\` - +10 FIT meilleur commentaire
- \`referral.js\` - +15 FIT parrainage

## Endpoints:
- POST \`/api/rewards/encouragement\`
- POST \`/api/rewards/best-comment\`
- POST \`/api/rewards/referral\`
`,

  'src/api/shoes/README.md': `# Smart Shoes Module

**Responsable:** Yassine (IoT)

## Fichiers:
- \`sync.js\` - Synchroniser les données du shoe

## Endpoints:
- POST \`/api/shoes/sync\`
- GET \`/api/shoes/devices\`

## Format Données:
\`\`\`json
{
  "deviceId": "SHOE_ABC123",
  "steps": 5000,
  "distance": 3.5,
  "calories": 250,
  "timestamp": "2025-11-04T10:00:00Z"
}
\`\`\`
`,

  'src/api/workouts/README.md': `# Workouts Module

**Responsable:** Backend Team

## Fichiers:
- \`steps.js\` - Enregistrer et tracker les pas

## Endpoints:
- POST \`/api/workouts/steps\`
- GET \`/api/workouts/history\`
`,

  'src/api/marketplace/README.md': `# Marketplace Module

**Responsable:** Backend Team + Bouchra (Blockchain)

## Fichiers:
- \`products.js\` - Gérer les produits
- \`purchase.js\` - Acheter avec FIT tokens

## Endpoints:
- GET \`/api/marketplace/products\`
- POST \`/api/marketplace/purchase\`
`
};

console.log('📝 Création des fichiers README...\n');
Object.entries(readmes).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✅ Créé:', filePath);
});

console.log('\n✅ Structure de base créée!\n');

// Étape 3: Instructions pour la suite
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 PROCHAINES ÉTAPES MANUELLES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('1️⃣  Déplacer la logique AI:');
console.log('   Extraire l\'analyse de sentiment depuis:');
console.log('   src/api/community/comments.js');
console.log('   → Vers: src/api/ai/commentFilter.js\n');

console.log('2️⃣  Garder src/lib/ai.js comme service bas niveau');
console.log('   (connexion HuggingFace)\n');

console.log('3️⃣  Badges:');
console.log('   - src/api/community/badges.js → Garder (OK)');
console.log('   - src/lib/badges-service.js → Fusionner avec hedera.js\n');

console.log('4️⃣  Créer les nouveaux endpoints dans:');
console.log('   - src/api/rewards/encouragement.js');
console.log('   - src/api/shoes/sync.js');
console.log('   - src/api/workouts/steps.js\n');

console.log('5️⃣  Mettre à jour src/index.js pour inclure:');
console.log('   app.use(\'/api/ai\', require(\'./api/ai/routes\'));');
console.log('   app.use(\'/api/rewards\', require(\'./api/rewards/routes\'));');
console.log('   // etc...\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ Dossiers créés!');
console.log('📚 READMEs ajoutés dans chaque module');
console.log('👉 Suis les étapes ci-dessus pour compléter\n');