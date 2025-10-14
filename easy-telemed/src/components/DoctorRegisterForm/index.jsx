import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Input, Button, Typography, Space, Card, message } from "antd";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { supabase } from "../../api/SupabaseClient";

function DoctorRegisterForm() {
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
      // Sign up user
      const { data, error } = await signUp(email, password);
      if (error) throw error;

      // Get user id (from returned data or by fetching session)
      let userId = data?.user?.id;
      if (!userId) {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        userId = userData.user?.id;
      }
      if (!userId) throw new Error("Cannot resolve user id after signup");

      // Upsert role into app_users (adjust column names if your schema differs)
      // NOTE:
      // Error you saw: "Could not find the 'email' column" => table 'app_users' ไม่มีคอลัมน์ email
      // จาก context เดิม app_users มี (username, website, avatar_url) เท่านั้น
      // แนะนำให้เพิ่มคอลัมน์ role ถ้ายังไม่มี:
      //   alter table public.app_users add column role text default 'patient';
      // แล้วจึงใช้ upsert ด้านล่างได้

      // สร้าง username เบื้องต้นจาก email (ถ้าตารางมีคอลัมน์นี้)
      const derivedUsername = email.split('@')[0];

      // จาก error ล่าสุด: ไม่มี column "id" ใน app_users -> อาจใช้ชื่อ user_id แทน
      // ปรับมาใช้ user_id หากตารางคุณนิยามแบบนั้น (ตรวจใน SQL Editor): \d app_users
      const payload = {
        user_id: userId,
        // username: derivedUsername, // เปิดใช้ถ้ามีคอลัมน์
        role: 'doctor' ,// กำหนด role เป็น verified_doctor,
        verify: false // แพทย์ต้องรอการ verify จาก admin
      };

      const { error: upsertErr } = await supabase
        .from('app_users')
        .upsert([payload], { onConflict: 'user_id' }); // ต้องมี unique/PK บน user_id
      if (upsertErr) throw upsertErr;

      message.success('Doctor account created');
      navigate("/easy-telemed/home");
    } catch (err) {
      setError(err.message);
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
          border: 'none'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={2} style={{ margin: 0, color: '#333' }}>
                Thanks for your interest 
            </Typography.Title>
            <Typography.Text type="secondary">
              Please sign up to your doctor account
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
                {loading ? 'Creating...' : 'Register as Doctor'}
              </Button>
            </Form.Item>
          </Form>

        </Space>
      </Card>
    </div>
  );
}
export default DoctorRegisterForm;
