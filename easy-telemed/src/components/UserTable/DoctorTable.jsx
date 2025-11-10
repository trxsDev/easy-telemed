import React, { useMemo, useState } from "react";
import { Table, Button, Modal, Card, Image, Spin, message } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  downloadDoctorCredential,
  clearDownload,
} from "../../store/doctorRequestsSlice";
import { selectDoctorRequestsState } from "../../store";

function DoctorTable({ userData }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { downloads, downloadingPath } = useSelector(selectDoctorRequestsState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCredentialPath, setSelectedCredentialPath] = useState(null);

  const columns = [
    {
      title: t("NO","No"),
      key: "no",
      render: (_, __, index) => index + 1,
      width: "5%",
    },
    {
      title: t("FULLNAME","Full Name"),
      dataIndex: "all_user_display_name",
      key: "full_name",
      render: (text) => text || "N/A",
      width: "20%",
    },
    {
      title: t("EMAIL","Email"),
      dataIndex: "all_user_email",
      key: "email",
      width: "20%",
    },
    {
      title: t("CREDENTIAL","Credential"),
      render: (_, record) => {
        const credDoc = record.credential;
        return (
        <Button type="primary" onClick={() => showModal(credDoc)} disabled={!credDoc}>
          {t("VIEW","View")}
        </Button>
        )
      },
      width: "10%",
    },
    {
      title: t("VERIFIED","Verified"),
      dataIndex: "all_user_verify",
      key: "verified",
      align: "center",
      render: (check) => {
        return check ? (
          <CheckOutlined style={{ color: "green" }} />
        ) : (
          <CloseOutlined style={{ color: "red" }} />
        );
      },
      width: "20%",
    },
  ];

  const handleOk = () => {
    setIsModalOpen(false);
    if (selectedCredentialPath) {
      dispatch(clearDownload(selectedCredentialPath));
      setSelectedCredentialPath(null);
    }
  };

  const showModal = async (credential) => {
    if (!credential) {
      return;
    }

    try {
      const docs = Array.isArray(credential) ? credential : JSON.parse(credential || "[]");
      const credPath = docs?.[0];
      if (!credPath) {
        message.warning(t("NO_DOCUMENT_FOUND", "ไม่พบเอกสารแนบ"));
        return;
      }
      setSelectedCredentialPath(credPath);
      await dispatch(downloadDoctorCredential(credPath)).unwrap();
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      message.error(t("LOAD_DOCUMENT_FAILED", "ไม่สามารถโหลดเอกสารได้"));
      setSelectedCredentialPath(null);
    }
  };

  const credentialUrl = useMemo(() => {
    if (!selectedCredentialPath) return null;
    return downloads[selectedCredentialPath] || null;
  }, [downloads, selectedCredentialPath]);

  return (
    <div>
      {/* แสดงสรุป Specialties */}
      {/* {Object.keys(specialtiesCount).length > 0 && (
        <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <h4>{t("SPECIALTIES_SUMMARY", "Specialties Summary")}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(specialtiesCount).map(([specialty, count]) => (
              <span key={specialty} style={{ 
                backgroundColor: '#1890ff', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: 4,
                fontSize: '12px'
              }}>
                {specialty}: {count}
              </span>
            ))}
          </div>
        </div>
      )} */}

      <Table
        dataSource={userData}
        rowKey="id"
        columns={columns}
        pagination={{ pageSize: 5 }}
      />
      <Modal
        title="Credential"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleOk}
        width="70%"
        destroyOnClose
      >
        {downloadingPath && downloadingPath === selectedCredentialPath ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin />
          </div>
        ) : credentialUrl ? (
          <Card>
            <Image src={credentialUrl} alt="" style={{ width: "100%" }} />
          </Card>
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              {t("NO_DOCUMENT_FOUND", "ไม่พบเอกสารแนบ")}
            </div>
          </Card>
        )}
      </Modal>
    </div>
  );
}

export default DoctorTable;
