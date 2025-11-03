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
            return { sentiment: 0, label: 'NEUTRAL', score: 0.5, isPositive: false, isNegative: false };
        }
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
        } else if (sentiment.isNegative && sentiment.score > 0.8) {
            isFiltered = true;
            filterReason = 'Commentaire extrêmement négatif';
        } else if (this.containsProfanity(text)) {
            isFiltered = true;
            filterReason = 'Langage inapproprié';
        }

        return {
            sentiment: sentiment.sentiment,
            sentimentLabel: sentiment.label,
            isFiltered,
            filterReason,
            toxicityScore: toxicity.score
        };
    }

    /**
     * Détection simple de grossièretés (à améliorer avec une vraie liste)
     */
    containsProfanity(text) {
        const profanityList = ['fuck', 'shit', 'ass', 'bitch', 'damn'];
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
            'NEGATIVE': -1,
            'negative': -1,
            'NEUTRAL': 0,
            'neutral': 0
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