import React, { useState } from "react";
import { Form, Input, Button, Select, Row, Col, notification } from "antd"; 
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { supabase } from "../../api/SupabaseClient";

function RegisterForm({ options }) {
  const [api, contextHolder] = notification.useNotification();
  const [error, setError] = useState("");
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
    setError("");
    const { email, password, role } = values;
    setLoading(true);
    try {
      const { data,error } = await signUp(email, password);
      if (error) throw error; // Trigger in backend will create app_users row (role=patient)
      console.log("Signup data", data);
      if (role && role === "doctor") {
        const payload = {
          user_id: data.user.id,
          role: "doctor", 
          verify: false, 
        };
        const { error: upsertErr } = await supabase
          .from("app_users")
          .upsert([payload], { onConflict: "user_id" }); // ต้องมี unique/PK บน user_id
        if (upsertErr) throw upsertErr;
      }
      openNotificationWithIcon('success',
        "Account created successfully! Please check your email to verify your account."
      );
    } catch (err) {
      setError(err.message);
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
              <Button type="primary" htmlType="submit" block>
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
