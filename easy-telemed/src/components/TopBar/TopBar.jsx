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
  return (
    <div className="topbar">
      <h1>
        {t("topBar.brandPrefix")}{" "}
        <img src={medcross} alt={t("topBar.brandIconAlt")} className="cross-icon" /> {t("topBar.brandSuffix")}
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
