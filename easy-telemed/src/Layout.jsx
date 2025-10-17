// src/Layout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import "./layout.css";
import twilioVideoService from "./services/twilioVideoServiceV2";

export default function Layout() {
  const location = useLocation();
  const prevPathRef = React.useRef(location.pathname);

  // เมื่อออกจากหน้าห้อง Telemed ให้ปิดกล้อง/ไมค์ และออกจากห้อง (ถ้ามี)
  React.useEffect(() => {
    const prevPath = prevPathRef.current;
    const currPath = location.pathname;
    const wasTelemed = /\/easy-telemed\/telemedroom/i.test(prevPath);
    const isTelemed = /\/easy-telemed\/telemedroom/i.test(currPath);

    if (wasTelemed && !isTelemed) {
      try {
        // ปิดการใช้งานทั้งหมดโดยไม่เรียกขอสิทธิ์ใหม่
        twilioVideoService.leaveRoom();
      } catch (_) {}
    }

    prevPathRef.current = currPath;
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
