import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, Steps, Button, Space, Typography, Tag, message, Alert, Spin } from "antd";
import { supabase } from "../../api/SupabaseClient";
import { subscribeMatchRequest } from "../../services/matchingService";
import { useSocket } from "../../context/SocketContext.jsx";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase.jsx";
import specializations from "../../specialization.json";

const { Title, Paragraph, Text } = Typography;

const CLOSED_CONSULTATION_STATUSES = new Set(['completed', 'canceled', 'cancel_by_error']);

const STATUS_STEPS = [
  { key: "waiting", label: "รอแพทย์ตอบรับ" },
  { key: "offered", label: "ส่งคำขอไปยังแพทย์" },
  { key: "accepted", label: "แพทย์ตอบรับ" },
  { key: "doctor_ready", label: "แพทย์กำลังเรียกเข้าห้อง" },
  { key: "doctor_in_room", label: "อยู่ในห้องปรึกษา" },
  { key: "doctor_on_hold", label: "แพทย์กำลังเตรียมสรุปผล" },
  { key: "doctor_ready_conclude", label: "แพทย์โทรแจ้งสรุปผล" },
  { key: "awaiting_payment", label: "รอชำระเงิน" },
  { key: "cancel_by_error", label: "การปรึกษาถูกยกเลิก (ระบบขัดข้อง)" },
  { key: "completed", label: "เสร็จสิ้น" },
];

const getStepIndex = (status) => {
  const index = STATUS_STEPS.findIndex((step) => step.key === status);
  return index === -1 ? 0 : index;
};

const mapConsultationStatusToPatientStatus = (status) => {
  switch (status) {
    case 'doctor_in_room':
    case 'active':
      return 'doctor_in_room';
    case 'on_hold':
      return 'doctor_on_hold';
    case 'doctor_ready_conclude':
    case 'summarizing':
      return 'doctor_ready_conclude';
    case 'awaiting_payment':
      return 'awaiting_payment';
    case 'cancel_by_error':
      return 'cancel_by_error';
    case 'completed':
      return 'completed';
    case 'pending':
      return 'doctor_ready';
    default:
      return null;
  }
};

const resolveSpecialty = (caseRow, fallback) => {
  if (fallback) return fallback;
  if (!caseRow) return null;
  if (caseRow.requested_specialty_id) {
    return specializations.find((spec) => spec.id === caseRow.requested_specialty_id) || null;
  }
  if (caseRow.requested_specialty) {
    const lower = String(caseRow.requested_specialty).trim().toLowerCase();
    return (
      specializations.find((spec) => spec.name.toLowerCase() === lower) ||
      specializations.find((spec) => spec.name_th?.toLowerCase() === lower) ||
      null
    );
  }
  return null;
};

