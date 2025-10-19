import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Input, Button, Upload, message, Typography, Avatar, Space } from "antd";
import { InboxOutlined, SendOutlined, PaperClipOutlined, UserOutlined } from "@ant-design/icons";
import { useSocket } from "../../context/SocketContext.jsx";
import { supabase } from "../../api/SupabaseClient";

const { Text } = Typography;

function TelemedChat({ consultationId, currentUser }) {
  const { socket, connected } = useSocket();
  const [thread, setThread] = useState(null);
  const [messagesData, setMessagesData] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const canChat = useMemo(() => Boolean(connected && socket && consultationId && currentUser?.user_id), [connected, socket, consultationId, currentUser?.user_id]);
  // Allow sending as soon as socket is connected; server can resolve thread by consultationId
  const canSend = useMemo(() => Boolean(canChat), [canChat]);


  useEffect(() => {
    if (!socket || !consultationId || !currentUser?.user_id) return;
    // Ask server to join chat and send history
    socket.emit('chat:join', { consultationId });
    const onHistory = (payload) => {
      if (!payload?.thread || payload?.thread?.consultation_id !== consultationId) return;
      setThread(payload.thread);
      setMessagesData(payload.messages || []);
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    };
    const onMessage = (msg) => {
      // Debug log for diagnosis
      // eslint-disable-next-line no-console
      console.log('[chat:message]', msg);
      if (!msg || !msg.thread_id) return;
      if (thread && msg.thread_id !== thread.thread_id) return;
      setMessagesData((prev) => {
        // Remove optimistic message if it matches real one
        const filtered = prev.filter(m => {
          // optimistic message has temp- prefix
          if (String(m.message_id).startsWith('temp-')) {
            // Match by sender_id, type, content, file_url, created_at (±5s)
            const timeDiff = Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime());
            if (
              m.sender_id === msg.sender_id &&
              m.type === msg.type &&
              m.content === msg.content &&
              m.file_url === msg.file_url &&
              timeDiff < 5000
            ) {
              return false; // remove temp
            }
          }
          return true;
        });
        return [...filtered, msg];
      });
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    };
    socket.on('chat:history', onHistory);
    socket.on('chat:message', onMessage);
    return () => {
      socket.off('chat:history', onHistory);
      socket.off('chat:message', onMessage);
    };
  }, [socket, consultationId, currentUser?.user_id]);

  // Re-join on socket reconnects to ensure room/history
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      if (consultationId && currentUser?.user_id) {
        try { socket.emit('chat:join', { consultationId }); } catch (_) {}
      }
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [socket, consultationId, currentUser?.user_id]);

  useEffect(() => {
    // Fallback realtime via Supabase only when socket isn't connected
    if (!thread?.thread_id || connected) return;

    const channel = supabase
      .channel(`chat-thread:${thread.thread_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${thread.thread_id}`,
        },
        (payload) => {
          setMessagesData((prev) => [...prev, payload.new]);
          requestAnimationFrame(() => {
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread?.thread_id, connected]);

  const handleSendMessage = async () => {
    if (!currentUser?.user_id) return;
    if (!chatMessage.trim()) return;
    setSending(true);
    try {
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic = { message_id: tempId, sender_id: currentUser.user_id, type: 'text', content: chatMessage.trim(), file_url: null, created_at: now, thread_id: thread?.thread_id || 'pending' };
      setMessagesData((prev) => [...prev, optimistic]);
      requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });
      socket.emit('chat:send', { threadId: thread?.thread_id || null, consultationId, type: 'text', content: chatMessage.trim() });
      setChatMessage("");
    } catch (error) {
      console.error("Send chat message error", error);
      message.error("ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const uploadChatFile = async (file) => {
    if (!currentUser?.user_id) return false;
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const storagePath = `chat/${consultationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload chat file error", uploadError);
      message.error("อัปโหลดไฟล์ไม่สำเร็จ");
      return false;
    }

    const { data: urlData } = supabase.storage
      .from("attachments")
      .getPublicUrl(storagePath);

    // inform chat via socket to persist & broadcast
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const optimistic = { message_id: tempId, sender_id: currentUser.user_id, type: 'file', content: file.name, file_url: urlData?.publicUrl, created_at: now, thread_id: thread?.thread_id || 'pending' };
    setMessagesData((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });
    socket.emit('chat:send', { threadId: thread?.thread_id || null, consultationId, type: 'file', file_url: urlData?.publicUrl, content: file.name });

    message.success("อัปโหลดไฟล์สำเร็จ");
    return false; // prevent Upload from adding to fileList
  };

  const renderMessage = (item, idx) => {
    if (!item) return null;
    const isSelf = item?.sender_id === currentUser?.user_id;
    const key = item?.message_id || `m-${idx}`;
    return (
      <div
        key={key}
        style={{
          display: 'flex',
          justifyContent: isSelf ? 'flex-end' : 'flex-start',
          marginBottom: 10,
        }}
      >
        <Space align="end" size={8}>
          {!isSelf && <Avatar size={28} icon={<UserOutlined />} />}
          <div style={{ maxWidth: '70%' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: 16,
                backgroundColor: isSelf ? '#1890ff' : '#f0f0f0',
                color: isSelf ? '#fff' : '#000',
                wordBreak: 'break-word',
              }}
            >
              {item?.type === 'file' ? (
                <a href={item?.file_url} target="_blank" rel="noreferrer" style={{ color: isSelf ? '#fff' : '#1890ff' }}>
                  <PaperClipOutlined /> {item?.content || 'ดาวน์โหลดไฟล์'}
                </a>
              ) : (
                item?.content
              )}
            </div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 2, textAlign: isSelf ? 'right' : 'left' }}>
              {new Date(item?.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          {isSelf && <Avatar size={28} icon={<UserOutlined />} />}
        </Space>
      </div>
    );
  };

  return (
    <Card
      title="แชทระหว่างการปรึกษา"
      size="small"
      extra={<Text type="secondary">ใช้สำหรับสื่อสารและแนบไฟล์เพิ่มเติม</Text>}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: 12,
          paddingRight: 4,
        }}
      >
        {messagesData.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '12px 0' }}>ยังไม่มีข้อความ</div>
        ) : (
          messagesData.filter(Boolean).map((item, idx) => renderMessage(item, idx))
        )}
      </div>

      <Input.TextArea
        rows={2}
        placeholder={canSend ? "พิมพ์ข้อความ..." : (canChat ? "กำลังเตรียมห้องแชท..." : "กำลังเชื่อมต่อ...")}
        value={chatMessage}
        onChange={(e) => setChatMessage(e.target.value)}
        onPressEnter={(e) => {
          if (!e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        disabled={!canChat}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Upload beforeUpload={uploadChatFile} showUploadList={false} disabled={!canChat}>
          <Button icon={<PaperClipOutlined />}>แนบไฟล์</Button>
        </Upload>
        <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} loading={sending} disabled={!chatMessage.trim() || !canSend}>
          ส่ง
        </Button>
      </div>
    </Card>
  );
}

export default TelemedChat;
