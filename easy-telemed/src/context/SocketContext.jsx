import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { connectSocket } from "../../socket";
import { useUserAuthSupabase } from "./UserAuthContextSupabase.jsx";

const SocketContext = createContext({
  socket: null,
  connected: false,
  emit: () => {},
});

export const SocketProvider = ({ children }) => {
  const { session, user, role } = useUserAuthSupabase();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const effectiveRole = useMemo(() => role || user?.role || "guest", [role, user?.role]);

  useEffect(() => {
    const hasAuth = Boolean(session?.access_token) || Boolean(user?.user_id);
    if (hasAuth || !socket) {
      return;
    }
    try {
      socket.disconnect();
    } catch (error) {
      console.warn("Failed to disconnect existing socket session", error);
    }
    setSocket(null);
    setConnected(false);
  }, [session?.access_token, user?.user_id, socket]);

  useEffect(() => {
    const idToken = session?.access_token;
    const shouldConnect = Boolean(idToken) || Boolean(user?.user_id);
    if (!shouldConnect) {
      return;
    }

    const newSocket = connectSocket(idToken);
    setSocket(newSocket);

    const handleConnect = () => {
      setConnected(true);
      try {
        newSocket.emit("register", {
          userId: user?.user_id,
          role: effectiveRole,
        });
        // eslint-disable-next-line no-console
        console.log('[socket] client connected and registered', { userId: user?.user_id, role: effectiveRole });
      } catch (err) {
        console.error("Failed to register socket user", err);
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [session?.access_token, user?.user_id, effectiveRole]);

  const emit = useCallback(
    (event, payload) => {
      if (!socket) return;
      try {
        socket.emit(event, payload);
      } catch (err) {
        console.error("Socket emit error", err);
      }
    },
    [socket]
  );

  const value = useMemo(
    () => ({
      socket,
      connected,
      emit,
    }),
    [socket, connected, emit]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
