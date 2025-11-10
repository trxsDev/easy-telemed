import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, Button, Space } from "antd";

function ChangeLangButton({onSidebar = false }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  
  const lngs = {
    en: { nativeName: "English", icon: "/icon/en-icon.svg" },
    th: { nativeName: "ไทย", icon: "/icon/th-icon.png" },
  };

  const currentLang = lngs[i18n.resolvedLanguage || "en"];

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    setOpen(false); // หุบ popover หลังเลือกภาษา
  };

  // Language selection content for popover
  const languageContent = (
    <div style={{ padding: "8px" }}>
      <Space direction="vertical" size="small" style={{ width: "150px" }}>
        {Object.keys(lngs).map((lng) => (
          <Button
            key={lng}
            type={i18n.resolvedLanguage === lng ? "primary" : "text"}
            block
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              justifyContent: "flex-start",
              padding: "8px 12px",
              height: "auto",
              border: i18n.resolvedLanguage === lng ? "1px solid #1890ff" : "1px solid transparent",
              borderRadius: "6px"
            }}
            onClick={() => handleLanguageChange(lng)}
          >
            <img 
              src={lngs[lng].icon} 
              alt={`${lngs[lng].nativeName} flag`}
              style={{
                width: "24px",
                height: "24px",
                objectFit: "cover",
                borderRadius: "50%",
                border: "1px solid #e0e0e0"
              }}
            />
            <span style={{
              fontSize: "14px",
              fontWeight: i18n.resolvedLanguage === lng ? "600" : "400"
            }}>
              {lngs[lng].nativeName}
            </span>
          </Button>
        ))}
      </Space>
    </div>
  );

  return (
    <Popover
      content={languageContent}
      title={t("SELECT_LANGUAGE", "Select Language")}
      trigger="click"
      placement={onSidebar ? "right" : "bottomRight"}
      open={open}
      onOpenChange={setOpen}
      overlayStyle={{
        zIndex: 1050
      }}
    >
      <Button
        type="text"
        style={{
          padding: "4px",
          height: "auto",
          border: "none",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#f0f0f0";
          e.target.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
          e.target.style.transform = "scale(1)";
        }}
      >
        <img 
          src={currentLang.icon} 
          alt={`${currentLang.nativeName} flag`}
          style={{
            width: "32px",
            height: "32px",
            objectFit: "cover",
            borderRadius: "50%",
            border: "2px solid #f0f0f0",
            cursor: "pointer"
          }}
        />
      </Button>
    </Popover>
  );
}

export default ChangeLangButton;
