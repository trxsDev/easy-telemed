// Backend API endpoint สำหรับ generate Twilio Access Token
// ไฟล์นี้เป็นตัวอย่างสำหรับ Express.js server
// ในการใช้งานจริงควรใช้ backend แยกต่างหากเพื่อความปลอดภัย

/* eslint-env node */
import express from 'express';
import { AccessToken } from 'twilio';

const router = express.Router();

// POST /api/twilio/token
router.post('/token', (req, res) => {
  try {
    const { identity, roomName } = req.body;

    if (!identity || !roomName) {
      return res.status(400).json({ 
        error: 'Missing required parameters: identity and roomName' 
      });
    }

    // Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

    if (!accountSid || !apiKeySid || !apiKeySecret) {
      return res.status(500).json({ 
        error: 'Twilio credentials not configured' 
      });
    }

    // Create an access token
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { identity: identity, ttl: 3600 } // Token valid for 1 hour
    );

    // Create a Video grant
    const videoGrant = new AccessToken.VideoGrant({
      room: roomName,
    });

    // Add the grant to the token
    token.addGrant(videoGrant);

    // Return the JWT token
    res.json({
      token: token.toJwt(),
      identity: identity,
      roomName: roomName
    });

  } catch (error) {
    console.error('Error generating access token:', error);
    res.status(500).json({ 
      error: 'Failed to generate access token' 
    });
  }
});

export default router;

// วิธีการใช้งาน:
// 1. ติดตั้ง dependencies: npm install express twilio cors
// 2. สร้าง server.js:
/*
import express from 'express';
import cors from 'cors';
import twilioRoutes from './routes/twilio.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/twilio', twilioRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

// 3. ตั้งค่า environment variables ใน .env:
/*
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
*/

// 4. แก้ไข twilioVideoService.js เพื่อเรียก API endpoint:
/*
async getAccessToken(identity, roomName) {
  try {
    const response = await fetch('/api/twilio/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, roomName })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get access token');
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}
*/