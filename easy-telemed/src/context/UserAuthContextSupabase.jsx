import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  hydrateAuth,
  signIn as signInThunk,
  signUp as signUpThunk,
  signOut as signOutThunk,
  fetchAppUser,
  selectAuthState,
  selectAuthUser,
  selectAppUser,
  selectAuthSession,
} from "../store/authSlice";

const UserAuthContextSupabase = createContext();

export function UserAuthContextSupabaseProvider({children}) {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuthState);
  const authUser = useSelector(selectAuthUser);
  const session = useSelector(selectAuthSession);
  const user = useSelector(selectAppUser);
  const [errorContext, setErrorContext] = useState({});

  const loadingUser = useMemo(() => {
    const hydrateLoading = authState.hydrateStatus === "loading" || authState.hydrateStatus === "idle";
    const profileLoading = authState.profileStatus === "loading";
    return hydrateLoading || profileLoading;
  }, [authState.hydrateStatus, authState.profileStatus]);

  useEffect(() => {
    dispatch(hydrateAuth());
  }, [dispatch]);

  const signIn = useCallback(
    async (email, password) => {
      const result = await dispatch(signInThunk({ email, password })).unwrap();
      return result;
    },
    [dispatch]
  );

  const signUp = useCallback(
    async (email, password, role) => {
      const result = await dispatch(signUpThunk({ email, password, role })).unwrap();
      return result;
    },
    [dispatch]
  );

  const logOut = useCallback(async () => {
    await dispatch(signOutThunk()).unwrap();
  }, [dispatch]);

  const refreshProfile = useCallback(() => {
    const authId = authUser?.id || authUser?.user_id;
    if (!authId) {
      return Promise.resolve();
    }
    return dispatch(fetchAppUser(authId)).unwrap();
  }, [dispatch, authUser?.id, authUser?.user_id]);

  const contextValue = useMemo(
    () => ({
      user: user ? { ...user, role: user.role || "patient" } : null,
      authUser,
      role: user?.role || "guest",
      loadingUser,
      verify: user?.verify,
      errorContext,
      emailVerified: !!user?.email_confirmed_at,
      signIn,
      signUp,
      logOut,
      session,
      refreshProfile,
      setErrorContext,
    }),
    [user, authUser, loadingUser, errorContext, signIn, signUp, logOut, session, refreshProfile]
  );

  return <UserAuthContextSupabase.Provider value={contextValue}>{children}</UserAuthContextSupabase.Provider>;
}

export const useUserAuthSupabase = () => {
    return useContext(UserAuthContextSupabase);
}
