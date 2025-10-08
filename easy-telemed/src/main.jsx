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
import ProtectedRoute  from "./auth/ProtectedRoute.jsx";


const router = createBrowserRouter([
  // กลุ่มที่ไม่ต้องล็อกอิน
  { path: "/", element: <App /> },
  { path: "/signin", element: <SignIn /> },
  { path: "/signup", element: <SignUp /> },
  // กลุ่มที่มี Layout ครอบ
  {
    path: "/easy-telemed/",
    element: <Layout />,
    children: [
      {
        path: "home",
        element: 
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ,
      },
      {
        path: "telemedroom",
        element: 
          <ProtectedRoute>
            <TelemedRoom />
          </ProtectedRoute>
        ,
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
