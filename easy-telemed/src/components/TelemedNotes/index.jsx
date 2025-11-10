import React, { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, List, message, Typography, Empty, Alert } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  addDoctorNote,
  fetchNotesByConsultation,
  selectTelemedNotesByConsultation,
  startNotesSubscription,
  stopNotesSubscription,
} from "../../store/telemedNotesSlice";

const { TextArea } = Input;
const { Text } = Typography;

function TelemedNotes({ consultationId, doctorId, readOnly = false }) {
  const dispatch = useDispatch();
  const { notes, loading, error, subscriptionActive, subscribing } = useSelector((state) =>
    selectTelemedNotesByConsultation(state, consultationId)
  );
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const canEdit = !readOnly;

  useEffect(() => {
    if (!consultationId) return;
    dispatch(fetchNotesByConsultation({ consultationId }));
    dispatch(startNotesSubscription({ consultationId }));
    return () => {
      dispatch(stopNotesSubscription({ consultationId })).catch(() => {});
    };
  }, [dispatch, consultationId]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleSave = useCallback(async () => {
    if (!consultationId || !doctorId) {
      message.error("ไม่พบข้อมูลสำหรับบันทึก note");
      return;
    }
    if (!noteText.trim()) {
      message.warning("กรุณากรอกข้อความ note");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        addDoctorNote({
          consultationId,
          doctorId,
          noteText,
        })
      ).unwrap();
      setNoteText("");
      message.success("บันทึก note สำเร็จ");
    } catch (err) {
      message.error(err?.message || "บันทึก note ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [consultationId, doctorId, noteText, dispatch]);

  return (
    <Card
      title="บันทึกจากแพทย์"
      extra={<Text type="secondary">note จะถูกเก็บไว้สำหรับการสรุปหลังการปรึกษา</Text>}
      size="small"
      style={{ height: "100%" }}
    >
      {!readOnly && (
        <div style={{ marginBottom: 16 }}>
          <TextArea
            rows={4}
            placeholder="จดบันทึกเพิ่มเติมระหว่างการปรึกษา..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={!canEdit || saving}
          />
          <Button
            type="primary"
            onClick={handleSave}
            loading={saving}
            style={{ marginTop: 8 }}
            disabled={!canEdit}
          >
            บันทึก note
          </Button>
        </div>
      )}

      {(subscribing || subscriptionActive) && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            subscribing
              ? "กำลังเชื่อมต่อ Supabase realtime สำหรับ note"
              : "เชื่อมต่อกับ Supabase realtime สำหรับ note แล้ว"
          }
        />
      )}

      <List
        size="small"
        dataSource={notes}
        loading={loading}
        locale={{ emptyText: <Empty description="ยังไม่มีบันทึก" /> }}
        renderItem={(item) => (
          <List.Item key={item.note_id}>
            <List.Item.Meta title={new Date(item.created_at).toLocaleString()} description={item.note_text} />
          </List.Item>
        )}
      />
    </Card>
  );
}

export default TelemedNotes;
