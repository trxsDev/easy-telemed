import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Steps, Button, Card, message, Upload, Tag, Radio, Select, Input } from "antd";
import { LeftOutlined, RightOutlined, InboxOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Base from "./Section/Base";
import Screen from "./Section/Screen";
import HumanBody from "../3D/HumanBody";
// Supabase calls have been moved to backend APIs
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import { useNavigate } from "react-router-dom";
import specializations from "../../specialization.json";
import { useDispatch, useSelector } from "react-redux";
import { loadSpecialtyAvailability } from "../../store/availabilitySlice";
import { selectAvailability, selectCases } from "../../store";
import { submitPatientCase } from "../../store/casesSlice";
import { fetchMatchingStatusByCase } from "../../services/matchingService";
const { Dragger } = Upload;

// Step 0: เลือกแผนกที่ต้องการพบ
const SpecialtyStep = React.memo(
  ({
    specialtyList,
    selectedSpecialtyId,
    onSelect,
    specialtyAvailability,
    loading,
    t,
  }) => {
    const totalActiveDoctors = useMemo(() => {
      return Object.values(specialtyAvailability || {}).reduce(
        (sum, value) => sum + (value?.activeCount || 0),
        0
      );
    }, [specialtyAvailability]);

    return (
      <div style={{ padding: 20 }}>
        <h3 style={{ marginBottom: 16 }}>{t("SELECT_SPECIALTY", "เลือกแผนกที่ต้องการพบ")}</h3>
        <p style={{ color: "#666", marginBottom: 24 }}>
          {t(
            "SPECIALTY_HINT",
            "ระบบจะแนะนำเฉพาะแผนกที่มีแพทย์ออนไลน์อยู่ในขณะนี้"
          )}
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <span>{t("LOADING_SPECIALTIES", "กำลังตรวจสอบแพทย์ที่ออนไลน์...")}</span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {specialtyList.map((spec) => {
              const availability = specialtyAvailability?.[spec.id];
              const activeCount = availability?.activeCount || 0;
              const isSelected = selectedSpecialtyId === spec.id;
              const hasActiveDoctor = activeCount > 0;

              return (
                <Button
                  key={spec.id}
                  type="default"
                  block
                  onClick={() => hasActiveDoctor && onSelect(spec.id)}
                  disabled={!hasActiveDoctor}
                  style={{
                    padding: "16px 20px",
                    borderRadius: 12,
                    textAlign: "left",
                    height: "auto",
                    border: `2px solid ${
                      isSelected ? "#1890ff" : hasActiveDoctor ? "#d9d9d9" : "#f0f0f0"
                    }`,
                    backgroundColor: isSelected
                      ? "rgba(24, 144, 255, 0.12)"
                      : hasActiveDoctor
                      ? "#fff"
                      : "#fafafa",
                    boxShadow: isSelected
                      ? "0 4px 10px rgba(24, 144, 255, 0.2)"
                      : "0 2px 6px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {spec.name_th || spec.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                    {spec.name}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Tag color={hasActiveDoctor ? "green" : "default"}>
                      {hasActiveDoctor
                        ? t("ACTIVE_DOCTORS_COUNT", {
                            defaultValue: "มีแพทย์ออนไลน์ {{count}} คน",
                            count: activeCount,
                          })
                        : t("NO_ACTIVE_DOCTOR", "ยังไม่มีแพทย์ออนไลน์")}
                    </Tag>
                  </div>
                </Button>
              );
            })}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            backgroundColor: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 8,
            color: "#389e0d",
          }}
        >
          {t("TOTAL_ACTIVE_DOCTORS", "แพทย์ที่ออนไลน์ทั้งหมด")}: {totalActiveDoctors}
        </div>
      </div>
    );
  }
);

// แยก component ออกมาและใช้ React.memo เพื่อป้องกัน re-render
const SymptomsStep = React.memo(
  ({
    symptomsText,
    setSymptomsText,
    painLevel,
    setPainLevel,
    selectedBodyParts,
    t,
  }) => {
    const painLevels = useMemo(() => Array.from({ length: 10 }, (_, idx) => idx + 1), []);

    return (
      <div style={{ padding: 20 }}>
        <h3>{t("DESCRIBE_SYMPTOMS", "Describe Your Symptoms")}</h3>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("SYMPTOMS_TEXT", "Symptoms Description")} *
          </label>
          <Input.TextArea
            value={symptomsText}
            onChange={(e) => setSymptomsText(e.target.value)}
            placeholder={t(
              "DESCRIBE_SYMPTOMS_PLACEHOLDER",
              "Please describe your symptoms in detail..."
            )}
            style={{
              width: "100%",
              minHeight: 120,
              padding: 12,
              borderRadius: 6,
              border: "1px solid #d9d9d9",
              resize: "vertical",
            }}
          />
        </div>

        {selectedBodyParts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              {t("PAIN_AREAS", "Pain Areas")}
            </label>
            <div>
              {selectedBodyParts.map((part, i) => (
                <span
                  key={`${part}-${i}`}
                  style={{
                    display: "inline-block",
                    margin: "4px 8px 4px 0",
                    padding: "4px 12px",
                    backgroundColor: "#e6f7ff",
                    color: "#1890ff",
                    borderRadius: 16,
                    fontSize: 14,
                    border: "1px solid #91d5ff",
                  }}
                >
                  {part}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("PAIN_LEVEL", "Pain Level (1-10)")}
          </label>
          <Radio.Group value={painLevel} onChange={(e) => setPainLevel(e.target.value)}>
            {painLevels.map((level) => (
              <Radio.Button
                key={level}
                value={level}
                style={{
                  width: 64,
                  height: 64,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  marginRight: 16,
                  marginBottom: 16,
                  fontWeight: 600,
                  fontSize: 16,
                }}
                aria-label={t("PAIN_LEVEL_SELECTION", "Pain level {{level}}", { level })}
              >
                {level}
              </Radio.Button>
            ))}
          </Radio.Group>
          <small style={{ color: "#666", marginTop: 4, display: "block" }}>
            1 = Minimal pain, 10 = Severe pain
          </small>
        </div>
      </div>
    );
  }
);

const SeverityStep = React.memo(
  ({
    severity,
    setSeverity,
    duration,
    setDuration,
    additionalInfo,
    setAdditionalInfo,
    selectedFiles,
    setSelectedFiles,
    t,
  }) => {
    // ฟังก์ชันจัดการการเลือกไฟล์
    const handleFileChange = (info) => {
      const { fileList } = info;
      
      // กรองเฉพาะไฟล์รูปภาพและจำกัดสูงสุด 3 ไฟล์
      const imageFiles = fileList.filter(file => {
        if (file.originFileObj) {
          return file.originFileObj.type.startsWith('image/');
        }
        return file.type && file.type.startsWith('image/');
      }).slice(0, 3);

      setSelectedFiles(imageFiles);
    };

    // ฟังก์ชันตรวจสอบไฟล์ก่อนเลือก
    const beforeUpload = (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น!');
        return false;
      }
      
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('รูปภาพต้องมีขนาดไม่เกิน 5MB!');
        return false;
      }

      if (selectedFiles.length >= 3) {
        message.error('สามารถเลือกได้สูงสุด 3 รูปภาพ!');
        return false;
      }
      
      return false; // ป้องกันการอัพโหลดทันที
    };

    return (
      <div style={{ padding: 20 }}>
        <h3>{t("SEVERITY_DETAILS", "Severity & Additional Details")}</h3>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("SEVERITY_LEVEL", "Overall Severity")} *
          </label>
          <Radio.Group value={severity} onChange={(e) => setSeverity(e.target.value)} buttonStyle="solid">
            <Radio.Button value="mild">{t("MILD", "Mild")}</Radio.Button>
            <Radio.Button value="medium">{t("MODERATE", "Moderate")}</Radio.Button>
            <Radio.Button value="severe">{t("SEVERE", "Severe")}</Radio.Button>
          </Radio.Group>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("WHEN_STARTED", "When did symptoms start?")}
          </label>
          <Select
            value={duration || undefined}
            onChange={(value) => setDuration(value || "")}
            placeholder={t("SELECT_DURATION", "Select duration")}
            size="large"
            style={{ width: "100%" }}
            options={[
              { value: "less_than_hour", label: t("LESS_THAN_HOUR", "Less than 1 hour") },
              { value: "few_hours", label: t("FEW_HOURS", "Few hours ago") },
              { value: "today", label: t("TODAY", "Today") },
              { value: "yesterday", label: t("YESTERDAY", "Yesterday") },
              { value: "few_days", label: t("FEW_DAYS", "Few days ago") },
              { value: "week", label: t("WEEK", "About a week ago") },
              { value: "longer", label: t("LONGER", "Longer than a week") },
            ]}
            allowClear
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("ADDITIONAL_INFO", "Additional Information")}
          </label>
          <Input.TextArea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder={t(
              "ADDITIONAL_INFO_PLACEHOLDER",
              "Any additional information, medications, allergies, etc."
            )}
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              borderRadius: 6,
              border: "1px solid #d9d9d9",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("UPLOAD_IMAGES", "Upload Images")} ({selectedFiles.length}/3)
          </label>
          <Upload
            listType="picture-card"
            fileList={selectedFiles}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            multiple
            accept="image/*"
            maxCount={3}
          >
            {selectedFiles.length >= 3 ? null : (
              <div>
                <InboxOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>{t("SELECT_IMAGE", "เลือกรูปภาพ")}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {t("MAX_3_IMAGES", "สูงสุด 3 รูป, ไม่เกิน 5MB")}
                </div>
              </div>
            )}
          </Upload>
        </div>
      </div>
    );
  }
);

