import { NavLink, useNavigate } from "react-router-dom";
import { Home, User, LogOut } from "lucide-react";
import { Divider } from "antd";
import { useUserAuth } from "../context/UserAuthContext";
import medcross from "../assets/medcross.svg";
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Button, Modal, Space } from 'antd';
const { confirm } = Modal;

export default function Sidebar() {
  const navigate = useNavigate();
  const { logOut } = useUserAuth();

  const handleSignOut = async () => {
    try {
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const menus = [
    { to: "/easy-telemed/home", icon: <Home size={24} />, label: "Home" },
    {
      to: "/easy-telemed/telemedroom",
      icon: <User size={24} />,
      label: "Telemed Room",
      divider: true,
    },
  ];

  const showDeleteConfirm = () => {
  confirm({
    title: 'Are you sure delete this task?',
    icon: <ExclamationCircleFilled />,
    content: 'Some descriptions',
    okText: 'Yes',
    okType: 'danger',
    cancelText: 'No',
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
        <Divider style={{ margin: 0}} />
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
          <button
            type="submit"
            className="menu-item"
            title="signout"
            aria-label="signout"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={handleSignOut}
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>
    </aside>
  );
}
