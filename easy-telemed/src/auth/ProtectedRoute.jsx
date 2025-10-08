import React from 'react'
import { Navigate } from 'react-router-dom'
import { useUserAuthSupabase } from '../context/UserAuthContextSupabase'


function ProtectedRoute({ children }) {
  const { user } = useUserAuthSupabase();
  if (!user) {
    return <Navigate to="/" />;
  }
  return children;
}

export default ProtectedRoute;