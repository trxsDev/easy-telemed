import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

const AVAILABILITY_COLUMN = "availability_schedule";

const normalizeScheduleValue = (rawSchedule) => {
  if (!rawSchedule) return null;

  if (typeof rawSchedule === "string") {
    try {
      return JSON.parse(rawSchedule);
    } catch (error) {
      console.warn("Failed to parse availability_schedule JSON", error);
      return null;
    }
  }

  if (Array.isArray(rawSchedule)) return rawSchedule;
  if (typeof rawSchedule === "object") return rawSchedule;

  return null;
};

const ensureDoctorProfileFromApplication = async (doctorId) => {
  if (!doctorId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("doctor_profiles")
    .select("user_id, specialties, hospital, license_no")
    .eq("user_id", doctorId)
    .maybeSingle();

  if (profileError) {
    console.warn("Failed to fetch doctor profile", profileError);
  }

  const needsProfile = !profile;

  const { data: application, error: applicationError } = await supabase
    .from("provider_applications")
    .select("specialties, hospital, license_no")
    .eq("applicant_user_id", doctorId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (applicationError) {
    console.warn("Failed to fetch provider application", applicationError);
    return profile ?? null;
  }

  if (!application) return profile ?? null;

  const payload = {
    specialties: application.specialties ?? profile?.specialties ?? null,
    hospital: application.hospital ?? profile?.hospital ?? null,
    license_no: application.license_no ?? profile?.license_no ?? null,
  };

  if (needsProfile) {
    const { data: inserted, error: insertError } = await supabase
      .from("doctor_profiles")
      .insert({ user_id: doctorId, ...payload })
      .select("user_id, specialties, hospital, license_no")
      .maybeSingle();

    if (insertError) {
      console.warn("Failed to create doctor profile", insertError);
      return profile ?? null;
    }

    return inserted;
  }

  const { specialties, hospital, license_no } = profile;
  const shouldUpdate =
    payload.specialties !== specialties ||
    payload.hospital !== hospital ||
    payload.license_no !== license_no;

  if (!shouldUpdate) return profile;

  const { data: updated, error: updateError } = await supabase
    .from("doctor_profiles")
    .update(payload)
    .eq("user_id", doctorId)
    .select("user_id, specialties, hospital, license_no")
    .maybeSingle();

  if (updateError) {
    console.warn("Failed to update doctor profile", updateError);
    return profile;
  }

  return updated;
};

export const fetchDoctorSchedule = createAsyncThunk(
  "doctorSchedule/fetchDoctorSchedule",
  async (doctorId, { rejectWithValue }) => {
    if (!doctorId) {
      return rejectWithValue("doctorId is required to fetch schedule");
    }

    try {
      const { data, error } = await supabase
        .from("doctor_status")
        .select(`doctor_id, is_active, ${AVAILABILITY_COLUMN}`)
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          doctor_id: doctorId,
          is_active: false,
          availability: null,
        };
      }

      return {
        doctor_id: data.doctor_id,
        is_active: Boolean(data.is_active),
        availability: normalizeScheduleValue(data[AVAILABILITY_COLUMN]),
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load doctor schedule");
    }
  }
);

export const upsertDoctorSchedule = createAsyncThunk(
  "doctorSchedule/upsertDoctorSchedule",
  async ({ doctorId, isActive, availability }, { rejectWithValue }) => {
    if (!doctorId) {
      return rejectWithValue("doctorId is required to upsert schedule");
    }

    try {
      const payload = {
        doctor_id: doctorId,
        is_active: Boolean(isActive),
        updated_at: new Date().toISOString(),
        [AVAILABILITY_COLUMN]: availability || null,
      };

      const selectColumns = `doctor_id, is_active, ${AVAILABILITY_COLUMN}`;

      const { data: updatedData, error: updateError } = await supabase
        .from("doctor_status")
        .update(payload)
        .eq("doctor_id", doctorId)
        .select(selectColumns)
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      let result = updatedData;

      if (!updatedData) {
        const insertPayload = {
          ...payload,
          created_at: new Date().toISOString(),
        };

        const { data: insertedData, error: insertError } = await supabase
          .from("doctor_status")
          .insert(insertPayload)
          .select(selectColumns)
          .maybeSingle();

        if (insertError) {
          throw insertError;
        }
        result = insertedData;
      }

      await ensureDoctorProfileFromApplication(doctorId);

      return {
        doctor_id: result.doctor_id,
        is_active: Boolean(result.is_active),
        availability: normalizeScheduleValue(result[AVAILABILITY_COLUMN]),
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to save doctor schedule");
    }
  }
);

const initialState = {
  schedule: null,
  loading: false,
  saving: false,
  error: null,
  lastUpdated: null,
};

const doctorScheduleSlice = createSlice({
  name: "doctorSchedule",
  initialState,
  reducers: {
    resetDoctorScheduleState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctorSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedule = action.payload;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchDoctorSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load doctor schedule";
      })
      .addCase(upsertDoctorSchedule.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(upsertDoctorSchedule.fulfilled, (state, action) => {
        state.saving = false;
        state.schedule = action.payload;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(upsertDoctorSchedule.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to save doctor schedule";
      });
  },
});

export const { resetDoctorScheduleState } = doctorScheduleSlice.actions;

export const selectDoctorScheduleState = (state) => state.doctorSchedule;
export const selectDoctorSchedule = (state) => state.doctorSchedule.schedule;

export default doctorScheduleSlice.reducer;
