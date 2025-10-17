import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Typography, Switch, Space, TimePicker, Button, message, Spin, Alert, Divider } from "antd";
import { PlusOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { fetchDoctorSchedule, upsertDoctorSchedule } from "../../services/doctorScheduleService";

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = TimePicker;

const DAYS_OF_WEEK = [
  { key: "monday", labelKey: "MONDAY", fallback: "Monday" },
  { key: "tuesday", labelKey: "TUESDAY", fallback: "Tuesday" },
  { key: "wednesday", labelKey: "WEDNESDAY", fallback: "Wednesday" },
  { key: "thursday", labelKey: "THURSDAY", fallback: "Thursday" },
  { key: "friday", labelKey: "FRIDAY", fallback: "Friday" },
  { key: "saturday", labelKey: "SATURDAY", fallback: "Saturday" },
  { key: "sunday", labelKey: "SUNDAY", fallback: "Sunday" },
];

const DEFAULT_SLOT = { start: "09:00", end: "17:00" };

const buildDefaultScheduleState = () =>
  DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day.key] = {
      enabled: false,
      slots: [{ ...DEFAULT_SLOT }],
    };
    return acc;
  }, {});

const toDayjsRange = (slot) => {
  if (!slot?.start || !slot?.end) return [null, null];
  return [dayjs(slot.start, "HH:mm"), dayjs(slot.end, "HH:mm")];
};

const isSlotValid = (slot) => {
  if (!slot?.start || !slot?.end) return false;
  const start = dayjs(slot.start, "HH:mm");
  const end = dayjs(slot.end, "HH:mm");
  return start.isValid() && end.isValid() && end.isAfter(start);
};

const normalizeScheduleForSave = (scheduleState) =>
  DAYS_OF_WEEK.map((day) => ({
    day: day.key,
    enabled: Boolean(scheduleState[day.key]?.enabled),
    slots: (scheduleState[day.key]?.slots || [])
      .filter(isSlotValid)
      .map((slot) => ({ start: slot.start, end: slot.end })),
  }));

const extractScheduleState = (rawAvailability) => {
  const base = buildDefaultScheduleState();
  if (!Array.isArray(rawAvailability)) {
    return base;
  }

  rawAvailability.forEach((item) => {
    if (!item?.day) return;
    const key = String(item.day).toLowerCase();
    if (!base[key]) return;

    const slots = Array.isArray(item.slots)
      ? item.slots
          .map((slot) => ({
            start: slot?.start || DEFAULT_SLOT.start,
            end: slot?.end || DEFAULT_SLOT.end,
          }))
          .filter(isSlotValid)
      : [];

    base[key] = {
      enabled: Boolean(item.enabled && slots.length > 0),
      slots: slots.length ? slots : [{ ...DEFAULT_SLOT }],
    };
  });

  return base;
};

