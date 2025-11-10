import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

const fallbackChannels = new Map();

export const uploadChatAttachment = createAsyncThunk(
  "telemedChat/uploadAttachment",
  async ({ consultationId, file }, { rejectWithValue }) => {
    if (!consultationId) {
      return rejectWithValue("Consultation ID is required for attachment upload");
    }
    if (!file) {
      return rejectWithValue("File is required for attachment upload");
    }
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      const storagePath = `chat/${consultationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData, error: urlError } = supabase.storage
        .from("attachments")
        .getPublicUrl(storagePath);

      if (urlError) {
        throw urlError;
      }

      return {
        consultationId,
        storagePath,
        fileName: file.name,
        publicUrl: urlData?.publicUrl,
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to upload chat attachment");
    }
  }
);

export const startChatFallbackSubscription = createAsyncThunk(
  "telemedChat/startFallbackSubscription",
  async ({ consultationId, threadId }, { dispatch, rejectWithValue }) => {
    if (!threadId) {
      return { consultationId, threadId, skipped: true };
    }
    if (fallbackChannels.has(threadId)) {
      return { consultationId, threadId, alreadyActive: true };
    }
    try {
      const channel = supabase
        .channel(`chat-thread:${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            if (payload?.new) {
              dispatch({
                type: "telemedChat/chatMessageReceived",
                payload: { consultationId, message: payload.new },
              });
            }
          }
        );

      const { error: subscribeError } = await channel.subscribe();
      if (subscribeError) {
        throw subscribeError;
      }
      fallbackChannels.set(threadId, channel);
      return { consultationId, threadId };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to subscribe to chat fallback");
    }
  }
);

export const stopChatFallbackSubscription = createAsyncThunk(
  "telemedChat/stopFallbackSubscription",
  async ({ consultationId, threadId }, { rejectWithValue }) => {
    if (!threadId) {
      return { consultationId, threadId, skipped: true };
    }
    try {
      const channel = fallbackChannels.get(threadId);
      if (channel) {
        try {
          await channel.unsubscribe?.();
        } catch (_) {
          // Some clients may not support unsubscribe, fall back to removeChannel
        }
        supabase.removeChannel(channel);
        fallbackChannels.delete(threadId);
      }
      return { consultationId, threadId };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to stop chat fallback");
    }
  }
);

const ensureConsultationEntry = (state, consultationId) => {
  if (!consultationId) {
    return null;
  }
  if (!state.consultations[consultationId]) {
    state.consultations[consultationId] = {
      thread: null,
      messages: [],
      fallbackActive: false,
      fallbackSubscribing: false,
      fallbackError: null,
    };
  }
  return state.consultations[consultationId];
};

const telemedChatSlice = createSlice({
  name: "telemedChat",
  initialState: {
    consultations: {},
    uploadStatus: {},
  },
  reducers: {
    initialiseChatSession: (state, action) => {
      ensureConsultationEntry(state, action.payload?.consultationId);
    },
    clearChatSession: (state, action) => {
      const consultationId = action.payload?.consultationId;
      if (!consultationId) {
        return;
      }
      if (state.consultations[consultationId]) {
        delete state.consultations[consultationId];
      }
      if (state.uploadStatus[consultationId]) {
        delete state.uploadStatus[consultationId];
      }
    },
    chatHistoryLoaded: (state, action) => {
      const { consultationId, thread, messages = [] } = action.payload || {};
      const entry = ensureConsultationEntry(state, consultationId);
      if (!entry) return;
      entry.thread = thread || null;
      entry.messages = messages.filter(Boolean);
    },
    chatMessageOptimisticAdded: (state, action) => {
      const { consultationId, message } = action.payload || {};
      const entry = ensureConsultationEntry(state, consultationId);
      if (!entry || !message) return;
      entry.messages.push(message);
    },
    chatMessageReceived: (state, action) => {
      const { consultationId, message } = action.payload || {};
      const entry = ensureConsultationEntry(state, consultationId);
      if (!entry || !message) return;
      entry.messages = entry.messages.filter((existing) => {
        if (!existing) return false;
        const messageId = String(existing.message_id || "");
        if (!messageId.startsWith("temp-")) {
          return true;
        }
        return !(
          existing.sender_id === message.sender_id &&
          existing.type === message.type &&
          existing.content === message.content &&
          existing.file_url === message.file_url
        );
      });
      entry.messages.push(message);
      if (message?.thread_id && (!entry.thread || entry.thread?.thread_id !== message.thread_id)) {
        entry.thread = entry.thread
          ? { ...entry.thread, thread_id: message.thread_id }
          : { thread_id: message.thread_id };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadChatAttachment.pending, (state, action) => {
        const consultationId = action.meta.arg?.consultationId;
        if (!consultationId) return;
        state.uploadStatus[consultationId] = {
          uploading: true,
          error: null,
        };
      })
      .addCase(uploadChatAttachment.fulfilled, (state, action) => {
        const consultationId = action.payload?.consultationId;
        if (!consultationId) return;
        state.uploadStatus[consultationId] = {
          uploading: false,
          error: null,
        };
      })
      .addCase(uploadChatAttachment.rejected, (state, action) => {
        const consultationId = action.meta.arg?.consultationId;
        if (!consultationId) return;
        state.uploadStatus[consultationId] = {
          uploading: false,
          error: action.payload || "Failed to upload chat attachment",
        };
      })
      .addCase(startChatFallbackSubscription.pending, (state, action) => {
        const consultationId = action.meta.arg?.consultationId;
        const entry = ensureConsultationEntry(state, consultationId);
        if (!entry) return;
        entry.fallbackSubscribing = true;
        entry.fallbackError = null;
      })
      .addCase(startChatFallbackSubscription.fulfilled, (state, action) => {
        const consultationId = action.meta.arg?.consultationId;
        const entry = ensureConsultationEntry(state, consultationId);
        if (!entry) return;
        entry.fallbackSubscribing = false;
        if (!action.payload?.skipped) {
          entry.fallbackActive = true;
        }
      })
      .addCase(startChatFallbackSubscription.rejected, (state, action) => {
        const consultationId = action.meta.arg?.consultationId;
        const entry = ensureConsultationEntry(state, consultationId);
        if (!entry) return;
        entry.fallbackSubscribing = false;
        entry.fallbackError = action.payload || "Failed to subscribe to chat fallback";
      })
      .addCase(stopChatFallbackSubscription.fulfilled, (state, action) => {
        const consultationId = action.meta.arg?.consultationId;
        const entry = ensureConsultationEntry(state, consultationId);
        if (!entry) return;
        entry.fallbackActive = false;
      });
  },
});

export const {
  initialiseChatSession,
  clearChatSession,
  chatHistoryLoaded,
  chatMessageOptimisticAdded,
  chatMessageReceived,
} = telemedChatSlice.actions;

export const selectTelemedChatState = (state) => state.telemedChat || {};
export const selectTelemedChatByConsultation = (state, consultationId) => {
  const chatState = state.telemedChat || {};
  return {
    ...(chatState.consultations?.[consultationId] || {
      thread: null,
      messages: [],
      fallbackActive: false,
      fallbackSubscribing: false,
      fallbackError: null,
    }),
    uploadStatus: chatState.uploadStatus?.[consultationId] || {
      uploading: false,
      error: null,
    },
  };
};

export default telemedChatSlice.reducer;
