const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'leaf-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetypes = /image\/jpeg|image\/png/;

        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = mimetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png) are allowed!'));
        }
    }
});

// Helper for python execution
const pythonExec = (function () {
    const venvPython = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
    return fs.existsSync(venvPython) ? venvPython : 'python';
})();

// POST /api/disease/predict
router.post('/predict', upload.single('leafImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image file.' });
        }

        const imagePath = req.file.path;
        const scriptPath = path.join(__dirname, '../../ml/predict_disease.py');

        // Call Python script
        const command = `"${pythonExec}" "${scriptPath}" "${imagePath}"`;

        exec(command, (error, stdout, stderr) => {
            // Clean up: Delete image after processing (optional, keeping it for now might be useful for debug)
            // fs.unlinkSync(imagePath); 

            if (error) {
                console.error('Disease Prediction Error:', error);
                return res.status(500).json({ error: 'Failed to analyze image.', details: stderr });
            }

            try {
                const result = JSON.parse(stdout.trim());
                res.json(result);
            } catch (e) {
                console.error('JSON Parse Error:', e, stdout);
                res.status(500).json({ error: 'Invalid response from model.' });
            }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
