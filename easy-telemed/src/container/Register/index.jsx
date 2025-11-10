import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Card, Divider, Typography, Badge } from "antd";
import { UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import "./styles.css";
import RegisterForm from "../../components/RegisterForm";
import DoctorRequestList from "../../components/DoctorRequests/DoctorRequestList";
import DoctorRequestTable from "../../components/DoctorRequests/DoctorRequestTable";
import { useTranslation } from "react-i18next";
import ChangeLangButton from "../../components/ChangeLangButton";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDoctorRequestCount,
  fetchDoctorRequestList,
} from "../../store/doctorRequestsSlice";
import { selectDoctorRequestsState } from "../../store";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";

const { Title, Text } = Typography;

function Register() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useUserAuthSupabase();
  const [activeView, setActiveView] = useState("create"); // 'create' | 'requests'
  const {
    count: requestCount,
    loadingCount,
    list: requestList,
    loadingList,
  } = useSelector(selectDoctorRequestsState);

  const options = useMemo(
    () => [
      { label: t("registerForm.roles.doctor"), value: "doctor" },
      { label: t("registerForm.roles.patient"), value: "patient" },
    ],
    [t]
  );

  const refreshCount = useCallback(() => {
    dispatch(fetchDoctorRequestCount());
  }, [dispatch]);

  const refreshList = useCallback(() => {
    dispatch(fetchDoctorRequestList());
  }, [dispatch]);

  const refreshAll = useCallback(() => {
    refreshList();
    refreshCount();
  }, [refreshList, refreshCount]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
          <DoctorRequestList
            requests={requestList}
            loading={loadingList}
            requestingCount={requestCount}
            onRefresh={refreshAll}
            onProcessed={refreshCount}
            currentUserId={user?.user_id}
          />
        )}
      </Card>
      {activeView === 'requests' && (
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <DoctorRequestTable
            requests={requestList}
            loading={loadingList}
            onRefresh={refreshAll}
            onProcessed={refreshCount}
            currentUserId={user?.user_id}
          />
        </div>
      )}

    </div>
  );
}

export default Register;
