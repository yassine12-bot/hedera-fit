const { HfInference } = require('@huggingface/inference');

class AIService {
    constructor() {
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    }

    /**
     * Analyse le sentiment d'un commentaire
     * Returns: { label: 'POSITIVE/NEGATIVE/NEUTRAL', score: 0.95, sentiment: 0.85 }
     */
    async analyzeSentiment(text) {
        try {
            // Modèle multilingue de sentiment analysis
            const result = await this.hf.textClassification({
                model: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
                inputs: text
            });

            // Convertir le résultat en score de -1 à 1
            const sentiment = this.convertToSentimentScore(result);

            return {
                label: result[0].label,
                score: result[0].score,
                sentiment: sentiment,
                isPositive: sentiment > 0.3,
                isNegative: sentiment < -0.3
            };
        } catch (error) {
            console.error('Sentiment analysis error:', error);
            
            // ✅ FALLBACK: Analyse simple basée sur mots-clés
            return this.fallbackSentimentAnalysis(text);
        }
    }

    /**
     * ✅ NOUVEAU: Analyse de sentiment fallback (sans API)
     */
    fallbackSentimentAnalysis(text) {
        const lowerText = text.toLowerCase();
        
        // Mots positifs
        const positiveWords = [
            'amazing', 'great', 'excellent', 'wonderful', 'fantastic', 'awesome',
            'love', 'perfect', 'best', 'good', 'nice', 'beautiful', 'happy',
            'incredible', 'brilliant', 'super', 'outstanding', 'magnificent',
            'génial', 'super', 'incroyable', 'parfait', 'excellent', 'bravo',
            'magnifique', 'formidable', 'merveilleux', 'bien', 'top'
        ];
        
        // Mots négatifs
        const negativeWords = [
            'terrible', 'horrible', 'awful', 'bad', 'worst', 'hate', 'disgusting',
            'poor', 'disappointing', 'useless', 'garbage', 'trash', 'sucks',
            'pathetic', 'boring', 'annoying', 'stupid', 'ridiculous', 'lame',
            'nul', 'horrible', 'terrible', 'mauvais', 'pire', 'déçu', 'décevant',
            'pourri', 'moche', 'affreux', 'ennuyeux', 'stupide'
        ];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
            if (lowerText.includes(word)) positiveCount++;
        });
        
        negativeWords.forEach(word => {
            if (lowerText.includes(word)) negativeCount++;
        });
        
        // Calculer le sentiment
        let sentiment = 0;
        let label = 'NEUTRAL';
        
        if (positiveCount > negativeCount) {
            sentiment = Math.min(0.8, positiveCount * 0.3);
            label = 'POSITIVE';
        } else if (negativeCount > positiveCount) {
            sentiment = Math.max(-0.9, negativeCount * -0.35);
            label = 'NEGATIVE';
        }
        
        console.log(`📊 Fallback Analysis: ${positiveCount} positive, ${negativeCount} negative → ${label} (${sentiment})`);
        
        return {
            label,
            score: Math.abs(sentiment),
            sentiment,
            isPositive: sentiment > 0.3,
            isNegative: sentiment < -0.3
        };
    }

    /**
     * Détecte le contenu toxique/haineux
     */
    async detectToxicity(text) {
        try {
            const result = await this.hf.textClassification({
                model: 'facebook/roberta-hate-speech-dynabench-r4-target',
                inputs: text
            });

            const hateSpeech = result.find(r => r.label === 'hate');
            const isToxic = hateSpeech && hateSpeech.score > 0.7;

            return {
                isToxic,
                score: hateSpeech ? hateSpeech.score : 0,
                labels: result
            };
        } catch (error) {
            console.error('Toxicity detection error:', error);
            return { isToxic: false, score: 0 };
        }
    }

    /**
     * Modération complète du commentaire
     */
    async moderateComment(text) {
        const [sentiment, toxicity] = await Promise.all([
            this.analyzeSentiment(text),
            this.detectToxicity(text)
        ]);

        let isFiltered = false;
        let filterReason = null;

        // Règles de modération
        if (toxicity.isToxic) {
            isFiltered = true;
            filterReason = 'Contenu toxique ou haineux détecté';
        } else if (sentiment.sentiment < -0.8) {  // ✅ CORRIGÉ: Utiliser sentiment, pas score!
            isFiltered = true;
            filterReason = 'Commentaire extrêmement négatif';
        } else if (this.containsProfanity(text)) {
            isFiltered = true;
            filterReason = 'Langage inapproprié';
        }

        console.log(`🤖 Moderation: sentiment=${sentiment.sentiment.toFixed(2)}, label=${sentiment.label}, filtered=${isFiltered}`);

        return {
            sentiment: sentiment.sentiment,
            sentimentLabel: sentiment.label,
            isFiltered,
            filterReason,
            toxicityScore: toxicity.score
        };
    }

    /**
     * Détection simple de grossièretés
     */
    containsProfanity(text) {
        const profanityList = [
            'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'bastard',
            'merde', 'putain', 'connard', 'con', 'salaud'
        ];
        const lowerText = text.toLowerCase();
        return profanityList.some(word => lowerText.includes(word));
    }

    /**
     * Convertit le résultat HuggingFace en score de -1 à 1
     */
    convertToSentimentScore(result) {
        const labelMap = {
            'POSITIVE': 1,
            'positive': 1,
            'Positive': 1,
            'NEGATIVE': -1,
            'negative': -1,
            'Negative': -1,
            'NEUTRAL': 0,
            'neutral': 0,
            'Neutral': 0
        };

        const label = result[0].label;
        const score = result[0].score;

        return (labelMap[label] || 0) * score;
    }

    /**
     * Génère un conseil de fitness personnalisé
     */
    async generateFitnessTip(userStats) {
        try {
            const prompt = `En tant que coach fitness, donne un conseil motivant et court (2-3 phrases) pour quelqu'un qui a fait ${userStats.steps} pas aujourd'hui. Objectif: ${userStats.goal} pas. Sois encourageant et spécifique.`;

            const result = await this.hf.textGeneration({
                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                inputs: prompt,
                parameters: {
                    max_new_tokens: 100,
                    temperature: 0.7
                }
            });

            return result.generated_text;
        } catch (error) {
            console.error('Fitness tip generation error:', error);
            return 'Continue comme ça ! Chaque pas compte vers ton objectif ! 💪';
        }
    }
}

module.exports = new AIService();