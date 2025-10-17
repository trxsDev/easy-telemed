/* eslint-env node */
const jwt = require('jsonwebtoken');
const { supabase } = require('./supabase');
let ioInstance = null;
const userSockets = new Map(); // userId -> Set<socketId>
const roomByThread = new Map(); // threadId -> room name

function initSocket(server) {
  if (ioInstance) return ioInstance;
  // Lazy require to avoid dep if not installed
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
  });
  ioInstance = io;

  io.on('connection', (socket) => {
    // Optional: verify token if provided
    const token = socket.handshake?.auth?.token || null;
    let authUser = null;
    if (token && process.env.APP_JWT_SECRET) {
      try {
        authUser = jwt.verify(token, process.env.APP_JWT_SECRET);
      } catch (_) {}
    }

    const register = ({ userId, role }) => {
      if (!userId) return;
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);
      socket.data.userId = userId;
      socket.data.role = role || authUser?.role || 'guest';
      // eslint-disable-next-line no-console
      console.log('[socket] registered', { userId, role: socket.data.role, sid: socket.id });
    };

    socket.on('register', register);

    // Relay doctor invitation to specific patient
    socket.on('doctor:ready', async (payload = {}) => {
      try {
        // Only allow doctors (best-effort; registration sets role)
        const role = socket.data?.role || 'guest';
        if (role !== 'doctor') {
          return; // ignore non-doctor sources
        }
        let patientId = payload?.patientId || payload?.consultation?.patient_id || null;
        const caseId = payload?.caseId || payload?.consultation?.case_id || null;
        if (!patientId && caseId) {
          try {
            const { data: caseRow } = await supabase
              .from('patient_cases')
              .select('patient_id')
              .eq('case_id', caseId)
              .maybeSingle();
            patientId = caseRow?.patient_id || null;
          } catch (_) {}
        }
        if (!patientId) return;
  const ok = emitToUser(patientId, 'doctor:ready', payload);
  // eslint-disable-next-line no-console
  console.log('[socket] relay doctor:ready', { from: socket.data?.userId, to: patientId, ok });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('doctor:ready relay failed', e?.message || e);
      }
    });

    // Chat: join a consultation thread room and receive history
    socket.on('chat:join', async (payload = {}) => {
      try {
        const userId = socket.data?.userId;
        const { consultationId } = payload || {};
        if (!userId || !consultationId) return;
        // Ensure thread exists
        let threadRow = null;
        try {
          const { data } = await supabase
            .from('chat_threads')
            .select('*')
            .eq('consultation_id', consultationId)
            .maybeSingle();
          threadRow = data || null;
        } catch (_) {}
        if (!threadRow) {
          const { data: created } = await supabase
            .from('chat_threads')
            .insert({ consultation_id: consultationId })
            .select('*')
            .single();
          threadRow = created;
        }
        if (!threadRow) return;
        const room = roomByThread.get(threadRow.thread_id) || `chat:${threadRow.thread_id}`;
        roomByThread.set(threadRow.thread_id, room);
        socket.join(room);
        // Fetch recent messages
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('message_id, sender_id, type, content, file_url, created_at')
          .eq('thread_id', threadRow.thread_id)
          .order('created_at', { ascending: true });
        socket.emit('chat:history', { thread: { thread_id: threadRow.thread_id, consultation_id: consultationId }, messages: messages || [] });
        // eslint-disable-next-line no-console
        console.log('[socket] chat:join', { userId, consultationId, thread: threadRow.thread_id, room });
      } catch (e) {
        console.warn('chat:join failed', e?.message || e);
      }
    });

    // Chat: send a message to the thread room
    socket.on('chat:send', async (payload = {}) => {
      try {
        const senderId = socket.data?.userId;
        const { threadId, consultationId, type = 'text', content = '', file_url = null } = payload;
        if (!senderId || !(threadId || consultationId)) return;
        let useThreadId = threadId;
        if (!useThreadId && consultationId) {
          const { data: row } = await supabase
            .from('chat_threads')
            .select('thread_id')
            .eq('consultation_id', consultationId)
            .maybeSingle();
          useThreadId = row?.thread_id;
        }
        if (!useThreadId) return;
        const insertPayload = { thread_id: useThreadId, sender_id: senderId, type, content: content || null, file_url };
        const { data: inserted, error: insertError } = await supabase
          .from('chat_messages')
          .insert(insertPayload)
          .select('message_id, sender_id, type, content, file_url, created_at, thread_id')
          .maybeSingle();
        if (insertError) {
          // eslint-disable-next-line no-console
          console.error('[socket] chat:send insert error', insertError, { insertPayload });
        }
        const room = roomByThread.get(useThreadId) || `chat:${useThreadId}`;
        roomByThread.set(useThreadId, room);
        try { socket.join(room); } catch (_) {}
        // Log inserted message for debug
        // eslint-disable-next-line no-console
        console.log('[socket] chat:send inserted', inserted);
        if (inserted) {
          socket.emit('chat:message', inserted);
          io.to(room).emit('chat:message', inserted);
        }
      } catch (e) {
        console.warn('chat:send failed', e?.message || e);
      }
    });

    socket.on('disconnect', () => {
      const uid = socket.data?.userId;
      if (uid && userSockets.has(uid)) {
        const set = userSockets.get(uid);
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(uid);
      }
    });
  });

  return io;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return false;
  const ids = userSockets.get(userId);
  if (!ids || ids.size === 0) return false;
  ids.forEach((sid) => ioInstance.to(sid).emit(event, payload));
  return true;
}

module.exports = { initSocket, getIO, emitToUser };