import React, { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, List, message, Typography, Empty } from "antd";
import { useTranslation } from "react-i18next";
import { supabase } from "../../api/SupabaseClient";

const { TextArea } = Input;
const { Text } = Typography;

function TelemedNotes({ consultationId, doctorId, readOnly = false }) {
  const { t } = useTranslation();
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
      message.error(t("telemedNotes.loadError"));
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
      message.error(t("telemedNotes.missingContextError"));
      return;
    }
    if (!noteText.trim()) {
      message.warning(t("telemedNotes.emptyNoteWarning"));
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
      message.error(t("telemedNotes.saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={t("telemedNotes.cardTitle")}
      extra={<Text type="secondary">{t("telemedNotes.cardSubtitle")}</Text>}
      size="small"
      style={{ height: "100%" }}
    >
      {!readOnly && (
        <div style={{ marginBottom: 16 }}>
          <TextArea
            rows={4}
            placeholder={t("telemedNotes.inputPlaceholder")}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button
            type="primary"
            onClick={handleSave}
            loading={loading}
            style={{ marginTop: 8 }}
          >
            {t("telemedNotes.saveButton")}
          </Button>
        </div>
      )}

      <List
        size="small"
        dataSource={notes}
        locale={{ emptyText: <Empty description={t("telemedNotes.emptyState")} /> }}
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
