const multer = require('multer');
const path = require('path');

// Konfiguracja przechowywania plików
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        // Generuj unikalną nazwę pliku
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtrowanie plików
const fileFilter = (req, file, cb) => {
    // Akceptuj tylko obrazy
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Nieprawidłowy typ pliku. Dozwolone są tylko obrazy.'), false);
    }
};

// Konfiguracja multera
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

module.exports = upload; 