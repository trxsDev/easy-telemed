// src/Layout.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import "./layout.css";

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
