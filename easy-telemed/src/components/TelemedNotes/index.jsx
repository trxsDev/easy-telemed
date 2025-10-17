import React, { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, List, message, Typography, Empty } from "antd";
import { supabase } from "../../api/SupabaseClient";

const { TextArea } = Input;
const { Text } = Typography;

function TelemedNotes({ consultationId, doctorId, readOnly = false }) {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!consultationId) return;
    const { data, error } = await supabase
      .from("doctor_notes")
      .select("note_id, note_text, author_id, created_at")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch notes", error);
      message.error("ไม่สามารถโหลดบันทึกได้");
      return;
    }
    setNotes(data || []);
  }, [consultationId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (!consultationId) return;
    const channel = supabase
      .channel(`doctor-notes:${consultationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "doctor_notes",
          filter: `consultation_id=eq.${consultationId}`,
        },
        fetchNotes
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, fetchNotes]);

  const handleSave = async () => {
    if (!consultationId || !doctorId) {
      message.error("ไม่พบข้อมูลสำหรับบันทึก note");
      return;
    }
    if (!noteText.trim()) {
      message.warning("กรุณากรอกข้อความ note");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("doctor_notes")
        .insert({
          consultation_id: consultationId,
          author_id: doctorId,
          note_text: noteText.trim(),
        });
      if (error) throw error;
      setNoteText("");
      fetchNotes();
    } catch (error) {
      console.error("Failed to save note", error);
      message.error("บันทึก note ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

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
          />
          <Button
            type="primary"
            onClick={handleSave}
            loading={loading}
            style={{ marginTop: 8 }}
          >
            บันทึก note
          </Button>
        </div>
      )}

      <List
        size="small"
        dataSource={notes}
        locale={{ emptyText: <Empty description="ยังไม่มีบันทึก" /> }}
        renderItem={(item) => (
          <List.Item key={item.note_id}>
            <List.Item.Meta
              title={new Date(item.created_at).toLocaleString()}
              description={item.note_text}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

export default TelemedNotes;
