import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useUserAuthSupabase } from '../context/UserAuthContextSupabase'
import { Spin } from 'antd'

/*
  Usage:
  <ProtectedRoute allowed={["admin","doctor"]} pendingRedirect="/onboarding/doctor" requireVerified>
     <TelemedRoom />
  </ProtectedRoute>

  Roles (convention):
  - admin
  - doctor (approved)
  - doctor_pending (awaiting approval)
  - patient
*/

function ProtectedRoute({ children, allowed, pendingRedirect, requireVerified = false }) {
  const { authUser, role, loadingUser, verify, errorContext, emailVerified } = useUserAuthSupabase();
  const navigate = useNavigate();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Reset render state when auth state changes
    setShouldRender(false);

    // Don't do anything while loading
    if (loadingUser) {
      return;
    }

    console.log("ProtectedRoute check:", { authUser, role, verify, errorContext, emailVerified });

    // Check if user is authenticated first
    console.log("errorContext:",errorContext)
    
    if (!authUser) {
      console.log("errorContext:",errorContext)
      console.log("No authenticated user, redirecting to signin");
      navigate("/signin", { replace: true });
      return;
    }

    // PRIORITY CHECK: Email verification - redirect if email not verified
    if (!emailVerified) {
      console.log("Email not verified, redirecting to verify-email");
      navigate("/verify-email", { replace: true });
      return;
    }

    // Check for email confirmation error (backup check)
    console.log("Error context check:", errorContext.code);
    if (errorContext?.code === "email_not_confirmed") {
      console.log("Email confirmation error, redirecting to verify-email");
      navigate("/verify-email", { replace: true });
      return;
    }

    // Check doctor verification status
    if (role === 'doctor' && verify === false && requireVerified) {
      console.log("Doctor not approved, redirecting to pending page");
      navigate(pendingRedirect || '/onboarding/doctor', { replace: true });
      return;
    }

    // PRIORITY CHECK: Patient verification status - always redirect unverified patients to profile
    if (role === 'patient' && verify !== true ) {
      console.log("Patient not verified, redirecting to profile page");
      const currentPath = window.location.pathname;
      if (currentPath !== '/easy-telemed/profile') {
        navigate('/easy-telemed/profile', { replace: true });
        return;
      }
    }

    // For verified patients with requireVerified flag
    if (role === 'patient' && verify !== true && requireVerified)  {
      console.log("Patient not approved, redirecting to pending page");
      navigate(pendingRedirect || '/easy-telemed/profile', { replace: true });
      return;
    }

    // Check role permissions
    if (allowed && !allowed.includes(role) && role !== 'admin') {
      console.log(`Role ${role} not allowed, redirecting to home`);
      navigate("/easy-telemed/home", { replace: true });
      return;
    }

    // All checks passed, allow rendering
    console.log("All checks passed, rendering protected content");
    setShouldRender(true);
  }, [authUser, role, loadingUser, verify, errorContext, emailVerified, navigate, allowed, requireVerified, pendingRedirect]);

  // Show loading spinner while checking auth
  if (loadingUser || !shouldRender) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '200px',
        padding: '40px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;