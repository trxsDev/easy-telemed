import React, { useState } from "react";
import { Table, Button, Modal, Card, Image } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { supabase } from "../../api/SupabaseClient";
import { useTranslation } from "react-i18next";

function DoctorTable({ userData }) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [credentialsDoc, setCredentialsDoc] = useState(null);
  

  const columns = [
    {
      title: t("userTable.noColumn"),
      key: "no",
      render: (_, __, index) => index + 1,
      width: "5%",
    },
    {
      title: t("userTable.fullNameColumn"),
      dataIndex: "all_user_display_name",
      key: "full_name",
      render: (text) => text || t("common.notAvailable"),
      width: "20%",
    },
    {
      title: t("userTable.emailColumn"),
      dataIndex: "all_user_email",
      key: "email",
      width: "20%",
    },
    {
      title: t("doctorTable.credentialColumn"),
      render: (_, record) => {
        const credDoc = record.credential;
        return (
        <Button type="primary" onClick={() => showModal(credDoc)} disabled={!credDoc}>
          {t("common.view")}
        </Button>
        )
      },
      width: "10%",
    },
    {
      title: t("doctorTable.verifiedColumn"),
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
    setCredentialsDoc(null);
  };

  const showModal = async (credential) => {
    if (!credential) {
      return;
    }

    const credentials = JSON.parse(credential);
    const credPath = credentials[0];

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("credentials")
        .download(credPath);

      if (downloadError) {
        console.error("Download error:", downloadError);
        return;
      }

      if (fileData) {
        const url = URL.createObjectURL(fileData);
        setCredentialsDoc(url);
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
    }

    setIsModalOpen(true);
  };

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
        title={t("doctorTable.credentialModalTitle")}
        closable={{ "aria-label": t("common.close") }}
        okText={t("common.close")}
        cancelText={t("common.cancel")}
        open={isModalOpen}
        onOk={() => handleOk()}
        onCancel={() => setIsModalOpen(false)}
      >
          <Card>
            <Image src={credentialsDoc} alt={t("doctorTable.credentialAlt")} style={{ width: "100%" }} />
          </Card>
        
        
      </Modal>
    </div>
  );
}

export default DoctorTable;
