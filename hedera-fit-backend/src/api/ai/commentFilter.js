const aiService = require('../../lib/ai');

/**
 * Analyser le sentiment d'un commentaire
 * Retourne: { sentiment, label, shouldFilter, filterReason }
 */
async function analyzeComment(text) {
  try {
    // Utiliser le service AI de bas niveau
    const sentiment = await aiService.analyzeSentiment(text);
    
    // Déterminer si le commentaire doit être filtré
    let shouldFilter = false;
    let filterReason = null;
    let label = 'neutral';
    
    if (sentiment > 0.5) {
      label = 'positive';
    } else if (sentiment < -0.85) {
      label = 'negative';
      shouldFilter = true;
      filterReason = 'Commentaire extrêmement négatif';
    } else if (sentiment < -0.5) {
      label = 'negative';
    }
    
    return {
      sentiment,
      label,
      shouldFilter,
      filterReason
    };
  } catch (error) {
    console.error('❌ Erreur analyse AI:', error.message);
    // En cas d'erreur, on laisse passer le commentaire
    return {
      sentiment: 0,
      label: 'neutral',
      shouldFilter: false,
      filterReason: null
    };
  }
}

/**
 * Vérifier si un commentaire mérite une récompense
 */
function shouldReward(sentimentScore) {
  return sentimentScore > 0.5; // Commentaire positif
}

/**
 * Calculer le montant de la récompense
 */
function calculateReward(sentimentScore) {
  if (sentimentScore > 0.9) return 5; // Très positif
  if (sentimentScore > 0.7) return 3; // Positif
  if (sentimentScore > 0.5) return 2; // Légèrement positif
  return 0;
}

module.exports = {
  analyzeComment,
  shouldReward,
  calculateReward
};