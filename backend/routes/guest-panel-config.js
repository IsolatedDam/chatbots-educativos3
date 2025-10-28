const express = require('express');
const router = express.Router();
const GuestPanel = require('../models/GuestPanel');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');

router.put('/', verificarToken, autorizarRoles('superadmin'), async (req, res) => {
    const { welcome, chatbots, videos } = req.body;

    try {
        let panelConfig = await GuestPanel.findOne();
        if (!panelConfig) {
            panelConfig = new GuestPanel({});
        }

        if (welcome) {
            panelConfig.welcome = welcome;
        }

        if (chatbots) {
            panelConfig.chatbots = chatbots;
        }

        if (videos) {
            panelConfig.videos = videos;
        }

        await panelConfig.save();
        res.json(panelConfig);
    } catch (error) {
        console.error('Error updating guest panel config:', error);
        res.status(500).send('Error del servidor al actualizar la configuración del panel de visita.');
    }
});

module.exports = router;