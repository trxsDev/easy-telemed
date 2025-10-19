import { NavLink, useNavigate } from "react-router-dom";
import { 
  Home, 
  User, 
  LogOut,
  NotebookPen,
  BookUser,
  Users,
  FileVideoCamera,
  PersonStanding,
  CircleUserRound,
  CalendarClock
 } from "lucide-react";
import { Divider } from "antd";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
import medcross from "../assets/medcross.svg";
import { Popconfirm } from "antd";
import ChangeLangButton from "./ChangeLangButton";
import React from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../api/SupabaseClient";
import { useSocket } from "../context/SocketContext.jsx";

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logOut, role, verify, authUser } = useUserAuthSupabase();
  const { socket } = useSocket();
  const [patientTelemedEnabled, setPatientTelemedEnabled] = React.useState(false);

  // Determine if Telemed Room should be visible for patients
  React.useEffect(() => {
    let mounted = true;
    const initFromLocal = () => {
      if (role !== 'patient' || !authUser?.user_id) {
        if (mounted) setPatientTelemedEnabled(false);
        return;
      }
      const invited = (() => { try { return localStorage.getItem('patientInvitedConsultationId'); } catch { return null; } })();
      const active = (() => { try { return localStorage.getItem('activeConsultationId'); } catch { return null; } })();
      if (mounted) setPatientTelemedEnabled(Boolean(invited || active));
    };
    initFromLocal();

    // React to localStorage changes (e.g., connect/disconnect)
    const onStorage = (e) => {
      if (e.key === 'activeConsultationId') {
        const has = !!e.newValue;
        setPatientTelemedEnabled(has);
      }
    };
    window.addEventListener('storage', onStorage);

    // Listen to socket events to toggle button in realtime
    if (socket) {
      const onDoctorReady = (payload) => {
        if (payload?.consultation?.patient_id === authUser?.user_id) {
          try { localStorage.setItem('patientInvitedConsultationId', payload.consultation?.consultation_id || ''); } catch {}
          setPatientTelemedEnabled(true);
        }
      };
      const onConsultationUpdated = (payload = {}) => {
        const status = payload?.status;
        if (!status) return;
        if (status === 'doctor_in_room' || status === 'doctor_ready_conclude' || status === 'active' || status === 'summarizing') {
          setPatientTelemedEnabled(true);
        } else {
          setPatientTelemedEnabled(false);
          try { localStorage.removeItem('activeConsultationId'); } catch {}
          if (status !== 'doctor_ready_conclude' && status !== 'summarizing') {
            try { localStorage.removeItem('patientInvitedConsultationId'); } catch {}
          }
        }
      };
      socket.on?.('doctor:ready', onDoctorReady);
      socket.on?.('consultation:updated', onConsultationUpdated);
      return () => {
        mounted = false;
        socket.off?.('doctor:ready', onDoctorReady);
        socket.off?.('consultation:updated', onConsultationUpdated);
        window.removeEventListener('storage', onStorage);
      };
    }

    return () => { mounted = false; window.removeEventListener('storage', onStorage); };
  }, [socket, role, authUser?.user_id]);

  const handleSignOut = async () => {
    try {
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Dynamic menus based on role and verify status
  const baseMenus = [
    {
      to: "/easy-telemed/home",
      icon: <Home size={24} />,
      labelKey: "sidebar.menu.home",
      roles: ["admin", "doctor", "patient"],
    },
    {
      to: "/easy-telemed/illness-case",
      icon: <PersonStanding size={24} />,
      labelKey: "sidebar.menu.illnessCase",
      roles: ["patient"],
    },
    {
      to: "/easy-telemed/telemedroom",
      icon: <FileVideoCamera size={24} />,
      labelKey: "sidebar.menu.telemedRoom",
      roles: ["admin", "doctor", "patient"],
      patientGuard: true,
    },
    {
      to: "/easy-telemed/register",
      icon: <BookUser size={24} />,
      labelKey: "sidebar.menu.register",
      roles: ["admin"],
    },
    {
      to: "/easy-telemed/onboarding/doctor",
      icon: <NotebookPen size={24} />,
      labelKey: "sidebar.menu.doctorPending",
      roles: ["doctor"],
      requireUnverified: true,
    },
    {
      to: "/easy-telemed/userDashboard",
      icon: <Users size={24} />,
      labelKey: "sidebar.menu.userManagement",
      roles: ["admin"],
    },
    {
      to: "/easy-telemed/profile",
      icon: <CircleUserRound size={24} />,
      labelKey: "sidebar.menu.profile",
      roles: ["patient"],
      requireUnverified: true,
    },
    {
      to: "/easy-telemed/doctor/schedule",
      icon: <CalendarClock size={24} />,
      labelKey: "sidebar.menu.doctorSchedule",
      roles: ["doctor"],
    },
  ];

  // Filter menus based on role and verify status
  const menus = baseMenus.filter((item) => {
    // Check if user has required role
    if (!item.roles.includes(role) && role !== "admin") {
      return false;
    }

    // Special case: if doctor role and not verified, show only onboarding
    if (verify === false && role === "doctor") {
      return item.requireUnverified === true;
    }
    
    // PRIORITY: if patient role and not verified, show ONLY profile page
    if (verify !== true && role === "patient") {
      return item.to === "/easy-telemed/profile" && item.requireUnverified === true;
    }
   
    // For verified doctors, exclude onboarding page
    if (role === "doctor" && verify === true) {
      return !item.requireUnverified;
    }
    
    // For verified patients, exclude profile requirement page and guard Telemed visibility
    if (role === "patient" && verify === true) {
      if (item.requireUnverified) return false;
      if (item.patientGuard) {
        return patientTelemedEnabled;
      }
      return true;
    }

    // For other roles, exclude unverified-only pages
    return !item.requireUnverified;
  });

  return (
    <aside className="sidebar">
      <div className="rail">
        <div className="sidebar-logo">
          <img src={medcross} alt={t("sidebar.brandIconAlt")} />
        </div>
        <Divider style={{ margin: 0 }} />
        {/* ===== เมนูหลัก ===== */}
        <nav className="menu">
          {menus.map((item) => {
            const label = t(item.labelKey);
            return (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  title={label}
                  aria-label={label}
                  className={({ isActive }) =>
                    `menu-item ${isActive ? "active" : ""}`
                  }
                >
                  {item.icon}
                </NavLink>
                {item.divider && <Divider />}
              </div>
            );
          })}
        </nav>

        {/* ===== ปุ่ม Logout แยกออกมา ===== */}
        <div className="logout">
          <ChangeLangButton onSidebar />

          <Popconfirm
            placement="right"
            title={t("sidebar.signOutConfirm")}
            okText={t("common.yes")}
            cancelText={t("common.no")}
            onConfirm={handleSignOut}
          >
            <button
              type="submit"
              className="menu-item"
              title={t("sidebar.signOut")}
              aria-label={t("sidebar.signOut")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <LogOut size={24} />
            </button>
          </Popconfirm>
        </div>
      </div>
    </aside>
  );
}
