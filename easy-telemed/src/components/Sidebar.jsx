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
import { supabase } from "../api/SupabaseClient";
import { useSocket } from "../context/SocketContext.jsx";

export default function Sidebar() {
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
          try {
            localStorage.setItem(
              "patientInvitedConsultationId",
              payload.consultation?.consultation_id || ""
            );
          } catch (error) {
            console.warn("Failed to cache patient consultation invite", error);
          }
          setPatientTelemedEnabled(true);
        }
      };
      const onSummarizing = (payload) => {
        if (payload?.patientId === authUser?.user_id || payload?.consultation?.patient_id === authUser?.user_id) {
          setPatientTelemedEnabled(false); // hide after call finished/summarizing
          try {
            localStorage.removeItem("activeConsultationId");
          } catch (error) {
            console.warn("Failed to clear active consultation cache", error);
          }
          try {
            localStorage.removeItem("patientInvitedConsultationId");
          } catch (error) {
            console.warn("Failed to clear consultation invite cache", error);
          }
        }
      };
      const onEnded = (payload) => {
        if (payload?.patientId === authUser?.user_id || payload?.consultation?.patient_id === authUser?.user_id) {
          setPatientTelemedEnabled(false);
          try {
            localStorage.removeItem("activeConsultationId");
          } catch (error) {
            console.warn("Failed to clear active consultation cache", error);
          }
          try {
            localStorage.removeItem("patientInvitedConsultationId");
          } catch (error) {
            console.warn("Failed to clear consultation invite cache", error);
          }
        }
      };
      socket.on?.('doctor:ready', onDoctorReady);
      socket.on?.('consultation:summarizing', onSummarizing);
      socket.on?.('consultation:ended', onEnded);
      return () => {
        mounted = false;
        socket.off?.('doctor:ready', onDoctorReady);
        socket.off?.('consultation:summarizing', onSummarizing);
        socket.off?.('consultation:ended', onEnded);
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
      label: "Home",
      roles: ["admin", "doctor", "patient"],
    },
    {
      to: "/easy-telemed/illness-case",
      icon: <PersonStanding size={24} />,
      label: "Illness Case",
      roles: ["patient"],
    },
    {
      to: "/easy-telemed/telemedroom",
      icon: <FileVideoCamera size={24} />,
      label: "Telemed Room",
      roles: ["admin", "doctor", "patient"],
      patientGuard: true,
    },
    {
      to: "/easy-telemed/register",
      icon: <BookUser size={24} />,
      label: "Register",
      roles: ["admin"],
    },
    {
      to: "/easy-telemed/onboarding/doctor",
      icon: <NotebookPen size={24} />,
      label: "Doctor Pending",
      roles: ["doctor"],
      requireUnverified: true,
    },
    {
      to: "/easy-telemed/userDashboard",
      icon: <Users size={24} />,
      label: "User Management",
      roles: ["admin"],
    },
    {
      to: "/easy-telemed/profile",
      icon: <CircleUserRound size={24} />,
      label: "Profile",
      roles: ["admin", "doctor", "patient"],
    },
    {
      to: "/easy-telemed/doctor/schedule",
      icon: <CalendarClock size={24} />,
      label: "Doctor Schedule",
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
      return item.to === "/easy-telemed/profile";
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
          <img src={medcross} alt="Logo" />
        </div>
        <Divider style={{ margin: 0 }} />
        {/* ===== เมนูหลัก ===== */}
        <nav className="menu">
          {menus.map((item) => (
            <div key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) =>
                  `menu-item ${isActive ? "active" : ""}`
                }
              >
                {item.icon}
              </NavLink>
              {item.divider && <Divider />}
            </div>
          ))}
        </nav>

        {/* ===== ปุ่ม Logout แยกออกมา ===== */}
        <div className="logout">
          <ChangeLangButton onSidebar />

          <Popconfirm
            placement="right"
            title="Are you sure to sign out?"
            okText="Yes"
            cancelText="No"
            onConfirm={handleSignOut}
          >
            <button
              type="submit"
              className="menu-item"
              title="signout"
              aria-label="signout"
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
