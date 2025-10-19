import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Result, Button, Space, Spin, Alert, Card, Typography } from "antd";
import { supabase } from "../../api/SupabaseClient";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase.jsx";

const DOC_LABELS = {
  summary_pdf: "เอกสารสรุปผล",
  prescription_pdf: "ใบสั่งยา",
};

function ConsultationSuccess() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useUserAuthSupabase();
  const acknowledgmentKey = consultationId ? `consultationDocAcknowledged:${consultationId}` : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [consultation, setConsultation] = useState(null);
  const [acknowledged, setAcknowledged] = useState(() => {
    if (!acknowledgmentKey) return false;
    try {
      return localStorage.getItem(acknowledgmentKey) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!acknowledgmentKey) return;
    try {
      setAcknowledged(localStorage.getItem(acknowledgmentKey) === "true");
    } catch {
      setAcknowledged(false);
    }
  }, [acknowledgmentKey]);

  useEffect(() => {
    const loadData = async () => {
      if (!consultationId) {
        setError("ไม่พบหมายเลขการปรึกษา");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: consultationRow, error: consultationError } = await supabase
          .from("consultations")
          .select("consultation_id, patient_id, doctor_id, status")
          .eq("consultation_id", consultationId)
          .maybeSingle();

        if (consultationError) throw consultationError;
        if (!consultationRow) {
          setError("ไม่พบข้อมูลการปรึกษา");
          setLoading(false);
          return;
        }

        const belongsToUser =
          (role === "patient" && consultationRow.patient_id === user?.user_id) ||
          (role === "doctor" && consultationRow.doctor_id === user?.user_id) ||
          role === "admin";

        if (!belongsToUser) {
          setError("คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้");
          setLoading(false);
          return;
        }

        setConsultation(consultationRow);

        const { data: docs, error: docError } = await supabase
          .from("consultation_documents")
          .select("kind, public_url")
          .eq("consultation_id", consultationId);

        if (docError) throw docError;

        const validDocs = (docs || []).filter((doc) => doc?.public_url);
        setDocuments(validDocs);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load consultation success data", err);
        setError(err.message || "เกิดข้อผิดพลาดระหว่างโหลดข้อมูล");
        setLoading(false);
      }
    };

    loadData();
  }, [consultationId, role, user?.user_id]);

  const documentButtons = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    return documents.map((doc) => (
      <Button
        key={doc.kind}
        type="default"
        onClick={() => window.open(doc.public_url, "_blank", "noopener")}
      >
        ดาวน์โหลด{DOC_LABELS[doc.kind] || doc.kind}
      </Button>
    ));
  }, [documents]);

  const handleAcknowledge = useCallback(() => {
    setAcknowledged(true);
    if (!acknowledgmentKey) return;
    try {
      localStorage.setItem(acknowledgmentKey, "true");
    } catch {
      // ignore storage failures
    }
  }, [acknowledgmentKey]);

  const successButtons = useMemo(() => {
    const buttons = [...documentButtons];
    buttons.push(
      <Button
        key="home"
        type="primary"
        onClick={() => navigate("/easy-telemed/home", { replace: true })}
      >
        กลับหน้าหลัก
      </Button>
    );
    return buttons;
  }, [documentButtons, navigate]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: "60px auto", padding: 16 }}>
        <Result
          status="error"
          title="ไม่สามารถแสดงผลได้"
          subTitle={error}
          extra={[
            <Button
              key="back"
              type="primary"
              onClick={() => navigate("/easy-telemed/home", { replace: true })}
            >
              กลับหน้าหลัก
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: "0 16px" }}>
      {acknowledged ? (
        <Result
          status="success"
          title="การปรึกษาเสร็จสิ้น"
          subTitle="สามารถดาวน์โหลดเอกสารหรือกลับไปยังหน้าหลักได้ทันที"
          extra={successButtons}
        />
      ) : (
        <Result
          status="success"
          title="การชำระเงินเสร็จสมบูรณ์"
          subTitle="กรุณาดาวน์โหลดเอกสารประกอบการรักษา และกดยืนยันเมื่อดาวน์โหลดเรียบร้อยแล้ว"
          extra={[
            ...documentButtons,
            <Button key="ack" type="primary" onClick={handleAcknowledge}>
              ฉันดาวน์โหลดเรียบร้อยแล้ว
            </Button>,
          ]}
        />
      )}

      {documents.length === 0 && (
        <Alert
          type="info"
          message="ยังไม่มีเอกสารสำหรับการปรึกษานี้"
          description="หากคุณคิดว่าควรมีเอกสาร กรุณาติดต่อเจ้าหน้าที่"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <Space direction="vertical" style={{ width: "100%", marginTop: 24 }}>
        <Card title="ข้อมูลการปรึกษา">
          <Space direction="vertical">
            <Typography.Text>หมายเลขการปรึกษา: {consultationId}</Typography.Text>
            <Typography.Text>สถานะล่าสุด: {consultation?.status || "-"}</Typography.Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default ConsultationSuccess;
