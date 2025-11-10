import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE = import.meta?.env?.VITE_BACKEND_URL || "http://localhost:3001";
const AUTH_TOKEN_KEY = "telemedAuthToken";

const getStoredAuthToken = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn("Failed to read auth token from storage", error);
    return null;
  }
};

const persistAuthToken = (token) => {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn("Failed to persist auth token", error);
  }
};

const fetchJson = async (path, options = {}) => {
  const authToken = getStoredAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      persistAuthToken(null);
    }
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      message = payload?.error || payload?.message || message;
    } catch (error) {
      console.warn("Failed to parse auth error payload", error);
    }
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch (error) {
    console.warn("Failed to parse auth response JSON", error);
    return null;
  }
};

export const hydrateAuth = createAsyncThunk(
  "auth/hydrate",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const data = await fetchJson("/api/auth/me", { method: "GET" });
      const authUser = data?.user
        ? {
          id: data.user.user_id || data.user.id,
          email: data.user.email || null,
          ...data.user,
        }
        : null;

      if (authUser?.id) {
        dispatch(fetchAppUser(authUser.id));
      }

      return {
        session: data?.session || (authUser ? {} : null),
        authUser,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to hydrate auth");
    }
  }
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const data = await fetchJson("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data?.token) {
        persistAuthToken(data.token);
      }

      const authUser = data?.user
        ? {
          id: data.user.id || data.user.user_id,
          email: data.user.email || null,
          ...data.user,
        }
        : null;

      if (authUser?.id) {
        await dispatch(fetchAppUser(authUser.id));
      }

      return {
        session: data?.session || null,
        authUser,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to sign in");
    }
  }
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      const data = await fetchJson("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });

      return {
        signupUser: data?.user
          ? {
            id: data.user.id || data.user.user_id,
            email: data.user.email || null,
            ...data.user,
          }
          : null,
        role: data?.role || role || "patient",
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to sign up");
    }
  }
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue }) => {
    try {
      await fetchJson("/api/auth/signout", { method: "POST" });
      persistAuthToken(null);
      return true;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to sign out");
    }
  }
);

export const fetchAppUser = createAsyncThunk(
  "auth/fetchAppUser",
  async (userId, { rejectWithValue }) => {
    if (!userId) {
      return null;
    }
    try {
      const data = await fetchJson(`/api/users/${userId}`, { method: "GET" });
      return data?.user || null;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch user profile");
    }
  }
);

const initialState = {
  authUser: null,
  session: null,
  appUser: null,
  hydrateStatus: "loading",
  authStatus: "idle",
  profileStatus: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuth.pending, (state) => {
        state.hydrateStatus = "loading";
        state.error = null;
      })
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.hydrateStatus = "succeeded";
        state.session = action.payload?.session || null;
        state.authUser = action.payload?.authUser || null;
      })
      .addCase(hydrateAuth.rejected, (state, action) => {
        state.hydrateStatus = "failed";
        state.session = null;
        state.authUser = null;
        state.error = action.payload || action.error?.message || "Failed to hydrate auth";
      })
      .addCase(signIn.pending, (state) => {
        state.authStatus = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.authStatus = "succeeded";
        state.session = action.payload?.session || null;
        state.authUser = action.payload?.authUser || null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.authStatus = "failed";
        state.error = action.payload || action.error?.message || "Failed to sign in";
      })
      .addCase(signUp.pending, (state) => {
        state.authStatus = "loading";
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state) => {
        state.authStatus = "succeeded";
      })
      .addCase(signUp.rejected, (state, action) => {
        state.authStatus = "failed";
        state.error = action.payload || action.error?.message || "Failed to sign up";
      })
      .addCase(signOut.pending, (state) => {
        state.authStatus = "loading";
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.authStatus = "succeeded";
        state.session = null;
        state.authUser = null;
        state.appUser = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.authStatus = "failed";
        state.error = action.payload || action.error?.message || "Failed to sign out";
      })
      .addCase(fetchAppUser.pending, (state) => {
        state.profileStatus = "loading";
        state.error = null;
      })
      .addCase(fetchAppUser.fulfilled, (state, action) => {
        state.profileStatus = "succeeded";
        state.appUser = action.payload || null;
      })
      .addCase(fetchAppUser.rejected, (state, action) => {
        state.profileStatus = "failed";
        state.appUser = null;
        state.error = action.payload || action.error?.message || "Failed to fetch user profile";
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export const selectAuthState = (state) => state.auth || initialState;
export const selectAuthUser = (state) => selectAuthState(state).authUser;
export const selectAuthSession = (state) => selectAuthState(state).session;
export const selectAppUser = (state) => selectAuthState(state).appUser;

export default authSlice.reducer;
