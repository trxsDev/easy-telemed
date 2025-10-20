import { TWILIO_CONFIG } from '../config/twilio.js';
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:3001';

// Service สำหรับสร้างห้อง video call
export class TwilioVideoService {
  constructor() {
    this.currentRoom = null;
    this.localTracks = [];
    this.participants = new Map();
  }

  // Sync local tracks from the connected room if they weren't pre-created
  _syncLocalTracksFromRoom(room) {
    try {
      if (!room || !room.localParticipant) return;
      const lp = room.localParticipant;
      const videoTracks = Array.from(lp.videoTracks?.values?.() || [])
        .map((pub) => pub?.track)
        .filter(Boolean);
      const audioTracks = Array.from(lp.audioTracks?.values?.() || [])
        .map((pub) => pub?.track)
        .filter(Boolean);
      const merged = [...videoTracks, ...audioTracks];
      if (merged.length > 0) {
        this.localTracks = merged;
      }
    } catch (_) {}
  }

  // ตรวจสอบการตั้งค่า Twilio
  checkTwilioConfig() {
    const { accountSid, apiKeySid, apiKeySecret } = TWILIO_CONFIG;
    
    if (!accountSid || accountSid === 'YOUR_TWILIO_ACCOUNT_SID' ||
        !apiKeySid || apiKeySid === 'YOUR_TWILIO_API_KEY_SID' ||
        !apiKeySecret || apiKeySecret === 'YOUR_TWILIO_API_KEY_SECRET') {
      // สำหรับ production เราใช้ token จาก backend ไม่จำเป็นต้องมี VITE_* บน frontend
      // แสดงคำเตือนใน console เพื่อช่วย dev เท่านั้น แต่ไม่ต้อง throw
      console.warn('[Twilio] Frontend VITE_TWILIO_* ไม่ได้ตั้งค่า จะใช้ token จาก backend แทน');
    }
  }

