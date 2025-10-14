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
  CircleUserRound
 } from "lucide-react";
import { Divider } from "antd";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
import medcross from "../assets/medcross.svg";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { Button, Modal, Popconfirm } from "antd";
import ChangeLangButton from "./ChangeLangButton";
const { confirm } = Modal;

export default function Sidebar() {
  const navigate = useNavigate();
  const { logOut, role, verify } = useUserAuthSupabase();

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
      roles: ["patient"],
      requireUnverified: true,
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
    
    // For verified patients, exclude profile requirement page
    if (role === "patient" && verify === true) {
      return !item.requireUnverified;
    }

    // For other roles, exclude unverified-only pages
    return !item.requireUnverified;
  });

  const showDeleteConfirm = () => {
    confirm({
      title: "Are you sure delete this task?",
      icon: <ExclamationCircleFilled />,
      content: "Some descriptions",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        handleSignOut();
      },
    });
  };

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
