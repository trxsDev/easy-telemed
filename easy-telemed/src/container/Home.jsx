import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
  Button,
  List,
  Tag,
} from "antd";
import {
  FileAddOutlined,
  CalendarOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  BarChartOutlined,
  ScheduleOutlined,
  TeamOutlined,
  SafetyOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";

const { Title, Paragraph, Text } = Typography;

const formatCount = (value) => {
  if (value === undefined || value === null) return "--";
  if (typeof value === "number") return value.toString();
  return value;
};

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUserAuthSupabase();

  const displayName =
    user?.display_name ||
    user?.full_name ||
    user?.email ||
    t("HOME_GUEST_NAME", "Guest");

  const role = (user?.role || "guest").toLowerCase();

  const subtitle = t(`HOME_SUBTITLE_${role.toUpperCase()}`, {
    defaultValue: t(
      "HOME_SUBTITLE",
      "Here’s a quick snapshot of what’s happening today."
    ),
  });

  const activeCaseId = useMemo(() => {
    try {
      return localStorage.getItem("activeCaseId");
    } catch (error) {
      console.warn("Unable to read activeCaseId from storage", error);
      return null;
    }
  }, []);

  const profileComplete = Boolean(
    user?.profile_completed ||
      user?.profile_complete ||
      user?.profileStatus === "complete"
  );

  const patientContent = useMemo(() => {
    const stats = [
      {
        key: "activeCase",
        label: t("HOME_STAT_ACTIVE_CASE", "Active case"),
        value: activeCaseId
          ? `#${activeCaseId.slice(-6)}`
          : t("HOME_STAT_NONE", "None"),
        hint: activeCaseId
          ? t(
              "HOME_STAT_ACTIVE_CASE_HINT",
              "We’ll notify you if anything changes."
            )
          : t(
              "HOME_STAT_NO_CASE_HINT",
              "Create a case to start a consultation."
            ),
      },
      {
        key: "role",
        label: t("HOME_STAT_ROLE", "Current role"),
        value: t(`HOME_ROLE_${role.toUpperCase()}`, {
          defaultValue: role.charAt(0).toUpperCase() + role.slice(1),
        }),
        hint: t("HOME_STAT_ROLE_HINT", "Access is tailored to your role."),
      },
      {
        key: "profile",
        label: t("HOME_STAT_PROFILE_STATUS", "Profile status"),
        value: profileComplete
          ? t("HOME_STAT_PROFILE_COMPLETE", "Complete")
          : t("HOME_STAT_PROFILE_INCOMPLETE", "In progress"),
        hint: profileComplete
          ? t(
              "HOME_STAT_PROFILE_HINT_COMPLETE",
              "Great! Your details help doctors prepare."
            )
          : t(
              "HOME_STAT_PROFILE_HINT_INCOMPLETE",
              "Add more medical history for better matching."
            ),
      },
    ];

    const quickActions = [
      {
        key: "newCase",
        title: t("HOME_ACTION_NEW_CASE_TITLE", "Start a new case"),
        description: t(
          "HOME_ACTION_NEW_CASE_DESC",
          "Tell us what’s happening so we can match you with the right doctor."
        ),
        icon: <FileAddOutlined />,
        onClick: () => navigate("/easy-telemed/illness-case"),
      },
      {
        key: "trackCase",
        title: t("HOME_ACTION_TRACK_CASE_TITLE", "Track my active case"),
        description: activeCaseId
          ? t(
              "HOME_ACTION_TRACK_CASE_DESC_ACTIVE",
              "See the latest status and messages for your current case."
            )
          : t(
              "HOME_ACTION_TRACK_CASE_DESC_EMPTY",
              "Create a case to see live updates and queue position here."
            ),
        icon: <CalendarOutlined />,
        onClick: () =>
          activeCaseId
            ? navigate(`/easy-telemed/matching/${activeCaseId}/wait`)
            : navigate("/easy-telemed/illness-case"),
        tag: !activeCaseId
          ? t("HOME_ACTION_NO_ACTIVE_CASE", "No active case yet")
          : undefined,
      },
      {
        key: "profile",
        title: t("HOME_ACTION_UPDATE_PROFILE_TITLE", "Update my profile"),
        description: t(
          "HOME_ACTION_UPDATE_PROFILE_DESC",
          "Keep your medical history and preferences current for faster triage."
        ),
        icon: <UserOutlined />,
        onClick: () => navigate("/easy-telemed/profile"),
      },
    ];

    const nextSteps = [
      {
        key: "patient-case",
        title: t("HOME_NEXT_STEP_CASE", "Create a case"),
        description: t(
          "HOME_NEXT_STEP_CASE_DESC",
          "Describe your symptoms and upload photos so our team can triage quickly."
        ),
        action: () => navigate("/easy-telemed/illness-case"),
        icon: <FileAddOutlined />,
      },
      {
        key: "patient-profile",
        title: t("HOME_NEXT_STEP_PROFILE", "Update profile"),
        description: t(
          "HOME_NEXT_STEP_PROFILE_DESC",
          "Let us know about medications, allergies, and lifestyle to personalise care."
        ),
        action: () => navigate("/easy-telemed/profile"),
        icon: <UserOutlined />,
      },
      {
        key: "patient-schedule",
        title: t(
          "HOME_NEXT_STEP_SCHEDULE",
          "Check upcoming consultations"
        ),
        description: t(
          "HOME_NEXT_STEP_SCHEDULE_DESC",
          "Review schedules and prepare any notes before your session."
        ),
        action: () => {
          if (activeCaseId) {
            navigate(`/easy-telemed/matching/${activeCaseId}/wait`);
          } else {
            navigate("/easy-telemed/illness-case");
          }
        },
        icon: <CalendarOutlined />,
      },
    ];

    return {
      subtitle,
      stats,
      quickActions,
      nextSteps,
      support: {
        title: t("HOME_SUPPORT_TITLE", "Need support?"),
        description: t(
          "HOME_SUPPORT_DESC",
          "Our care team is on standby to help troubleshoot technical issues or answer questions."
        ),
        ctaLabel: t("HOME_SUPPORT_CONTACT", "Contact support"),
        ctaHref: "mailto:support@easy-telemed.com",
      },
    };
  }, [activeCaseId, navigate, profileComplete, role, subtitle, t]);

  const doctorContent = useMemo(() => {
    if (role !== "doctor") return null;
    const doctorMetrics =
      user?.doctor_metrics || user?.dashboard_metrics || user?.metrics || {};

    const onCall =
      doctorMetrics.is_active ?? doctorMetrics.on_call ?? user?.verify ?? false;
    const queueLength = formatCount(doctorMetrics.queue_length);
    const todaysConsults = formatCount(doctorMetrics.today_consultations);
    const lastSeen = doctorMetrics.last_seen_at || user?.last_seen_at;

    const stats = [
      {
        key: "status",
        label: t("HOME_STAT_DOCTOR_STATUS", "On-call status"),
        value: onCall
          ? t("HOME_STAT_DOCTOR_STATUS_ACTIVE", "On call")
          : t("HOME_STAT_DOCTOR_STATUS_INACTIVE", "Offline"),
        hint: lastSeen
          ? t("HOME_STAT_DOCTOR_STATUS_HINT_TIMESTAMP", {
              defaultValue: "Last seen {{time}}",
              time: new Date(lastSeen).toLocaleString(),
            })
          : t(
              "HOME_STAT_DOCTOR_STATUS_HINT",
              "Update availability from the queue tab."
            ),
      },
      {
        key: "queue",
        label: t("HOME_STAT_DOCTOR_QUEUE", "Patients waiting"),
        value: queueLength,
        hint: t(
          "HOME_STAT_DOCTOR_QUEUE_HINT",
          "Join the queue when you’re ready to consult."
        ),
      },
      {
        key: "todayConsults",
        label: t("HOME_STAT_DOCTOR_TODAY", "Consultations today"),
        value: todaysConsults,
        hint: t(
          "HOME_STAT_DOCTOR_TODAY_HINT",
          "Wrap up summaries so patients receive updates quickly."
        ),
      },
    ];

    const quickActions = [
      {
        key: "doctorQueue",
        title: t("HOME_ACTION_DOCTOR_QUEUE_TITLE", "Open my patient queue"),
        description: t(
          "HOME_ACTION_DOCTOR_QUEUE_DESC",
          "View patients waiting and join live consultations."
        ),
        icon: <BarChartOutlined />,
        onClick: () => navigate("/easy-telemed/doctor/queue"),
      },
      {
        key: "doctorSchedule",
        title: t("HOME_ACTION_DOCTOR_SCHEDULE_TITLE", "Review my schedule"),
        description: t(
          "HOME_ACTION_DOCTOR_SCHEDULE_DESC",
          "Check upcoming consultations and block out time."
        ),
        icon: <CalendarOutlined />,
        onClick: () => navigate("/easy-telemed/doctor/schedule"),
      },
      {
        key: "doctorAvailability",
        title: t("HOME_ACTION_DOCTOR_AVAIL_TITLE", "Update availability"),
        description: t(
          "HOME_ACTION_DOCTOR_AVAIL_DESC",
          "Adjust your on-call hours so patients can be matched faster."
        ),
        icon: <ScheduleOutlined />,
        onClick: () =>
          navigate("/easy-telemed/doctor/schedule", {
            state: { focus: "availability" },
          }),
      },
    ];

    const nextSteps = [
      {
        key: "doctor-queue",
        title: t("HOME_NEXT_STEP_DOCTOR_QUEUE", "Join the live queue"),
        description: t(
          "HOME_NEXT_STEP_DOCTOR_QUEUE_DESC",
          "See waiting patients and pick cases that match your specialty."
        ),
        action: () => navigate("/easy-telemed/doctor/queue"),
        icon: <BarChartOutlined />,
      },
      {
        key: "doctor-notes",
        title: t("HOME_NEXT_STEP_DOCTOR_NOTES", "Catch up on notes"),
        description: t(
          "HOME_NEXT_STEP_DOCTOR_NOTES_DESC",
          "Finish summaries and handover notes for recent consultations."
        ),
        action: () => navigate("/easy-telemed/doctor/schedule"),
        icon: <AuditOutlined />,
      },
      {
        key: "doctor-profile",
        title: t(
          "HOME_NEXT_STEP_DOCTOR_PROFILE",
          "Complete professional profile"
        ),
        description: t(
          "HOME_NEXT_STEP_DOCTOR_PROFILE_DESC",
          "Update licenses, specialties, and hospital details."
        ),
        action: () => navigate("/easy-telemed/profile"),
        icon: <UserOutlined />,
      },
    ];

    return {
      subtitle,
      stats,
      quickActions,
      nextSteps,
      support: {
        title: t("HOME_SUPPORT_TITLE_DOCTOR", "Need operational support?"),
        description: t(
          "HOME_SUPPORT_DESC_DOCTOR",
          "Contact the clinical operations team if you need assistance with queue management or patient handoffs."
        ),
        ctaLabel: t("HOME_SUPPORT_CONTACT_DOCTOR", "Message operations"),
        ctaHref: "mailto:operations@easy-telemed.com",
      },
    };
  }, [navigate, role, subtitle, t, user]);

  const adminContent = useMemo(() => {
    if (role !== "admin") return null;
    const adminMetrics =
      user?.admin_metrics || user?.dashboard_metrics || user?.metrics || {};

    const stats = [
      {
        key: "users",
        label: t("HOME_STAT_ADMIN_USERS", "Total users"),
        value: formatCount(adminMetrics.total_users),
        hint: t(
          "HOME_STAT_ADMIN_USERS_HINT",
          "Includes patients, doctors, and staff accounts."
        ),
      },
      {
        key: "pendingProviders",
        label: t(
          "HOME_STAT_ADMIN_PENDING",
          "Pending provider applications"
        ),
        value: formatCount(adminMetrics.pending_provider_apps),
        hint: t(
          "HOME_STAT_ADMIN_PENDING_HINT",
          "Review applications promptly to expand clinical capacity."
        ),
      },
      {
        key: "activeDoctors",
        label: t(
          "HOME_STAT_ADMIN_ACTIVE_DOCTORS",
          "Doctors online"
        ),
        value: formatCount(adminMetrics.active_doctors),
        hint: t(
          "HOME_STAT_ADMIN_ACTIVE_DOCTORS_HINT",
          "Monitor coverage to balance patient demand."
        ),
      },
    ];

    const quickActions = [
      {
        key: "adminUsers",
        title: t(
          "HOME_ACTION_ADMIN_MANAGE_USERS_TITLE",
          "Manage user accounts"
        ),
        description: t(
          "HOME_ACTION_ADMIN_MANAGE_USERS_DESC",
          "Invite new staff, reset access, or adjust roles."
        ),
        icon: <TeamOutlined />,
        onClick: () => navigate("/easy-telemed/register"),
      },
      {
        key: "adminRequests",
        title: t(
          "HOME_ACTION_ADMIN_REVIEW_REQUESTS_TITLE",
          "Review doctor applications"
        ),
        description: t(
          "HOME_ACTION_ADMIN_REVIEW_REQUESTS_DESC",
          "Verify credentials and approve pending provider requests."
        ),
        icon: <SafetyOutlined />,
        onClick: () =>
          navigate("/easy-telemed/register", { state: { tab: "requests" } }),
      },
      {
        key: "adminDashboard",
        title: t(
          "HOME_ACTION_ADMIN_DASHBOARD_TITLE",
          "Open operations dashboard"
        ),
        description: t(
          "HOME_ACTION_ADMIN_DASHBOARD_DESC",
          "Monitor queues, consult volume, and platform health."
        ),
        icon: <BarChartOutlined />,
        onClick: () => navigate("/easy-telemed/userDashboard"),
      },
    ];

    const nextSteps = [
      {
        key: "admin-users",
        title: t("HOME_NEXT_STEP_ADMIN_USERS", "Audit user roles"),
        description: t(
          "HOME_NEXT_STEP_ADMIN_USERS_DESC",
          "Ensure every account has the correct permissions."
        ),
        action: () => navigate("/easy-telemed/register"),
        icon: <TeamOutlined />,
      },
      {
        key: "admin-requests",
        title: t(
          "HOME_NEXT_STEP_ADMIN_REQUESTS",
          "Review provider applications"
        ),
        description: t(
          "HOME_NEXT_STEP_ADMIN_REQUESTS_DESC",
          "Check new submissions and follow up on outstanding documents."
        ),
        action: () =>
          navigate("/easy-telemed/register", { state: { tab: "requests" } }),
        icon: <SafetyOutlined />,
      },
      {
        key: "admin-audit",
        title: t("HOME_NEXT_STEP_ADMIN_AUDIT", "Monitor audit activity"),
        description: t(
          "HOME_NEXT_STEP_ADMIN_AUDIT_DESC",
          "Review recent changes and system events for compliance."
        ),
        action: () => navigate("/easy-telemed/userDashboard"),
        icon: <AuditOutlined />,
      },
    ];

    return {
      subtitle,
      stats,
      quickActions,
      nextSteps,
      support: {
        title: t(
          "HOME_SUPPORT_TITLE_ADMIN",
          "Need administrative support?"
        ),
        description: t(
          "HOME_SUPPORT_DESC_ADMIN",
          "Contact the platform team for billing, compliance, or operational questions."
        ),
        ctaLabel: t("HOME_SUPPORT_CONTACT_ADMIN", "Email platform team"),
        ctaHref: "mailto:platform@easy-telemed.com",
      },
    };
  }, [navigate, role, subtitle, t, user]);

  const content =
    doctorContent || adminContent || patientContent;
  const { stats, quickActions, nextSteps, support } = content;

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            {t("HOME_TITLE", { name: displayName })}
          </Title>
          <Paragraph style={{ marginBottom: 0 }}>{content.subtitle}</Paragraph>
        </div>

        <Row gutter={[16, 16]}>
          {stats.map((stat) => (
            <Col key={stat.key} xs={24} md={8}>
              <Card>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Text type="secondary">{stat.label}</Text>
                  <Title level={3} style={{ margin: 0 }}>
                    {stat.value}
                  </Title>
                  <Text style={{ color: "#667085", fontSize: 13 }}>
                    {stat.hint}
                  </Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          title={t("HOME_QUICK_ACTIONS_TITLE", "Quick actions")}
          extra={
            <Tag color="blue" icon={<QuestionCircleOutlined />}>
              {t("HOME_SECTION_HINT", "Need a hand? Start here.")}
            </Tag>
          }
        >
          <Row gutter={[16, 16]}>
            {quickActions.map((action) => (
              <Col key={action.key} xs={24} md={12} lg={6}>
                <Card
                  bordered
                  style={{ height: "100%" }}
                  bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <Tag
                    color="processing"
                    icon={action.icon}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {t("HOME_ACTION_TAG", "Action")}
                  </Tag>
                  <Title level={4} style={{ margin: 0 }}>
                    {action.title}
                  </Title>
                  <Paragraph style={{ flex: 1 }}>{action.description}</Paragraph>
                  {action.tag && (
                    <Tag color="default" style={{ alignSelf: "flex-start" }}>
                      {action.tag}
                    </Tag>
                  )}
                  <Button
                    type="primary"
                    icon={action.icon}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {t("HOME_ACTION_BUTTON", "Go")}
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title={t("HOME_NEXT_STEPS_TITLE", "What’s next?")}>
              <List
                itemLayout="horizontal"
                dataSource={nextSteps}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button key="go" type="link" onClick={item.action}>
                        {t("HOME_NEXT_STEP_ACTION", "Open")}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Tag color="blue" icon={item.icon} />}
                      title={item.title}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={support.title}
              extra={<QuestionCircleOutlined style={{ color: "#1677ff" }} />}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {support.description}
                </Paragraph>
                <Button
                  type="default"
                  icon={<QuestionCircleOutlined />}
                  href={support.ctaHref}
                >
                  {support.ctaLabel}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}

export default Home;
