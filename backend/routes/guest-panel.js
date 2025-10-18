const express = require('express');
const router = express.Router();
const GuestPanel = require('../models/GuestPanel');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');

// GET guest panel configuration
// This is a public endpoint, so no auth needed
router.get('/', async (req, res) => {
  try {
    let panelConfig = await GuestPanel.findOne();
    if (!panelConfig) {
      // If no config exists, create a default one
      panelConfig = new GuestPanel({
        welcome: {
          title: 'Bienvenido a la Plataforma',
          text: 'Explora los recursos que hemos preparado para ti.'
        },
        chatbots: [],
        videos: []
      });
      await panelConfig.save();
    }
    res.json(panelConfig);
  } catch (error) {
    console.error('Error fetching guest panel config:', error);
    res.status(500).send('Error del servidor al obtener la configuración del panel de visita.');
  }
});

// PUT (update) guest panel configuration
router.put('/', verificarToken, autorizarRoles('superadmin'), async (req, res) => {
  const { welcome, chatbots, videos } = req.body;

  try {
    let panelConfig = await GuestPanel.findOne();
    if (!panelConfig) {
      panelConfig = new GuestPanel({});
    }

    // Clean up chatbots and videos to remove mongoose _id fields if they are sent from client
    const cleanChatbots = chatbots.map(({ title, iframeUrl }) => ({ title, iframeUrl }));
    const cleanVideos = videos.map(({ title, videoUrl }) => ({ title, videoUrl }));

    panelConfig.welcome = welcome;
    panelConfig.chatbots = cleanChatbots;
    panelConfig.videos = cleanVideos;

    await panelConfig.save();
    res.json(panelConfig);
  } catch (error) {
    console.error('Error updating guest panel config:', error);
    res.status(500).send('Error del servidor al actualizar la configuración del panel de visita.');
  }
});

module.exports = router;