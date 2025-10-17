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
        <section className="hero">
          <h1>{t("app.title", "แพลตฟอร์มเทเลเมดิซีน")}</h1>
          <p>{t("app.subtitle", "เข้าสู่ระบบเพื่อเริ่มต้นการปรึกษาแพทย์ออนไลน์ของคุณ")}</p>
        </section>
      </div>
    </>
  );
}
