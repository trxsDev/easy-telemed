import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

const notesChannels = new Map();

const ensureEntry = (state, consultationId) => {
  if (!consultationId) return null;
  if (!state.byConsultation[consultationId]) {
    state.byConsultation[consultationId] = {
      notes: [],
      loading: false,
      error: null,
      subscriptionActive: false,
      subscribing: false,
    };
  }
  return state.byConsultation[consultationId];
};

export const fetchNotesByConsultation = createAsyncThunk(
  "telemedNotes/fetchByConsultation",
  async ({ consultationId }, { rejectWithValue }) => {
    if (!consultationId) {
      return rejectWithValue("Consultation ID is required");
    }
    try {
      const { data, error } = await supabase
        .from("doctor_notes")
        .select("note_id, note_text, author_id, created_at")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return { consultationId, notes: data || [] };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load doctor notes");
    }
  }
);

export const addDoctorNote = createAsyncThunk(
  "telemedNotes/addDoctorNote",
  async ({ consultationId, doctorId, noteText }, { rejectWithValue }) => {
    if (!consultationId || !doctorId) {
      return rejectWithValue("Consultation and doctor IDs are required");
    }
    if (!noteText || !noteText.trim()) {
      return rejectWithValue("Note text is required");
    }
    try {
      const { data, error } = await supabase
        .from("doctor_notes")
        .insert({
          consultation_id: consultationId,
          author_id: doctorId,
          note_text: noteText.trim(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { consultationId, note: data };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to add doctor note");
    }
  }
);

export const startNotesSubscription = createAsyncThunk(
  "telemedNotes/startSubscription",
  async ({ consultationId }, { dispatch, rejectWithValue }) => {
    if (!consultationId) {
      return rejectWithValue("Consultation ID is required");
    }
    if (notesChannels.has(consultationId)) {
      return { consultationId, alreadyActive: true };
    }
    try {
      const channel = supabase
        .channel(`doctor-notes:${consultationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "doctor_notes",
            filter: `consultation_id=eq.${consultationId}`,
          },
          (payload) => {
            if (payload?.new) {
              dispatch(noteAdded({ consultationId, note: payload.new }));
            }
          }
        );

      const { error } = await channel.subscribe();
      if (error) {
        throw error;
      }
      notesChannels.set(consultationId, channel);
      return { consultationId };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to subscribe to doctor notes");
    }
  }
);

export const stopNotesSubscription = createAsyncThunk(
  "telemedNotes/stopSubscription",
  async ({ consultationId }, { rejectWithValue }) => {
    if (!consultationId) {
      return rejectWithValue("Consultation ID is required");
    }
    try {
      const channel = notesChannels.get(consultationId);
      if (channel) {
        try {
          await channel.unsubscribe?.();
        } catch (error) {
          console.warn("Failed to unsubscribe from telemed notes channel", error);
        }
        supabase.removeChannel(channel);
        notesChannels.delete(consultationId);
      }
      return { consultationId };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to stop doctor notes subscription");
    }
  }
);

const telemedNotesSlice = createSlice({
  name: "telemedNotes",
  initialState: {
    byConsultation: {},
  },
  reducers: {
    noteAdded: (state, action) => {
      const { consultationId, note } = action.payload || {};
      const entry = ensureEntry(state, consultationId);
      if (!entry || !note) {
        return;
      }
      const exists = entry.notes.some((n) => n?.note_id === note.note_id);
      if (!exists) {
        entry.notes = [note, ...entry.notes];
      }
    },
    clearNotesState: (state, action) => {
      const consultationId = action.payload?.consultationId;
      if (consultationId && state.byConsultation[consultationId]) {
        delete state.byConsultation[consultationId];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotesByConsultation.pending, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.loading = true;
        entry.error = null;
      })
      .addCase(fetchNotesByConsultation.fulfilled, (state, action) => {
        const { consultationId, notes } = action.payload || {};
        const entry = ensureEntry(state, consultationId);
        if (!entry) return;
        entry.loading = false;
        entry.error = null;
        entry.notes = Array.isArray(notes) ? notes : [];
      })
      .addCase(fetchNotesByConsultation.rejected, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.loading = false;
        entry.error = action.payload || action.error?.message || "Failed to load doctor notes";
      })
      .addCase(addDoctorNote.pending, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.error = null;
      })
      .addCase(addDoctorNote.fulfilled, (state, action) => {
        const { consultationId, note } = action.payload || {};
        const entry = ensureEntry(state, consultationId);
        if (!entry || !note) return;
        entry.notes = [note, ...entry.notes.filter((n) => n?.note_id !== note.note_id)];
      })
      .addCase(addDoctorNote.rejected, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.error = action.payload || action.error?.message || "Failed to add doctor note";
      })
      .addCase(startNotesSubscription.pending, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.subscribing = true;
        entry.error = null;
      })
      .addCase(startNotesSubscription.fulfilled, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.subscribing = false;
        if (!action.payload?.alreadyActive) {
          entry.subscriptionActive = true;
        }
      })
      .addCase(startNotesSubscription.rejected, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.subscribing = false;
        entry.error = action.payload || action.error?.message || "Failed to subscribe to doctor notes";
      })
      .addCase(stopNotesSubscription.fulfilled, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg?.consultationId);
        if (!entry) return;
        entry.subscriptionActive = false;
        entry.subscribing = false;
      });
  },
});

export const { noteAdded, clearNotesState } = telemedNotesSlice.actions;

export const selectTelemedNotesState = (state) => state.telemedNotes || { byConsultation: {} };
export const selectTelemedNotesByConsultation = (state, consultationId) => {
  const notesState = selectTelemedNotesState(state);
  return (
    notesState.byConsultation?.[consultationId] || {
      notes: [],
      loading: false,
      error: null,
      subscriptionActive: false,
      subscribing: false,
    }
  );
};

export default telemedNotesSlice.reducer;
