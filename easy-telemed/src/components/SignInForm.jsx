import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Input, Button, Typography, Space, Card } from "antd";
import { useUserAuth } from "../context/userAuthContext";

function signInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useUserAuth();

  let navigate = useNavigate();
  const handeSubmit = async (e) => {
    setError("");
    try {
      await signIn(email, password);
      navigate("/easy-telemed/home");
    } catch (err) {
      setError(err.message);
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
          border: 'none'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={2} style={{ margin: 0, color: '#333' }}>
              Welcome Back!
            </Typography.Title>
            <Typography.Text type="secondary">
              Please sign in to your account
            </Typography.Text>
          </div>

          {error && <Alert message={error} type="error" showIcon closable />}

          <Form layout="vertical" onFinish={handeSubmit}>
            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: '500' }}>Email Address</span>}
              name="username"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                placeholder="Enter your email"
                size="large"
                style={{ borderRadius: '8px' }}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: '500' }}>Password</span>}
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password
                placeholder="Enter your password"
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
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text type="secondary">
              Don't have an account?{' '}
              <Link 
                to="/signup"
                style={{ 
                  color: '#667eea', 
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
              >
                Create Account
              </Link>
            </Typography.Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
export default signInForm;