function DoctorSchedule() {
  const { t } = useTranslation();
  const { user, role, verify } = useUserAuthSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleState, setScheduleState] = useState(() => buildDefaultScheduleState());
  const [isActive, setIsActive] = useState(false);

  const canEdit = useMemo(() => role === "doctor" && verify === true, [role, verify]);

  const doctorId = user?.user_id;

  useEffect(() => {
    if (!doctorId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchDoctorSchedule(doctorId);
        setIsActive(Boolean(data?.is_active));
        setScheduleState(extractScheduleState(data?.availability));
      } catch (error) {
        console.error("Failed to load doctor schedule", error);
        message.error(t("DOC_SCHEDULE_FETCH_FAILED", "ไม่สามารถโหลดข้อมูลตารางเวรได้"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [doctorId, t]);

  const handleToggleDay = useCallback((dayKey, checked) => {
    setScheduleState((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: checked,
        slots: checked && (!prev[dayKey]?.slots || prev[dayKey].slots.length === 0)
          ? [{ ...DEFAULT_SLOT }]
          : prev[dayKey].slots,
      },
    }));
  }, []);

  const handleSlotChange = useCallback((dayKey, index, range) => {
    if (!range || !Array.isArray(range)) return;
    setScheduleState((prev) => {
      const nextSlots = [...(prev[dayKey]?.slots || [])];
      const [start, end] = range;
      nextSlots[index] = {
        start: start ? start.format("HH:mm") : null,
        end: end ? end.format("HH:mm") : null,
      };
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          slots: nextSlots,
        },
      };
    });
  }, []);

  const handleAddSlot = useCallback((dayKey) => {
    setScheduleState((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: [...(prev[dayKey]?.slots || []), { ...DEFAULT_SLOT }],
      },
    }));
  }, []);

  const handleRemoveSlot = useCallback((dayKey, index) => {
    setScheduleState((prev) => {
      const slots = [...(prev[dayKey]?.slots || [])];
      if (slots.length <= 1) {
        return prev;
      }
      slots.splice(index, 1);
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          slots,
        },
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!doctorId) {
      message.error(t("DOC_SCHEDULE_NO_USER", "ไม่พบข้อมูลผู้ใช้งาน"));
      return;
    }

    const normalized = normalizeScheduleForSave(scheduleState);
    const hasEnabledDay = normalized.some((day) => day.enabled && day.slots.length > 0);

    if (isActive && !hasEnabledDay) {
      message.warning(t("DOC_SCHEDULE_REQUIRE_SLOTS", "กรุณาเลือกเวลาว่างอย่างน้อยหนึ่งช่วงก่อนเปิดสถานะพร้อมให้บริการ"));
      return;
    }

    setSaving(true);
    try {
      await upsertDoctorSchedule(doctorId, {
        isActive,
        availability: normalized,
      });
      message.success(t("DOC_SCHEDULE_SAVE_SUCCESS", "บันทึกตารางเวรสำเร็จ"));
    } catch (error) {
      console.error("Failed to save doctor schedule", error);
      message.error(error.message || t("DOC_SCHEDULE_SAVE_FAILED", "ไม่สามารถบันทึกข้อมูลได้"));
    } finally {
      setSaving(false);
    }
  }, [doctorId, isActive, scheduleState, t]);

  if (!canEdit) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <Alert
          type="warning"
          message={t("DOC_SCHEDULE_UNAUTHORIZED_TITLE", "ไม่มีสิทธิ์เข้าถึงฟีเจอร์นี้")}
          description={t("DOC_SCHEDULE_UNAUTHORIZED_DESC", "เฉพาะแพทย์ที่ผ่านการยืนยันแล้วเท่านั้นที่สามารถจัดการตารางการทำงานได้")}
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            <Title level={3} style={{ margin: 0 }}>
              {t("DOC_SCHEDULE_TITLE", "จัดการตารางการทำงาน")}
            </Title>
            <Paragraph style={{ margin: 0, color: "#666" }}>
              {t("DOC_SCHEDULE_SUBTITLE", "กำหนดเวลาที่คุณพร้อมรับการปรึกษาและสลับสถานะเปิด/ปิดการให้บริการ")}
            </Paragraph>
            <Divider style={{ margin: "12px 0" }} />
            <Space align="center" size="middle">
              <Text strong>{t("DOC_SCHEDULE_ACTIVE_LABEL", "สถานะพร้อมให้บริการ")}</Text>
              <Switch
                checked={isActive}
                onChange={setIsActive}
                checkedChildren={t("ACTIVE", "เปิด")}
                unCheckedChildren={t("INACTIVE", "ปิด")}
              />
              {isActive ? (
                <Text type="success">{t("DOC_SCHEDULE_ACTIVE_HINT", "สถานะ: ผู้ป่วยสามารถเห็นคุณได้ในระบบ")}</Text>
              ) : (
                <Text type="secondary">{t("DOC_SCHEDULE_INACTIVE_HINT", "สถานะ: ซ่อนจากการค้นหาของผู้ป่วย")}</Text>
              )}
            </Space>
          </Space>
        </Card>

        {loading ? (
          <Spin />
        ) : (
          <Card>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {DAYS_OF_WEEK.map((day) => {
                const dayState = scheduleState[day.key];
                const enabled = dayState?.enabled;
                const slots = dayState?.slots || [];

                return (
                  <Card
                    key={day.key}
                    type="inner"
                    title={t(day.labelKey, day.fallback)}
                    extra={
                      <Switch
                        checked={enabled}
                        onChange={(checked) => handleToggleDay(day.key, checked)}
                      />
                    }
                    style={{ border: "1px solid #f0f0f0" }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                      {slots.map((slot, index) => (
                        <Space key={`${day.key}-${index}`} align="center" wrap>
                          <RangePicker
                            value={toDayjsRange(slot)}
                            onChange={(range) => handleSlotChange(day.key, index, range)}
                            format="HH:mm"
                            minuteStep={30}
                            allowClear={false}
                            disabled={!enabled}
                          />
                          {slots.length > 1 && (
                            <Button
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveSlot(day.key, index)}
                              disabled={!enabled}
                            />
                          )}
                        </Space>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => handleAddSlot(day.key)}
                        disabled={!enabled}
                      >
                        {t("DOC_SCHEDULE_ADD_SLOT", "เพิ่มช่วงเวลา")}
                      </Button>
                    </Space>
                  </Card>
                );
              })}
            </Space>
          </Card>
        )}

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            size="large"
            loading={saving}
            onClick={handleSave}
          >
            {t("DOC_SCHEDULE_SAVE_ACTION", "บันทึกการเปลี่ยนแปลง")}
          </Button>
        </Space>
      </Space>
    </div>
  );
}

export default DoctorSchedule;
