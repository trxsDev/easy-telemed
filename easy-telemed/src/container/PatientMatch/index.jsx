import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, Button, message, Space, Tag, Typography, Alert } from "antd";
import specializations from "../../specialization.json";
import { fetchActiveDoctorsBySpecialty, createMatchRequest, fetchMatchingStatusByCase } from "../../services/matchingService";
import { useSocket } from "../../context/SocketContext.jsx";

const { Title, Paragraph, Text } = Typography;

const formatRelative = (isoString) => {
  if (!isoString) return "-";
  const updated = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "เมื่อสักครู่";
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} วันที่แล้ว`;
};

const resolveSpecialty = (caseData) => {
  if (!caseData) return null;
  if (caseData.requested_specialty_id) {
    return specializations.find((spec) => spec.id === caseData.requested_specialty_id) || null;
  }
  if (caseData.requested_specialty) {
    const lower = String(caseData.requested_specialty).trim().toLowerCase();
    return (
      specializations.find((spec) => spec.name.toLowerCase() === lower) ||
      specializations.find((spec) => spec.name_th?.toLowerCase() === lower) ||
      null
    );
  }
  return null;
};

function PatientMatch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { emit } = useSocket();

  const [caseData, setCaseData] = useState(location.state?.caseData || null);
  const [specialty, setSpecialty] = useState(location.state?.specialty || null);
  const [doctors, setDoctors] = useState(location.state?.doctors || []);
  const [loading, setLoading] = useState(false);
  const [manualDoctorId, setManualDoctorId] = useState(null);
  const [creatingRequest, setCreatingRequest] = useState(false);

  const caseId = params.caseId;

  // Persist/redirect: if this case already has an active request or consultation, send user to the latest step
  useEffect(() => {
    const ensureLatestStep = async () => {
      if (!caseId) return;
      try {
        const { matchRequest, consultation, step } = await fetchMatchingStatusByCase(caseId);
        if (consultation) {
          navigate(`/easy-telemed/matching/${caseId}/wait`, {
            state: { requestId: matchRequest?.request_id, caseData, specialty, mode: 'auto' },
            replace: true,
          });
          return;
        }
        if (matchRequest) {
          // Already in progress; go to waiting page
          navigate(`/easy-telemed/matching/${caseId}/wait`, {
            state: { requestId: matchRequest.request_id, caseData, specialty, mode: matchRequest.mode },
            replace: true,
          });
        }
      } catch (e) {
        // ignore; fall through to normal flow
      }
    };
    ensureLatestStep();
  }, [caseId]);

  useEffect(() => {
    if (!caseData && caseId) {
      const API_BASE = import.meta?.env?.VITE_BACKEND_URL || "http://localhost:3001";
      const load = async () => {
        try {
          const resp = await fetch(`${API_BASE}/api/cases/${caseId}`, {
            credentials: "include",
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          setCaseData(json.case);
          setSpecialty(resolveSpecialty(json.case));
        } catch (error) {
          console.error("Unable to fetch case", error);
          message.error(t("FETCH_CASE_FAILED", "ไม่สามารถโหลดข้อมูลเคสได้"));
        }
      };
      load();
    } else if (caseData && !specialty) {
      setSpecialty(resolveSpecialty(caseData));
    }
  }, [caseId, caseData, specialty, t]);

  useEffect(() => {
    const loadDoctors = async () => {
      if (!specialty) return;
      setLoading(true);
      try {
        const { doctors: activeDoctors } = await fetchActiveDoctorsBySpecialty(
          specialty.id || specialty.name
        );
        setDoctors(activeDoctors || []);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
        message.error(t("FETCH_DOCTORS_FAILED", "ไม่สามารถโหลดรายชื่อแพทย์ได้"));
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, [specialty, t]);

  const availableDoctorCount = doctors.length;

  const handleCreateRequest = async ({ mode, doctorId }) => {
    if (!caseData?.case_id) {
      message.error(t("CASE_ID_NOT_FOUND", "ไม่พบหมายเลขเคส"));
      return;
    }

    setCreatingRequest(true);
    try {
      const targetDoctorId = doctorId || (doctors.length ? doctors[0].id : null);
      const matchRequest = await createMatchRequest({
        caseId: caseData.case_id,
        patientId: caseData.patient_id,
        mode,
        preferredDoctorId: targetDoctorId,
        specialty,
      });

      if (!matchRequest?.request_id) {
        throw new Error("Match request was not created");
      }

      emit("patient:match_request_created", {
        requestId: matchRequest.request_id,
        doctorId: targetDoctorId,
        caseId: caseData.case_id,
        patientId: caseData.patient_id,
        specialty,
        mode,
      });

      navigate(`/easy-telemed/matching/${caseData.case_id}/wait`, {
        state: {
          requestId: matchRequest.request_id,
          caseData,
          specialty,
          mode,
          doctorId: targetDoctorId,
        },
        replace: true,
      });
    } catch (error) {
      console.error("Failed to create match request", error);
      message.error(error.message || t("CREATE_MATCH_FAILED", "ไม่สามารถส่งคำขอได้"));
    } finally {
      setCreatingRequest(false);
    }
  };

  const handleAutoMatch = () => {
    if (!availableDoctorCount) {
      message.warning(
        t("NO_DOCTOR_AVAILABLE", "ขณะนี้ไม่มีแพทย์ออนไลน์ในแผนกนี้")
      );
      return;
    }

    const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
    handleCreateRequest({ mode: "auto", doctorId: randomDoctor?.id });
  };

  const handleManualConfirm = () => {
    if (!manualDoctorId) {
      message.warning(t("SELECT_DOCTOR_FIRST", "กรุณาเลือกแพทย์ก่อน"));
      return;
    }
    handleCreateRequest({ mode: "manual_pick", doctorId: manualDoctorId });
  };

  const manualDoctor = useMemo(
    () => doctors.find((doc) => doc.id === manualDoctorId) || null,
    [doctors, manualDoctorId]
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {t("MATCHING_ROOM_TITLE", "เลือกวิธีพบแพทย์")}
                </Title>
                <Paragraph style={{ margin: "4px 0 0", color: "#666" }}>
                  {t("MATCHING_ROOM_SUBTITLE", "เลือกวิธีเข้าพบแพทย์สำหรับเคสของคุณ")}
                </Paragraph>
              </div>
              <Tag color="blue">
                {specialty ? specialty.name_th || specialty.name : t("UNKNOWN_SPECIALTY", "ไม่ระบุแผนก")}
              </Tag>
            </div>

            <Alert
              type={availableDoctorCount ? "success" : "warning"}
              showIcon
              message={
                availableDoctorCount
                  ? t("DOCTOR_AVAILABLE_COUNT", {
                      defaultValue: "มีแพทย์ที่พร้อมให้บริการ {{count}} คน",
                      count: availableDoctorCount,
                    })
                  : t("NO_DOCTOR_AVAILABLE", "ขณะนี้ไม่มีแพทย์ออนไลน์ในแผนกนี้")
              }
              description={
                availableDoctorCount
                  ? t(
                      "MATCHING_HINT",
                      "คุณสามารถให้ระบบสุ่มแพทย์ให้โดยอัตโนมัติ หรือเลือกแพทย์ที่คุณต้องการได้เอง"
                    )
                  : t(
                      "MATCHING_HINT_NO_DOCTOR",
                      "ระบบจะส่งคำขอไว้และแจ้งเตือนเมื่อมีแพทย์ออนไลน์"
                    )
              }
            />
          </Space>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <Card
            title={t("AUTO_MATCH", "จับคู่แพทย์อัตโนมัติ")}
            bordered
            hoverable
            style={{ borderColor: "#1890ff" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Paragraph>
                {t(
                  "AUTO_MATCH_DESC",
                  "ระบบจะเลือกแพทย์ที่พร้อมให้บริการในแผนกนี้ให้คุณอัตโนมัติ"
                )}
              </Paragraph>
              <Button
                type="primary"
                size="large"
                onClick={handleAutoMatch}
                disabled={!availableDoctorCount || creatingRequest}
                loading={creatingRequest}
              >
                {t("AUTO_MATCH_BUTTON", "เริ่มจับคู่แพทย์อัตโนมัติ")}
              </Button>
            </Space>
          </Card>

          <Card title={t("MANUAL_MATCH", "เลือกแพทย์เอง")} bordered hoverable>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Paragraph>
                {t(
                  "MANUAL_MATCH_DESC",
                  "เลือกแพทย์ที่ต้องการจากรายชื่อแพทย์ที่ออนไลน์ในแผนกนี้"
                )}
              </Paragraph>

              <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
                {loading ? (
                  <Paragraph>{t("LOADING_DOCTORS", "กำลังโหลดรายชื่อแพทย์...")}</Paragraph>
                ) : doctors.length ? (
                  doctors.map((doctor) => {
                    const isSelected = manualDoctorId === doctor.id;
                    return (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => setManualDoctorId(doctor.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 14px",
                          marginBottom: 8,
                          borderRadius: 10,
                          border: `2px solid ${isSelected ? "#1890ff" : "#d9d9d9"}`,
                          backgroundColor: isSelected ? "rgba(24,144,255,0.1)" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{doctor.displayName}</div>
                        {doctor.hospital && (
                          <div style={{ color: "#666", fontSize: 12 }}>{doctor.hospital}</div>
                        )}
                        <div style={{ marginTop: 4 }}>
                          <Tag color="green">{t("STATUS_ACTIVE", "พร้อมให้บริการ")}</Tag>
                          <Tag>{formatRelative(doctor.lastSeenAt)}</Tag>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <Paragraph style={{ color: "#999" }}>
                    {t("NO_DOCTOR_AVAILABLE", "ขณะนี้ไม่มีแพทย์ออนไลน์ในแผนกนี้")}
                  </Paragraph>
                )}
              </div>

              <Button
                type="primary"
                onClick={handleManualConfirm}
                disabled={!manualDoctorId || creatingRequest}
                loading={creatingRequest}
              >
                {manualDoctor
                  ? `ยืนยันเลือก ${manualDoctor.displayName}`
                  : t("CONFIRM_MANUAL", "ยืนยันการเลือกแพทย์")}
              </Button>
            </Space>
          </Card>
        </div>

        <Card>
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            <Text type="secondary">
              {t(
                "MATCHING_NOTICE",
                "เมื่อส่งคำขอแล้ว กรุณารอแพทย์ตอบรับ ระบบจะแจ้งเตือนทันที"
              )}
            </Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default PatientMatch;
