import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, Typography, Space, Spin, Tag, Descriptions, Divider, Button, Badge, message, Steps, Alert, Modal, List } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../api/SupabaseClient";
import TwilioVideoRoom from "../../components/TwilioVideoRoom";
import {
  markConsultationStarted,
  moveToSummarizing,
  pauseConsultation,
  completeSummary,
  moveToAwaitingPayment,
  markConsultationPaid,
} from "../../services/consultationService";
import TelemedNotes from "../../components/TelemedNotes";
import DoctorSummary from "../../components/DoctorSummary";
import TelemedChat from "../../components/TelemedChat";
import { useSocket } from "../../context/SocketContext.jsx";
import { fetchDoctorQueue, acceptMatchRequestBackend, createConsultationBackend, doctorHeartbeat } from "../../services/matchingService";

const { Title, Paragraph } = Typography;

const parseAttachments = (attachments) => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  try {
    return JSON.parse(attachments);
  } catch {
    return [];
  }
};

function TelemedRoom() {
  const { user, role } = useUserAuthSupabase();
  const { emit, socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultationId = searchParams.get("consultationId");
  const fallbackCaseId = searchParams.get("caseId");

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [matchRequest, setMatchRequest] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [queueItems, setQueueItems] = useState([]);
  const lastQueueCountRef = useRef(0);
  const [requestId, setRequestId] = useState(null);
  const [summaryDocuments, setSummaryDocuments] = useState(null);
  const [isProcessingSummary, setIsProcessingSummary] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [videoControlSignal, setVideoControlSignal] = useState(null);
  const [summaryPreview, setSummaryPreview] = useState({ open: false, loading: false, data: null });

  const refreshSummaryDocuments = useCallback(async (targetConsultationId) => {
    const id = targetConsultationId || consultation?.consultation_id;
    if (!id) return null;
    try {
      const { data } = await supabase
        .from('consultation_documents')
        .select('*')
        .eq('consultation_id', id);
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      const aggregated = {};
      data.forEach((doc) => {
        if (doc.kind) {
          aggregated[doc.kind] = doc;
        }
      });
      setSummaryDocuments((prev) => ({ ...(prev || {}), ...aggregated }));
      return aggregated;
    } catch (_) {
      return null;
    }
  }, [consultation?.consultation_id]);

  const loadSummaryPreview = useCallback(async () => {
    const enrichItems = async (itemsCandidate) => {
      const items = Array.isArray(itemsCandidate) ? itemsCandidate : [];
      const drugIds = Array.from(new Set(items.map((it) => it?.drug_id).filter(Boolean)));
      if (drugIds.length === 0) return items;
      try {
        const { data } = await supabase
          .from('drug_catalog')
          .select('drug_id, name, strength')
          .in('drug_id', drugIds);
        const map = new Map();
        (data || []).forEach((drug) => {
          const label = [drug.name, drug.strength].filter(Boolean).join(' ');
          map.set(drug.drug_id, label || drug.name || drug.drug_id);
        });
        return items.map((item) => ({
          ...item,
          drug_name: map.get(item.drug_id) || item.drug_name || item.drug_id || '',
        }));
      } catch (_) {
        return items;
      }
    };

    const meta = summaryDocuments?.summary_pdf?.meta;
    if (meta) {
      return {
        discharge: meta.discharge_summary || null,
        prescription: meta.prescription || null,
        items: await enrichItems(meta.prescription_items),
      };
    }
    if (!consultation?.consultation_id) return null;
    try {
      const { data: discharge } = await supabase
        .from('discharge_summaries')
        .select('*')
        .eq('consultation_id', consultation.consultation_id)
        .maybeSingle();
      if (!discharge) {
        return null;
      }
      let prescription = null;
      let items = [];
      if (discharge.prescription_id) {
        const [{ data: pres }, { data: presItems }] = await Promise.all([
          supabase
            .from('prescriptions')
            .select('*')
            .eq('prescription_id', discharge.prescription_id)
            .maybeSingle(),
          supabase
            .from('prescription_items')
            .select('*')
            .eq('prescription_id', discharge.prescription_id),
        ]);
        prescription = pres || null;
        items = await enrichItems(presItems);
      }
      return { discharge, prescription, items };
    } catch (_) {
      return null;
    }
  }, [summaryDocuments?.summary_pdf?.meta, consultation?.consultation_id]);

  const openSummaryPreview = useCallback(async () => {
    setSummaryPreview((prev) => ({ ...prev, open: true, loading: true }));
    const payload = await loadSummaryPreview();
    if (!payload) {
      message.warning('ไม่พบข้อมูลสรุปผลสำหรับการแสดงตัวอย่าง');
      setSummaryPreview({ open: false, loading: false, data: null });
      return;
    }
    setSummaryPreview({ open: true, loading: false, data: payload });
  }, [loadSummaryPreview]);

  const closeSummaryPreview = useCallback(() => {
    setSummaryPreview({ open: false, loading: false, data: null });
  }, []);

  const isDoctor = role === "doctor";
  const isPatient = role === "patient";
  const consultationReady = Boolean(consultation?.consultation_id);

  // Patient step mapping for doctor's view
  const PATIENT_STATUS_STEPS = [
    { key: "waiting", label: "รอแพทย์ตอบรับ" },
    { key: "offered", label: "ส่งคำขอไปยังแพทย์" },
    { key: "accepted", label: "แพทย์ตอบรับ" },
    { key: "doctor_ready", label: "แพทย์กำลังเรียกเข้าห้อง" },
    { key: "doctor_in_room", label: "กำลังพูดคุยกับแพทย์" },
    { key: "doctor_on_hold", label: "แพทย์กำลังเตรียมสรุปผล" },
    { key: "doctor_ready_conclude", label: "แพทย์โทรแจ้งสรุปผล" },
    { key: "awaiting_payment", label: "รอชำระเงิน" },
    { key: "cancel_by_error", label: "การปรึกษาถูกยกเลิก (ระบบขัดข้อง)" },
    { key: "completed", label: "เสร็จสิ้น" },
  ];

  const patientStatus = React.useMemo(() => {
    // Highest priority: consultation state
    if (consultation?.status === 'awaiting_payment') return 'awaiting_payment';
    if (consultation?.status === 'completed') return 'completed';
    if (consultation?.status === 'cancel_by_error') return 'cancel_by_error';
    if (consultation?.status === 'pending') return 'doctor_ready';
    if (consultation?.status === 'doctor_ready_conclude') return 'doctor_ready_conclude';
    if (consultation?.status === 'summarizing') return 'doctor_ready_conclude';
    if (consultation?.status === 'on_hold') return 'doctor_on_hold';
    if (consultation?.status === 'doctor_in_room') return 'doctor_in_room';
    if (consultation?.consultation_id) return 'doctor_in_room';
    // Next: match request state
    const m = matchRequest?.status;
    if (m === 'doctor_ready') return 'doctor_ready';
    if (m === 'accepted') return 'accepted';
    if (m === 'offered') return 'offered';
    return 'waiting';
  }, [consultation?.status, consultation?.consultation_id, matchRequest?.status]);

  const patientStepIndex = React.useMemo(() => {
    const idx = PATIENT_STATUS_STEPS.findIndex(s => s.key === patientStatus);
    return idx >= 0 ? idx : 0;
  }, [patientStatus]);

  // Doctor horizontal steps (shown once case accepted)
  const DOCTOR_FLOW_STEPS = [
    { key: 'accepted', label: 'รับเคสแล้ว' },
    { key: 'doctor_in_room', label: 'กำลังสนทนา' },
    { key: 'on_hold', label: 'เตรียมสรุปผล' },
    { key: 'doctor_ready_conclude', label: 'โทรแจ้งสรุปผล' },
    { key: 'awaiting_payment', label: 'รอผู้ป่วยชำระเงิน' },
    { key: 'cancel_by_error', label: 'ระบบขัดข้อง' },
    { key: 'completed', label: 'เสร็จสิ้น' },
  ];

  const doctorFlowStatus = React.useMemo(() => {
    const status = consultation?.status;
    if (status === 'doctor_ready_conclude') return 'doctor_ready_conclude';
    if (status === 'summarizing') return 'doctor_ready_conclude';
    if (status === 'on_hold') return 'on_hold';
    if (status === 'awaiting_payment') return 'awaiting_payment';
    if (status === 'cancel_by_error') return 'cancel_by_error';
    if (status === 'completed') return 'completed';
    if (consultationReady && status === 'doctor_in_room') return 'doctor_in_room';
    if (consultationReady && !status) return 'doctor_in_room';
    if (matchRequest?.status === 'accepted') return 'accepted';
    return null;
  }, [consultation?.status, consultationReady, matchRequest?.status]);

  const doctorFlowIndex = React.useMemo(() => {
    if (!doctorFlowStatus) return -1;
    const idx = DOCTOR_FLOW_STEPS.findIndex(s => s.key === doctorFlowStatus);
    return idx >= 0 ? idx : 0;
  }, [doctorFlowStatus]);

  const PATIENT_STATUS_KEY = 'patientTelemedStatus';

  const clearPatientTelemedFlags = useCallback(() => {
    try { localStorage.removeItem('activeConsultationId'); } catch {}
    try { localStorage.removeItem('patientInvitedConsultationId'); } catch {}
    try { localStorage.removeItem(PATIENT_STATUS_KEY); } catch {}
  }, []);

  const defaultRoomName = useMemo(() => {
    // Prefer live state over URL when available
    if (consultation?.consultation_id) return `consult-${consultation.consultation_id}`;
    if (caseData?.case_id) return `case-${caseData.case_id}`;
    if (consultationId) return `consult-${consultationId}`;
    if (fallbackCaseId) return `case-${fallbackCaseId}`;
    return "telemed-room";
  }, [consultation?.consultation_id, caseData?.case_id, consultationId, fallbackCaseId]);

  // ----- Doctor Queue on TelemedRoom -----
  const doctorId = user?.user_id;
  // Keep doctor presence fresh on this page
  useEffect(() => {
    if (!isDoctor || !doctorId) return;
    // immediate ping
    doctorHeartbeat(doctorId, true).catch(() => {});
    const id = setInterval(() => doctorHeartbeat(doctorId, true).catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, [isDoctor, doctorId]);
  const loadQueue = useCallback(async () => {
    if (!isDoctor || !doctorId) return;
    setQueueLoading(true);
    try {
      const items = await fetchDoctorQueue(doctorId);
      // Notify when new items come in
      if (items.length > lastQueueCountRef.current) {
        const diff = items.length - lastQueueCountRef.current;
        message.info(`มีคำขอใหม่จำนวน ${diff} รายการ`);
      }
      lastQueueCountRef.current = items.length;
      setQueueItems(items);
    } catch (e) {
      // Silent fail on this panel
      // console.error('Failed to load doctor queue', e);
    } finally {
      setQueueLoading(false);
    }
  }, [doctorId, isDoctor]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Polling every 20s as fallback
  useEffect(() => {
    if (!isDoctor || !doctorId) return;
    const id = setInterval(loadQueue, 20000);
    return () => clearInterval(id);
  }, [isDoctor, doctorId, loadQueue]);

  // Optional socket triggers if server emits events
  useEffect(() => {
    if (!socket || !isDoctor) return;
    const onMatchCreated = (payload) => {
      // payload: { caseId, requestId, patientId, specialty }
      loadQueue();
      message.info("มีคำขอจับคู่ใหม่");
    };
    const onMatchOffered = () => {
      loadQueue();
    };
    socket.on?.("match:created", onMatchCreated);
    socket.on?.("match:offered", onMatchOffered);
    return () => {
      socket.off?.("match:created", onMatchCreated);
      socket.off?.("match:offered", onMatchOffered);
    };
  }, [socket, isDoctor, loadQueue]);

  useEffect(() => {
    if (!socket) return;
    const onConsultationUpdate = (payload = {}) => {
      if (!payload?.consultationId || !payload?.status) return;
      if (consultation?.consultation_id === payload.consultationId) {
        setConsultation((prev) => (prev ? { ...prev, status: payload.status } : prev));
      } else if (!consultation && payload.consultationId === consultationId) {
        setConsultation((prev) => (prev ? prev : { consultation_id: payload.consultationId, status: payload.status }));
      }
    };
    socket.on?.('consultation:updated', onConsultationUpdate);
    return () => {
      socket.off?.('consultation:updated', onConsultationUpdate);
    };
  }, [socket, consultation?.consultation_id, consultationId]);

  const handleAcceptFromQueue = async (item) => {
    if (!item?.request || !isDoctor || !doctorId) return;
    setAcceptingId(item.request.request_id);
    try {
      const request = await acceptMatchRequestBackend({ requestId: item.request.request_id, doctorId });
      const consultation = await createConsultationBackend({
        caseId: item.request.case_id,
        patientId: item.case?.patient_id,
        doctorId,
        createdBy: doctorId,
      });

      emit?.("doctor:match_accepted", {
        requestId: item.request.request_id,
        patientId: item.case?.patient_id,
        consultation,
      });

      // Update local telemed context to start session here
      setConsultation(consultation);
      setMatchRequest(request);

      // Refresh case + doctor/patient info
      if (consultation?.case_id || item.request.case_id) {
        const caseIdToLoad = consultation?.case_id || item.request.case_id;
        try {
          const { data: caseRow } = await supabase
            .from("patient_cases")
            .select("*")
            .eq("case_id", caseIdToLoad)
            .single();
          setCaseData(caseRow);

          if (caseRow?.patient_id) {
            const { data: patientRow } = await supabase
              .from("app_users")
              .select("user_id, display_name, phone")
              .eq("user_id", caseRow.patient_id)
              .maybeSingle();
            setPatientInfo(patientRow);
          }

          const docId = request?.preferred_doctor_id || doctorId;
          if (docId) {
            const { data: doctorRow } = await supabase
              .from("app_users")
              .select("user_id, display_name, phone")
              .eq("user_id", docId)
              .maybeSingle();
            setDoctorInfo(doctorRow);
          }
        } catch (_) {}
      }

      // Remove accepted item from queue panel
      setQueueItems((prev) => prev.filter((q) => q.request.request_id !== item.request.request_id));
      lastQueueCountRef.current = Math.max(0, lastQueueCountRef.current - 1);
      message.success("รับเคสและสร้างห้องปรึกษาเรียบร้อย");
    } catch (error) {
      message.error(error.message || "ไม่สามารถรับเคสได้");
    } finally {
      setAcceptingId(null);
    }
  };

  const emitDoctorReadySignal = useCallback((successMessage, consultationOverride) => {
    const caseId = consultation?.case_id || caseData?.case_id || fallbackCaseId;
    const consultationPayload = consultationOverride || consultation;
    const patientId =
      consultationPayload?.patient_id ||
      patientInfo?.user_id ||
      caseData?.patient_id ||
      null;
    if (!caseId) {
      message.warning('ยังไม่พบข้อมูลเคสที่จะเชิญผู้ป่วย');
      return;
    }
    emit?.('doctor:ready', {
      requestId: requestId || null,
      caseId,
      consultation: consultationPayload,
      patientId,
    });
    if (successMessage) {
      message.success(successMessage);
    } else {
      message.success('ได้ส่งสัญญาณเรียกผู้ป่วยแล้ว');
    }
  }, [emit, consultation, caseData?.case_id, fallbackCaseId, requestId]);

  const handlePauseForSummary = async () => {
    if (!consultation?.consultation_id) return;
    setIsProcessingSummary(true);
    try {
      const res = await pauseConsultation(consultation.consultation_id);
      if (res?.consultation) {
        setConsultation(res.consultation);
      } else {
        setConsultation((prev) => (prev ? { ...prev, status: 'on_hold' } : prev));
      }
      setVideoControlSignal({ type: 'hangup', retainMedia: true, target: 'patient', ts: Date.now() });
      message.success('พักสายผู้ป่วยและเข้าสู่ขั้นเตรียมสรุปผลแล้ว');
    } catch (e) {
      message.error(e.message || 'ไม่สามารถพักสายเพื่อสรุปผลได้');
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleStartSummaryCall = async () => {
    if (!consultation?.consultation_id) return;
    if (!summaryReady) {
      message.warning('กรุณาสร้างเอกสารสรุปผลก่อนโทรแจ้งผล');
      return;
    }

    setIsProcessingSummary(true);
    try {
      const res = await moveToSummarizing(consultation.consultation_id);
      const updatedConsultation = res?.consultation || consultation;
      if (updatedConsultation) setConsultation(updatedConsultation);
      emitDoctorReadySignal('ได้ส่งสัญญาณเชิญผู้ป่วยกลับมาฟังสรุปแล้ว', updatedConsultation);
    } catch (e) {
      message.error(e.message || 'ไม่สามารถเริ่มโทรแจ้งผลได้');
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleCompleteSummary = async () => {
    if (!consultation?.consultation_id) return;
    setIsProcessingSummary(true);
    try {
      const res = await completeSummary(consultation.consultation_id);
      if (res?.consultation) setConsultation(res.consultation);
      const consultationIdToUse = res?.consultation?.consultation_id || consultation.consultation_id;
      let summaryDoc = res?.documents?.summary_pdf || null;
      if (!summaryDoc) {
        const refreshed = await refreshSummaryDocuments(consultationIdToUse);
        summaryDoc = refreshed?.summary_pdf || null;
      }
      if (summaryDoc) {
        setSummaryDocuments((prev) => ({ ...(prev || {}), summary_pdf: summaryDoc }));
        message.success('สร้างไฟล์สรุปผลเรียบร้อย');
      } else {
        message.warning('ยังไม่พบเอกสารสรุปผลที่สร้างขึ้น โปรดตรวจสอบและลองใหม่');
      }
    } catch (e) {
      message.error(e.message || 'ไม่สามารถสร้างสรุปผลได้');
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleMoveToPayment = async () => {
    if (!consultation?.consultation_id) return;
    setIsProcessingSummary(true);
    try {
      const res = await moveToAwaitingPayment(consultation.consultation_id);
      if (res?.consultation) setConsultation(res.consultation);
      message.success('ส่งต่อให้ผู้ป่วยชำระเงินแล้ว');
      if (isDoctor) {
        setVideoControlSignal({ type: 'hangup', retainMedia: false, target: 'doctor', ts: Date.now() });
        setConsultation(null);
        setCaseData(null);
        setMatchRequest(null);
        navigate('/easy-telemed/telemedroom', { replace: true });
        loadQueue();
      } else {
        loadQueue();
      }
    } catch (e) {
      message.error(e.message || 'ไม่สามารถเปลี่ยนเป็นรอชำระเงินได้');
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handlePatientPaid = async () => {
    if (!consultation?.consultation_id) return;
    setPaymentProcessing(true);
    try {
      const res = await markConsultationPaid(consultation.consultation_id, {});
      if (res?.consultation) setConsultation(res.consultation);
      message.success('บันทึกการชำระเงินเรียบร้อย');
      if (isPatient) {
        navigate(`/easy-telemed/consultation/${consultation.consultation_id}/success`, { replace: true });
      } else {
        loadQueue();
      }
    } catch (e) {
      message.error(e.message || 'ไม่สามารถบันทึกการชำระเงินได้');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const defaultIdentity = useMemo(() => {
    return user?.email || user?.displayName || user?.user_id || "guest";
  }, [user]);

  const consultationStatus = consultation?.status || null;
  const isOnHoldStatus = consultationStatus === 'on_hold';
  const isSummarizingStatus = consultationStatus === 'doctor_ready_conclude' || consultationStatus === 'summarizing';
  const isAwaitingPaymentStatus = consultationStatus === 'awaiting_payment';
  const isCompletedStatus = consultationStatus === 'completed';

  useEffect(() => {
    const loadData = async () => {
      if (!consultationId && !fallbackCaseId) {
        // If doctor refreshed without params, recover latest active consultation for this doctor
        if (isDoctor && doctorId) {
          try {
            setLoading(true);
            const { data: consultRow } = await supabase
              .from('consultations')
              .select('*')
              .eq('doctor_id', doctorId)
              .in('status', ['pending','doctor_in_room','on_hold','doctor_ready_conclude','awaiting_payment','summarizing','active'])
              .order('created_at', { ascending: false })
              .maybeSingle();
            if (consultRow) {
              setConsultation(consultRow);
              const caseId = consultRow.case_id;
              if (caseId) {
                const [{ data: caseRow }, { data: matchRow }] = await Promise.all([
                  supabase.from('patient_cases').select('*').eq('case_id', caseId).single(),
                  supabase.from('match_requests').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).maybeSingle(),
                ]);
                setCaseData(caseRow || null);
                setMatchRequest(matchRow || null);
                if (caseRow?.patient_id) {
                  const { data: patientRow } = await supabase
                    .from('app_users')
                    .select('user_id, display_name, phone')
                    .eq('user_id', caseRow.patient_id)
                    .maybeSingle();
                  setPatientInfo(patientRow || null);
                }
                const docId = (matchRow?.preferred_doctor_id) || consultRow?.doctor_id || doctorId;
                if (docId) {
                  const { data: doctorRow } = await supabase
                    .from('app_users')
                    .select('user_id, display_name, phone')
                    .eq('user_id', docId)
                    .maybeSingle();
                  setDoctorInfo(doctorRow || null);
                }
              }
            } else {
              setConsultation(null);
            }
          } catch (e) {
            // ignore
          } finally {
            setLoading(false);
          }
          return; // handled doctor fallback
        }
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let consultationRow = null;

        if (consultationId) {
          const { data, error } = await supabase
            .from("consultations")
            .select("*")
            .eq("consultation_id", consultationId)
            .single();
          if (error) throw error;
          consultationRow = data;
        }

        if (!consultationRow && fallbackCaseId) {
          const { data } = await supabase
            .from("consultations")
            .select("*")
            .eq("case_id", fallbackCaseId)
            .order("created_at", { ascending: false })
            .maybeSingle();
          consultationRow = data;
        }

        setConsultation(consultationRow);

        const caseId = consultationRow?.case_id || fallbackCaseId;
        if (caseId) {
          const { data: caseRow } = await supabase
            .from("patient_cases")
            .select("*")
            .eq("case_id", caseId)
            .single();
          setCaseData(caseRow);

          const { data: matchRow } = await supabase
            .from("match_requests")
            .select("*")
            .eq("case_id", caseId)
            .order("created_at", { ascending: false })
            .maybeSingle();
          setMatchRequest(matchRow);

          if (caseRow?.patient_id) {
            const { data: patientRow } = await supabase
              .from("app_users")
              .select("user_id, display_name, phone")
              .eq("user_id", caseRow.patient_id)
              .maybeSingle();
            setPatientInfo(patientRow);
          }

          const doctorId = matchRow?.preferred_doctor_id || consultationRow?.doctor_id;
          if (doctorId) {
            const { data: doctorRow } = await supabase
              .from("app_users")
              .select("user_id, display_name, phone")
              .eq("user_id", doctorId)
              .maybeSingle();
            setDoctorInfo(doctorRow);
          }
        }
      } catch (error) {
        console.error("Failed to load telemed context", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [consultationId, fallbackCaseId, isDoctor, doctorId]);

  useEffect(() => {
    const recoverPatientConsultation = async () => {
      if (!isPatient) return;
      if (consultationId || fallbackCaseId || consultation?.consultation_id) return;
      const storedConsultId = (() => {
        try {
          return (
            localStorage.getItem('activeConsultationId') ||
            localStorage.getItem('patientInvitedConsultationId')
          );
        } catch {
          return null;
        }
      })();
      if (!storedConsultId) {
        return;
      }

      setLoading(true);
      try {
        const { data: consultRow } = await supabase
          .from('consultations')
          .select('*')
          .eq('consultation_id', storedConsultId)
          .maybeSingle();

        if (!consultRow || consultRow.patient_id !== user?.user_id) {
          clearPatientTelemedFlags();
          setConsultation(null);
          setCaseData(null);
          setMatchRequest(null);
          return;
        }

        if (!['doctor_in_room', 'doctor_ready_conclude', 'summarizing', 'on_hold', 'active'].includes(consultRow.status || '')) {
          clearPatientTelemedFlags();
          setConsultation(null);
          setCaseData(null);
          setMatchRequest(null);
          return;
        }

        setConsultation(consultRow);

        const caseId = consultRow.case_id;
        if (caseId) {
          const [{ data: caseRow }, { data: matchRow }] = await Promise.all([
            supabase.from('patient_cases').select('*').eq('case_id', caseId).maybeSingle(),
            supabase
              .from('match_requests')
              .select('*')
              .eq('case_id', caseId)
              .order('created_at', { ascending: false })
              .maybeSingle(),
          ]);
          setCaseData(caseRow || null);
          setMatchRequest(matchRow || null);
          if (caseRow?.patient_id) {
            const { data: patientRow } = await supabase
              .from('app_users')
              .select('user_id, display_name, phone')
              .eq('user_id', caseRow.patient_id)
              .maybeSingle();
            setPatientInfo(patientRow || null);
          }
          const docId = matchRow?.preferred_doctor_id || consultRow.doctor_id;
          if (docId) {
            const { data: doctorRow } = await supabase
              .from('app_users')
              .select('user_id, display_name, phone')
              .eq('user_id', docId)
              .maybeSingle();
            setDoctorInfo(doctorRow || null);
          }
        }
      } catch (err) {
        console.error('Failed to recover patient consultation', err);
        clearPatientTelemedFlags();
      } finally {
        setLoading(false);
      }
    };

    recoverPatientConsultation();
  }, [
    isPatient,
    consultationId,
    fallbackCaseId,
    consultation?.consultation_id,
    user?.user_id,
    clearPatientTelemedFlags,
  ]);

  // Patients shouldn't be able to stay on this page without an active consultation
  useEffect(() => {
    if (loading) return;
    if (!isPatient) return;
    // Require explicit invitation flag to allow patient entry, not just presence of a consultation
    const invited = (() => { try { return localStorage.getItem('patientInvitedConsultationId'); } catch { return null; } })();
    if (consultation?.consultation_id) {
      if (invited && invited === consultation.consultation_id) return;
      if (['on_hold', 'summarizing', 'awaiting_payment', 'completed'].includes(consultationStatus)) return;
      clearPatientTelemedFlags();
    } else {
      clearPatientTelemedFlags();
    }
    const caseId = fallbackCaseId || caseData?.case_id;
    if (caseId) {
      navigate(`/easy-telemed/matching/${caseId}/wait`, { replace: true });
    } else {
      navigate('/easy-telemed/illness-case', { replace: true });
    }
  }, [
    loading,
    isPatient,
    consultation?.consultation_id,
    fallbackCaseId,
    caseData?.case_id,
    navigate,
    consultationStatus,
    clearPatientTelemedFlags,
  ]);

  // Load match request id for this case (used when calling patient)
  useEffect(() => {
    const loadRequest = async () => {
      const caseIdToUse = consultation?.case_id || caseData?.case_id || fallbackCaseId;
      if (!caseIdToUse) return;
      try {
        const { data } = await supabase
          .from('match_requests')
          .select('request_id')
          .eq('case_id', caseIdToUse)
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (data?.request_id) setRequestId(data.request_id);
      } catch (_) {}
    };
    // If we already have it from queue accept, skip
    if (!requestId) loadRequest();
  }, [consultation?.case_id, caseData?.case_id, fallbackCaseId, requestId]);

  const lastStatusRef = useRef(null);
  useEffect(() => {
    const currentStatus = consultation?.status || null;
    const prevStatus = lastStatusRef.current;
    if (isPatient && currentStatus && currentStatus !== prevStatus) {
      try {
        localStorage.setItem(PATIENT_STATUS_KEY, currentStatus);
      } catch (_) {}
      if (currentStatus === 'on_hold') {
        setVideoControlSignal({ type: 'hangup', retainMedia: true, target: 'patient', ts: Date.now() });
      } else if (currentStatus === 'awaiting_payment') {
        setVideoControlSignal({ type: 'hangup', retainMedia: true, target: 'patient', ts: Date.now() });
      } else if (currentStatus === 'completed') {
        setVideoControlSignal({ type: 'hangup', retainMedia: false, target: 'patient', ts: Date.now() });
      } else if (currentStatus === 'cancel_by_error') {
        setVideoControlSignal({ type: 'hangup', retainMedia: false, target: 'patient', ts: Date.now() });
      }
    }
    lastStatusRef.current = currentStatus;
  }, [consultation?.status, isPatient]);

  useEffect(() => {
    refreshSummaryDocuments();
  }, [consultation?.consultation_id, refreshSummaryDocuments]);

  const attachments = useMemo(() => parseAttachments(caseData?.attachments), [caseData?.attachments]);
  const summaryReady = Boolean(summaryDocuments?.summary_pdf);
  const patientAutoJoinStatuses = ['doctor_in_room', 'active', 'summarizing'];
  const doctorAutoJoinStatuses = ['doctor_in_room', 'active', 'summarizing'];
  const patientAutoJoin = isPatient && consultationReady && patientAutoJoinStatuses.includes(consultationStatus || '');
  const doctorAutoJoin = isDoctor && consultationReady && (!consultationStatus || doctorAutoJoinStatuses.includes(consultationStatus));
  const videoRoomReady = (isDoctor && consultationReady) || patientAutoJoin;
  const autoJoinEnabled = patientAutoJoin || doctorAutoJoin;
  const hideJoinFormForRole = patientAutoJoin;

  return (
    <div style={{ padding: 20, maxWidth: 1280, margin: "0 auto" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <VideoCameraOutlined style={{ fontSize: 32, color: "#1890ff" }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>Telemed Consultation Room</Title>
                <Paragraph style={{ margin: 0, color: "#666" }}>
                  {consultationId ? `Consultation ID: ${consultationId}` : "Live telemedicine session"}
                </Paragraph>
              </div>
              <Tag color="blue" style={{ marginLeft: "auto" }}>
                {caseData?.requested_specialty || "ทั่วไป"}
              </Tag>
            </div>

            {loading ? (
              <Spin />
            ) : (
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="ผู้ป่วย">
                  {patientInfo?.display_name || caseData?.patient_id || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="แพทย์ผู้ดูแล">
                  {doctorInfo?.display_name || matchRequest?.preferred_doctor_id || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="ระดับความเร่งด่วน">
                  {caseData?.triage_level || "standard"}
                </Descriptions.Item>
                <Descriptions.Item label="ความรุนแรง">
                  {caseData?.severity || "-"}
                </Descriptions.Item>
              </Descriptions>
            )}

            {/* Patient progress indicator for doctor (only if we can resolve the patient of this session) */}
            {(patientInfo?.user_id || caseData?.patient_id) && (
              <Card size="small" style={{ marginTop: 8 }} title="สถานะผู้ป่วย">
                <Steps
                  direction="horizontal"
                  size="small"
                  current={patientStepIndex}
                  items={PATIENT_STATUS_STEPS.map(s => ({ title: s.label }))}
                />
              </Card>
            )}
          </Space>
        </Card>

        {isPatient && isOnHoldStatus && (
          <Alert
            type="info"
            message="แพทย์กำลังสรุปผล"
            description="โปรดรอสายใหม่จากแพทย์ ระบบจะแจ้งเมื่อแพทย์พร้อมพูดคุย"
            showIcon
          />
        )}

        {isPatient && isAwaitingPaymentStatus && (
          <Card type="inner" title="ขั้นตอนการชำระเงิน" style={{ borderColor: '#faad14' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Paragraph>
                กรุณาชำระค่าบริการตามช่องทางที่ได้รับ และกดปุ่มด้านล่างเมื่อชำระเงินเสร็จแล้วเพื่อยืนยันกับระบบ
              </Paragraph>
              <Button
                type="primary"
                loading={paymentProcessing}
                onClick={handlePatientPaid}
              >
                ฉันชำระเงินเรียบร้อยแล้ว
              </Button>
            </Space>
          </Card>
        )}

        {isDoctor && summaryReady && (
          <Alert
            type="success"
            message="สร้างเอกสารสรุปผลสำเร็จ"
            description="สามารถดาวน์โหลดเอกสารได้จากส่วนเอกสารสรุปผลด้านขวา และส่งต่อให้ผู้ป่วยได้ทันที"
            showIcon
          />
        )}

  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1.2fr)", gap: 16, alignItems: "start" }}>
          <Card style={{ minHeight: 580 }} bodyStyle={{ padding: 0, height: "100%" }}>
            <TwilioVideoRoom
              defaultRoomName={defaultRoomName}
              defaultIdentity={defaultIdentity}
              autoJoin={autoJoinEnabled}
              hideJoinForm={hideJoinFormForRole}
              lockRoomName
              lockIdentity
              controlSignal={videoControlSignal}
              canJoin={videoRoomReady}
              onConnected={async (room) => {
                try {
                  if (consultation?.consultation_id) {
                    if (isDoctor) {
                      // Persist start; backend will set status=doctor_in_room and started_at, and may store room_id if provided
                      await markConsultationStarted(consultation.consultation_id, room?.sid || null);
                      // Reflect status locally for smoother UX (no room_sid in schema)
                      setConsultation((prev) => (prev ? { ...prev, status: 'doctor_in_room' } : prev));
                    }
                    // Persist active consultation for patient to enable guarded menu
                    try {
                      localStorage.setItem('activeConsultationId', consultation.consultation_id);
                    } catch {}
                  }
                } catch (_) {}
              }}
              onDisconnected={async () => {
                try {
                  localStorage.removeItem('activeConsultationId');
                } catch {}
                if (isPatient) {
                  if (consultation?.status === 'completed') {
                    clearPatientTelemedFlags();
                    return;
                  }
                }
              }}
            />
            {!consultationReady && isDoctor && (
              <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
                <Button
                  type="primary"
                  onClick={async () => {
                    if (!queueItems[0]) {
                      message.info('ยังไม่มีคำขอให้เรียก');
                      return;
                    }
                    await handleAcceptFromQueue(queueItems[0]);
                  }}
                >
                  โทรหาผู้ป่วย (รับเคสล่าสุด)
                </Button>
              </div>
            )}
            {consultationReady && isDoctor && (
              <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Space wrap size={8}>
                  {(() => {
                    const rawStatus = consultation?.status || (consultationReady ? 'pending' : '');
                    const normalizedStatus = (() => {
                      if (rawStatus === 'summarizing') return 'doctor_ready_conclude';
                      if (rawStatus === 'active') return 'doctor_in_room';
                      return rawStatus;
                    })();

                    const controls = [];
                    const initialCallAllowed = normalizedStatus === 'pending'
                      || normalizedStatus === 'doctor_ready'
                      || normalizedStatus === 'doctor_in_room';

                    if (initialCallAllowed) {
                      controls.push(
                        <Button
                          key="call-initial"
                          type="primary"
                          onClick={() => emitDoctorReadySignal('ได้ส่งสัญญาณเชิญผู้ป่วยเข้าห้องแล้ว')}
                        >
                          โทรหาผู้ป่วย (เชิญเข้าห้อง)
                        </Button>
                      );
                    }

                    if (normalizedStatus === 'doctor_in_room') {
                      controls.push(
                        <Button
                          key="pause"
                          loading={isProcessingSummary}
                          onClick={handlePauseForSummary}
                        >
                          พักสายเพื่อสรุปผล
                        </Button>
                      );
                    }

                    if (normalizedStatus === 'on_hold') {
                      if (!summaryReady) {
                        controls.push(
                          <Button
                            key="generate-summary"
                            type="primary"
                            loading={isProcessingSummary}
                            onClick={handleCompleteSummary}
                          >
                            สร้างเอกสารสรุปผล
                          </Button>
                        );
                      } else {
                        controls.push(
                          <Button
                            key="preview-summary"
                            onClick={openSummaryPreview}
                          >
                            ดูตัวอย่างสรุปผล
                          </Button>,
                          <Button
                            key="summary-call"
                            type="primary"
                            loading={isProcessingSummary}
                            onClick={handleStartSummaryCall}
                          >
                            โทรแจ้งผลให้ผู้ป่วย
                          </Button>
                        );
                      }
                    }

                    if (normalizedStatus === 'doctor_ready_conclude') {
                      controls.push(
                        <Button
                          key="preview-summary-existing"
                          onClick={openSummaryPreview}
                        >
                          ดูตัวอย่างสรุปผล
                        </Button>,
                        <Button
                          key="summary-recall"
                          type="primary"
                          loading={isProcessingSummary}
                          onClick={handleStartSummaryCall}
                        >
                          โทรแจ้งผลให้ผู้ป่วย
                        </Button>
                      );
                    }

                    if (!summaryReady && normalizedStatus === 'doctor_ready_conclude') {
                      controls.push(
                        <Button
                          key="generate-summary-after"
                          onClick={handleCompleteSummary}
                          loading={isProcessingSummary}
                        >
                          สร้างเอกสารสรุปผล
                        </Button>
                      );
                    }

                    if (summaryReady && ['doctor_in_room', 'doctor_ready_conclude', 'on_hold', 'active', 'summarizing'].includes(normalizedStatus)) {
                      controls.push(
                        <Button
                          key="awaiting-payment"
                          danger
                          loading={isProcessingSummary}
                          onClick={handleMoveToPayment}
                        >
                          ปิดเคส (ส่งต่อให้ชำระเงิน)
                        </Button>
                      );
                    }

                    if (normalizedStatus === 'awaiting_payment') {
                      controls.push(
                        <Button key="await" disabled>
                          รอผู้ป่วยยืนยันการชำระเงิน
                        </Button>
                      );
                      controls.push(
                        <Button
                          key="mark-paid"
                          type="primary"
                          loading={paymentProcessing}
                          onClick={handlePatientPaid}
                        >
                          บันทึกว่าชำระเงินแล้ว
                        </Button>
                      );
                    }

                    if (normalizedStatus === 'cancel_by_error') {
                      controls.push(
                        <Button
                          key="error"
                          danger
                          onClick={() => navigate('/easy-telemed/home', { replace: true })}
                        >
                          ออกจากห้อง (ระบบขัดข้อง)
                        </Button>
                      );
                    }

                    if (normalizedStatus === 'completed') {
                      controls.push(
                        <Button
                          key="completed"
                          onClick={() => navigate('/easy-telemed/home', { replace: true })}
                        >
                          กลับหน้าแรก
                        </Button>
                      );
                    }

                    if (controls.length === 0) {
                      controls.push(
                        <Button key="noop" disabled>
                          ไม่มีการกระทำที่ต้องทำในขณะนี้
                        </Button>
                      );
                    }

                    return controls;
                  })()}
                </Space>
              </div>
            )}
          </Card>

          {/* Doctor flow (horizontal) shown when case accepted or in consultation */}
          {isDoctor && doctorFlowStatus && (
            <Card size="small" title="ขั้นตอนของแพทย์">
              <Steps
                current={doctorFlowIndex}
                items={DOCTOR_FLOW_STEPS.map(s => ({ title: s.label }))}
              />
            </Card>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {isDoctor && (
              <Card size="small" title={<span>Incoming Queue <Badge count={queueItems.length} /></span>}>
                {queueLoading ? (
                  <Spin />
                ) : queueItems.length > 0 ? (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {queueItems.map((item) => (
                      <Card key={item.request.request_id} size="small">
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Space wrap>
                            <Tag color="blue">{item.case?.requested_specialty || "ทั่วไป"}</Tag>
                            <Tag>{item.case?.triage_level || "standard"}</Tag>
                            <Tag color="purple">{item.case?.severity || "-"}</Tag>
                            <Tag color="default">{item.request.status}</Tag>
                          </Space>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ color: "#555" }}>{item.patient?.display_name || item.case?.patient_id}</div>
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => handleAcceptFromQueue(item)}
                              loading={acceptingId === item.request.request_id}
                            >
                              รับเคส
                            </Button>
                          </div>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <div style={{ color: "#999" }}>ยังไม่มีคำขอใหม่</div>
                )}
              </Card>
            )}
            {!consultationReady || isOnHoldStatus || isAwaitingPaymentStatus || isCompletedStatus ? (
              <Card size="small">
                <Paragraph>
                  {(() => {
                    if (!consultationReady) return 'ระบบแชทจะพร้อมใช้งานหลังจากสร้าง consultation แล้ว';
                    if (isOnHoldStatus) return 'แพทย์พักสายเพื่อสรุปผล ชั่วคราวไม่สามารถใช้งานแชท';
                    if (isAwaitingPaymentStatus) return 'อยู่ระหว่างดำเนินการชำระเงิน';
                    if (isCompletedStatus) return 'การปรึกษาเสร็จสิ้น';
                    return 'ไม่พร้อมใช้งาน';
                  })()}
                </Paragraph>
              </Card>
            ) : (
              <TelemedChat consultationId={consultation.consultation_id} currentUser={user} />
            )}
            {consultationReady && isDoctor && (isOnHoldStatus || isSummarizingStatus) ? (
              <DoctorSummary consultationId={consultation.consultation_id} doctorId={doctorInfo?.user_id || user?.user_id} />
            ) : consultationReady ? (
              <TelemedNotes
                consultationId={consultation.consultation_id}
                doctorId={doctorInfo?.user_id || user?.user_id}
                readOnly={!isDoctor}
              />
            ) : (
              <Card size="small">
                <Paragraph>
                  บันทึกจากแพทย์จะแสดงหลังจากเปิด consultation
                </Paragraph>
              </Card>
            )}
            {summaryReady && (
              <Card size="small" title="เอกสารสรุปผล">
                <Space direction="vertical">
                  <Button onClick={openSummaryPreview}>
                    ดูตัวอย่างเอกสารสรุปผล
                  </Button>
                  {summaryDocuments?.summary_pdf?.public_url ? (
                    <a href={summaryDocuments.summary_pdf.public_url} target="_blank" rel="noreferrer">
                      ดาวน์โหลดสรุปผล (PDF)
                    </a>
                  ) : (
                    <Paragraph>ไฟล์ถูกสร้างแล้ว แต่ยังไม่พร้อมให้ดาวน์โหลด</Paragraph>
                  )}
                </Space>
              </Card>
            )}
          </div>
        </div>

        {caseData && (
          <Card title="รายละเอียดอาการเพิ่มเติม">
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>
              {caseData.symptoms_text || "-"}
            </Paragraph>
            {attachments.length > 0 && (
              <>
                <Divider orientation="left">ไฟล์แนบจากผู้ป่วย</Divider>
                <Space direction="vertical">
                  {attachments.map((file, index) => (
                    <a key={index} href={file.url || file.path} target="_blank" rel="noreferrer">
                      📎 {file.name || file.path}
                    </a>
                  ))}
                </Space>
              </>
            )}
          </Card>
        )}
      </Space>
      <Modal
        open={summaryPreview.open}
        onCancel={closeSummaryPreview}
        footer={[
          <Button key="close" onClick={closeSummaryPreview}>
            ปิด
          </Button>,
          summaryDocuments?.summary_pdf?.public_url ? (
            <Button
              key="download"
              type="primary"
              href={summaryDocuments.summary_pdf.public_url}
              target="_blank"
            >
              ดาวน์โหลด PDF
            </Button>
          ) : null,
        ].filter(Boolean)}
        title="ตัวอย่างเอกสารสรุปผล"
        width={720}
      >
        {summaryPreview.loading ? (
          <Spin />
        ) : summaryPreview.data ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title="ข้อมูลการรักษา">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="การวินิจฉัย">
                  {summaryPreview.data.discharge?.diagnosis || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="แผนการรักษา">
                  <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                    {summaryPreview.data.discharge?.plan || '-'}
                  </Paragraph>
                </Descriptions.Item>
                <Descriptions.Item label="คำแนะนำ">
                  <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                    {summaryPreview.data.discharge?.advice || '-'}
                  </Paragraph>
                </Descriptions.Item>
              </Descriptions>
            </Card>
            {summaryPreview.data.items?.length ? (
              <Card size="small" title="รายการยา">
                <List
                  dataSource={summaryPreview.data.items}
                  renderItem={(item, idx) => (
                    <List.Item key={item.item_id || idx}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <strong>{item.drug_name || item.drug_id || `ยา ${idx + 1}`}</strong>
                        <Space wrap>
                          <Tag color="blue">{item.dose || '-'}</Tag>
                          <Tag color="green">{item.route || '-'}</Tag>
                          <Tag color="purple">{item.frequency || '-'}</Tag>
                          <Tag color="gold">{item.duration || '-'}</Tag>
                        </Space>
                        <Paragraph style={{ marginBottom: 0 }}>
                          ปริมาณ: {item.quantity ?? '-'}
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 0 }}>
                          คำแนะนำ: {item.instruction || '-'}
                        </Paragraph>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ) : (
              <Alert message="ไม่มีรายการยาในสรุปผลนี้" type="info" showIcon />
            )}
          </Space>
        ) : (
          <Alert type="warning" message="ไม่พบข้อมูลสำหรับแสดงตัวอย่าง" />
        )}
      </Modal>
    </div>
  );
}
export default TelemedRoom;
