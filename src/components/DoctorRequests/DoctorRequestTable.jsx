import React, { useMemo, useState } from "react";
import "./styles.css";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Card,
  Typography,
  Table,
  Popconfirm,
  Button,
  message,
  Space,
  Modal,
  Spin,
} from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  approveDoctorRequest,
  rejectDoctorRequest,
  downloadDoctorCredential,
  clearDownload,
  fetchDoctorRequestCount,
} from "../../store/doctorRequestsSlice";
import { selectDoctorRequestsState } from "../../store";
import specializationData from "../../specialization.json";

const { Title } = Typography;

function DoctorRequestTable({
  requests = [],
  loading = false,
  onRefresh,
  onProcessed,
  currentUserId,
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { submitting, downloads, downloadingPath } = useSelector(selectDoctorRequestsState);
  const [processingId, setProcessingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedCredentialPath, setSelectedCredentialPath] = useState(null);

  const refreshList = () => {
    onRefresh?.();
  };

  const credentialUrl = useMemo(() => {
    if (!selectedCredentialPath) return null;
    return downloads[selectedCredentialPath] || null;
  }, [downloads, selectedCredentialPath]);

  const handleCloseModal = () => {
    if (selectedCredentialPath) {
      dispatch(clearDownload(selectedCredentialPath));
      setSelectedCredentialPath(null);
    }
    setIsModalOpen(false);
  };

  const showModal = async (record) => {
    setSelectedRecord(record);
    try {
      const documents = Array.isArray(record.applicant_documents_form)
        ? record.applicant_documents_form
        : JSON.parse(record.applicant_documents_form || "[]");
      const credPath = documents[0];
      if (!credPath) {
        message.warning(t("NO_DOCUMENT_FOUND", "ไม่พบเอกสารแนบ"));
        return;
      }
      setSelectedCredentialPath(credPath);
      await dispatch(downloadDoctorCredential(credPath)).unwrap();
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error loading credential", error);
      message.error(t("LOAD_DOCUMENT_FAILED", "ไม่สามารถโหลดเอกสารได้"));
      setSelectedCredentialPath(null);
    }
  };

  const handleApprove = async (record) => {
    if (!record?.application_id || !record?.applicant_user_id) return;
    const key = record.applicant_user_id;
    setProcessingId(key);
    try {
      await dispatch(
        approveDoctorRequest({
          applicationId: record.application_id,
          userId: record.applicant_user_id,
          reviewerId: currentUserId || null,
        })
      ).unwrap();
      message.success(t("APPROVED", "Approved"));
      dispatch(fetchDoctorRequestCount());
      refreshList();
      onProcessed?.();
    } catch (error) {
      message.error(error || t("UPDATE_FAILED", "Update failed"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (record) => {
    if (!record?.application_id) return;
    const key = record.applicant_user_id || record.application_id;
    setProcessingId(key);
    try {
      await dispatch(
        rejectDoctorRequest({
          applicationId: record.application_id,
          reason: null,
          reviewerId: currentUserId || null,
        })
      ).unwrap();
      message.success(t("REJECTED", "Rejected"));
      dispatch(fetchDoctorRequestCount());
      refreshList();
      onProcessed?.();
    } catch (error) {
      message.error(error || t("UPDATE_FAILED", "Update failed"));
    } finally {
      setProcessingId(null);
    }
  };

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
          const parsedSpecialties =
            typeof specialties === "string" ? JSON.parse(specialties) : specialties;

          if (parsedSpecialties && typeof parsedSpecialties === "object" && !Array.isArray(parsedSpecialties)) {
            return i18n.language === "th"
              ? parsedSpecialties.name_th
              : parsedSpecialties.name || "N/A";
          }

          if (Array.isArray(parsedSpecialties) && parsedSpecialties.length > 0) {
            if (typeof parsedSpecialties[0] === "object" && parsedSpecialties[0].name) {
              return parsedSpecialties
                .map((spec) =>
                  (i18n.language === "th" ? spec.name_th : spec.name) || spec.name
                )
                .filter(Boolean)
                .join(", ");
            }

            const specialtyLabels = parsedSpecialties
              .map((id) => {
                const spec = specializationData.find((s) => s.id === id);
                if (!spec) return null;
                return i18n.language === "th"
                  ? spec.name_th || spec.label_th
                  : spec.name || spec.label;
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
    },
    {
      title: "Submitted",
      dataIndex: "created_at",
      key: "created_at",
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
      width: "20%",
    },
    {
      title: "Actions",
      key: "actions",
      width: "25%",
      render: (_, record) => {
        const key = record.applicant_user_id || record.application_id;
        return (
          <Space>
            <Popconfirm
              title={t("APPROVE_DOCTOR", "Approve doctor")}
              description={t("CONFIRM_APPROVE", "Are you sure you want to approve this application?")}
              onConfirm={() => handleApprove(record)}
              okText={t("YES", "Yes")}
              cancelText={t("NO", "No")}
            >
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={processingId === key || submitting}
                disabled={submitting}
              >
                {t("APPROVE", "Approve")}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t("REJECT_DOCTOR", "Reject doctor")}
              description={t("CONFIRM_REJECT", "Are you sure you want to reject this application?")}
              onConfirm={() => handleReject(record)}
              okText={t("YES", "Yes")}
              cancelText={t("NO", "No")}
            >
              <Button
                danger
                icon={<CloseOutlined />}
                loading={processingId === key || submitting}
                disabled={submitting}
              >
                {t("REJECT", "Reject")}
              </Button>
            </Popconfirm>
            <Button
              icon={<BarChartOutlined />}
              onClick={() => showModal(record)}
              loading={downloadingPath === selectedCredentialPath && isModalOpen}
            >
              {t("VIEW_DOCUMENT", "View document")}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={refreshList}>
          {t("REFRESH", "Refresh")}
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={requests}
        loading={loading}
        rowKey={(record) => record.application_id || record.applicant_user_id}
        pagination={{ pageSize: 8 }}
      />

      <Modal
        open={isModalOpen}
        onOk={handleCloseModal}
        onCancel={handleCloseModal}
        title={t("CREDENTIAL_DOCUMENT", "Credential Document")}
        width="70%"
        destroyOnClose
        footer={[
          <Button key="close" type="primary" onClick={handleCloseModal}>
            {t("CLOSE", "Close")}
          </Button>,
        ]}
      >
        {downloadingPath && downloadingPath === selectedCredentialPath && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Spin />
          </div>
        )}
        {credentialUrl ? (
          <iframe
            title="credential"
            src={credentialUrl}
            style={{ width: "100%", height: "70vh", border: "none" }}
          />
        ) : (
          <Typography.Paragraph>{t("NO_DOCUMENT_FOUND", "ไม่พบเอกสารแนบ")}</Typography.Paragraph>
        )}
      </Modal>
    </div>
  );
}

export default DoctorRequestTable;
