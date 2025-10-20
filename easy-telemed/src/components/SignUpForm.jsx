import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Input, Button, Typography, Space, Card, message } from "antd";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
import { ChevronLeft } from "lucide-react";
import ChangeLangButton from "./ChangeLangButton";
import { useTranslation } from "react-i18next";

function SignUpForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signUp } = useUserAuthSupabase();
  const [loading, setLoading] = useState(false);

  let navigate = useNavigate();
  const handeSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password);
      
      if (error) {
        throw error;
      }
      
      // Trigger in backend will create app_users row (role=patient)
      message.success(t("signUpForm.successMessage"));
      navigate("/verify-email");
    } catch (err) {
      setError(err.message || t("signUpForm.genericError"));
    } finally {
      setLoading(false);
    }
  };
 return (
    <div style={{ 
      maxWidth: 520, 
      width: '100%',
      padding: "0 16px" 
    }}>
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          border: 'none',
          position: 'relative'
        }}
        bodyStyle={{ paddingTop: 48 }}
      >
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 16,
          }}
        >
          <ChangeLangButton />
        </div>
        <Button
          type="text"
          icon={<ChevronLeft />}
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            color: '#667eea',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px'
          }}
        />
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={2} style={{ margin: 0, color: '#333' }}>
              {t("signUpForm.title")}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t("signUpForm.subtitle")}
            </Typography.Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"   
              showIcon
              closable
            />
          )}

          <Form layout="vertical" onFinish={handeSubmit}>
            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: '500' }}>{t("signUpForm.emailLabel")}</span>}
              name="username"
              rules={[
                { required: true, message: t("signUpForm.emailRequired") },
                { type: "email", message: t("signUpForm.emailInvalid") },
              ]}
            >
              <Input 
                placeholder={t("signUpForm.emailPlaceholder")}
                size="large"
                style={{ borderRadius: '8px' }}
                onChange={(e) => setEmail(e.target.value)} 
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: '500' }}>{t("signUpForm.passwordLabel")}</span>}
              name="password"
              rules={[{ required: true, message: t("signUpForm.passwordRequired") }]}
            >
              <Input.Password 
                placeholder={t("signUpForm.passwordPlaceholder")}
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
              disabled={!email || !password}
              style={{
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                height: '48px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
                {loading ? t("signUpForm.submitLoading") : t("signUpForm.submit")}
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text type="secondary">
              {t("signUpForm.haveAccount")} {' '}
              <Link 
                to="/signin"
                style={{ 
                  color: '#667eea', 
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
              >
                {t("signUpForm.signInLink")}
              </Link>
            </Typography.Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
export default SignUpForm;
