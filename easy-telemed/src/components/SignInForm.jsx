import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Input, Button, Typography, Space, Card } from "antd";
import { ChevronLeft } from "lucide-react";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
import { useTranslation } from "react-i18next";
import ChangeLangButton from "./ChangeLangButton";

function SignInForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useUserAuthSupabase();

  const navigate = useNavigate();

  const handeSubmit = async () => {
    setError("");
    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        const errorMessage = signInError.message || "";
        const isEmailNotConfirmed =
          errorMessage.includes("email_not_confirmed") ||
          errorMessage.includes("Email not confirmed") ||
          errorMessage.includes("email not confirmed");

        if (isEmailNotConfirmed) {
          navigate("/verify-email");
          return;
        }

        setError(signInError.message);
        return;
      }

      navigate("/easy-telemed/home");
    } catch (err) {
      setError(err.message || t("signInForm.genericError"));
    }
  };

  return (
    <div
      style={{
        maxWidth: 520,
        width: "100%",
        padding: "0 16px",
      }}
    >
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          border: "none",
          position: "relative",
        }}
        styles={{ body: { paddingTop: 48 } }}
      >
        <div style={{ marginBottom: 24 }}>
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
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={2} style={{ margin: 0, color: "#333" }}>
              {t("signInForm.title")}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t("signInForm.subtitle")}
            </Typography.Text>
          </div>

          {error && <Alert message={error} type="error" showIcon closable />}

          <Form layout="vertical" onFinish={handeSubmit}>
            <Form.Item
              label={
                <span style={{ fontSize: "14px", fontWeight: "500" }}>
                  {t("signInForm.emailLabel")}
                </span>
              }
              name="username"
              rules={[
                { required: true, message: t("signInForm.emailRequired") },
                { type: "email", message: t("signInForm.emailInvalid") },
              ]}
            >
              <Input
                placeholder={t("signInForm.emailPlaceholder")}
                size="large"
                style={{ borderRadius: "8px" }}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label={
                <span style={{ fontSize: "14px", fontWeight: "500" }}>
                  {t("signInForm.passwordLabel")}
                </span>
              }
              name="password"
              rules={[
                { required: true, message: t("signInForm.passwordRequired") },
              ]}
            >
              <Input.Password
                placeholder={t("signInForm.passwordPlaceholder")}
                size="large"
                style={{ borderRadius: "8px" }}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                style={{
                  borderRadius: "8px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                  height: "48px",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                {t("signInForm.submit")}
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: "center" }}>
            <Typography.Text type="secondary">
              {t("signInForm.noAccount")}{" "}
              <Link
                to="/signup"
                style={{
                  color: "#667eea",
                  fontWeight: "500",
                  textDecoration: "none",
                }}
              >
                {t("signInForm.signUpLink")}
              </Link>
            </Typography.Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export default SignInForm;
