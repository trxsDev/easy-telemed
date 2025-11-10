import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  message,
  Result,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import MultiStepPatientForm from "../../components/MultiStepPatientForm";
import DoctorProfileForm from "../../components/DoctorProfileForm";
import {
  fetchDoctorProfile,
  fetchPatientProfile,
  resetProfileState,
  selectDoctorProfile,
  selectPatientProfile,
  selectProfileErrors,
  selectProfileLoading,
  updateDoctorProfile,
  updatePatientProfile,
} from "../../store/profileSlice";

const { Title, Text } = Typography;

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, refreshProfile, loadingUser, verify } = useUserAuthSupabase();

  const [activeTab, setActiveTab] = useState("overview");

  const role = (user?.role || "guest").toLowerCase();
  const patientProfile = useSelector(selectPatientProfile);
  const doctorProfile = useSelector(selectDoctorProfile);
  const { loadingPatient, loadingDoctor, updatingPatient, updatingDoctor } =
    useSelector(selectProfileLoading);
  const { patientError, doctorError } = useSelector(selectProfileErrors);

  useEffect(() => {
    if (!user?.user_id) {
      dispatch(resetProfileState());
      return;
    }

    if (role === "patient") {
      dispatch(fetchPatientProfile(user.user_id));
    } else if (role === "doctor") {
      dispatch(fetchDoctorProfile(user.user_id));
    } else {
      dispatch(resetProfileState());
    }
  }, [dispatch, role, user?.user_id]);

  useEffect(() => {
    setActiveTab("overview");
  }, [role]);

  useEffect(() => {
    if (patientError && role === "patient" && !loadingPatient && !updatingPatient) {
      message.error(patientError);
    }
  }, [patientError, role, loadingPatient, updatingPatient]);

  useEffect(() => {
    if (doctorError && role === "doctor" && !loadingDoctor && !updatingDoctor) {
      message.error(doctorError);
    }
  }, [doctorError, role, loadingDoctor, updatingDoctor]);

  const handlePatientSubmit = async (formData) => {
    if (!user?.user_id) return;
    try {
      await dispatch(
        updatePatientProfile({ userId: user.user_id, formData, user })
      ).unwrap();
      await refreshProfile?.();
      message.success(t("PROFILE_SAVE_SUCCESS"));
      navigate("/easy-telemed/home");
    } catch (error) {
      message.error(error || t("PROFILE_SAVE_ERROR"));
    }
  };

  const handleDoctorSubmit = async (formValues) => {
    if (!user?.user_id) return;
    try {
      await dispatch(
        updateDoctorProfile({ userId: user.user_id, formValues, user })
      ).unwrap();
      await refreshProfile?.();
      message.success(t("PROFILE_DOCTOR_SAVE_SUCCESS"));
      navigate("/easy-telemed/home");
    } catch (error) {
      message.error(error || t("PROFILE_SAVE_ERROR"));
    }
  };

  const formatValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return t("PROFILE_NOT_PROVIDED");
    }
    return value;
  };

  const formatDate = (value) => {
    if (!value) return t("PROFILE_NOT_PROVIDED");
    return dayjs(value).format("D MMM YYYY");
  };

  const formatDateTime = (value) => {
    if (!value) return null;
    return dayjs(value).format("D MMM YYYY HH:mm");
  };

  const formatConsent = (value) => {
    if (value === true) return t("PROFILE_CONSENT_ACCEPTED");
    if (value === false) return t("PROFILE_CONSENT_DECLINED");
    return t("PROFILE_NOT_PROVIDED");
  };

  const languageLabels = {
    th: t("PROFILE_LANGUAGE_TH"),
    en: t("PROFILE_LANGUAGE_EN"),
  };

  const getLanguageLabel = (code) => {
    if (!code) return t("PROFILE_NOT_PROVIDED");
    if (languageLabels[code]) return languageLabels[code];
    return typeof code === "string" ? code.toUpperCase() : `${code}`;
  };

  const sexLabels = {
    male: t("PROFILE_SEX_MALE"),
    female: t("PROFILE_SEX_FEMALE"),
    intersex: t("PROFILE_SEX_INTERSEX"),
    unknown: t("PROFILE_SEX_UNKNOWN"),
  };

  const getSexLabel = (code) => {
    if (!code) return t("PROFILE_NOT_PROVIDED");
    return sexLabels[code] || code;
  };

  const relationshipLabels = {
    spouse: t("PROFILE_RELATIONSHIP_SPOUSE"),
    parent: t("PROFILE_RELATIONSHIP_PARENT"),
    child: t("PROFILE_RELATIONSHIP_CHILD"),
    sibling: t("PROFILE_RELATIONSHIP_SIBLING"),
    friend: t("PROFILE_RELATIONSHIP_FRIEND"),
    relative: t("PROFILE_RELATIONSHIP_RELATIVE"),
    other: t("PROFILE_RELATIONSHIP_OTHER"),
  };

  const getRelationshipLabel = (value) => {
    if (!value) return t("PROFILE_NOT_PROVIDED");
    return relationshipLabels[value] || value;
  };

  const formatList = (value) => {
    if (Array.isArray(value) && value.length > 0) {
      return value.join(", ");
    }
    return t("PROFILE_NOT_PROVIDED");
  };

  const patientData = patientProfile || {};
  const doctorData = doctorProfile || {};
  const address = patientData.address || {};
  const emergency = patientData.emergency_contact || {};

  const verificationStatusLabel =
    verify === true
      ? t("PROFILE_STATUS_VERIFIED")
      : verify === false
      ? t("PROFILE_STATUS_PENDING")
      : t("PROFILE_STATUS_UNKNOWN");

  const verificationStatusColor =
    verify === true ? "green" : verify === false ? "orange" : "default";

  const roleLabelMap = {
    admin: "PROFILE_ROLE_ADMIN",
    doctor: "PROFILE_ROLE_DOCTOR",
    patient: "PROFILE_ROLE_PATIENT",
  };

  const roleTranslationKey = roleLabelMap[role];
  const roleDisplay = roleTranslationKey
    ? t(roleTranslationKey)
    : role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : t("PROFILE_NOT_PROVIDED");

  const roleTagColor =
    role === "doctor"
      ? "geekblue"
      : role === "admin"
      ? "magenta"
      : role === "patient"
      ? "blue"
      : "default";

  const patientHasProfile = !!(
    patientProfile && Object.keys(patientProfile).length > 0
  );

  const doctorHasProfile = !!(
    doctorProfile &&
    (doctorData.license_no ||
      doctorData.hospital ||
      doctorData.country ||
      (Array.isArray(doctorData.specialties) && doctorData.specialties.length > 0))
  );

  const fullName =
    role === "patient"
      ? (() => {
          const composed = `${patientData.fname || ""} ${patientData.lname || ""}`.trim();
          if (composed) return composed;
          if (user?.display_name) return user.display_name;
          if (user?.email) return user.email;
          return t("PROFILE_NOT_PROVIDED");
        })()
      : doctorData.display_name || user?.display_name || user?.email || t("PROFILE_NOT_PROVIDED");

  const lastUpdated =
    role === "patient" ? patientData.updated_at : doctorData.updated_at || null;

  const quickFacts =
    role === "patient"
      ? [
          { label: t("PROFILE_PHONE_LABEL"), value: formatValue(patientData.phone || user?.phone) },
          {
            label: t("PROFILE_LANGUAGE_PREFERENCE_LABEL"),
            value: getLanguageLabel(patientData.language_pref),
          },
          { label: t("PROFILE_DOB_LABEL"), value: formatDate(patientData.dob) },
          {
            label: t("PROFILE_CITY_LABEL"),
            value: formatValue(address.city),
          },
        ]
      : [
          { label: t("PROFILE_SPECIALTIES_LABEL"), value: formatList(doctorData.specialties) },
          { label: t("DOCTOR_LICENSE_LABEL"), value: formatValue(doctorData.license_no) },
          { label: t("PROFILE_HOSPITAL_LABEL"), value: formatValue(doctorData.hospital) },
          { label: t("PROFILE_COUNTRY_LABEL"), value: formatValue(doctorData.country) },
        ];

  const renderProfileCard = () => {
    const avatarLetter = typeof fullName === "string" ? fullName.charAt(0).toUpperCase() : "U";
    return (
      <Card styles={{ body: { padding: 24 } }} style={{ height: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space size="large" align="center">
            <Avatar
              size={80}
              style={{ backgroundColor: "#1677ff", fontSize: 32 }}
              icon={!fullName ? <UserOutlined /> : null}
            >
              {fullName ? avatarLetter : null}
            </Avatar>
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ marginBottom: 0 }}>
                {fullName}
              </Title>
              <Text type="secondary">{user?.email || t("PROFILE_NOT_PROVIDED")}</Text>
            </Space>
          </Space>

          <div>
            <Text strong>{t("PROFILE_STATUS_LABEL")}</Text>
            <Space size="small" wrap style={{ marginTop: 8 }}>
              <Tag color={verificationStatusColor}>{verificationStatusLabel}</Tag>
              <Tag color={roleTagColor}>{roleDisplay}</Tag>
            </Space>
          </div>

          <Button type="primary" block onClick={() => setActiveTab("edit")}>
            {(role === "patient" && patientHasProfile) || (role === "doctor" && doctorHasProfile)
              ? t("PROFILE_EDIT_BUTTON")
              : t("PROFILE_CREATE_BUTTON")}
          </Button>

          <Divider style={{ margin: "12px 0" }} />

          <Descriptions layout="vertical" column={1} size="small">
            {quickFacts.map(({ label, value }) => (
              <Descriptions.Item label={label} key={label}>
                {value}
              </Descriptions.Item>
            ))}
          </Descriptions>

          {lastUpdated && (
            <Text type="secondary">
              {t("PROFILE_LAST_UPDATED_LABEL")}: {formatDateTime(lastUpdated)}
            </Text>
          )}
        </Space>
      </Card>
    );
  };

  const renderPatientOverview = () => (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ marginBottom: 0 }}>
            {t("PROFILE_OVERVIEW_TITLE")}
          </Title>
          <Text type="secondary">{t("PROFILE_OVERVIEW_DESC")}</Text>
        </Space>
        <Button type="primary" onClick={() => setActiveTab("edit")}>
          {patientHasProfile ? t("PROFILE_EDIT_BUTTON") : t("PROFILE_CREATE_BUTTON")}
        </Button>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_BASIC")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_NAME_LABEL")}>{fullName}</Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_ROLE_LABEL")}>{roleDisplay}</Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_DOB_LABEL")}>
            {formatDate(patientData.dob)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_GENDER_LABEL")}>
            {getSexLabel(patientData.sex_at_birth)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_LANGUAGE_PREFERENCE_LABEL")}>
            {getLanguageLabel(patientData.language_pref)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_CONTACT")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_EMAIL_LABEL")}>
            {user?.email || t("PROFILE_NOT_PROVIDED")}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_PHONE_LABEL")}>
            {formatValue(patientData.phone || user?.phone)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_ADDRESS")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_ADDRESS_LINE_LABEL")}>
            {formatValue(address.street)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_CITY_LABEL")}>
            {formatValue(address.city)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_PROVINCE_LABEL")}>
            {formatValue(address.province)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_POSTAL_CODE_LABEL")}>
            {formatValue(address.postal_code)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_EMERGENCY")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_EMERGENCY_NAME_LABEL")}>
            {formatValue(emergency.name)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_EMERGENCY_RELATIONSHIP_LABEL")}>
            {getRelationshipLabel(emergency.relationship)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_EMERGENCY_PHONE_LABEL")}>
            {formatValue(emergency.phone)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_EMERGENCY_ALT_PHONE_LABEL")}>
            {formatValue(emergency.alt_phone)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_EMERGENCY_ADDRESS_LABEL")}>
            {formatValue(emergency.address)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_CONSENT")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_CONSENT_TELEMED_LABEL")}>
            {formatConsent(patientData.consent_telemed)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_CONSENT_PRIVACY_LABEL")}>
            {formatConsent(patientData.consent_privacy)}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Space>
  );

  const renderDoctorOverview = () => (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ marginBottom: 0 }}>
            {t("PROFILE_OVERVIEW_TITLE")}
          </Title>
          <Text type="secondary">{t("PROFILE_OVERVIEW_DESC")}</Text>
        </Space>
        <Button type="primary" onClick={() => setActiveTab("edit")}>
          {doctorHasProfile ? t("PROFILE_EDIT_BUTTON") : t("PROFILE_CREATE_BUTTON")}
        </Button>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_BASIC")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_NAME_LABEL")}>{fullName}</Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_EMAIL_LABEL")}>
            {user?.email || t("PROFILE_NOT_PROVIDED")}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_PHONE_LABEL")}>
            {formatValue(user?.phone)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div>
        <Title level={5}>{t("PROFILE_SECTION_PROFESSIONAL")}</Title>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label={t("PROFILE_SPECIALTIES_LABEL")}>
            {formatList(doctorData.specialties)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_HOSPITAL_LABEL")}>
            {formatValue(doctorData.hospital)}
          </Descriptions.Item>
          <Descriptions.Item label={t("PROFILE_COUNTRY_LABEL")}>
            {formatValue(doctorData.country)}
          </Descriptions.Item>
          <Descriptions.Item label={t("DOCTOR_LICENSE_LABEL")}>
            {formatValue(doctorData.license_no)}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Space>
  );

  const renderPatientEditor = () => (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4}>
        <Title level={4} style={{ marginBottom: 0 }}>
          {t("PROFILE_PATIENT_TITLE")}
        </Title>
        <Text type="secondary">{t("PROFILE_PATIENT_DESC")}</Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t("PROFILE_PATIENT_FORM_HELP")}
        </Text>
      </Space>
      <MultiStepPatientForm
        initialData={patientData}
        onSubmit={handlePatientSubmit}
        mode={patientHasProfile ? "edit" : "create"}
        loading={updatingPatient}
      />
    </Space>
  );

  const renderDoctorEditor = () => (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <DoctorProfileForm
        initialData={{
          display_name: doctorData.display_name || user?.display_name || "",
          license_no: doctorData.license_no || "",
          hospital: doctorData.hospital || "",
          country: doctorData.country || "",
          specialties: doctorData.specialties || [],
        }}
        onSubmit={handleDoctorSubmit}
        loading={updatingDoctor}
      />
    </Space>
  );

  const renderTabs = () => {
    if (role === "patient") {
      return (
        <Card styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "overview",
                label: t("PROFILE_TAB_OVERVIEW"),
                children: <div style={{ padding: 24 }}>{renderPatientOverview()}</div>,
              },
              {
                key: "edit",
                label: t("PROFILE_TAB_EDIT"),
                children: <div style={{ padding: 24 }}>{renderPatientEditor()}</div>,
              },
            ]}
          />
        </Card>
      );
    }

    if (role === "doctor") {
      return (
        <Card styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "overview",
                label: t("PROFILE_TAB_OVERVIEW"),
                children: <div style={{ padding: 24 }}>{renderDoctorOverview()}</div>,
              },
              {
                key: "edit",
                label: t("PROFILE_TAB_EDIT"),
                children: <div style={{ padding: 24 }}>{renderDoctorEditor()}</div>,
              },
            ]}
          />
        </Card>
      );
    }

    return (
      <Result
        status="info"
        title={t("PROFILE_ROLE_UNSUPPORTED_TITLE")}
        subTitle={t("PROFILE_ROLE_UNSUPPORTED_DESC")}
        extra={
          <Button type="primary" onClick={() => navigate("/easy-telemed/home")}>
            {t("PROFILE_NAVIGATE_HOME")}
          </Button>
        }
      />
    );
  };

  const isFetching =
    (role === "patient" && loadingPatient) ||
    (role === "doctor" && loadingDoctor);

  if (loadingUser || isFetching) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Space direction="vertical" size="large">
          <Spin size="large" />
          <div style={{ color: "#8c8c8c" }}>{t("PROFILE_LOADING")}</div>
        </Space>
      </div>
    );
  }

  if (!user) {
    return (
      <Result
        status="warning"
        title={t("LOGIN_REQUIRED", "Please sign in before submitting your case")}
        extra={
          <Button type="primary" onClick={() => navigate("/signin")}>
            {t("signIn", "Sign In")}
          </Button>
        }
      />
    );
  }

  if (!["patient", "doctor"].includes(role)) {
    return (
      <div style={{ padding: 24 }}>
        <Result
          status="info"
          title={t("PROFILE_ROLE_UNSUPPORTED_TITLE")}
          subTitle={t("PROFILE_ROLE_UNSUPPORTED_DESC")}
          extra={
            <Button type="primary" onClick={() => navigate("/easy-telemed/home")}>
              {t("PROFILE_NAVIGATE_HOME")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          {renderProfileCard()}
        </Col>
        <Col xs={24} lg={16}>
          {renderTabs()}
        </Col>
      </Row>
    </div>
  );
}

export default Profile;
