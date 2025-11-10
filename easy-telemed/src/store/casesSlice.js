import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// Submit via backend API

const calculateTriageLevel = ({ severity, symptoms_text = "", painLevel }) => {
  const emergencyKeywords = [
    "chest pain",
    "difficulty breathing",
    "severe pain",
    "bleeding",
  ];
  const hasEmergencySymptoms = emergencyKeywords.some((keyword) =>
    (symptoms_text || "").toLowerCase().includes(keyword)
  );
  if (hasEmergencySymptoms || severity === "severe" || (painLevel || 0) >= 8)
    return "urgent";
  if (severity === "moderate" || severity === "medium" || (painLevel || 0) >= 5)
    return "semi_urgent";
  return "standard";
};

// For now, we'll send selectedFiles metadata to backend. If needed, switch to pre-signed URL upload flow later.
const uploadFilesToSupabase = async (_userId, files) => {
  // TODO: replace with signed URL upload flow if direct browser upload is undesired.
  // Temporarily return files as-is; backend route currently just stores metadata.
  return files || [];
};

export const submitPatientCase = createAsyncThunk(
  "cases/submitPatientCase",
  async (
    {
      userId,
      symptomsText,
      severity,
      painLevel,
      duration,
      additionalInfo,
      selectedBodyParts,
      selectedFiles,
      selectedSpecialty,
    },
    { rejectWithValue }
  ) => {
    try {
      // Upload attachments first (if any)
      const uploadedAttachments = await uploadFilesToSupabase(userId, selectedFiles || []);

      // Combine symptoms text
      let combinedSymptoms = symptomsText || "";
      if ((selectedBodyParts || []).length > 0) {
        const painAreasText = `Pain in: ${(selectedBodyParts || []).join(", ")}`;
        if (!combinedSymptoms.toLowerCase().includes("pain in")) {
          combinedSymptoms += combinedSymptoms ? `\n\n${painAreasText}` : painAreasText;
        }
      }
      if (painLevel) combinedSymptoms += `\nPain Level: ${painLevel}/10`;
      if (duration) combinedSymptoms += `\nDuration: ${duration}`;
      if (additionalInfo) combinedSymptoms += `\n\nAdditional Information: ${additionalInfo}`;

      const payload = {
        symptoms_text: (combinedSymptoms || "").trim(),
        severity: severity || "medium",
        triage_level: calculateTriageLevel({ severity, symptoms_text: combinedSymptoms, painLevel }),
        status: "open",
        attachments: uploadedAttachments,
        patient_id: userId,
        requested_specialty: selectedSpecialty?.name || selectedSpecialty?.name_th || null,
        requested_specialty_id: selectedSpecialty?.id || null,
      };

      const base = import.meta.env?.VITE_BACKEND_URL || "http://localhost:3001";
      const resp = await fetch(`${base}/api/cases/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          symptomsText,
          severity,
          painLevel,
          duration,
          additionalInfo,
          selectedBodyParts,
          selectedFiles: uploadedAttachments,
          selectedSpecialty,
        }),
      });
      if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
      const result = await resp.json();
      return { case: result.case || null, uploadedAttachments };
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to submit case");
    }
  }
);

const casesSlice = createSlice({
  name: "cases",
  initialState: {
    submitting: false,
    lastError: null,
    lastCase: null,
  },
  reducers: {
    resetCaseState: (state) => {
      state.submitting = false;
      state.lastError = null;
      state.lastCase = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitPatientCase.pending, (state) => {
        state.submitting = true;
        state.lastError = null;
      })
      .addCase(submitPatientCase.fulfilled, (state, action) => {
        state.submitting = false;
        state.lastError = null;
        state.lastCase = action.payload.case || null;
      })
      .addCase(submitPatientCase.rejected, (state, action) => {
        state.submitting = false;
        state.lastError = action.payload || "Failed to submit case";
      });
  },
});

export const { resetCaseState } = casesSlice.actions;
export default casesSlice.reducer;
