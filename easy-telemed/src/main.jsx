import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// NOTE: filename is 'UserAuthContext.jsx' (capital U) - fix casing for case-sensitive builds
import { UserAuthContextSupabaseProvider } from "./context/UserAuthContextSupabase.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./Layout.jsx";
import SignIn from "./container/SignIn";
import SignUp from "./container/SignUp";
import Home from "./container/Home.jsx";
import TelemedRoom from "./container/TelemedRoom";
import Register from "./container/Register";
import DoctorRegister from "./container/DoctorRegister";
import DoctorPending from "./container/Onboarding/DoctorPending.jsx";
import UserDashboard from "./container/UserDashboad";
import PatientOnCase from "./container/PateintOnCase";
import Profile from "./container/Profile";
import PendingEmail from "./container/PendingEmail";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import "./i18n"; // import i18n (needs to be bundled)

const router = createBrowserRouter([
  // กลุ่มที่ไม่ต้องล็อกอิน
  { path: "/", element: <App /> },
  { path: "/signin", element: <SignIn /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/doctor-register", element: <DoctorRegister /> },
  {
    path: "/verify-email",
    element: <PendingEmail />
  },
  // กลุ่มที่มี Layout ครอบ
  {
    path: "/easy-telemed/",
    element: <Layout />,
    children: [
      {
        path: "home",
        element: (
          <ProtectedRoute
            allowed={["admin", "doctor", "patient"]}
            requireVerified
            pendingRedirect="/easy-telemed/onboarding/doctor"
          >
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: "telemedroom",
        element: (
          <ProtectedRoute
            allowed={["admin", "doctor", "patient"]}
            requireVerified
            pendingRedirect="/easy-telemed/onboarding/doctor"
          >
            <TelemedRoom />
          </ProtectedRoute>
        ),
      },
      {
        path: "register",
        element: (
          <ProtectedRoute allowed={["admin"]}>
            <Register />
          </ProtectedRoute>
        ),
      },
      {
        path: "onboarding/doctor",
        element: (
          <ProtectedRoute allowed={["doctor"]}>
            <DoctorPending />
          </ProtectedRoute>
        ),
      },
      {
        path: "userDashboard",
        element: (
          <ProtectedRoute allowed={["admin"]} >
            <UserDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "illness-case",
        element: (
          <ProtectedRoute allowed={["patient"]} requireVerified>
            <PatientOnCase />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute allowed={["patient", "doctor"]}>
            <Profile />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserAuthContextSupabaseProvider>
      <RouterProvider router={router} />
    </UserAuthContextSupabaseProvider>
  </StrictMode>
);
