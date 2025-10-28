const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const GuestPanel = require('../models/GuestPanel');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// GET guest panel configuration
router.get('/', async (req, res) => {
    try {
        let panelConfig = await GuestPanel.findOne();
        if (!panelConfig) {
            panelConfig = new GuestPanel({
                welcome: {
                    title: 'Bienvenido a la Plataforma',
                    text: 'Explora los recursos que hemos preparado para ti.'
                },
                chatbots: [],
                videos: [],
                heroBlocks: [
                    {
                        title: 'Cursos Cortos',
                        image: 'B1.png',
                        pdf: '#'
                    },
                    {
                        title: 'Matriculas Abiertas 2026',
                        image: 'B2.png',
                        pdf: '#'
                    },
                    {
                        title: 'Información Adicional',
                        image: 'B3.png',
                        pdf: '#'
                    }
                ]
            });
            await panelConfig.save();
        } else if (!panelConfig.heroBlocks || panelConfig.heroBlocks.length === 0) {
            panelConfig.heroBlocks = [
                {
                    title: 'Cursos Cortos',
                    image: 'B1.png',
                    pdf: '#'
                },
                {
                    title: 'Matriculas Abiertas 2026',
                    image: 'B2.png',
                    pdf: '#'
                },
                {
                    title: 'Información Adicional',
                    image: 'B3.png',
                    pdf: '#'
                }
            ];
            await panelConfig.save();
        }
        res.json(panelConfig);
    } catch (error) {
        console.error('Error fetching guest panel config:', error);
        res.status(500).send('Error del servidor al obtener la configuración del panel de visita.');
    }
});

// PUT (update) guest panel configuration
router.put('/hero-blocks', verificarToken, autorizarRoles('superadmin'), upload.any(), async (req, res) => {
    const { heroBlocks } = req.body;
    const files = req.files;

    try {
        let panelConfig = await GuestPanel.findOne();
        if (!panelConfig) {
            panelConfig = new GuestPanel({});
        }

        if (heroBlocks) {
            const updatedHeroBlocks = JSON.parse(heroBlocks).map((block, index) => {
                const imageFile = files.find(f => f.fieldname === `heroBlocks[${index}][image]`);
                const pdfFile = files.find(f => f.fieldname === `heroBlocks[${index}][pdf]`);
                return {
                    title: block.title,
                    image: imageFile ? imageFile.filename : block.image,
                    pdf: pdfFile ? pdfFile.filename : block.pdf,
                };
            });
            panelConfig.heroBlocks = updatedHeroBlocks;
        }

        await panelConfig.save();
        res.json(panelConfig);
    } catch (error) {
        console.error('Error updating guest panel config:', error);
        res.status(500).send('Error del servidor al actualizar la configuración del panel de visita.');
    }
});

module.exports = router;