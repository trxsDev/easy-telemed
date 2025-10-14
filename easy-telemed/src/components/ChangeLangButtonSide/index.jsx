import React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "antd";

function ChangeLangButtonSide() {
  const { t, i18n } = useTranslation();
  const lngs = {
    en: { nativeName: "English", icon: "/icon/en-icon.svg" },
    th: { nativeName: "ไทย", icon: "/icon/th-icon.png" },
  };

  // Custom render for the selected value (what shows when dropdown is closed)
  const renderSelectedValue = (value) => {
    const currentLang = lngs[value];
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <img 
          src={currentLang.icon} 
          alt={`${currentLang.nativeName} flag`}
          style={{
            width: "32px",
            height: "32px",
            objectFit: "cover",
            borderRadius: "50%",
            border: "2px solid #f0f0f0"
          }}
        />
        <span style={{
          fontSize: "16px",
          fontWeight: "500",
          color: "#2c3e50"
        }}>
          {currentLang.nativeName}
        </span>
      </div>
    );
  };

  return (
    <Select
      size="large"
      value={i18n.resolvedLanguage || "en"}
      style={{ 
        width: 140,
        borderRadius: "12px",
        backgroundColor: "#f8f9fa"
        
      }}
      onChange={(lng) => i18n.changeLanguage(lng)}
      labelRender={({ value }) => renderSelectedValue(value)}
      options={Object.keys(lngs).map((lng) => ({
        key: lng,
        label: (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "4px 0"
            }}
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
          </div>
        ),
        value: lng,
      }))}
    />
  );
}

export default ChangeLangButtonSide;
