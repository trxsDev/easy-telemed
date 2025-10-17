// Twilio Configuration
export const TWILIO_CONFIG = {
  // Replace with your Twilio Account SID
  accountSid:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWILIO_ACCOUNT_SID) ||
    'YOUR_TWILIO_ACCOUNT_SID',
  
  // Replace with your Twilio API Key SID
  apiKeySid:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWILIO_API_KEY_SID) ||
    'YOUR_TWILIO_API_KEY_SID',
  
  // Replace with your Twilio API Key Secret
  apiKeySecret:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWILIO_API_KEY_SECRET) ||
    'YOUR_TWILIO_API_KEY_SECRET',
  
  // Video settings
  video: {
    dominantSpeaker: true,
    maxAudioBitrate: 16000,
    maxVideoBitrate: 2400000,
    preferredVideoCodecs: ['VP8'],
    networkQuality: {
      local: 3,
      remote: 1
    }
  }
};

export default TWILIO_CONFIG;