  // สร้าง access token สำหรับ development (ไม่แนะนำสำหรับ production)
  async getAccessToken(identity, roomName) {
    try {
      // ใช้ backend API เพื่อขอ token เสมอ
      this.checkTwilioConfig(); // ไม่ throw ถ้าไม่มี VITE_*
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_BASE}/api/twilio/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identity, roomName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Token API not available (${response.status}) ${text}`);
      }

      const data = await response.json();
      if (!data?.token) {
        throw new Error('Token API response missing "token" field');
      }

      return data.token;

    } catch (error) {
      const message = `ไม่สามารถดึง access token จาก backend ได้: ${error.message}`;
      console.error(message);
      throw new Error(`${message}\n\nกรุณาตรวจสอบให้แน่ใจว่าได้ตั้งค่า backend endpoint "/api/twilio/token" พร้อม Twilio credentials ที่ถูกต้อง หรือสร้าง endpoint ใน Functions ของ Supabase / Cloud ที่คืน token ให้ฝั่ง client.`);
    }
  }

  // เข้าร่วมห้อง
  async joinRoom(token, roomName, options = {}) {
    try {
      const { connect } = await import('twilio-video');

      // Reuse pre-created local tracks to avoid a second permission prompt
      const hasLocalTracks = Array.isArray(this.localTracks) && this.localTracks.length > 0;

      const baseOptions = {
        name: roomName,
        dominantSpeaker: true,
        networkQuality: { local: 3, remote: 1 },
        preferredVideoCodecs: ['VP8'],
        ...options,
      };

      // If we already have local tracks, prefer reusing them and avoid implicit capture
      // Else, honor the explicit audio/video flags passed in options
      const connectOptions = hasLocalTracks
        ? { ...baseOptions, tracks: this.localTracks, audio: false, video: false }
        : { ...baseOptions };

      const connectPromise = connect(token, connectOptions).then((room) => {
        this.currentRoom = room;
        console.log(`Successfully joined room: ${room.name}`);
        // If tracks were not provided, sync them from the room
        if (!hasLocalTracks) {
          this._syncLocalTracksFromRoom(room);
        }
        if (hasLocalTracks) {
          // Publish any tracks not already published
          const published = new Set(
            Array.from(room.localParticipant.tracks.values()).map((pub) => pub.track && pub.track.sid)
          );
          this.localTracks.forEach((t) => {
            if (!t.sid || !published.has(t.sid)) {
              try { room.localParticipant.publishTrack(t); } catch (_) {}
            }
          });
        }
        return room;
      });

      // Add a soft timeout so UI won't spin forever
      const timeoutMs = 20000;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Video connect timeout')), timeoutMs));

      return await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error joining room:', error);
      throw new Error(`ไม่สามารถเข้าร่วมห้องได้: ${error.message}`);
    }
  }

  // ออกจากห้อง
  leaveRoom() {
    if (this.currentRoom) {
      try {
        const lp = this.currentRoom.localParticipant;
        if (lp && lp.tracks) {
          // Unpublish all tracks to release resources cleanly
          Array.from(lp.tracks.values()).forEach((pub) => {
            try { if (pub.track) lp.unpublishTrack(pub.track); } catch (_) {}
          });
        }
      } catch (_) {}
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

  // วางสาย + reset อุปกรณ์ (best-effort)
  async hangupAndReset(retainLocalTracks = false) {
    try { this.leaveRoom(); } catch (_) {}
    if (!retainLocalTracks) {
      try {
        this.localTracks.forEach((track) => {
          try { track.disable?.(); } catch (_) {}
          try { track.stop?.(); } catch (_) {}
        });
      } catch (_) {}
      this.localTracks = [];
    }
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
      throw new Error(`ไม่สามารถเข้าถึงกล้องและไมโครโฟนได้: ${error.message}`);
    }
  }

  async ensureAudioTrack() {
    let audioTrack = this.localTracks.find((t) => t.kind === 'audio');
    if (!audioTrack && this.currentRoom?.localParticipant?.audioTracks) {
      const pub = Array.from(this.currentRoom.localParticipant.audioTracks.values())[0];
      audioTrack = pub?.track || null;
    }
    if (!audioTrack) {
      const { createLocalAudioTrack } = await import('twilio-video');
      audioTrack = await createLocalAudioTrack();
      this.localTracks.push(audioTrack);
      // Publish if in room
      if (this.currentRoom?.localParticipant) {
        try { await this.currentRoom.localParticipant.publishTrack(audioTrack); } catch (_) {}
      }
    }
    return audioTrack;
  }

  async ensureVideoTrack(constraints = { width: 640, height: 480 }) {
    let videoTrack = this.localTracks.find((t) => t.kind === 'video');
    if (!videoTrack && this.currentRoom?.localParticipant?.videoTracks) {
      const pub = Array.from(this.currentRoom.localParticipant.videoTracks.values())[0];
      videoTrack = pub?.track || null;
    }
    if (!videoTrack) {
      const { createLocalVideoTrack } = await import('twilio-video');
      videoTrack = await createLocalVideoTrack({ width: constraints.width, height: constraints.height });
      this.localTracks.push(videoTrack);
      // Publish if in room
      if (this.currentRoom?.localParticipant) {
        try { await this.currentRoom.localParticipant.publishTrack(videoTrack); } catch (_) {}
      }
    }
    return videoTrack;
  }

  // แสดง track (video/audio) ใน DOM element พร้อมรองรับ local preview
  attachTrackToElement(track, element, opts = {}) {
    if (!track || !element) return null;
    // Remove stale children of the same tag to prevent layered black frames
    try {
      const tag = track.kind === 'video' ? 'VIDEO' : 'AUDIO';
      Array.from(element.children)
        .filter((el) => el.tagName === tag)
        .forEach((el) => element.removeChild(el));
    } catch (_) {}

    const mediaElement = track.attach();
    // Ensure autoplay works across browsers
    if (track.kind === 'video') {
      mediaElement.muted = !!opts.isLocal; // local preview must be muted
      mediaElement.autoplay = true;
      mediaElement.playsInline = true;
      mediaElement.setAttribute('playsinline', 'true');
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';
      mediaElement.style.objectFit = 'cover';
      mediaElement.style.backgroundColor = '#000';
    } else if (track.kind === 'audio') {
      mediaElement.autoplay = true;
    }
    element.appendChild(mediaElement);
    return mediaElement;
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
  async toggleAudio(enabled) {
    try {
      let audioTrack = this.localTracks.find((t) => t.kind === 'audio');
      if (enabled && !audioTrack) {
        audioTrack = await this.ensureAudioTrack();
      } else if (!audioTrack && this.currentRoom?.localParticipant?.audioTracks) {
        const pub = Array.from(this.currentRoom.localParticipant.audioTracks.values())[0];
        audioTrack = pub?.track || null;
        if (audioTrack) this.localTracks.push(audioTrack);
      }
      if (!audioTrack) return false;
      if (enabled) {
        audioTrack.enable();
      } else {
        try { audioTrack.disable(); } catch (_) {}
        try { audioTrack.stop(); } catch (_) {}
        this.localTracks = this.localTracks.filter((t) => t !== audioTrack);
      }
      return true;
    } catch (e) {
      console.error('toggleAudio failed', e);
      return false;
    }
  }

  // ปิด/เปิด camera
  async toggleVideo(enabled) {
    try {
      let videoTrack = this.localTracks.find((t) => t.kind === 'video');
      if (enabled && !videoTrack) {
        videoTrack = await this.ensureVideoTrack();
      } else if (!videoTrack && this.currentRoom?.localParticipant?.videoTracks) {
        const pub = Array.from(this.currentRoom.localParticipant.videoTracks.values())[0];
        videoTrack = pub?.track || null;
        if (videoTrack) this.localTracks.push(videoTrack);
      }
      if (!videoTrack) return false;
      if (enabled) {
        videoTrack.enable();
      } else {
        try { videoTrack.disable(); } catch (_) {}
        try { videoTrack.stop(); } catch (_) {}
        this.localTracks = this.localTracks.filter((t) => t !== videoTrack);
      }
      return true;
    } catch (e) {
      console.error('toggleVideo failed', e);
      return false;
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
