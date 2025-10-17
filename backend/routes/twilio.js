/* eslint-env node */
const express = require('express');
const twilio = require('twilio');

const router = express.Router();

router.post('/token', (req, res) => {
  try {
    const { identity, roomName } = req.body || {};
    if (!identity || !roomName) {
      return res.status(400).json({ error: 'Missing required parameters: identity and roomName' });
    }

    const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET) {
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY_SID,
      TWILIO_API_KEY_SECRET,
      { identity, ttl: 3600 }
    );

    token.addGrant(new VideoGrant({ room: roomName }));

    return res.json({ token: token.toJwt(), identity, roomName });
  } catch (error) {
    console.error('Error generating access token:', error);
    return res.status(500).json({ error: 'Failed to generate access token' });
  }
});

module.exports = router;
