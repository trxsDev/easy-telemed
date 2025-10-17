import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Button, Space, Typography, Tag, message, Empty, Spin } from "antd";
import { supabase } from "../../api/SupabaseClient";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { useSocket } from "../../context/SocketContext.jsx";
import { fetchDoctorQueue, acceptMatchRequestBackend, createConsultationBackend } from "../../services/matchingService";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

const STATUS_BADGE = {
  waiting: "processing",
  offered: "warning",
};

function DoctorQueue() {
  const { t } = useTranslation();
  const { user } = useUserAuthSupabase();
  const { emit } = useSocket();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const doctorId = user?.user_id;

  const fetchQueue = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const items = await fetchDoctorQueue(doctorId);
      setRequests(items);
    } catch (error) {
      console.error("Failed to fetch doctor queue", error);
      message.error(t("FETCH_QUEUE_FAILED", "ไม่สามารถโหลดคิวผู้ป่วยได้"));
    } finally {
      setLoading(false);
    }
  }, [doctorId, t]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Simple polling fallback (30s) to reflect new requests and updates; can be replaced by sockets/SSE
  useEffect(() => {
    if (!doctorId) return;
    const id = setInterval(fetchQueue, 30000);
    return () => clearInterval(id);
  }, [doctorId, fetchQueue]);

  const handleAccept = async (item) => {
    if (!item?.request) return;
    setAcceptingId(item.request.request_id);
    try {
      const result = await acceptMatchRequestBackend({ requestId: item.request.request_id, doctorId });
      const consultation = await createConsultationBackend({
        caseId: item.request.case_id,
        patientId: item.case?.patient_id,
        doctorId,
        createdBy: doctorId,
      });

      emit("doctor:match_accepted", {
        requestId: item.request.request_id,
        patientId: item.case?.patient_id,
        consultation,
      });

      message.success(t("ACCEPT_REQUEST_SUCCESS", "ยืนยันรับเคสเรียบร้อย"));
      fetchQueue();

      if (consultation?.consultation_id) {
        navigate(`/easy-telemed/telemedroom?consultationId=${consultation.consultation_id}`, {
          state: {
            consultation,
            caseData: item.case,
            matchRequest: result,
          },
        });
      }
    } catch (error) {
      console.error("Accept request failed", error);
      message.error(error.message || t("ACCEPT_REQUEST_FAILED", "ไม่สามารถรับเคสได้"));
    } finally {
      setAcceptingId(null);
    }
  };

  const hasQueue = requests.length > 0;

  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Title level={3} style={{ margin: 0 }}>
              {t("DOCTOR_QUEUE_TITLE", "คิวผู้ป่วยที่รอการตอบรับ")}
            </Title>
            <Text type="secondary">
              {t("DOCTOR_QUEUE_SUBTITLE", "เลือกเคสที่ต้องการให้บริการตามลำดับเวลา")}
            </Text>
          </Space>
        </Card>

        {loading ? (
          <Card style={{ textAlign: "center" }}>
            <Spin />
          </Card>
        ) : hasQueue ? (
          requests.map((item) => (
            <Card key={item.request.request_id}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space align="center" wrap>
                  <Tag color="blue">{item.case?.requested_specialty || t("GENERAL", "ทั่วไป")}</Tag>
                  <Tag color="default">{item.case?.severity || "-"}</Tag>
                  <Tag color="purple">{item.case?.triage_level || "standard"}</Tag>
                  <Tag color={STATUS_BADGE[item.request.status] || "default"}>
                    {item.request.status}
                  </Tag>
                </Space>

                <div>
                  <Paragraph style={{ marginBottom: 8 }}>
                    <strong>{t("PATIENT_NAME", "ผู้ป่วย")}: </strong>
                    {item.patient?.display_name || item.case?.patient_id}
                  </Paragraph>
                  <Paragraph ellipsis={{ rows: 3 }}>
                    {item.case?.symptoms_text || t("NO_SYMPTOM_DESC", "ไม่มีคำอธิบายอาการ")}
                  </Paragraph>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Button
                    type="primary"
                    onClick={() => handleAccept(item)}
                    loading={acceptingId === item.request.request_id}
                  >
                    {t("ACCEPT_CASE", "รับเคสนี้")}
                  </Button>
                </div>
              </Space>
            </Card>
          ))
        ) : (
          <Card>
            <Empty description={t("NO_PENDING_CASE", "ยังไม่มีเคสรอการตอบรับ")}
            />
          </Card>
        )}
      </Space>
    </div>
  );
}

export default DoctorQueue;
