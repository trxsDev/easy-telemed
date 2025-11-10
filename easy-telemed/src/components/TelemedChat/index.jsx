import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Input, Button, Upload, message, Typography, Avatar, Space, Alert } from "antd";
import { SendOutlined, PaperClipOutlined, UserOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  initialiseChatSession,
  clearChatSession,
  chatHistoryLoaded,
  chatMessageOptimisticAdded,
  chatMessageReceived,
  uploadChatAttachment,
  startChatFallbackSubscription,
  stopChatFallbackSubscription,
  selectTelemedChatByConsultation,
} from "../../store/telemedChatSlice";

const { Text } = Typography;

function TelemedChat({ consultationId, currentUser }) {
  const dispatch = useDispatch();
  const { socket, connected } = useSocket();
  const {
    thread,
    messages = [],
    fallbackActive,
    fallbackSubscribing,
    fallbackError,
    uploadStatus,
  } = useSelector((state) => selectTelemedChatByConsultation(state, consultationId));

  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const canChat = useMemo(
    () => Boolean(connected && socket && consultationId && currentUser?.user_id),
    [connected, socket, consultationId, currentUser?.user_id]
  );

  const canSend = useMemo(() => Boolean(canChat), [canChat]);

  useEffect(() => {
    if (!consultationId) {
      return undefined;
    }
    dispatch(initialiseChatSession({ consultationId }));
    return () => {
      dispatch(stopChatFallbackSubscription({ consultationId, threadId: thread?.thread_id || null })).catch(() => {});
      dispatch(clearChatSession({ consultationId }));
    };
  }, [dispatch, consultationId, thread?.thread_id]);

  useEffect(() => {
    if (!socket || !consultationId || !currentUser?.user_id) return;

    socket.emit("chat:join", { consultationId });

    const onHistory = (payload) => {
      if (!payload?.thread || payload?.thread?.consultation_id !== consultationId) return;
      dispatch(
        chatHistoryLoaded({
          consultationId,
          thread: payload.thread,
          messages: payload.messages || [],
        })
      );
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    };

    const onMessage = (msg) => {
      // eslint-disable-next-line no-console
      console.log("[chat:message]", msg);
      if (!msg || !msg.thread_id) return;
      if (thread && msg.thread_id !== thread.thread_id) return;
      dispatch(
        chatMessageReceived({
          consultationId,
          message: msg,
        })
      );
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    };

    socket.on("chat:history", onHistory);
    socket.on("chat:message", onMessage);

    return () => {
      socket.off("chat:history", onHistory);
      socket.off("chat:message", onMessage);
    };
  }, [socket, consultationId, currentUser?.user_id, dispatch, thread]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      if (consultationId && currentUser?.user_id) {
        try {
          socket.emit("chat:join", { consultationId });
        } catch (_) {
          // ignore reconnect failure
        }
      }
    };
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [socket, consultationId, currentUser?.user_id]);

  useEffect(() => {
    if (!consultationId || !thread?.thread_id) return;
    if (connected) {
      dispatch(stopChatFallbackSubscription({ consultationId, threadId: thread.thread_id })).catch(() => {});
      return undefined;
    }
    dispatch(startChatFallbackSubscription({ consultationId, threadId: thread.thread_id }));

    return () => {
      dispatch(stopChatFallbackSubscription({ consultationId, threadId: thread.thread_id })).catch(() => {});
    };
  }, [dispatch, consultationId, thread?.thread_id, connected]);

  useEffect(() => {
    if (!listRef.current) return;
    requestAnimationFrame(() => {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentUser?.user_id) return;
    if (!chatMessage.trim()) return;
    setSending(true);
    try {
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic = {
        message_id: tempId,
        sender_id: currentUser.user_id,
        type: "text",
        content: chatMessage.trim(),
        file_url: null,
        created_at: now,
        thread_id: thread?.thread_id || "pending",
      };
      dispatch(chatMessageOptimisticAdded({ consultationId, message: optimistic }));
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
      socket.emit("chat:send", {
        threadId: thread?.thread_id || null,
        consultationId,
        type: "text",
        content: chatMessage.trim(),
      });
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
    try {
      const result = await dispatch(uploadChatAttachment({ consultationId, file })).unwrap();
      const now = new Date().toISOString();
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        message_id: tempId,
        sender_id: currentUser.user_id,
        type: "file",
        content: file.name,
        file_url: result?.publicUrl,
        created_at: now,
        thread_id: thread?.thread_id || "pending",
      };
      dispatch(chatMessageOptimisticAdded({ consultationId, message: optimistic }));
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
      socket.emit("chat:send", {
        threadId: thread?.thread_id || null,
        consultationId,
        type: "file",
        file_url: result?.publicUrl,
        content: file.name,
      });
      message.success("อัปโหลดไฟล์สำเร็จ");
    } catch (error) {
      console.error("Upload chat file error", error);
      message.error(error?.message || "อัปโหลดไฟล์ไม่สำเร็จ");
    }
    return false;
  };

  const renderMessage = useCallback(
    (item, idx) => {
      if (!item) return null;
      const isSelf = item?.sender_id === currentUser?.user_id;
      const key = item?.message_id || `m-${idx}`;
      return (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: isSelf ? "flex-end" : "flex-start",
            marginBottom: 10,
          }}
        >
          <Space align="end" size={8}>
            {!isSelf && <Avatar size={28} icon={<UserOutlined />} />}
            <div style={{ maxWidth: "70%" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 16,
                  backgroundColor: isSelf ? "#1890ff" : "#f0f0f0",
                  color: isSelf ? "#fff" : "#000",
                  wordBreak: "break-word",
                }}
              >
                {item?.type === "file" ? (
                  <a
                    href={item?.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: isSelf ? "#fff" : "#1890ff" }}
                  >
                    <PaperClipOutlined /> {item?.content || "ดาวน์โหลดไฟล์"}
                  </a>
                ) : (
                  item?.content
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#999",
                  marginTop: 2,
                  textAlign: isSelf ? "right" : "left",
                }}
              >
                {new Date(item?.created_at || Date.now()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            {isSelf && <Avatar size={28} icon={<UserOutlined />} />}
          </Space>
        </div>
      );
    },
    [currentUser?.user_id]
  );

  const uploadDisabled = !canChat || uploadStatus?.uploading;

  return (
    <Card
      title="แชทระหว่างการปรึกษา"
      size="small"
      extra={<Text type="secondary">ใช้สำหรับสื่อสารและแนบไฟล์เพิ่มเติม</Text>}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      {!connected && thread?.thread_id && (
        <Alert
          type={fallbackError ? "error" : "info"}
          style={{ marginBottom: 8 }}
          showIcon
          message={
            fallbackError
              ? `เชื่อมต่อ fallback realtime ไม่สำเร็จ: ${fallbackError}`
              : fallbackActive || fallbackSubscribing
                ? "กำลังเชื่อมต่อผ่าน Supabase realtime สำรอง"
                : "กำลังเตรียม Supabase realtime สำรอง"
          }
        />
      )}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: 12,
          paddingRight: 4,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#999", textAlign: "center", padding: "12px 0" }}>ยังไม่มีข้อความ</div>
        ) : (
          messages.filter(Boolean).map((item, idx) => renderMessage(item, idx))
        )}
      </div>

      <Input.TextArea
        rows={2}
        placeholder={canSend ? "พิมพ์ข้อความ..." : canChat ? "กำลังเตรียมห้องแชท..." : "กำลังเชื่อมต่อ..."}
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
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Upload beforeUpload={uploadChatFile} showUploadList={false} disabled={uploadDisabled}>
          <Button icon={<PaperClipOutlined />} loading={uploadStatus?.uploading}>
            แนบไฟล์
          </Button>
        </Upload>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          loading={sending}
          disabled={!chatMessage.trim() || !canSend}
        >
          ส่ง
        </Button>
      </div>
    </Card>
  );
}

export default TelemedChat;
