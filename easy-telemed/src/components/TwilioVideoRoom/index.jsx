import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, Input, message, Card, Space, Typography, Row, Col, Badge, Alert, Modal, Tooltip, Spin } from 'antd';
import { 
  VideoCameraOutlined, 
  AudioOutlined, 
  PhoneOutlined, 
  UserOutlined,
  VideoCameraAddOutlined,
  AudioMutedOutlined,
  StopOutlined
} from '@ant-design/icons';
import twilioVideoService from '../../services/twilioVideoServiceV2';
import { useUserAuthSupabase } from '../../context/UserAuthContextSupabase';
import './TwilioRoom.css';

const { Title, Text, Paragraph } = Typography;

function TwilioVideoRoom({
  defaultRoomName = '',
  defaultIdentity = '',
  autoJoin = false,
  hideJoinForm = false,
  lockRoomName = false,
  lockIdentity = false,
  onConnected,
  onDisconnected,
  controlSignal,
  skipPreview = false,
  canJoin = true,
}) {
  const AUTO_JOIN_MAX_ATTEMPTS = 3;
  const { user, role } = useUserAuthSupabase();
  
  // State management
  const [roomName, setRoomName] = useState(defaultRoomName || '');
  const [identity, setIdentity] = useState(defaultIdentity || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localTracksReady, setLocalTracksReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [currentRoomName, setCurrentRoomName] = useState('');
  const [permissionIssue, setPermissionIssue] = useState(null);
  const [secureContextIssue, setSecureContextIssue] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [canRetryJoin, setCanRetryJoin] = useState(false);
  // Prevent repeated auto-join attempts causing reconnect loops
  const autoJoinStateRef = useRef({ key: '', attempted: false, attempts: 0, manualOnly: false });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const disconnectIntentRef = useRef({ intentional: false, allowReconnect: false });
  const previewKey = useMemo(() => {
    const baseIdentity = defaultIdentity || user?.email || user?.user_id || 'guest';
    return `twilioPreview:${baseIdentity}`;
  }, [defaultIdentity, user?.email, user?.user_id]);
  const [hasShownPreview, setHasShownPreview] = useState(() => {
    if (!previewKey) return false;
    try {
      return sessionStorage.getItem(previewKey) === '1';
    } catch (_) {
      return false;
    }
  });

  // Refs for video containers (inline and modal)
  const localInlineVideoRef = useRef(null);
  const localModalVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());

  useEffect(() => {
    if (!previewKey) {
      setHasShownPreview(false);
      return;
    }
    try {
      setHasShownPreview(sessionStorage.getItem(previewKey) === '1');
    } catch (_) {
      setHasShownPreview(false);
    }
  }, [previewKey]);

  const markPreviewShown = useCallback(() => {
    if (!previewKey) return;
    try {
      sessionStorage.setItem(previewKey, '1');
    } catch (_) {}
    setHasShownPreview(true);
  }, [previewKey]);

  useEffect(() => {
    if (!canJoin) {
      setPreviewOpen(false);
      setCanRetryJoin(false);
      setConnectError(null);
      autoJoinStateRef.current = { ...autoJoinStateRef.current, attempted: false, attempts: 0, manualOnly: false };
    }
  }, [canJoin]);

  // Initialize identity from user or props
  useEffect(() => {
    if (defaultIdentity) {
      setIdentity(defaultIdentity);
    }
  }, [defaultIdentity]);

  useEffect(() => {
    if (defaultRoomName) {
      setRoomName(defaultRoomName);
    }
  }, [defaultRoomName]);

  useEffect(() => {
    if (!lockIdentity && !defaultIdentity && user?.email) {
      setIdentity((prev) => prev || user.email);
    }
  }, [user, lockIdentity, defaultIdentity]);

  useEffect(() => {
    if (!controlSignal) return;
    const userRole = role || user?.role || 'guest';
    if (controlSignal.target && controlSignal.target !== userRole) {
      return;
    }
    if (controlSignal.type === 'hangup') {
      const retain = Boolean(controlSignal.retainMedia);
      disconnectIntentRef.current = { intentional: true, allowReconnect: retain };
      twilioVideoService
        .hangupAndReset(retain)
        .catch(() => {})
        .finally(() => {
          if (!retain) {
            setLocalTracksReady(false);
            setCanRetryJoin(false);
            setConnectError(null);
          } else if (!autoJoin) {
            setCanRetryJoin(true);
          }
          setAudioEnabled(false);
          setVideoEnabled(false);
          onDisconnected?.();
        });
    }
  }, [autoJoin, controlSignal, onDisconnected, role, user?.role]);

  const attachLocalVideoTo = useCallback((containerRef) => {
    if (!containerRef?.current) return;
    try {
      let videoTrack = (twilioVideoService.localTracks || []).find(t => t.kind === 'video');
      if (!videoTrack && twilioVideoService.currentRoom?.localParticipant?.videoTracks) {
        const pub = Array.from(twilioVideoService.currentRoom.localParticipant.videoTracks.values())[0];
        videoTrack = pub?.track || null;
      }
      if (videoTrack) {
        twilioVideoService.attachTrackToElement(videoTrack, containerRef.current, { isLocal: true });
      }
    } catch (_) {}
  }, []);

  const setupLocalTracks = useCallback(async () => {
    try {
      const existingTracks = Array.isArray(twilioVideoService.localTracks) ? twilioVideoService.localTracks : [];

      if (existingTracks.length > 0) {
        setLocalTracksReady(true);
        setPermissionIssue(null);
        return existingTracks;
      }

      const tracks = await twilioVideoService.createLocalTracks({
        video: { width: 640, height: 480 },
        audio: true
      });

      const videoTrack = tracks.find((track) => track.kind === 'video');
      if (videoTrack) {
        try { videoTrack.disable(); } catch (_) {}
      }

      const audioTrack = tracks.find((track) => track.kind === 'audio');
      if (audioTrack) {
        try { audioTrack.disable(); } catch (_) {}
      }

      setLocalTracksReady(true);
      setPermissionIssue(null);
      setAudioEnabled(false);
      setVideoEnabled(false);
      message.success('เตรียมอุปกรณ์เรียบร้อย (ไมค์/กล้องปิดอยู่)');
      return tracks;
    } catch (error) {
      console.error('Error setting up local tracks:', error);
      if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        setPermissionIssue(error.name);
      }
      message.error('ไม่สามารถเข้าถึงกล้องและไมโครโฟนได้');
      throw error;
    }
  }, [previewOpen]);

  const handleTrackSubscribed = useCallback((track, participant) => {
    console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
    const containerDiv = document.getElementById(`participant-${participant.sid}`);
    if (containerDiv) {
      // Attach video or audio tracks
      twilioVideoService.attachTrackToElement(track, containerDiv, { isLocal: false });
    }
  }, []);

  const handleTrackUnsubscribed = useCallback((track, participant) => {
    console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`);
    const containerDiv = document.getElementById(`participant-${participant.sid}`);
    if (containerDiv) {
      twilioVideoService.detachTrackFromElement(track, containerDiv);
    }
  }, []);

  const handleParticipantDisconnected = useCallback((participant) => {
    console.log(`Participant "${participant.identity}" disconnected`);

    setParticipants(prev => prev.filter(p => p.sid !== participant.sid));

    const containerRef = remoteVideosRef.current.get(participant.sid);
    if (containerRef) {
      containerRef.innerHTML = '';
      remoteVideosRef.current.delete(participant.sid);
    }
  }, []);

  const handleParticipantConnected = useCallback((participant) => {
    console.log(`Participant "${participant.identity}" connected`);

    setParticipants(prev => {
      const updated = [...prev];
      if (!updated.find(p => p.sid === participant.sid)) {
        updated.push(participant);
      }
      return updated;
    });

    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        handleTrackSubscribed(publication.track, participant);
      }
    });

    participant.on('trackSubscribed', (track) => handleTrackSubscribed(track, participant));
    participant.on('trackUnsubscribed', (track) => handleTrackUnsubscribed(track, participant));
  }, [handleTrackSubscribed, handleTrackUnsubscribed]);

  const handleRoomDisconnected = useCallback((room, error) => {
    console.log('Disconnected from room:', room.name);
    if (error) {
      console.error('Room disconnection error:', error);
      message.error('การเชื่อมต่อขาดหาย: ' + error.message);
    }

    setIsConnected(false);
    setCurrentRoomName('');
    setParticipants([]);
    remoteVideosRef.current.clear();
    if (localInlineVideoRef.current) {
      localInlineVideoRef.current.innerHTML = '';
    }
    try { twilioVideoService.hangupAndReset(); } catch (_) {}
    const { intentional, allowReconnect } = disconnectIntentRef.current;
    const { manualOnly } = autoJoinStateRef.current;
    const shouldRetryAuto = !manualOnly && (allowReconnect || !intentional);
    if (!intentional) {
      setConnectError(error?.message || 'การเชื่อมต่อถูกตัด กรุณาลองใหม่');
      autoJoinStateRef.current.attempts = (autoJoinStateRef.current.attempts || 0) + 1;
      autoJoinStateRef.current.attempts = Math.min(autoJoinStateRef.current.attempts, AUTO_JOIN_MAX_ATTEMPTS);
      if (autoJoinStateRef.current.attempts >= AUTO_JOIN_MAX_ATTEMPTS) {
        autoJoinStateRef.current.manualOnly = true;
      }
    }
    autoJoinStateRef.current.attempted = shouldRetryAuto ? false : true;
    setCanRetryJoin((!intentional && !autoJoin) || manualOnly);
    if (manualOnly) {
      autoJoinStateRef.current.manualOnly = true;
    }
    disconnectIntentRef.current = { intentional: false, allowReconnect: false };
    setAudioEnabled(false);
    setVideoEnabled(false);
    setLocalTracksReady(false);
    onDisconnected?.(error);
  }, [autoJoin, onDisconnected]);

  const setupRoomEventListeners = useCallback((room) => {
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);
    room.on('disconnected', handleRoomDisconnected);

    room.participants.forEach(participant => {
      participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
          handleTrackSubscribed(publication.track, participant);
        }
      });

      participant.on('trackSubscribed', (track) => handleTrackSubscribed(track, participant));
      participant.on('trackUnsubscribed', (track) => handleTrackUnsubscribed(track, participant));
    });
  }, [handleParticipantConnected, handleParticipantDisconnected, handleRoomDisconnected, handleTrackSubscribed, handleTrackUnsubscribed]);

  const joinRoom = useCallback(async (options = {}) => {
    const targetRoomName = (options.roomName ?? roomName).trim();
    const targetIdentity = (options.identity ?? identity).trim();

    if (!targetRoomName) {
      message.warning('กรุณาใส่ชื่อห้อง');
      return;
    }

    if (!targetIdentity) {
      message.warning('กรุณาใส่ชื่อผู้ใช้');
      return;
    }

    if (!canJoin) {
      message.info('ยังไม่พร้อมให้เข้าร่วมห้อง');
      return;
    }
    if (autoJoinStateRef.current.manualOnly && !options.force) {
      setConnectError('การเชื่อมต่อก่อนหน้านี้ล้มเหลว กรุณากดปุ่มเตรียมอุปกรณ์เพื่อลองใหม่');
      setCanRetryJoin(true);
      return;
    }

    disconnectIntentRef.current = { intentional: false, allowReconnect: false };
    setConnectError(null);
    setCanRetryJoin(false);
    if (!options.force && !autoJoinStateRef.current.manualOnly) {
      autoJoinStateRef.current.attempts += 1;
      autoJoinStateRef.current.attempts = Math.min(autoJoinStateRef.current.attempts, AUTO_JOIN_MAX_ATTEMPTS);
    }
    setIsConnecting(true);

    try {
      // Get access token
      const token = await twilioVideoService.getAccessToken(targetIdentity, targetRoomName);
      
      // Join room honoring current toggle states (join with media off by default)
      const room = await twilioVideoService.joinRoom(
        token,
        targetRoomName,
        {
          audio: !!audioEnabled,
          video: videoEnabled ? { width: 640, height: 480 } : false,
        }
      );
      
      // Setup room event listeners
      setupRoomEventListeners(room);
      
      setIsConnected(true);
      setCurrentRoomName(targetRoomName);
      setRoomName(targetRoomName);
      setIdentity(targetIdentity);
      setCanRetryJoin(false);
      autoJoinStateRef.current = {
        ...autoJoinStateRef.current,
        attempted: true,
        attempts: 0,
        manualOnly: false,
      };
      markPreviewShown();
      message.success(`เข้าร่วมห้อง "${targetRoomName}" สำเร็จ`);
      onConnected?.(room);

      // Re-attach local preview into the (possibly) new container in connected layout
      try {
        let videoTrack2 = (twilioVideoService.localTracks || []).find(t => t.kind === 'video');
        if (!videoTrack2 && room?.localParticipant?.videoTracks) {
          const pub = Array.from(room.localParticipant.videoTracks.values())[0];
          videoTrack2 = pub?.track || null;
        }
        if (videoTrack2 && localInlineVideoRef.current && !previewOpen) {
          twilioVideoService.attachTrackToElement(videoTrack2, localInlineVideoRef.current, { isLocal: true });
        }
      } catch (_) {}

      // Handle existing participants
      room.participants.forEach(participant => {
        handleParticipantConnected(participant);
      });

    } catch (error) {
      console.error('Error joining room:', error);
      message.error('ไม่สามารถเข้าร่วมห้องได้: ' + error.message);
      setConnectError(error.message || 'unknown error');
      setCanRetryJoin(true);
      const nextAttempts = Math.min(autoJoinStateRef.current.attempts, AUTO_JOIN_MAX_ATTEMPTS);
      autoJoinStateRef.current = {
        ...autoJoinStateRef.current,
        attempts: nextAttempts,
        manualOnly: options.force ? autoJoinStateRef.current.manualOnly : nextAttempts >= AUTO_JOIN_MAX_ATTEMPTS,
        attempted: options.force
          ? autoJoinStateRef.current.attempted
          : (nextAttempts < AUTO_JOIN_MAX_ATTEMPTS ? false : true),
      };
    } finally {
      setIsConnecting(false);
    }
  }, [handleParticipantConnected, identity, onConnected, roomName, setupRoomEventListeners, canJoin, markPreviewShown, audioEnabled, videoEnabled, previewOpen]);

  const openPreviewModal = useCallback(() => {
    if (!canJoin) {
      message.info('ยังไม่มีห้องให้เข้าร่วม');
      return;
    }
    // Open modal first
    setPreviewOpen(true);
    setConnectError(null);
    setCanRetryJoin(false);
  }, [canJoin]);

  const closePreviewModal = useCallback(() => {
    setPreviewOpen(false);
    setJoinPending(false);
    if (!isConnected) {
      if (audioEnabled) {
        twilioVideoService.toggleAudio(false).catch(() => {});
        setAudioEnabled(false);
      }
      if (videoEnabled) {
        twilioVideoService.toggleVideo(false).catch(() => {});
        setVideoEnabled(false);
        if (localModalVideoRef.current) {
          localModalVideoRef.current.innerHTML = '';
        }
        if (localInlineVideoRef.current) {
          localInlineVideoRef.current.innerHTML = '';
        }
      }
    }
    if (!isConnected) {
      autoJoinStateRef.current.attempted = false;
    }
  }, [audioEnabled, videoEnabled, isConnected]);

  const confirmJoinFromPreview = useCallback(async () => {
    if (!localTracksReady && (audioEnabled || videoEnabled)) {
      try { await setupLocalTracks(); } catch (_) { return; }
    }
    setJoinPending(true);
    try {
      await joinRoom({ roomName: defaultRoomName, identity: defaultIdentity, force: true });
      setPreviewOpen(false);
    } finally {
      setJoinPending(false);
    }
  }, [audioEnabled, videoEnabled, localTracksReady, setupLocalTracks, joinRoom, defaultRoomName, defaultIdentity]);

  const leaveRoom = useCallback(() => {
    // ปิดห้องและอุปกรณ์ทั้งหมดทันทีตามที่ร้องขอ
    disconnectIntentRef.current = { intentional: true, allowReconnect: false };
    try { twilioVideoService.hangupAndReset(); } catch (_) {}
    setIsConnected(false);
    setCurrentRoomName('');
    setParticipants([]);
    remoteVideosRef.current.clear();
    onDisconnected?.();
    setCanRetryJoin(false);
    setConnectError(null);
    autoJoinStateRef.current = { ...autoJoinStateRef.current, attempted: false, attempts: 0, manualOnly: false };
    setAudioEnabled(false);
    setVideoEnabled(false);
    setLocalTracksReady(false);
    
    // Clear remote video containers
    const remoteContainer = document.getElementById('remote-videos-container');
    if (remoteContainer) {
      remoteContainer.innerHTML = '';
    }
    
    message.success('ปิดห้องและอุปกรณ์แล้ว');
  }, [onDisconnected]);

  const toggleAudio = async () => {
    const target = !audioEnabled;
    const ok = await twilioVideoService.toggleAudio(target);
    if (ok) {
      setAudioEnabled(target);
      if (target && !localTracksReady) {
        setLocalTracksReady(true);
      }
      message.info(target ? 'เปิดไมโครโฟน' : 'ปิดไมโครโฟน');
    } else {
      message.error('ไม่สามารถสลับไมโครโฟนได้');
    }
  };

  const toggleVideo = async () => {
    const target = !videoEnabled;
    const ok = await twilioVideoService.toggleVideo(target);
    if (ok) {
      setVideoEnabled(target);
      if (target && !localTracksReady) {
        setLocalTracksReady(true);
      }
      message.info(target ? 'เปิดกล้อง' : 'ปิดกล้อง');
      if (target) {
        const containerRef = previewOpen ? localModalVideoRef : localInlineVideoRef;
        try { attachLocalVideoTo(containerRef); } catch (_) {}
      } else {
        if (localInlineVideoRef.current) {
          localInlineVideoRef.current.innerHTML = '';
        }
        if (localModalVideoRef.current) {
          localModalVideoRef.current.innerHTML = '';
        }
      }
    } else {
      message.error('ไม่สามารถสลับกล้องได้');
    }
  };

  // Click-to-prepare: request camera/mic only when user clicks preview area
  const handlePreviewClick = useCallback(async () => {
    if (!localTracksReady) {
      try { await setupLocalTracks(); } catch (_) {}
    }
  }, [localTracksReady, setupLocalTracks]);

  // Cleanup on unmount only; avoid tying cleanup to isConnected to prevent loops
  useEffect(() => {
    return () => {
      try {
        // Attempt full hangup and device reset on unmount
        twilioVideoService.hangupAndReset();
      } catch (_) {}
    };
  }, []);

  // Detect secure context (HTTPS or localhost)
  useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || window.location.protocol === 'https:');
    setSecureContextIssue(!(isLocalhost || isSecure));
  }, []);

  // Zero-trust: do not auto-request permissions; require explicit user gesture via button
  // However, if tracks already exist in service (prepared externally), reflect that here
  useEffect(() => {
    if (!localTracksReady && Array.isArray(twilioVideoService.localTracks) && twilioVideoService.localTracks.length > 0) {
      const videoTrack = twilioVideoService.localTracks.find(t => t.kind === 'video');
      if (videoTrack && videoEnabled && localInlineVideoRef.current) {
        try { twilioVideoService.attachTrackToElement(videoTrack, localInlineVideoRef.current, { isLocal: true }); } catch (_) {}
      }
      setLocalTracksReady(true);
    }
  }, [localTracksReady, videoEnabled]);

  // When modal opens/closes, (re)attach local preview to appropriate container
  useEffect(() => {
    if (previewOpen) {
      if (videoEnabled && localTracksReady && localModalVideoRef.current) {
        const videoTrack = (twilioVideoService.localTracks || []).find((t) => t.kind === 'video');
        if (videoTrack) {
          try { twilioVideoService.attachTrackToElement(videoTrack, localModalVideoRef.current, { isLocal: true }); } catch (_) {}
        }
      }
    } else {
      if (localInlineVideoRef.current) {
        if (videoEnabled && localTracksReady) {
          const videoTrack = (twilioVideoService.localTracks || []).find((t) => t.kind === 'video');
          if (videoTrack) {
            try { twilioVideoService.attachTrackToElement(videoTrack, localInlineVideoRef.current, { isLocal: true }); } catch (_) {}
          }
        } else {
          localInlineVideoRef.current.innerHTML = '';
        }
      }
    }
  }, [previewOpen, localTracksReady, videoEnabled]);

  useEffect(() => {
    const targetKey = `${defaultRoomName}::${defaultIdentity}`;
    if (autoJoinStateRef.current.key !== targetKey) {
      autoJoinStateRef.current = { ...autoJoinStateRef.current, key: targetKey, attempted: false, attempts: 0, manualOnly: false };
    }

    const { manualOnly, attempts } = autoJoinStateRef.current;
    const shouldAutoJoin = autoJoin
      && canJoin
      && !isConnected
      && !isConnecting
      && defaultRoomName
      && defaultIdentity
      && !autoJoinStateRef.current.attempted
      && !manualOnly
      && attempts < AUTO_JOIN_MAX_ATTEMPTS;

    if (!shouldAutoJoin) return;

    const previewRequired = !skipPreview && !hasShownPreview;
    autoJoinStateRef.current.attempted = true;
    setConnectError(null);

    if (previewRequired) {
      setCanRetryJoin(false);
      setPreviewOpen(true);
      return;
    }

    const attemptJoin = async () => {
      if (!localTracksReady && (audioEnabled || videoEnabled)) {
        const cachedTracks = Array.isArray(twilioVideoService.localTracks) ? twilioVideoService.localTracks : [];
        if (cachedTracks.length === 0) {
          try {
            await setupLocalTracks();
          } catch (_) {
            if (!skipPreview) setPreviewOpen(true);
            return;
          }
        }
      }

      try {
        await joinRoom({ roomName: defaultRoomName, identity: defaultIdentity });
      } catch (err) {
        console.error('Auto join failed:', err);
        setCanRetryJoin(true);
        if (!skipPreview) {
          setPreviewOpen(true);
        } else {
          message.error('ไม่สามารถเชื่อมต่อห้องได้ ลองใหม่อีกครั้ง');
        }
      }
    };

    attemptJoin();
  }, [autoJoin, canJoin, localTracksReady, isConnected, isConnecting, defaultRoomName, defaultIdentity, joinRoom, setupLocalTracks, skipPreview, hasShownPreview]);

  const showEmptyState = !isConnected && !canJoin;

  return (
    <div className="twilio-video-room">
      <div className="room-header">
        <Title level={2}>Twilio Video Call Room</Title>
        {isConnected && (
          <Badge 
            status="success" 
            text={`Connected to: ${currentRoomName}`}
            style={{ fontSize: '16px' }}
          />
        )}
      </div>

      {!isConnected ? (
        showEmptyState ? (
          <Card style={{ maxWidth: 600, margin: '0 auto', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paragraph style={{ margin: 0, textAlign: 'center', color: '#666' }}>
              ยังไม่มีการปรึกษาให้เข้าร่วม กรุณาเริ่มรับเคสหรือรอการเชิญ
            </Paragraph>
          </Card>
        ) : hideJoinForm && autoJoin ? (
          <Card title="เตรียมอุปกรณ์เพื่อเข้าร่วม" style={{ maxWidth: 600, margin: '0 auto' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Paragraph>
                ระบบกำลังเตรียมกล้องและไมโครโฟนให้คุณโดยอัตโนมัติ โปรดรอสักครู่ หากเบราว์เซอร์ถามอนุญาตให้เลือก “Allow” เพื่อใช้งานได้ทันที
              </Paragraph>
              {connectError && (
                <Alert
                  type="error"
                  showIcon
                  message="ไม่สามารถเชื่อมต่อห้องได้"
                  description={connectError}
                />
              )}
              <div
                style={{
                  width: '100%',
                  height: 280,
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#000',
                  position: 'relative'
                }}
              >
                <div ref={localInlineVideoRef} style={{ width: '100%', height: '100%' }} />
                {isConnecting && <Spin style={{ position: 'absolute' }} />}
              </div>
              {secureContextIssue && (
                <Alert
                  type="warning"
                  showIcon
                  message="จำเป็นต้องใช้ HTTPS หรือ localhost"
                  description="เบราว์เซอร์จะบล็อกการใช้งานกล้อง/ไมโครโฟนบน HTTP โปรดเปิดผ่าน https:// หรือใช้งานบน localhost ระหว่างพัฒนา"
                />
              )}
              {!isConnecting && canRetryJoin && (
                <Button
                  type="primary"
                  icon={<VideoCameraOutlined />}
                  onClick={() => joinRoom({ roomName: defaultRoomName, identity: defaultIdentity, force: true })}
                >
                  ลองเชื่อมต่อใหม่
                </Button>
              )}
              {!isConnecting && !previewOpen && !hasShownPreview && (
                <Button onClick={openPreviewModal}>เปิดพรีวิว</Button>
              )}
            </Space>
          </Card>
        ) : (
        <Card title="เข้าร่วมห้อง Video Call" style={{ maxWidth: 600, margin: '0 auto' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {secureContextIssue && (
              <Alert
                type="warning"
                showIcon
                message="จำเป็นต้องใช้ HTTPS หรือ localhost"
                description="เบราว์เซอร์จะบล็อกการใช้งานกล้อง/ไมค์บน HTTP โปรดเปิดผ่าน https:// หรือใช้งานบน localhost ระหว่างพัฒนา"
              />
            )}
            {permissionIssue && (
              <Alert
                type="error"
                showIcon
                message="ไม่ได้รับสิทธิ์ใช้งานกล้อง/ไมโครโฟน"
                description="โปรดกดปุ่มอนุญาตที่ด้านบนของเบราว์เซอร์ หรือไปที่การตั้งค่าเว็บไซต์เพื่ออนุญาต จากนั้นกดปุ่ม เตรียมอุปกรณ์ อีกครั้ง"
                style={{ whiteSpace: 'pre-line' }}
              />
            )}
            {connectError && (
              <Alert
                type="error"
                showIcon
                message="ไม่สามารถเชื่อมต่อห้องได้"
                description={connectError}
              />
            )}

            {/* Clickable minimal preview area */}
            <div
              style={{ width: '100%', height: 280, border: '1px dashed #d9d9d9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative' }}
            >
              <div ref={localInlineVideoRef} style={{ width: '100%', height: '100%' }} />
              {(!localTracksReady || !videoEnabled) && (
                <VideoCameraOutlined style={{ fontSize: 48, color: '#888', position: 'absolute' }} />
              )}
            </div>
            <Space style={{ justifyContent: 'center', width: '100%' }}>
              <Tooltip title={audioEnabled ? 'ปิดไมโครโฟน' : 'เปิดไมโครโฟน'}>
                <Button
                  type={audioEnabled ? 'default' : 'primary'}
                  danger={!audioEnabled}
                  icon={audioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                  onClick={toggleAudio}
                />
              </Tooltip>
              <Tooltip title={videoEnabled ? 'ปิดกล้อง' : 'เปิดกล้อง'}>
                <Button
                  type={videoEnabled ? 'default' : 'primary'}
                  danger={!videoEnabled}
                  icon={videoEnabled ? <VideoCameraOutlined /> : <StopOutlined />}
                  onClick={toggleVideo}
                />
              </Tooltip>
            </Space>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Button
                type="primary"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={openPreviewModal}
                loading={isConnecting || joinPending}
                disabled={isConnecting || joinPending}
              >
                เตรียมอุปกรณ์
              </Button>
            </div>
          </Space>
        </Card>)
      ) : (
        <div className="video-call-interface">
          {/* Control buttons */}
          <div className="control-buttons">
            <Space size="large">
              <Button
                type={audioEnabled ? "default" : "primary"}
                danger={!audioEnabled}
                icon={audioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                onClick={toggleAudio}
                size="large"
              >
                {audioEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
              </Button>
              
              <Button
                type={videoEnabled ? "default" : "primary"}
                danger={!videoEnabled}
                icon={videoEnabled ? <VideoCameraOutlined /> : <StopOutlined />}
                onClick={toggleVideo}
                size="large"
              >
                {videoEnabled ? 'ปิดกล้อง' : 'เปิดกล้อง'}
              </Button>
              
              <Button
                type="primary"
                danger
                icon={<PhoneOutlined />}
                onClick={leaveRoom}
                size="large"
              >
                ออกจากห้อง
              </Button>
            </Space>
          </div>

          {/* Video grid */}
          <div className="video-grid">
            <Row gutter={[16, 16]}>
              {/* Local video */}
              <Col xs={24} sm={12} md={8}>
                <Card 
                  title={`คุณ (${identity})`} 
                  className="video-card local-video"
                  bodyStyle={{ padding: 0 }}
                >
                  <div 
                    ref={localInlineVideoRef} 
                    className="video-container"
                    style={{ 
                      width: '100%', 
                      height: '320px', 
                      backgroundColor: '#000',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 6,
                    }}
                  />
                </Card>
              </Col>

              {/* Remote videos */}
              {participants.map((participant) => (
                <Col xs={24} sm={12} md={8} key={participant.sid}>
                  <Card 
                    title={participant.identity}
                    className="video-card remote-video"
                    bodyStyle={{ padding: 0 }}
                  >
                    <div 
                      id={`participant-${participant.sid}`}
                      className="video-container"
                      style={{ 
                        width: '100%', 
                        height: '320px', 
                        backgroundColor: '#000',
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 6,
                      }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* Participants info */}
          <div className="participants-info">
            <Text>
              ผู้เข้าร่วม: {participants.length + 1} คน
              {participants.length > 0 && (
                <span> ({participants.map(p => p.identity).join(', ')})</span>
              )}
            </Text>
          </div>
        </div>
      )}
      <Modal
        title="พรีวิวอุปกรณ์ก่อนเข้าห้อง"
        open={previewOpen}
        onCancel={closePreviewModal}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ width: '100%', height: 420, background: '#000', borderRadius: 8, position: 'relative' }}>
            <div ref={localModalVideoRef} style={{ width: '100%', height: '100%' }} />
            {!localTracksReady && (
              <div onClick={handlePreviewClick} style={{ cursor: 'pointer', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <VideoCameraAddOutlined style={{ fontSize: 64, color: '#888' }} />
              </div>
            )}
          </div>
          <Space style={{ justifyContent: 'center', width: '100%' }} size="large">
            <Tooltip title={audioEnabled ? 'ปิดไมโครโฟน' : 'เปิดไมโครโฟน'}>
              <Button
                type={audioEnabled ? 'default' : 'primary'}
                danger={!audioEnabled}
                size="large"
                icon={audioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                onClick={toggleAudio}
              >
                {audioEnabled ? 'ไมค์เปิด' : 'ไมค์ปิด'}
              </Button>
            </Tooltip>
            <Tooltip title={videoEnabled ? 'ปิดกล้อง' : 'เปิดกล้อง'}>
              <Button
                type={videoEnabled ? 'default' : 'primary'}
                danger={!videoEnabled}
                size="large"
                icon={videoEnabled ? <VideoCameraOutlined /> : <StopOutlined />}
                onClick={toggleVideo}
              >
                {videoEnabled ? 'กล้องเปิด' : 'กล้องปิด'}
              </Button>
            </Tooltip>
          </Space>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closePreviewModal}>ยกเลิก</Button>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              loading={joinPending}
              disabled={(audioEnabled || videoEnabled) && !localTracksReady}
              onClick={confirmJoinFromPreview}
            >
              เข้าร่วมห้อง
            </Button>
          </div>
        </Space>
      </Modal>
    </div>
  );
}

// Preview Modal: placed after component return
// Note: We place it after component, but conceptually it renders alongside.

/* The Modal is rendered via a portal; we include it here: */
TwilioVideoRoom.ModalContent = null;

export default TwilioVideoRoom;
