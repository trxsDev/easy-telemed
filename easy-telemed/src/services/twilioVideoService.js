import TWILIO_CONFIG from "../config/twilio";

// สำหรับ production ควรสร้าง access token บน backend
// นี่เป็นตัวอย่างสำหรับ development เท่านั้น
export const generateAccessToken = (identity, roomName) => {
  console.warn("🚨 Development mode: Token generation on client-side");
  console.warn("📝 For production, implement backend token generation");

  return `dev_token_${identity}_${roomName}_${Date.now()}`;
};

// Service สำหรับสร้างห้อง video call
export class TwilioVideoService {
  constructor() {
    this.currentRoom = null;
    this.localTracks = [];
    this.participants = new Map();
  }

  // สร้าง access token (ใน production ควรเรียกจาก backend)
//   async getAccessToken(identity, roomName) {
//     try {
//       const response = await fetch("/api/twilio/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ identity, roomName }),
//       });

//       if (response.ok) {
//         const data = await response.json();
//         if (data?.token) {
//           return data.token;
//         }
//       }

//       console.warn("🚨 Falling back to client-side token generation");
//       return generateAccessToken(identity, roomName);
//     } catch (error) {
//       console.error("Error getting access token:", error);
//       return generateAccessToken(identity, roomName);
//     }
//   }
async getAccessToken(identity, roomName) {
  const response = await fetch('/api/twilio/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, roomName })
  });
  
  const data = await response.json();
  return data.token;
}

  // เข้าร่วมห้อง
  async joinRoom(token, roomName, options = {}) {
    try {
      const { connect } = await import('twilio-video');
      
      const defaultOptions = {
        name: roomName,
        audio: true,
        video: { width: 640, height: 480 },
        ...TWILIO_CONFIG.video,
        ...options
      };

      this.currentRoom = await connect(token, defaultOptions);
      
      console.log(`Successfully joined room: ${this.currentRoom.name}`);
      return this.currentRoom;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // ออกจากห้อง
  leaveRoom() {
    if (this.currentRoom) {
      this.currentRoom.disconnect();
      this.currentRoom = null;
    }
    
    // หยุด local tracks
    this.localTracks.forEach(track => {
      track.stop();
      track.detach();
    });
    this.localTracks = [];
    
    // ล้าง participants
    this.participants.clear();
  }

  // เริ่มต้น local video/audio
  async createLocalTracks(options = {}) {
    try {
      const { createLocalVideoTrack, createLocalAudioTrack } = await import('twilio-video');
      
      const defaultOptions = {
        video: { width: 640, height: 480 },
        audio: true,
        ...options
      };

      const tracks = [];
      
      if (defaultOptions.video) {
        const videoTrack = await createLocalVideoTrack({
          width: defaultOptions.video.width,
          height: defaultOptions.video.height
        });
        tracks.push(videoTrack);
      }
      
      if (defaultOptions.audio) {
        const audioTrack = await createLocalAudioTrack();
        tracks.push(audioTrack);
      }

      this.localTracks = tracks;
      return tracks;
    } catch (error) {
      console.error('Error creating local tracks:', error);
      throw error;
    }
  }

  // แสดง video track ใน DOM element
  attachTrackToElement(track, element) {
    if (track && element) {
      const mediaElement = track.attach();
      element.appendChild(mediaElement);
      return mediaElement;
    }
  }

  // ลบ video track จาก DOM element
  detachTrackFromElement(track, element) {
    if (track && element) {
      const mediaElements = track.detach();
      mediaElements.forEach(mediaElement => {
        if (element.contains(mediaElement)) {
          element.removeChild(mediaElement);
        }
      });
    }
  }

  // ปิด/เปิด microphone
  toggleAudio(enabled) {
    const audioTrack = this.localTracks.find(track => track.kind === 'audio');
    if (audioTrack) {
      if (enabled) {
        audioTrack.enable();
      } else {
        audioTrack.disable();
      }
    }
  }

  // ปิด/เปิด camera
  toggleVideo(enabled) {
    const videoTrack = this.localTracks.find(track => track.kind === 'video');
    if (videoTrack) {
      if (enabled) {
        videoTrack.enable();
      } else {
        videoTrack.disable();
      }
    }
  }

  // ดึงข้อมูล participants ในห้อง
  getParticipants() {
    if (this.currentRoom) {
      return Array.from(this.currentRoom.participants.values());
    }
    return [];
  }

  // ตรวจสอบสถานะการเชื่อมต่อ
  isConnected() {
    return this.currentRoom && this.currentRoom.state === 'connected';
  }
}

export default new TwilioVideoService();