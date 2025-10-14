import React, { useState, useEffect, useCallback, use } from "react";
import { Button, Card, Divider, Typography, Badge, Space } from "antd";
import { UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import "./styles.css";
import RegisterForm from "../../components/RegisterForm";
import DoctorRequestList from "../../components/DoctorRequests/DoctorRequestList";
import DoctorRequestTable from "../../components/DoctorRequests/DoctorRequestTable";
import { supabase } from "../../api/SupabaseClient";

const { Title, Text } = Typography;

function Register() {
  const [activeView, setActiveView] = useState("create"); // 'create' | 'requests'
  const [requestCount, setRequestCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [requestList, setRequestList] = useState([]); // เพิ่ม state สำหรับเก็บรายการคำขอแพทย์
  useEffect(() => { 
    console.log("Request List Updated:", requestList);
  }, [requestList]);

  const options = [
    { label: "Doctor", value: "doctor" },
    { label: "Patient", value: "patient" },
  ];

  const fetchRequestCount = useCallback(async () => {
    setLoadingCount(true);
    // Assumption: table 'doctor_requests' with status column. Adjust if schema differs.
    const { count, error } = await supabase
      .from("app_users")
      .select("*", { count: "exact", head: true })
      .eq('role', 'doctor')
      .eq('verify', false) // เฉพาะแพทย์ที่ยังไม่ได้รับการ verify
    if (!error) setRequestCount(count || 0);
    console.log("count :",count)
    setLoadingCount(false);
  }, []);

  useEffect(() => {
    fetchRequestCount();
    // Optional: subscribe to realtime changes if enabled
    const channel = supabase
      .channel("doctor-requests-count")
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_users' },
        () => fetchRequestCount()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequestCount]);

  return (
    <div style={{display: 'flex', flexDirection: 'row', gap: 16, width: '100%', margin: '0', padding: '0'}}>
      <Card className="card-register" bordered={false} style={{ flexShrink: 0 }}>
        <div className="card-register__header">
          {activeView === 'create' ? (
            <UserAddOutlined className="card-register__icon" />
          ) : (
            <TeamOutlined className="card-register__icon" />
          )}
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {activeView === 'create' ? 'Register (Admin)' : 'Doctor Requests'}
            </Title>
            <Text type="secondary" className="subtitle">
              {activeView === 'create' ? 'Create a new user account' : 'Review pending doctor role requests'}
            </Text>
          </div>
        </div>
        <Divider style={{ margin: "16px 0 24px" }} />
        <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
          <Button
            type={activeView === 'create' ? 'primary' : 'default'}
            onClick={() => setActiveView('create')}
            
          >
            Create New User
          </Button>
          <Badge count={requestCount} showZero offset={[ -4, 4 ]}>
            <Button
              type={activeView === 'requests' ? 'primary' : 'default'}
              onClick={() => setActiveView('requests')}
              loading={loadingCount && activeView !== 'requests'}
              block
            >
              Doctor Request
            </Button>
          </Badge>
        </div>
        {activeView === 'create' ? (
          <RegisterForm options={options} />
        ) : (
          <DoctorRequestList onProcessed={fetchRequestCount} setRequestList={setRequestList} requestCount={requestCount}/>
        )}
      </Card>
      {activeView === 'requests' && (
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <DoctorRequestTable requestList={requestList} onProcessed={fetchRequestCount} />
        </div>
      )}

    </div>
  );
}

export default Register;
