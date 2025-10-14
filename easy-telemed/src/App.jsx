// src/App.jsx
import { Link } from "react-router-dom";
import { CustomizeButton } from "./components/element/CustomizeButton";
import { LoginOutlined } from "@ant-design/icons";
import TopBar from "./components/TopBar/TopBar";
import "./App.css";
import { useTranslation } from "react-i18next";

export default function App() {
  const { t } = useTranslation();
  return (
    <>
      <TopBar />
      <div className="app-content">
    
      </div>
    </>
  );
}
