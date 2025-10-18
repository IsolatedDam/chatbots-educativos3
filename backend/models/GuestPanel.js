const mongoose = require('mongoose');

const ChatbotSchema = new mongoose.Schema({
  title: { type: String, required: true },
  iframeUrl: { type: String, required: true }
});

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, required: true }
});

const GuestPanelSchema = new mongoose.Schema({
  welcome: {
    title: { type: String, default: 'Bienvenido' },
    text: { type: String, default: '' }
  },
  chatbots: [ChatbotSchema],
  videos: [VideoSchema]
});

module.exports = mongoose.model('GuestPanel', GuestPanelSchema);