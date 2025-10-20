import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Card, Divider, Typography, Badge } from "antd";
import { UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import "./styles.css";
import RegisterForm from "../../components/RegisterForm";
import DoctorRequestList from "../../components/DoctorRequests/DoctorRequestList";
import DoctorRequestTable from "../../components/DoctorRequests/DoctorRequestTable";
import { supabase } from "../../api/SupabaseClient";
import { useTranslation } from "react-i18next";
import ChangeLangButton from "../../components/ChangeLangButton";

const { Title, Text } = Typography;

function Register() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState("create"); // 'create' | 'requests'
  const [requestCount, setRequestCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [requestList, setRequestList] = useState([]); // เพิ่ม state สำหรับเก็บรายการคำขอแพทย์
  useEffect(() => { 
    console.log("Request List Updated:", requestList);
  }, [requestList]);

  const options = useMemo(
    () => [
      { label: t("registerForm.roles.doctor"), value: "doctor" },
      { label: t("registerForm.roles.patient"), value: "patient" },
    ],
    [t]
  );

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
          <div className="card-register__info">
            {activeView === 'create' ? (
              <UserAddOutlined className="card-register__icon" />
            ) : (
              <TeamOutlined className="card-register__icon" />
            )}
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {activeView === 'create'
                  ? t("registerPage.headers.createTitle")
                  : t("registerPage.headers.requestsTitle")}
              </Title>
              <Text type="secondary" className="subtitle">
                {activeView === 'create'
                  ? t("registerPage.headers.createSubtitle")
                  : t("registerPage.headers.requestsSubtitle")}
              </Text>
            </div>
          </div>
          <div className="card-register__lang">
            <ChangeLangButton />
          </div>
        </div>
        <Divider style={{ margin: "16px 0 24px" }} />
        <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
          <Button
            type={activeView === 'create' ? 'primary' : 'default'}
            onClick={() => setActiveView('create')}
          >
            {t("registerPage.buttons.createUser")}
          </Button>
          <Badge count={requestCount} showZero offset={[ -4, 4 ]}>
            <Button
              type={activeView === 'requests' ? 'primary' : 'default'}
              onClick={() => setActiveView('requests')}
              loading={loadingCount && activeView !== 'requests'}
              block
            >
              {t("registerPage.buttons.doctorRequests")}
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
