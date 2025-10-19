import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, Typography, Space, Spin, Tag, Descriptions, Divider, Button, Badge, message, Steps } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../api/SupabaseClient";
import TwilioVideoRoom from "../../components/TwilioVideoRoom";
import { markConsultationStarted, moveToSummarizing, endConsultation } from "../../services/consultationService";
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

  const isDoctor = role === "doctor";
  const isPatient = role === "patient";
  const consultationReady = Boolean(consultation?.consultation_id);

  // Patient step mapping for doctor's view
  const PATIENT_STATUS_STEPS = [
    { key: "waiting", label: "รอแพทย์ตอบรับ" },
    { key: "offered", label: "ส่งคำขอไปยังแพทย์" },
    { key: "accepted", label: "แพทย์ตอบรับ" },
    { key: "doctor_ready", label: "แพทย์พร้อมเข้าพูดคุย" },
    { key: "doctor_summarizing", label: "แพทย์กำลังสรุปผล" },
  ];

  const patientStatus = React.useMemo(() => {
    // Highest priority: consultation state
    if (consultation?.status === 'summarizing') return 'doctor_summarizing';
    if (consultation?.consultation_id) return 'doctor_ready';
    // Next: match request state
    const m = matchRequest?.status;
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
    { key: 'active', label: 'กำลังสนทนา' },
    { key: 'summarizing', label: 'กำลังสรุปผล' },
  ];

  const doctorFlowStatus = React.useMemo(() => {
    if (consultation?.status === 'summarizing') return 'summarizing';
    if (consultationReady) return 'active';
    if (matchRequest?.status === 'accepted') return 'accepted';
    return null;
  }, [consultation?.status, consultationReady, matchRequest?.status]);

  const doctorFlowIndex = React.useMemo(() => {
    if (!doctorFlowStatus) return -1;
    const idx = DOCTOR_FLOW_STEPS.findIndex(s => s.key === doctorFlowStatus);
    return idx >= 0 ? idx : 0;
  }, [doctorFlowStatus]);

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

  const defaultIdentity = useMemo(() => {
    return user?.email || user?.displayName || user?.user_id || "guest";
  }, [user]);

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
              .in('status', ['pending','active'])
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

  // Patients shouldn't be able to stay on this page without an active consultation
  useEffect(() => {
    if (loading) return;
    if (!isPatient) return;
    // Require explicit invitation flag to allow patient entry, not just presence of a consultation
    const invited = (() => { try { return localStorage.getItem('patientInvitedConsultationId'); } catch { return null; } })();
    if (consultation?.consultation_id && invited && invited === consultation?.consultation_id) return;
    const caseId = fallbackCaseId || caseData?.case_id;
    if (caseId) {
      navigate(`/easy-telemed/matching/${caseId}/wait`, { replace: true });
    } else {
      navigate('/easy-telemed/illness-case', { replace: true });
    }
  }, [loading, isPatient, consultation?.consultation_id, fallbackCaseId, caseData?.case_id, navigate]);

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

  const attachments = useMemo(() => parseAttachments(caseData?.attachments), [caseData?.attachments]);

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

  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1.2fr)", gap: 16, alignItems: "start" }}>
          <Card style={{ minHeight: 580 }} bodyStyle={{ padding: 0, height: "100%" }}>
            <TwilioVideoRoom
              defaultRoomName={defaultRoomName}
              defaultIdentity={defaultIdentity}
              autoJoin={isDoctor && consultationReady}
              hideJoinForm={isDoctor}
              lockRoomName
              lockIdentity
              onConnected={async (room) => {
                try {
                  if (consultation?.consultation_id) {
                    // Persist start; backend will set status=active and started_at, and may store room_id if provided
                    await markConsultationStarted(consultation.consultation_id, room?.sid || null);
                    // Reflect status locally for smoother UX (no room_sid in schema)
                    setConsultation((prev) => prev ? { ...prev, status: 'active' } : prev);
                    // Persist active consultation for patient to enable guarded menu
                    try {
                      localStorage.setItem('activeConsultationId', consultation.consultation_id);
                    } catch {}
                  }
                } catch (_) {}
              }}
              onDisconnected={async () => {
                // ฝั่งแพทย์: สรุปผลและเคลียร์เคส
                try {
                  if (isDoctor && consultation?.consultation_id) {
                    const res = await moveToSummarizing(consultation.consultation_id);
                    setConsultation((prev) => (res?.consultation ? res.consultation : { ...(prev || {}), status: 'summarizing' }));
                    try { await endConsultation(consultation.consultation_id); } catch (_) {}
                    setConsultation(null);
                    setMatchRequest(null);
                    loadQueue();
                  }
                } catch (_) {}
                // ฝั่งผู้ป่วย: เคลียร์ flag และ state ทันที
                try { localStorage.removeItem('activeConsultationId'); } catch {}
                try { localStorage.removeItem('patientInvitedConsultationId'); } catch {}
                setConsultation(null);
                setMatchRequest(null);
                setCaseData(null);
                setPatientInfo(null);
                setDoctorInfo(null);
                if (isPatient) {
                  const caseId = consultation?.case_id || fallbackCaseId;
                  if (caseId) {
                    navigate(`/easy-telemed/matching/${caseId}/wait`, { replace: true });
                  } else {
                    navigate('/easy-telemed/illness-case', { replace: true });
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
                <Button
                  type="primary"
                  onClick={() => {
                    if (!consultation?.consultation_id) {
                      message.warning('ยังไม่มี consultation');
                      return;
                    }
                    const caseId = consultation?.case_id || caseData?.case_id || fallbackCaseId;
                    emit?.('doctor:ready', {
                      requestId: requestId || null,
                      caseId,
                      consultation: consultation,
                    });
                    message.success('ได้ส่งสัญญาณเรียกผู้ป่วยแล้ว');
                  }}
                >
                  โทรหาผู้ป่วย (เชิญเข้าห้อง)
                </Button>
                <Button
                  onClick={async () => {
                    if (!consultation?.consultation_id) return;
                    try {
                      const res = await moveToSummarizing(consultation.consultation_id);
                      // If backend couldn't set DB status due to constraint but indicated clientPhase, reflect it locally
                      if (res?.consultation) {
                        setConsultation(res.consultation);
                      } else if (res?.clientPhase === 'summarizing') {
                        setConsultation((prev) => ({ ...(prev || {}), status: 'summarizing' }));
                      } else {
                        setConsultation((prev) => ({ ...(prev || {}), status: 'summarizing' }));
                      }
                      message.success('เข้าสู่ขั้นสรุปผลแล้ว');
                    } catch (e) {
                      message.error(e.message || 'ไม่สามารถเข้าสู่ขั้นสรุปผล');
                    }
                  }}
                >
                  ไปขั้นสรุปผล
                </Button>
                <Button
                  danger
                  onClick={async () => {
                    if (!consultation?.consultation_id) return;
                    try {
                      await endConsultation(consultation.consultation_id);
                      message.success('ปิดเคสเรียบร้อย');
                      setConsultation(null);
                      setMatchRequest(null);
                      await loadQueue();
                    } catch (e) {
                      message.error(e.message || 'ไม่สามารถปิดเคสได้');
                    }
                  }}
                >
                  ปิดเคสและล้างหน้าจอ
                </Button>
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
            {consultationReady && consultation?.status !== 'summarizing' ? (
              <TelemedChat consultationId={consultation.consultation_id} currentUser={user} />
            ) : (
              <Card size="small">
                <Paragraph>{consultation?.status === 'summarizing' ? 'กำลังสรุปผล' : 'ระบบแชทจะพร้อมใช้งานหลังจากสร้าง consultation แล้ว'}</Paragraph>
              </Card>
            )}
            {consultationReady && isDoctor && consultation?.status === 'summarizing' ? (
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
    </div>
  );
}

export default TelemedRoom;
