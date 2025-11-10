import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "../api/SupabaseClient";

export const assignUserRole = createAsyncThunk(
  "adminUsers/assignUserRole",
  async ({ userId, role, verify }, { rejectWithValue }) => {
    if (!userId) {
      return rejectWithValue("userId is required");
    }
    try {
      const payload = {
        user_id: userId,
        role: role || "patient",
        verify: verify ?? false,
      };
      const { data, error } = await supabase
        .from("app_users")
        .upsert([payload], { onConflict: "user_id" })
        .select()
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data || payload;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to assign user role");
    }
  }
);

const adminUsersSlice = createSlice({
  name: "adminUsers",
  initialState: {
    assigning: false,
    assignError: null,
  },
  reducers: {
    resetAdminUsers(state) {
      state.assigning = false;
      state.assignError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(assignUserRole.pending, (state) => {
        state.assigning = true;
        state.assignError = null;
      })
      .addCase(assignUserRole.fulfilled, (state) => {
        state.assigning = false;
        state.assignError = null;
      })
      .addCase(assignUserRole.rejected, (state, action) => {
        state.assigning = false;
        state.assignError = action.payload || "Failed to assign user role";
      });
  },
});

export const { resetAdminUsers } = adminUsersSlice.actions;
export default adminUsersSlice.reducer;