function CaseScreeningForm() {
  const { t } = useTranslation();
  const { user } = useUserAuthSupabase();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const availability = useSelector(selectAvailability);
  const casesState = useSelector(selectCases);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState(null);
  const specialtyAvailability = availability.stats || {};
  const loadingSpecialty = availability.loading;

  // แยก state เพื่อลด re-render
  const [symptomsText, setSymptomsText] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [painLevel, setPainLevel] = useState(null);
  const [duration, setDuration] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]); // เก็บไฟล์ที่เลือกไว้ก่อนอัพโหลด

  // Redirect guard: if there is an active case already in progress, send user to latest step
    useEffect(() => {
      const enforceSingleActiveCase = async () => {
        let activeCaseId;
        try { activeCaseId = localStorage.getItem('activeCaseId'); } catch {}
        if (!activeCaseId) {
          navigate('/easy-telemed/illness-case', { replace: true });
          return;
        }
        try {
          const { case: caseRow, matchRequest, consultation } = await fetchMatchingStatusByCase(activeCaseId);
          // Redirect only if this case belongs to current user AND it has an active request/consultation
          const belongs = !!caseRow && caseRow.patient_id && user?.user_id && caseRow.patient_id === user.user_id;
          if (belongs && (consultation || matchRequest)) {
            navigate(`/easy-telemed/matching/${activeCaseId}/wait`, { replace: true });
          } else {
            // Clear stale active case reference to prevent redirect loops
            try { localStorage.removeItem('activeCaseId'); } catch {}
            navigate('/easy-telemed/illness-case', { replace: true });
          }
        } catch {
          // If status fetch fails, clear to be safe
          try { localStorage.removeItem('activeCaseId'); } catch {}
          navigate('/easy-telemed/illness-case', { replace: true });
        }
      };
      enforceSingleActiveCase();
    }, [navigate, user?.user_id]);

  const loadAvailability = useCallback(async () => {
    try {
      await dispatch(loadSpecialtyAvailability()).unwrap();
    } catch (error) {
      console.error("Error fetching specialty availability", error);
      message.error(
        t(
          "FAILED_FETCH_SPECIALTY",
          "ไม่สามารถโหลดข้อมูลแผนกและแพทย์ที่พร้อมให้บริการได้"
        )
      );
    }
  }, [dispatch, t]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Subscribe to realtime changes in doctor_status to keep availability fresh
  // Polling fallback for availability refresh (since direct Supabase realtime was removed from frontend)
  useEffect(() => {
    // const id = setInterval(() => {
    //   loadAvailability();
    // },
    //  10_000
    // ); // every 10s
    // return () => clearInterval(id);
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (selectedSpecialtyId) return;
    if (!specialtyAvailability || Object.keys(specialtyAvailability).length === 0) return;

    const firstAvailable = specializations.find((spec) => {
      const bucket = specialtyAvailability?.[spec.id];
      return (bucket?.activeCount || 0) > 0;
    });

    if (firstAvailable) {
      setSelectedSpecialtyId(firstAvailable.id);
    }
  }, [specialtyAvailability, selectedSpecialtyId]);

  const selectedSpecialty = useMemo(() => {
    return specializations.find((spec) => spec.id === selectedSpecialtyId) || null;
  }, [selectedSpecialtyId]);

  const selectedSpecialtyDoctors = useMemo(() => {
    if (!selectedSpecialty) return [];
    const bucket = specialtyAvailability?.[selectedSpecialty.id];
    return bucket?.doctors || [];
  }, [selectedSpecialty, specialtyAvailability]);

  // ใช้ useCallback เพื่อป้องกัน re-create functions
  const setSymptomsTextCallback = useCallback(
    (value) => setSymptomsText(value),
    []
  );
  const setAdditionalInfoCallback = useCallback(
    (value) => setAdditionalInfo(value),
    []
  );

  // การอัพโหลดไฟล์ถูกย้ายไป backend flow ภายใต้ casesSlice (ส่ง metadata ชั่วคราว)

  // รวม formData เฉพาะเมื่อจำเป็น (สำหรับ ReviewStep และ Submit)
  const formData = useMemo(
    () => ({
      symptoms_text: symptomsText,
      severity,
      painLevel,
      duration,
      additional_info: additionalInfo,
      painAreas: selectedBodyParts,
      selectedFiles,
      requested_specialty: selectedSpecialty,
      available_doctors: selectedSpecialtyDoctors,
      triage_level: "standard",
      status: "open",
    }),
    [
      symptomsText,
      severity,
      painLevel,
      duration,
      additionalInfo,
      selectedBodyParts,
      selectedFiles,
      selectedSpecialty,
      selectedSpecialtyDoctors,
    ]
  );

  const steps = useMemo(
    () => [
      {
        title: t("SPECIALTY", "Specialty"),
        description: t("SPECIALTY_DESC", "เลือกแผนกที่ต้องการพบ"),
      },
      {
        title: t("SYMPTOMS", "Symptoms"),
        description: t("SYMPTOMS_DESC", "Describe your symptoms"),
      },
      {
        title: t("SEVERITY", "Severity & Details"),
        description: t("SEVERITY_DESC", "Severity and additional details"),
      },
      {
        title: t("REVIEW", "Review"),
        description: t("REVIEW_DESC", "Review and submit"),
      },
    ],
    [t]
  );

  const nextStep = () => {
    // Validate current step
    if (currentStep === 0) {
      if (!selectedSpecialtyId) {
        message.error(
          t("SPECIALTY_REQUIRED", "กรุณาเลือกแผนกที่ต้องการพบก่อน")
        );
        return;
      }

      const availability = specialtyAvailability?.[selectedSpecialtyId];
      if (!availability || (availability.activeCount || 0) === 0) {
        message.warning(
          t(
            "SPECIALTY_NO_DOCTOR",
            "แผนกที่เลือกยังไม่มีแพทย์ออนไลน์ กรุณาเลือกแผนกอื่น"
          )
        );
        return;
      }
    } else if (currentStep === 1) {
      if (!symptomsText?.trim()) {
        message.error(
          t(
            "SYMPTOMS_REQUIRED",
            "Please describe your symptoms before proceeding"
          )
        );
        return;
      }
    } else if (currentStep === 2) {
      if (!severity) {
        message.error(t("SEVERITY_REQUIRED", "Please select severity level"));
        return;
      }
    }

    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleBodyPartSelect = useCallback((parts) => {
    setSelectedBodyParts(parts);
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting || casesState.submitting) return;
    if (!user?.user_id) {
      message.error("กรุณาเข้าสู่ระบบก่อนส่งข้อมูล");
      return;
    }
    if (!selectedSpecialty) {
      message.error(t("SPECIALTY_REQUIRED", "กรุณาเลือกแผนกที่ต้องการพบก่อน"));
      return;
    }

    setIsSubmitting(true);
    message.loading('กำลังบันทึกข้อมูล...', 0);
    try {
      const resultAction = await dispatch(
        submitPatientCase({
          userId: user.user_id,
          symptomsText,
          severity,
          painLevel,
          duration,
          additionalInfo,
          selectedBodyParts,
          selectedFiles,
          selectedSpecialty,
        })
      );

      message.destroy();

      if (submitPatientCase.fulfilled.match(resultAction)) {
        const saved = resultAction.payload.case;
        message.success(
          t(
            "CASE_SUBMITTED",
            "Case submitted successfully! A healthcare provider will review your case."
          )
        );
        if (saved?.case_id) {
          try { localStorage.setItem('activeCaseId', saved.case_id); } catch {}
          navigate(`/easy-telemed/matching/${saved.case_id}`, {
            state: {
              caseData: saved,
              specialty: selectedSpecialty,
              doctors: selectedSpecialtyDoctors,
            },
            replace: true,
          });
        }
      } else {
        const errMsg = resultAction.payload || "Failed to submit";
        message.error(`เกิดข้อผิดพลาด: ${errMsg}`);
      }
    } catch (error) {
      message.destroy();
      message.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate triage level based on symptoms and severity
  const calculateTriageLevel = (data) => {
    const { severity, symptoms_text = "", painLevel } = data;

    // High priority conditions
    const emergencyKeywords = [
      "chest pain",
      "difficulty breathing",
      "severe pain",
      "bleeding",
    ];
    const hasEmergencySymptoms = emergencyKeywords.some((keyword) =>
      symptoms_text.toLowerCase().includes(keyword)
    );

    if (hasEmergencySymptoms || severity === "severe" || painLevel >= 8) {
      return "urgent";
    } else if (severity === "moderate" || severity === "medium" || painLevel >= 5) {
      return "semi_urgent";
    } else {
      return "standard";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <SpecialtyStep
            specialtyList={specializations}
            selectedSpecialtyId={selectedSpecialtyId}
            onSelect={setSelectedSpecialtyId}
            specialtyAvailability={specialtyAvailability}
            loading={loadingSpecialty}
            t={t}
          />
        );
      case 1:
        return (
          <SymptomsStep
            symptomsText={symptomsText}
            setSymptomsText={setSymptomsTextCallback}
            painLevel={painLevel}
            setPainLevel={setPainLevel}
            selectedBodyParts={selectedBodyParts}
            t={t}
          />
        );
      case 2:
        return (
          <SeverityStep
            severity={severity}
            setSeverity={setSeverity}
            duration={duration}
            setDuration={setDuration}
            additionalInfo={additionalInfo}
            setAdditionalInfo={setAdditionalInfoCallback}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            t={t}
          />
        );
      case 3:
        return (
          <ReviewStep
            formData={formData}
            selectedBodyParts={selectedBodyParts}
            selectedFiles={selectedFiles}
            t={t}
            calculateTriageLevel={calculateTriageLevel}
            selectedSpecialty={selectedSpecialty}
          />
        );
      default:
        return null;
    }
  };

  // Review Step Component แยกออกมาและใช้ React.memo
  const ReviewStep = React.memo(
    ({
      formData,
      selectedBodyParts,
      selectedFiles,
      selectedSpecialty,
      t,
      calculateTriageLevel,
    }) => {
      const triageLevel = calculateTriageLevel(formData);
      const triageColors = {
        urgent: "#f5222d",
        semi_urgent: "#faad14",
        standard: "#52c41a",
      };

      return (
        <div style={{ padding: 20 }}>
          <h3>{t("REVIEW_CASE", "Review Your Case")}</h3>

          <div
            style={{
              background: "#f5f5f5",
              padding: 20,
              borderRadius: 8,
              marginTop: 16,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: "#1890ff", marginBottom: 8 }}>
                {t("CASE_SUMMARY", "Case Summary")}
              </h4>
              <div
                style={{
                  padding: 12,
                  background: triageColors[triageLevel],
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: "bold",
                  marginBottom: 16,
                }}
              >
                {t("TRIAGE_LEVEL", "Triage Level")}: {triageLevel.toUpperCase()}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong>{t("SYMPTOMS", "Symptoms")}:</strong>
              <p
                style={{
                  margin: "8px 0",
                  padding: 12,
                  background: "#fff",
                  borderRadius: 4,
                }}
              >
                {formData.symptoms_text ||
                  t("NO_SYMPTOMS_DESCRIBED", "No symptoms described")}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong>{t("SEVERITY", "Severity")}:</strong>
              <span
                style={{
                  marginLeft: 8,
                  padding: "4px 12px",
                  borderRadius: 12,
                  backgroundColor:
                    formData.severity === "severe"
                      ? "#f5222d"
                      : formData.severity === "medium"
                      ? "#faad14"
                      : "#52c41a",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                {formData.severity?.toUpperCase() || "MEDIUM"}
              </span>
            </div>

            {selectedSpecialty && (
              <div style={{ marginBottom: 16 }}>
                <strong>{t("SELECTED_SPECIALTY", "แผนกที่เลือก")}:</strong>
                <span
                  style={{
                    marginLeft: 8,
                    padding: "4px 12px",
                    background: "#e6f7ff",
                    borderRadius: 12,
                    color: "#1890ff",
                    fontWeight: 600,
                  }}
                >
                  {selectedSpecialty.name_th || selectedSpecialty.name}
                </span>
                <span style={{ marginLeft: 12, color: "#888", fontSize: 12 }}>
                  {t("ACTIVE_DOCTORS_LABEL", {
                    defaultValue: "แพทย์ที่พร้อมให้บริการ {{count}} คน",
                    count: (formData.available_doctors || []).length,
                  })}
                </span>
              </div>
            )}

            {formData.painLevel && (
              <div style={{ marginBottom: 16 }}>
                <strong>{t("PAIN_LEVEL", "Pain Level")}:</strong>
                <span
                  style={{ marginLeft: 8, fontSize: 16, fontWeight: "bold" }}
                >
                  {formData.painLevel}/10
                </span>
              </div>
            )}

            {selectedBodyParts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>{t("AFFECTED_AREAS", "Affected Areas")}:</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedBodyParts.map((part, i) => (
                    <span
                      key={`${part}-${i}`}
                      style={{
                        display: "inline-block",
                        margin: "4px 8px 4px 0",
                        padding: "4px 12px",
                        backgroundColor: "#1890ff",
                        color: "#fff",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formData.duration && (
              <div style={{ marginBottom: 16 }}>
                <strong>{t("DURATION", "Duration")}:</strong>
                <span style={{ marginLeft: 8 }}>{formData.duration}</span>
              </div>
            )}

            {formData.additional_info && (
              <div style={{ marginBottom: 16 }}>
                <strong>
                  {t("ADDITIONAL_INFO", "Additional Information")}:
                </strong>
                <p
                  style={{
                    margin: "8px 0",
                    padding: 12,
                    background: "#fff",
                    borderRadius: 4,
                  }}
                >
                  {formData.additional_info}
                </p>
              </div>
            )}

            {/* แสดงรูปภาพที่เลือก */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>{t("SELECTED_IMAGES", "Selected Images")} ({selectedFiles.length}):</strong>
                <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {selectedFiles.map((fileObj, index) => {
                    const file = fileObj.originFileObj || fileObj;
                    const imageUrl = file ? URL.createObjectURL(file) : fileObj.url;
                    
                    return (
                      <div
                        key={index}
                        style={{
                          border: "1px solid #d9d9d9",
                          borderRadius: 8,
                          overflow: "hidden",
                          width: 100,
                          height: 100,
                          position: "relative",
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={file?.name || fileObj.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            color: "white",
                            padding: "2px 4px",
                            fontSize: 10,
                            textAlign: "center",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {file?.name || fileObj.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "#e6f7ff",
              borderRadius: 8,
              border: "1px solid #91d5ff",
            }}
          >
            <p style={{ margin: 0, color: "#1890ff", fontWeight: "bold" }}>
              📋{" "}
              {t(
                "READY_TO_SUBMIT",
                "Your case is ready to be submitted to our medical team."
              )}
            </p>
            {selectedFiles.length > 0 && (
              <p style={{ margin: "8px 0 0 0", color: "#1890ff", fontSize: 14 }}>
                📎 {t("IMAGES_WILL_BE_UPLOADED", `${selectedFiles.length} รูปภาพจะถูกอัพโหลดเมื่อกดส่ง`)}
              </p>
            )}
          </div>
        </div>
      );
    }
  );

  // กันชื่อซ้ำ (เผื่อกดซ้ำ) ก่อนแสดงชิป
  const uniqSelected = useMemo(
    () => Array.from(new Set(selectedBodyParts)),
    [selectedBodyParts]
  );

  return (
    <div
      style={{
        padding: 24,
        margin: "0 auto",
        display: "flex",
        flexDirection: "row",
        gap: 16,
      }}
    >
      {/* Left: Body map */}
      <div style={{ overflow: "visible", width: 400 }}>
        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 16, textAlign: "center" }}>
              {t("BODY_DIAGRAM", "Body Diagram")}
            </h3>
            <p
              style={{
                textAlign: "center",
                marginBottom: 16,
                fontSize: 14,
                color: "#666",
              }}
            >
              {t(
                "SELECT_PAIN_AREAS",
                "Click on body parts where you feel pain"
              )}
            </p>
            <div style={{ position: "relative" }}>
              <HumanBody
                onBodyPartSelect={handleBodyPartSelect}
                selectedParts={selectedBodyParts}
                height={350}
              />
            </div>

            {uniqSelected.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: "8px 12px",
                  backgroundColor: "#f0f8ff",
                  borderRadius: 6,
                  border: "1px solid #d6f3ff",
                }}
              >
                <strong style={{ color: "#1890ff" }}>
                  {t("SELECTED_AREAS", "Selected areas:")}
                </strong>
                <div style={{ marginTop: 4 }}>
                  {uniqSelected.map((part, i) => (
                    <span
                      key={`${part}-${i}`}
                      style={{
                        display: "inline-block",
                        margin: "2px 4px",
                        padding: "2px 8px",
                        backgroundColor: "#1890ff",
                        color: "white",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right: Steps + content */}
      <Card style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 32, width: "100%" }}>
          <div style={{ minWidth: 250 }}>
            <Steps
              current={currentStep}
              direction="vertical"
              items={steps}
              style={{ height: "100%" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ minHeight: 400, marginBottom: 24 }}>
              {renderStepContent()}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #f0f0f0",
                paddingTop: 16,
              }}
            >
              <Button
                icon={<LeftOutlined />}
                onClick={prevStep}
                disabled={currentStep === 0}
                size="large"
              >
                {t("PREVIOUS", "Previous")}
              </Button>

              <span style={{ color: "#666", fontSize: 14 }}>
                {t("STEP_COUNT", `Step ${currentStep + 1} of ${steps.length}`)}
              </span>

              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={nextStep} size="large">
                  {t("NEXT", "Next")} <RightOutlined />
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleSubmit} 
                  size="large"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("SUBMITTING", "กำลังส่ง...") : t("SUBMIT", "Submit")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CaseScreeningForm;
