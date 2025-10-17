import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, Button, Space, Typography, Tag, message, Descriptions, Divider, List } from "antd";
import { supabase } from "../../api/SupabaseClient";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  updateMatchRequestStatus,
} from "../../services/matchingService";

const { Title, Paragraph, Text } = Typography;

const parseAttachments = (attachments) => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  try {
    return JSON.parse(attachments);
  } catch {
    return [];
  }
};

function DoctorConsult() {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { emit } = useSocket();

  const [consultation, setConsultation] = useState(location.state?.consultation || null);
  const [caseData, setCaseData] = useState(location.state?.caseData || null);
  const [matchRequest, setMatchRequest] = useState(location.state?.matchRequest || null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [updating, setUpdating] = useState(false);

  const consultationId = params.consultationId;

  useEffect(() => {
    const fetchConsultation = async () => {
      if (consultation) return;
      if (!consultationId) return;
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("consultation_id", consultationId)
        .single();
      if (error) {
        console.error("Failed to fetch consultation", error);
        message.error(t("FETCH_CONSULT_FAILED", "ไม่สามารถโหลดข้อมูลการปรึกษาได้"));
        return;
      }
      setConsultation(data);
    };
    fetchConsultation();
  }, [consultationId, consultation, t]);

  useEffect(() => {
    const fetchCase = async () => {
      if (!consultation?.case_id || caseData) return;
      const { data, error } = await supabase
        .from("patient_cases")
        .select("*")
        .eq("case_id", consultation.case_id)
        .single();
      if (!error && data) {
        setCaseData(data);
      }
    };
    fetchCase();
  }, [consultation, caseData]);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!consultation?.case_id || matchRequest) return;
      const { data } = await supabase
        .from("match_requests")
        .select("*")
        .eq("case_id", consultation.case_id)
        .order("created_at", { ascending: false })
        .maybeSingle();
      if (data) setMatchRequest(data);
    };
    fetchMatch();
  }, [consultation, matchRequest]);

  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (!caseData?.patient_id) return;
      const { data } = await supabase
        .from("app_users")
        .select("user_id, display_name, phone")
        .eq("user_id", caseData.patient_id)
        .maybeSingle();
      if (data) setPatientInfo(data);
    };
    fetchPatientInfo();
  }, [caseData?.patient_id]);

  const attachments = useMemo(() => parseAttachments(caseData?.attachments), [caseData?.attachments]);

  const handleNotifyPatient = async () => {
    if (!matchRequest?.request_id || !caseData?.patient_id) {
      message.error(t("MATCH_NOT_READY", "ยังไม่สามารถแจ้งผู้ป่วยได้"));
      return;
    }
    setUpdating(true);
    try {
      await updateMatchRequestStatus(matchRequest.request_id, "doctor_ready");
      emit("doctor:ready", {
        requestId: matchRequest.request_id,
        patientId: caseData.patient_id,
        consultation,
      });
      message.success(t("NOTIFY_PATIENT_SUCCESS", "แจ้งผู้ป่วยเรียบร้อย"));
      setMatchRequest((prev) => ({ ...prev, status: "doctor_ready" }));
    } catch (error) {
      console.error("Failed to notify patient", error);
      message.error(error.message || t("NOTIFY_PATIENT_FAILED", "แจ้งผู้ป่วยไม่สำเร็จ"));
    } finally {
      setUpdating(false);
    }
  };

  const handleJoinTelemed = () => {
    if (!consultation?.consultation_id) {
      message.error(t("CONSULTATION_NOT_READY", "ไม่พบข้อมูลการปรึกษา"));
      return;
    }
    navigate(`/easy-telemed/telemedroom?consultationId=${consultation.consultation_id}&caseId=${consultation.case_id}`);
  };

  if (!consultation) {
    return (
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: 24 }}>
        <Card>
          <Paragraph>{t("LOADING_CONSULTATION", "กำลังโหลดข้อมูลการปรึกษา...")}</Paragraph>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" size="small">
            <Title level={3} style={{ margin: 0 }}>
              {t("CONSULT_OVERVIEW", "รายละเอียดเคสผู้ป่วย")}
            </Title>
            {caseData?.requested_specialty && (
              <Tag color="blue">{caseData.requested_specialty}</Tag>
            )}
            <Paragraph style={{ margin: 0 }}>
              {patientInfo?.display_name || caseData?.patient_id}
            </Paragraph>
          </Space>
        </Card>

        {caseData && (
          <Card title={t("CASE_DETAIL", "รายละเอียดอาการ")}> 
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label={t("SYMPTOMS", "อาการ")}
                >
                {caseData.symptoms_text || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("SEVERITY", "ความรุนแรง")}
                >
                {caseData.severity || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("TRIAGE_LEVEL", "ระดับความเร่งด่วน")}
                >
                {caseData.triage_level || "standard"}
              </Descriptions.Item>
            </Descriptions>

            {attachments?.length > 0 && (
              <>
                <Divider orientation="left">
                  {t("ATTACHMENTS", "ไฟล์แนบ")}
                </Divider>
                <List
                  dataSource={attachments}
                  renderItem={(item, index) => (
                    <List.Item key={index}>
                      <a href={item.url || item.path} target="_blank" rel="noreferrer">
                        {item.name || item.path || t("ATTACHMENT", "ไฟล์แนบ")}
                      </a>
                    </List.Item>
                  )}
                />
              </>
            )}
          </Card>
        )}

        <Card>
          <Space size="middle">
            <Button type="primary" onClick={handleJoinTelemed}>
              {t("OPEN_TELEMED_ROOM", "เข้า Telemed Room")}
            </Button>
            <Button
              onClick={handleNotifyPatient}
              loading={updating}
              disabled={matchRequest?.status === "doctor_ready"}
            >
              {t("NOTIFY_PATIENT_BUTTON", "แจ้งผู้ป่วยว่าพร้อมให้บริการ")}
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default DoctorConsult;
