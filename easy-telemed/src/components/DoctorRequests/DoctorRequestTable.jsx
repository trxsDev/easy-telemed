import React, { useEffect, useState } from "react";
import "./styles.css";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import {
  Card,
  Typography,
  Table,
  Popconfirm,
  Button,
  message,
  Space,
  Modal,
} from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import { supabase } from "../../api/SupabaseClient";
import spacializationData from "../../specialization.json";
import { useTranslation } from "react-i18next";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";

const { Title } = Typography;

function DoctorRequestTable({ requestList, onProcessed }) {
  const { t, i18n } = useTranslation();
  const [processingId, setProcessingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [credentialsDoc, setCredentialsDoc] = useState(null);
  const [isBlock,setIsBlock] = useState(true);
  const { user } = useUserAuthSupabase();
  
  const showModal = async (record) => {
  setSelectedRecord(record);
    
    try {
      const credentials = JSON.parse(record.applicant_documents_form);
      const credPath = credentials[0];
      
      const { data, error } = await supabase.storage
        .from('credentials')
        .download(credPath);
        
      if (error) {
        console.error('Download error:', error);
        message.error('Failed to load document');
        return;
      }
      
      if (data) {
        const url = URL.createObjectURL(data);
        setCredentialsDoc(url);
        console.log("Credentials URL:", url);
      }
    } catch (parseError) {
      console.error('Error parsing documents:', parseError);
      message.error('Failed to parse document information');
    }
    setIsBlock(false);

    setIsModalOpen(true);
  };

  const handleOk = () => {

    if (credentialsDoc) {
      URL.revokeObjectURL(credentialsDoc);
      setCredentialsDoc(null);
    }
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    // Clean up object URL to prevent memory leaks
    if (credentialsDoc) {
      URL.revokeObjectURL(credentialsDoc);
      setCredentialsDoc(null);
    }
    setIsModalOpen(false);
  };

  const updateStatus = async (id, status) => {
    setProcessingId(id);
    try {
      if (status === "approved") {
        const { error: approveError } = await supabase
          .from("app_users")
          .update({ role: "doctor", verify: true })
          .eq("user_id", id);

        if (approveError) {
          throw approveError;
        }
      }

      const { error: providerError } = await supabase
        .from("provider_applications")
        .update({
          status,
          reviewer_admin_id: user.user_id,
          decided_at: new Date().toISOString(),
        })
        .eq("applicant_user_id", id);

      if (providerError) {
        throw providerError;
      }

      const { error: requestError } = await supabase
        .from("doctor_requests")
        .update({ status })
        .eq("user_id", id);

      if (requestError) {
        throw requestError;
      }

      message.success(
        status === "approved" ? t("APPROVED", "Approved") : t("REJECTED", "Rejected")
      );
      onProcessed?.();
      setIsBlock(true);
    } catch (error) {
      console.error("Error updating doctor request status", error);
      message.error(t("UPDATE_FAILED", "Update failed"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (id) => {
    updateStatus(id, "approved");
    console.log("Approved", id);

    
  };

  const handleReject = (id) => updateStatus(id, "rejected");

  const columns = [
    {
      title: "Full Name",
      dataIndex: "applicant_full_name_form",
      key: "full_name",
      render: (text) => text || "Unnamed",
      width: "20%",
    },
    {
      title: "Email",
      dataIndex: "applicant_email",
      key: "email",
      width: "20%",
    },
    {
      title: "License No",
      key: "license_no",
      dataIndex: "license_no",
      width: "15%",
    },
    {
      title: "Specialties",
      key: "specialties",
      render: (_, record) => {
        const specialties = record.specialties;
        if (!specialties) return "N/A";
        
        try {
          // Parse JSON string if it's a string, otherwise use as-is if it's already an array
          const parsedSpecialties = typeof specialties === 'string' 
            ? JSON.parse(specialties) 
            : specialties;
          
          // Handle single object format
          if (parsedSpecialties && typeof parsedSpecialties === 'object' && !Array.isArray(parsedSpecialties)) {
            return  i18n.language === 'th' ? parsedSpecialties.name_th :  parsedSpecialties.name || "N/A";
          }
          
          if (Array.isArray(parsedSpecialties) && parsedSpecialties.length > 0) {
            if (typeof parsedSpecialties[0] === 'object' && parsedSpecialties[0].name) {
              return parsedSpecialties
                .map(spec => (i18n.language === 'th' ? spec.name_th : spec.name) || spec.name)
                .filter(Boolean)
                .join(", ");
            }

            const specialtyLabels = parsedSpecialties
              .map(id => {
                const spec = spacializationData.find(s => s.id === id);
                if (!spec) return null;
                return i18n.language === 'th' ? spec.name_th || spec.label_th : spec.name || spec.label;
              })
              .filter(Boolean);

            if (specialtyLabels.length > 0) {
              return specialtyLabels.join(", ");
            }
          }
        } catch (error) {
          console.error("Error parsing specialties:", error);
        }
        
        return "N/A";
      },
      width: "15%",
    },
    {
      title: "Credential",
      render: (_, record) => {
        return (
        <Button type="primary" onClick={() => showModal(record)}>
          View
        </Button>)
      },
      width: "10%",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="Approve this doctor?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleApprove(record.applicant_user_id)}
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={processingId === record.applicant_user_id}
              size="medium"
              disabled={isBlock}
            >
              {isBlock? "Check first" : "Approve"}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Reject this doctor?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleReject(record.applicant_user_id)}
          >
            <Button
              danger
              icon={<CloseOutlined />}
              loading={processingId === record.applicant_user_id}
              size="medium"
            >
              {t("REJECT", "Reject")}
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: "20%",
    },
  ];

  useEffect(() => {
    console.log("Request List:", requestList);
  }, [requestList]);

  const onChange = (pagination, filters, sorter, extra) => {
    console.log("params", pagination, filters, sorter, extra);
  };

  
  return (
    <Card
      className="doctor-request-table"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChartOutlined />
          <Title level={4} style={{ margin: 0 }}>
            {t("DOCTOR_REQUESTS", "Doctor Requests")}
          </Title>
        </div>
      }
      style={{ height: "100%" }}
    >
      <Table
        columns={columns}
  dataSource={requestList}
        onChange={onChange}
  rowKey="applicant_user_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ y: 400 }}
      />
      <Modal
  title={selectedRecord?.applicant_full_name_form ? `${t("CREDENTIAL_FOR", "Credential for")} ${selectedRecord.applicant_full_name_form}` : t("CREDENTIAL", "Credential")}
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        loading={true}
      >
        <Card>
          <img src={credentialsDoc} alt="" style={{ width: "100%" }} />
        </Card>
      
      </Modal>
      
    </Card>
  );
}

export default DoctorRequestTable;
