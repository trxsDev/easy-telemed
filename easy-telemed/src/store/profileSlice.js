import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

const fetchPatientProfileFromSupabase = async (userId) => {
  const { data, error } = await supabase
    .from("patient_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || {};
};

const fetchDoctorProfileFromSupabase = async (userId) => {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    return {
      license_no: "",
      hospital: "",
      country: "",
      specialties: [],
      updated_at: null,
    };
  }

  const specialties = Array.isArray(data?.specialties)
    ? data.specialties
    : Array.isArray(data?.specialties?.value)
    ? data.specialties.value
    : [];

  return {
    ...data,
    specialties,
  };
};

export const fetchPatientProfile = createAsyncThunk(
  "profile/fetchPatientProfile",
  async (userId, { rejectWithValue }) => {
    try {
      const data = await fetchPatientProfileFromSupabase(userId);
      return data;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load patient profile");
    }
  }
);

export const fetchDoctorProfile = createAsyncThunk(
  "profile/fetchDoctorProfile",
  async (userId, { rejectWithValue }) => {
    try {
      const data = await fetchDoctorProfileFromSupabase(userId);
      return data;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load doctor profile");
    }
  }
);

export const updatePatientProfile = createAsyncThunk(
  "profile/updatePatientProfile",
  async ({ userId, formData, user }, { rejectWithValue }) => {
    try {
      const payload = {
        ...formData,
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("patient_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      const displayName = `${formData.fname || ""} ${formData.lname || ""}`.trim();

      const { error: updateError } = await supabase
        .from("app_users")
        .update({
          display_name: displayName || user?.display_name || user?.email,
          phone: formData.phone || user?.phone,
          verify: true,
          verified_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }

      return data || payload;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to update patient profile");
    }
  }
);

export const updateDoctorProfile = createAsyncThunk(
  "profile/updateDoctorProfile",
  async ({ userId, formValues, user }, { rejectWithValue }) => {
    try {
      const payload = {
        user_id: userId,
        license_no: formValues.license_no,
        hospital: formValues.hospital || null,
        country: formValues.country || null,
        specialties: formValues.specialties || [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("doctor_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      const { error: updateError } = await supabase
        .from("app_users")
        .update({
          display_name: formValues.display_name || user?.display_name || user?.email,
          verify: true,
          verified_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }

      return data || payload;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to update doctor profile");
    }
  }
);

const initialState = {
  patient: null,
  doctor: null,
  loadingPatient: false,
  loadingDoctor: false,
  updatingPatient: false,
  updatingDoctor: false,
  patientError: null,
  doctorError: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    resetProfileState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientProfile.pending, (state) => {
        state.loadingPatient = true;
        state.patientError = null;
      })
      .addCase(fetchPatientProfile.fulfilled, (state, action) => {
        state.loadingPatient = false;
        state.patient = action.payload || {};
        state.patientError = null;
      })
      .addCase(fetchPatientProfile.rejected, (state, action) => {
        state.loadingPatient = false;
        state.patientError = action.payload || "Failed to load patient profile";
      })
      .addCase(fetchDoctorProfile.pending, (state) => {
        state.loadingDoctor = true;
        state.doctorError = null;
      })
      .addCase(fetchDoctorProfile.fulfilled, (state, action) => {
        state.loadingDoctor = false;
        state.doctor = action.payload || {};
        state.doctorError = null;
      })
      .addCase(fetchDoctorProfile.rejected, (state, action) => {
        state.loadingDoctor = false;
        state.doctorError = action.payload || "Failed to load doctor profile";
      })
      .addCase(updatePatientProfile.pending, (state) => {
        state.updatingPatient = true;
        state.patientError = null;
      })
      .addCase(updatePatientProfile.fulfilled, (state, action) => {
        state.updatingPatient = false;
        state.patient = action.payload || state.patient;
        state.patientError = null;
      })
      .addCase(updatePatientProfile.rejected, (state, action) => {
        state.updatingPatient = false;
        state.patientError = action.payload || "Failed to update patient profile";
      })
      .addCase(updateDoctorProfile.pending, (state) => {
        state.updatingDoctor = true;
        state.doctorError = null;
      })
      .addCase(updateDoctorProfile.fulfilled, (state, action) => {
        state.updatingDoctor = false;
        state.doctor = action.payload || state.doctor;
        state.doctorError = null;
      })
      .addCase(updateDoctorProfile.rejected, (state, action) => {
        state.updatingDoctor = false;
        state.doctorError = action.payload || "Failed to update doctor profile";
      });
  },
});

export const { resetProfileState } = profileSlice.actions;

export const selectPatientProfile = (state) => state.profile.patient;
export const selectDoctorProfile = (state) => state.profile.doctor;
export const selectProfileLoading = (state) => ({
  loadingPatient: state.profile.loadingPatient,
  loadingDoctor: state.profile.loadingDoctor,
  updatingPatient: state.profile.updatingPatient,
  updatingDoctor: state.profile.updatingDoctor,
});
export const selectProfileErrors = (state) => ({
  patientError: state.profile.patientError,
  doctorError: state.profile.doctorError,
});

export default profileSlice.reducer;
