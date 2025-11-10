import React, { useState } from "react";
import { Form, Input, Button, Select, Row, Col, notification } from "antd";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";

function RegisterForm({ options }) {
  const [api, contextHolder] = notification.useNotification();
  const { signUp } = useUserAuthSupabase();
  const [loading, setLoading] = useState(false);
  const openNotificationWithIcon = (type, message, title = null) => {
    api[type]({
      message: title || (type === 'success' ? 'Registration Successful' : 'Registration Failed'),
      description: message,
      duration: type === 'success' ? 4 : 6,
    });
  };

  const handleSubmit = async (values) => {
    const { email, password, role } = values;
    setLoading(true);
    try {
      await signUp(email, password, role);
      openNotificationWithIcon('success',
        "Account created successfully! Please check your email to verify your account."
      );
    } catch (err) {
      openNotificationWithIcon('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {contextHolder}
      <Form
        layout="vertical"
        size="middle"
        className="register-form"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please input email" },
                { type: "email", message: "Invalid email format" },
              ]}
            >
              <Input placeholder="name@example.com" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: "Select role" }]}
            >
              <Select placeholder="Choose role" options={options} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Enter password" },
                { min: 6, message: "At least 6 characters" },
              ]}
            >
              <Input.Password placeholder="••••••" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading} disabled={loading}>
                Create User
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default RegisterForm;