function PatientWait() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { socket } = useSocket();
  const { user } = useUserAuthSupabase();
  const initialSpecialty = location.state?.specialty || null;

  const [matchRequest, setMatchRequest] = useState(location.state?.matchRequest || null);
  const [caseData, setCaseData] = useState(location.state?.caseData || null);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(location.state?.mode ? "waiting" : matchRequest?.status || "waiting");
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  const requestId = location.state?.requestId || params.requestId || matchRequest?.request_id;
  const hasPrefilledContext = Boolean(location.state?.matchRequest || location.state?.caseData);

  useEffect(() => {
    if (hasPrefilledContext) {
      setLoading(false);
    }
  }, [hasPrefilledContext]);

  // Show steps only when this context belongs to the signed-in patient
  const showSteps = useMemo(() => {
    const uid = user?.user_id;
    if (!uid) return false;
    // If we have a case loaded and it belongs to user, show
    if (caseData?.patient_id && caseData.patient_id === uid) return true;
    // Or if consultation belongs to user, show
    if (consultation?.patient_id && consultation.patient_id === uid) return true;
    // Else hide (e.g., opened without creating a request)
    return false;
  }, [user?.user_id, caseData?.patient_id, consultation?.patient_id]);

  useEffect(() => {
    if (caseData && !specialty) {
      setSpecialty(resolveSpecialty(caseData, initialSpecialty));
    }
  }, [caseData, specialty, initialSpecialty]);

  useEffect(() => {
    const fetchMatchRequest = async () => {
      if (!requestId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("match_requests")
          .select("*")
          .eq("request_id", requestId)
          .single();
        if (error) throw error;
        setMatchRequest(data);
        setCurrentStatus(data.status || "waiting");

        if (!caseData) {
          const { data: caseRow } = await supabase
            .from("patient_cases")
            .select("*")
            .eq("case_id", data.case_id)
            .single();
          if (caseRow) {
            setCaseData(caseRow);
            setSpecialty(resolveSpecialty(caseRow, initialSpecialty));
          }
        }
      } catch (error) {
        console.error("Failed to load match request", error);
        message.error(t("FETCH_MATCH_FAILED", "ไม่สามารถโหลดข้อมูลการจับคู่ได้"));
      } finally {
        setLoading(false);
      }
    };

    if (!matchRequest && requestId) {
      fetchMatchRequest();
    }
  }, [requestId, matchRequest, caseData, t, initialSpecialty]);

  // Fallback: on refresh without state, derive context from consultations for this user
  useEffect(() => {
    (async () => {
      if (matchRequest || requestId) {
        return;
      }
      if (!user?.user_id) {
        return;
      }
      setLoading(true);
      try {
        // Try latest active consultation for this patient
        const { data: consult } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', user.user_id)
          .in('status', ['pending', 'doctor_in_room', 'on_hold', 'doctor_ready_conclude', 'summarizing', 'awaiting_payment', 'active'])
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (consult) {
          setConsultation(consult);
          if (consult.status === 'doctor_ready_conclude' || consult.status === 'summarizing') {
            setCurrentStatus('doctor_ready_conclude');
          } else if (consult.status === 'on_hold') {
            setCurrentStatus('doctor_on_hold');
          } else if (consult.status === 'doctor_in_room' || consult.status === 'active') {
            setCurrentStatus('doctor_in_room');
          } else if (consult.status === 'awaiting_payment') {
            setCurrentStatus('awaiting_payment');
          } else if (consult.status === 'completed') {
            setCurrentStatus('completed');
          } else {
            setCurrentStatus('doctor_ready');
          }
          // Load case and latest match for the case
          if (consult.case_id) {
            try {
              const { data: caseRow } = await supabase
                .from('patient_cases')
                .select('*')
                .eq('case_id', consult.case_id)
                .single();
              if (caseRow) {
                setCaseData(caseRow);
                setSpecialty(resolveSpecialty(caseRow, initialSpecialty));
              }
              const { data: m } = await supabase
                .from('match_requests')
                .select('*')
                .eq('case_id', consult.case_id)
                .order('created_at', { ascending: false })
                .maybeSingle();
              if (m) setMatchRequest(m);
            } catch (_) {}
          }
          return; // done
        }

        // Else, try latest match from recent cases of this patient
        const { data: cases } = await supabase
          .from('patient_cases')
          .select('case_id')
          .eq('patient_id', user.user_id)
          .order('created_at', { ascending: false })
          .limit(5);
        const caseIds = (cases || []).map(c => c.case_id);
        if (caseIds.length > 0) {
          const { data: m2 } = await supabase
            .from('match_requests')
            .select('*')
            .in('case_id', caseIds)
            .order('created_at', { ascending: false })
            .maybeSingle();
          if (m2) {
            setMatchRequest(m2);
            setCurrentStatus(m2.status || 'waiting');
            const { data: caseRow } = await supabase
              .from('patient_cases')
              .select('*')
              .eq('case_id', m2.case_id)
              .single();
            if (caseRow) {
              setCaseData(caseRow);
              setSpecialty(resolveSpecialty(caseRow, initialSpecialty));
            }
          }
        }
      } catch (_) {
        // silent fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [matchRequest, requestId, user?.user_id, initialSpecialty]);

  useEffect(() => {
    if (!matchRequest?.preferred_doctor_id) return;

    const fetchDoctor = async () => {
      const doctorId = matchRequest.preferred_doctor_id;
      const [{ data: userRow }, { data: profileRow }] = await Promise.all([
        supabase
          .from("app_users")
          .select("user_id, display_name, phone")
          .eq("user_id", doctorId)
          .maybeSingle(),
        supabase
          .from("doctor_profiles")
          .select("user_id, hospital, specialties")
          .eq("user_id", doctorId)
          .maybeSingle(),
      ]);

      setDoctorInfo({
        doctorId,
        displayName: userRow?.display_name,
        phone: userRow?.phone,
        hospital: profileRow?.hospital,
      });
    };

    fetchDoctor();
  }, [matchRequest?.preferred_doctor_id]);

  useEffect(() => {
    if (!matchRequest?.case_id) return;

    const fetchConsultation = async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("case_id", matchRequest.case_id)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (!error && data) {
        setConsultation(data);
        const mappedStatus = mapConsultationStatusToPatientStatus(data.status);
        if (mappedStatus) setCurrentStatus(mappedStatus);
      }
    };

    fetchConsultation();
  }, [matchRequest?.case_id, currentStatus]);

  // Fallback polling: check consultation every 10s while waiting
  useEffect(() => {
    if (!matchRequest?.case_id) return undefined;
    // Do not promote to in-room states from polling alone; rely on explicit doctor:ready invite
    if (consultation && ['doctor_ready', 'doctor_in_room'].includes(currentStatus)) return undefined;
    const id = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('consultations')
          .select('*')
          .eq('case_id', matchRequest.case_id)
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (data) {
          setConsultation(data);
          const mappedStatus = mapConsultationStatusToPatientStatus(data.status);
          if (mappedStatus) setCurrentStatus(mappedStatus);
        }
      } catch (_) {}
    }, 10000);
    return () => clearInterval(id);
  }, [matchRequest?.case_id, consultation, currentStatus]);

  useEffect(() => {
    if (!requestId) return;
    const unsubscribe = subscribeMatchRequest(requestId, (data) => {
      if (!data) return;
      setMatchRequest(data);
      const requestStatus = data.status || "waiting";

      setCurrentStatus(prev => {
        // Preserve richer consultation-driven statuses once user is in-room or beyond
        const stickyStatuses = new Set([
          'doctor_in_room',
          'doctor_on_hold',
          'doctor_ready_conclude',
          'awaiting_payment',
          'cancel_by_error',
          'completed',
        ]);
        if (stickyStatuses.has(prev)) {
          return prev;
        }
        // Otherwise allow match request status to drive UI
        return requestStatus;
      });
    });
    return unsubscribe;
  }, [requestId]);

  useEffect(() => {
    if (!socket || !requestId) return;

    const handleDoctorReady = (payload) => {
      // Accept if:
      // - requestId matches, OR
      // - consultation.patient_id matches current user, OR
      // - caseId matches current matchRequest
      const belongsToUser = payload?.consultation?.patient_id && user?.user_id && payload.consultation.patient_id === user.user_id;
      const sameRequest = payload?.requestId && requestId && payload.requestId === requestId;
      const sameCase = payload?.caseId && matchRequest?.case_id && payload.caseId === matchRequest.case_id;
      if (sameRequest || belongsToUser || sameCase) {
        const statusFromPayload = mapConsultationStatusToPatientStatus(payload?.consultation?.status);
        const nextStatus = statusFromPayload || "doctor_ready";
        setCurrentStatus(nextStatus);
        if (payload.consultation) {
          setConsultation(payload.consultation);
        }
        if (nextStatus === 'doctor_ready_conclude') {
          message.success('แพทย์กำลังสรุปผลและจะติดต่อกลับในไม่ช้า');
        } else if (nextStatus === 'doctor_on_hold') {
          message.info('แพทย์กำลังเตรียมสรุปผล');
        } else if (nextStatus === 'cancel_by_error') {
          message.error('การปรึกษาถูกยกเลิกเนื่องจากระบบขัดข้อง กรุณาลองใหม่อีกครั้ง');
        } else {
          message.success(t("DOCTOR_READY", "แพทย์พร้อมให้บริการแล้ว"));
        }
        // นำผู้ป่วยเข้าห้อง telemed อัตโนมัติเมื่อแพทย์โทรหา
        const consultId = payload?.consultation?.consultation_id;
        const caseId = payload?.caseId || matchRequest?.case_id;
        if (consultId && caseId) {
          try {
            localStorage.setItem('activeConsultationId', consultId);
            localStorage.setItem('patientInvitedConsultationId', consultId);
          } catch {}
          navigate(`/easy-telemed/telemedroom?consultationId=${consultId}&caseId=${caseId}`, { replace: true });
        }
      }
    };

    socket.on("doctor:ready", handleDoctorReady);
    const handleConsultationUpdated = (payload) => {
      if (!payload?.consultationId || !payload?.status) return;
      if (consultation?.consultation_id && payload.consultationId !== consultation.consultation_id) return;
      const mappedStatus = mapConsultationStatusToPatientStatus(payload.status);
      if (mappedStatus) {
        setCurrentStatus(mappedStatus);
        if (mappedStatus === 'doctor_on_hold') {
          message.info('แพทย์กำลังเตรียมสรุปผล');
        } else if (mappedStatus === 'doctor_ready_conclude') {
          message.success('แพทย์กำลังสรุปผลและจะติดต่อกลับในไม่ช้า');
        } else if (mappedStatus === 'awaiting_payment') {
          message.success('กรุณาดำเนินการชำระเงินตามที่ได้รับแจ้ง');
        } else if (mappedStatus === 'completed') {
          message.success('การปรึกษาเสร็จสิ้น');
        } else if (mappedStatus === 'cancel_by_error') {
          message.error('การปรึกษาถูกยกเลิกเนื่องจากระบบขัดข้อง กรุณาลองใหม่อีกครั้ง');
        }
      }
      if (payload.consultationId) {
        setConsultation((prev) => (prev ? { ...prev, status: payload.status } : prev));
      }
    };
    socket.on('consultation:updated', handleConsultationUpdated);

    return () => {
      socket.off("doctor:ready", handleDoctorReady);
      socket.off('consultation:updated', handleConsultationUpdated);
    };
  }, [socket, requestId, t, consultation?.consultation_id, navigate, matchRequest?.case_id]);

  const stepIndex = useMemo(() => getStepIndex(currentStatus), [currentStatus]);

  // ถ้ายังไม่มีคำขอและไม่มี consultation ของผู้ใช้ แสดงฟอร์มจองปกติในหน้านี้เลย
  const hasStoredTelemedSession = useCallback(() => {
    try {
      return (
        localStorage.getItem('patientInvitedConsultationId') ||
        localStorage.getItem('activeConsultationId')
      );
    } catch {
      return null;
    }
  }, []);

  const restoreStoredStatus = useCallback(() => {
    try {
      return localStorage.getItem('patientTelemedStatus') || null;
    } catch {
      return null;
    }
  }, []);

  const shouldShowInlineForm = useMemo(() => {
    const uid = user?.user_id;
    if (!uid) return false;
    const belongs = (caseData?.patient_id === uid) || (consultation?.patient_id === uid);
    if (belongs) return false; // มีของตัวเองแล้ว ไม่ต้องแสดงฟอร์มใหม่
    if (hasStoredTelemedSession()) return false;
    return !loading && !matchRequest && !consultation;
  }, [user?.user_id, caseData?.patient_id, consultation?.patient_id, loading, matchRequest, consultation, currentStatus, hasStoredTelemedSession]);

  // ถ้าผู้ใช้ยังไม่ได้ส่งคำขอ พาไปหน้าแบบฟอร์มหลัก (PatientOnCase) ให้เหมือนภาพตัวอย่าง
  useEffect(() => {
    if (!user?.user_id) return; // wait until auth known
    if (shouldShowInlineForm) {
      // guard: avoid ping-pong if already on illness-case
      if (!window.location.pathname.endsWith('/easy-telemed/illness-case')) {
        navigate('/easy-telemed/illness-case', { replace: true });
      }
    }
  }, [shouldShowInlineForm, navigate, user?.user_id]);

  useEffect(() => {
    if (currentStatus !== 'waiting') return;
    const stored = restoreStoredStatus();
    if (stored && stored !== currentStatus) {
      setCurrentStatus(stored);
    }
  }, [currentStatus, restoreStoredStatus]);

  const handleJoinTelemed = () => {
    if (!consultation?.consultation_id) {
      message.error(t("CONSULTATION_NOT_READY", "ยังไม่สามารถเข้าห้องได้ กรุณารอสักครู่"));
      return;
    }
    if (consultation.status && CLOSED_CONSULTATION_STATUSES.has(consultation.status)) {
      message.warning(t('CONSULTATION_CLOSED', 'ไม่สามารถเข้าห้องได้เนื่องจากการปรึกษาสิ้นสุดแล้ว'));
      return;
    }
    setCalling(true);
    navigate(`/easy-telemed/telemedroom?consultationId=${consultation.consultation_id}&caseId=${matchRequest.case_id}`);
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Title level={3} style={{ margin: 0 }}>
              {t("WAITING_ROOM_TITLE", "รอแพทย์ตอบรับคำขอ")}
            </Title>
            <Paragraph style={{ margin: 0, color: "#666" }}>
              {t("WAITING_ROOM_DESC", "เมื่อแพทย์ตอบรับ ระบบจะแจ้งเตือนอัตโนมัติและพาคุณเข้าสู่ห้องปรึกษา")}
            </Paragraph>
            {specialty && (
              <Tag color="blue" style={{ alignSelf: "flex-start" }}>
                {specialty.name_th || specialty.name}
              </Tag>
            )}
          </Space>
        </Card>

        {showSteps ? (
          <Card>
            <Steps
              direction="vertical"
              size="small"
              current={stepIndex}
              items={STATUS_STEPS.map((step) => ({
                title: t(step.key.toUpperCase(), step.label),
              }))}
            />
          </Card>
        ) : (
          <Card>
            <Paragraph style={{ margin: 0, color: '#666' }}>
              {t('NO_ACTIVE_REQUEST', 'คุณยังไม่ได้ส่งคำขอปรึกษาแพทย์ กรุณากลับไปเริ่มต้นแบบฟอร์มเพื่อส่งคำขอ')}
            </Paragraph>
          </Card>
        )}

        {(
          <Card>
            {matchRequest ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Alert
                message={t("REQUEST_STATUS", "สถานะคำขอ")}
                description={t(currentStatus.toUpperCase(), currentStatus)}
                type={
                  ["accepted", "doctor_ready", "doctor_in_room", "doctor_ready_conclude"].includes(currentStatus)
                    ? "success"
                    : currentStatus === "cancel_by_error"
                    ? "error"
                    : "info"
                }
                showIcon
              />

              {doctorInfo && (
                <div style={{
                  padding: 16,
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  borderRadius: 8,
                }}>
                  <Paragraph style={{ marginBottom: 8 }}>
                    <strong>{t("ASSIGNED_DOCTOR", "แพทย์ที่จะให้บริการ")}</strong>
                  </Paragraph>
                  <Paragraph style={{ margin: 0 }}>
                    {doctorInfo.displayName || t("DOCTOR_NAME_FALLBACK", "แพทย์ไม่ระบุชื่อ")}
                  </Paragraph>
                  {doctorInfo.hospital && (
                    <Text type="secondary">{doctorInfo.hospital}</Text>
                  )}
                </div>
              )}

              {['doctor_ready', 'doctor_in_room', 'doctor_ready_conclude'].includes(currentStatus) && consultation && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="success"
                  showIcon
                  message={t("CONSULTATION_READY", "หากแพทย์โทรหา โปรดเตรียมกล้อง/ไมโครโฟนให้พร้อม")}
                  description="เมื่อได้รับสาย คุณจะเข้าสู่หน้าเตรียมกล้องเพื่อกดยืนยันเข้าห้องโดยอัตโนมัติ"
                />
              )}
              {currentStatus === 'cancel_by_error' && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="error"
                  showIcon
                  message="การปรึกษาถูกยกเลิกเนื่องจากระบบขัดข้อง กรุณาติดต่อเจ้าหน้าที่หรือเริ่มคำขอใหม่"
                />
              )}
            </Space>
            ) : loading ? (
              <Spin />
            ) : (
              <Paragraph>{t("REQUEST_NOT_FOUND", "ไม่พบข้อมูลคำขอ กรุณากลับไปเริ่มใหม่")}</Paragraph>
            )}
          </Card>
        )}
      </Space>
    </div>
  );
}

export default PatientWait;
