import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { UserAuthContextProvider } from "./context/userAuthContext.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./Layout.jsx";
import SignIn from "./container/SignIn/SignIn.jsx";
import SignUp from "./container/SignUp/SignUp.jsx";
import Home from "./container/Home.jsx";
import TelemedRoom from "./container/TelemedRoom.jsx";
import signOutAction from "./services/signOutAction.js";
import ProtectedRoute  from "./auth/protectedRoute.jsx";

const router = createBrowserRouter([
  // กลุ่มที่ไม่ต้องล็อกอิน
  { path: "/", element: <App /> },
  { path: "/signin", element: <SignIn /> },
  { path: "/signup", element: <SignUp /> },
  {
    path: "/signout",
    action: async () => {
      await signOutAction();
    },
  },

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
    <UserAuthContextProvider>
      <RouterProvider router={router} />
    </UserAuthContextProvider>
  </StrictMode>
);
