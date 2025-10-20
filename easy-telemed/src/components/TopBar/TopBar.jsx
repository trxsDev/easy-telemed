import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CustomizeButton } from "../element/CustomizeButton";
import { LoginOutlined } from "@ant-design/icons";
import { Stethoscope } from "lucide-react";
import "./TopBar.css";
import medcross from "../../assets/medcross.svg";
import { Button, Select } from "antd";
import { useTranslation } from "react-i18next";
import ChangeLangButton from "../ChangeLangButton";
const TopBar = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className={`topbar${isScrolled ? " topbar--scrolled" : ""}`}>
      <h1>
        Easy Tele{" "}
        <img src={medcross} alt="medical cross" className="cross-icon" /> med
      </h1>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Link to="/doctor-register">
          <Button size="large" icon={<Stethoscope />}>
            {t('doctorRegister')}
          </Button>
        </Link>
        <Link to="/signin">
          <CustomizeButton iconElement={<LoginOutlined />}>
            {t('signIn')}
          </CustomizeButton>
        </Link>
        <ChangeLangButton />
      </div>
    </div>
  );
};
export default TopBar;
