const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configuration Multer pour l'upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = file.mimetype.startsWith('video') 
            ? './uploads/videos' 
            : './uploads/images';
        
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtre pour accepter uniquement images et vidéos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WEBP, MP4 ou MOV.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});

class MediaService {
    /**
     * Optimise une image (compression, resize)
     */
    async optimizeImage(filePath) {
        try {
            const optimizedPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '-optimized.jpg');
            
            await sharp(filePath)
                .resize(1080, 1080, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toFile(optimizedPath);

            // Supprimer l'original et renommer l'optimisé
            await fs.unlink(filePath);
            await fs.rename(optimizedPath, filePath);

            return filePath;
        } catch (error) {
            console.error('Image optimization error:', error);
            return filePath; // Retourner l'original si l'optimisation échoue
        }
    }

    /**
     * Crée une miniature pour une vidéo
     */
    async generateVideoThumbnail(videoPath) {
        // Note: Pour une vraie app, utilise ffmpeg
        // Ici on retourne juste un placeholder
        return `/uploads/thumbnails/video-placeholder.jpg`;
    }

    /**
     * Supprime un fichier média
     */
    async deleteMedia(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Delete media error:', error);
        }
    }
}

module.exports = {
    upload,
    mediaService: new MediaService()
};