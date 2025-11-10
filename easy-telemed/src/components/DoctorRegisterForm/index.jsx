import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Alert, Input, Button, Typography, Space, Card, message } from "antd";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { ChevronLeft } from "lucide-react";
import ChangeLangButton from "../ChangeLangButton";
import { useTranslation } from "react-i18next";
import "./DoctorRegisterForm.css";

const VIDEO_SRC = "/videos/doctor-register.mp4";
const VIDEO_POSTER = "/videos/doctor-register.jpg";

function DoctorRegisterForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signUp } = useUserAuthSupabase();

  let navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handeSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await signUp(email, password, "doctor");
      message.success(t("doctorRegisterForm.successMessage"));
      navigate("/easy-telemed/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="doctor-register">
      <video
        className="doctor-register__video"
        autoPlay
        loop
        muted
        playsInline
        poster={VIDEO_POSTER}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="doctor-register__overlay" />
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          border: "none",
          position: "relative",
        }}
        styles={{ body: { paddingTop: 48 } }}
      >
         <div style={{marginBottom: 24}}>
          <Button
            type="text"
            icon={<ChevronLeft />}
            onClick={() => navigate("/")}
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              color: "#667eea",
              display: "flex",
              alignItems: "left",
              padding: "4px 8px",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 16,
            }}
          >
            <ChangeLangButton />
          </div>
        </div>

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={2} style={{ margin: 0, color: '#333' }}>
              {t("doctorRegisterForm.title")}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t("doctorRegisterForm.subtitle")}
            </Typography.Text>
          </div>

          {error && <Alert message={error} type="error" showIcon closable />}

          <Form layout="vertical" onFinish={handeSubmit}>
            <Form.Item
              label={
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  {t("doctorRegisterForm.emailLabel")}
                </span>
              }
              name="username"
              rules={[
                { required: true, message: t("doctorRegisterForm.emailRequired") },
                { type: "email", message: t("doctorRegisterForm.emailInvalid") },
              ]}
            >
              <Input
                placeholder={t("doctorRegisterForm.emailPlaceholder")}
                size="large"
                style={{ borderRadius: '8px' }}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label={
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  {t("doctorRegisterForm.passwordLabel")}
                </span>
              }
              name="password"
              rules={[
                { required: true, message: t("doctorRegisterForm.passwordRequired") },
              ]}
            >
              <Input.Password
                placeholder={t("doctorRegisterForm.passwordPlaceholder")}
                size="large"
                style={{ borderRadius: '8px' }}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                disabled={!email || !password || loading}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                {loading
                  ? t("doctorRegisterForm.submitLoading")
                  : t("doctorRegisterForm.submit")}
              </Button>
            </Form.Item>
          </Form>

        </Space>
      </Card>
    </div>
  );
}
export default DoctorRegisterForm;
