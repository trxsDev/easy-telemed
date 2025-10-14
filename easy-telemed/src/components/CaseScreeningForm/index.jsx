import React, { useState, useMemo, useCallback } from "react";
import { Steps, Button, Card, message, Upload, Image } from "antd";
import { LeftOutlined, RightOutlined, InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Base from "./Section/Base";
import Screen from "./Section/Screen";
import HumanBody from "../3D/HumanBody";
import { Input } from "antd";
import { supabase } from "../../api/SupabaseClient";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
const { Dragger } = Upload;

// แยก component ออกมาและใช้ React.memo เพื่อป้องกัน re-render
const SymptomsStep = React.memo(
  ({
    symptomsText,
    setSymptomsText,
    painLevel,
    setPainLevel,
    selectedBodyParts,
    t,
  }) => (
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
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPainLevel(level)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
                backgroundColor: painLevel === level ? "#1890ff" : "#fff",
                color: painLevel === level ? "#fff" : "#000",
                cursor: "pointer",
                minWidth: 40,
              }}
            >
              {level}
            </button>
          ))}
        </div>
        <small style={{ color: "#666", marginTop: 4, display: "block" }}>
          1 = Minimal pain, 10 = Severe pain
        </small>
      </div>
    </div>
  )
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
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { value: "mild", label: t("MILD", "Mild"), color: "#52c41a" },
              {
                value: "medium",
                label: t("MODERATE", "Moderate"),
                color: "#faad14",
              },
              { value: "severe", label: t("SEVERE", "Severe"), color: "#f5222d" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSeverity(option.value)}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "2px solid",
                  borderColor:
                    severity === option.value ? option.color : "#d9d9d9",
                  backgroundColor:
                    severity === option.value ? option.color : "#fff",
                  color: severity === option.value ? "#fff" : "#000",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            {t("WHEN_STARTED", "When did symptoms start?")}
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 6,
              border: "1px solid #d9d9d9",
            }}
          >
            <option value="">{t("SELECT_DURATION", "Select duration")}</option>
            <option value="less_than_hour">
              {t("LESS_THAN_HOUR", "Less than 1 hour")}
            </option>
            <option value="few_hours">{t("FEW_HOURS", "Few hours ago")}</option>
            <option value="today">{t("TODAY", "Today")}</option>
            <option value="yesterday">{t("YESTERDAY", "Yesterday")}</option>
            <option value="few_days">{t("FEW_DAYS", "Few days ago")}</option>
            <option value="week">{t("WEEK", "About a week ago")}</option>
            <option value="longer">{t("LONGER", "Longer than a week")}</option>
          </select>
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // แยก state เพื่อลด re-render
  const [symptomsText, setSymptomsText] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [painLevel, setPainLevel] = useState(null);
  const [duration, setDuration] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]); // เก็บไฟล์ที่เลือกไว้ก่อนอัพโหลด

  // ใช้ useCallback เพื่อป้องกัน re-create functions
  const setSymptomsTextCallback = useCallback(
    (value) => setSymptomsText(value),
    []
  );
  const setAdditionalInfoCallback = useCallback(
    (value) => setAdditionalInfo(value),
    []
  );

  // ฟังก์ชันอัพโหลดไฟล์ไปยัง Supabase Storage
  const uploadFilesToSupabase = async (files) => {
    if (!user?.user_id) {
      throw new Error("กรุณาเข้าสู่ระบบก่อนอัพโหลดไฟล์");
    }

    console.log("Starting upload for user:", user.user_id);
    console.log("Files to upload:", files.length);

    const uploadPromises = files.map(async (fileObj, index) => {
      const file = fileObj.originFileObj || fileObj;
      
      try {
        console.log(`Uploading file ${index + 1}:`, file.name);
        
        // สร้างชื่อไฟล์ที่ไม่ซ้ำ
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.user_id}/${fileName}`; // ลบ "attachments/" ออกเพราะเป็นชื่อ bucket แล้ว

        console.log("Upload path:", filePath);

        // อัพโหลดไฟล์ไปยัง Supabase Storage
        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error for file:', file.name, error);
          
          // ตรวจสอบประเภท error ต่างๆ
          if (error.message.includes('Bucket not found')) {
            throw new Error(`Storage bucket 'attachments' ไม่พบ กรุณาสร้าง bucket ใน Supabase Dashboard`);
          } else if (error.message.includes('Policy')) {
            throw new Error(`ไม่มีสิทธิ์อัพโหลดไฟล์ กรุณาตั้งค่า Storage Policies ใน Supabase`);
          } else if (error.message.includes('violates row-level security')) {
            throw new Error(`ปัญหา Row Level Security กรุณาตั้งค่า Storage Policies ให้ถูกต้อง`);
          } else {
            throw new Error(`ไม่สามารถอัพโหลดไฟล์ ${file.name}: ${error.message}`);
          }
        }

        console.log('Upload success:', data);

        // ดึง public URL
        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        console.log('Public URL:', urlData.publicUrl);

        return {
          path: filePath,
          url: urlData.publicUrl,
          name: file.name,
          size: file.size,
          type: file.type
        };
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    });

    const results = await Promise.all(uploadPromises);
    console.log('All uploads completed:', results);
    return results;
  };

  // รวม formData เฉพาะเมื่อจำเป็น (สำหรับ ReviewStep และ Submit)
  const formData = useMemo(
    () => ({
      symptoms_text: symptomsText,
      severity,
      painLevel,
      duration,
      additional_info: additionalInfo,
      attachments,
      painAreas: selectedBodyParts,
      selectedFiles,
      triage_level: "standard",
      status: "open",
    }),
    [
      symptomsText,
      severity,
      painLevel,
      duration,
      additionalInfo,
      attachments,
      selectedBodyParts,
      selectedFiles,
    ]
  );

  const steps = useMemo(
    () => [
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
      if (!symptomsText?.trim()) {
        message.error(
          t(
            "SYMPTOMS_REQUIRED",
            "Please describe your symptoms before proceeding"
          )
        );
        return;
      }
    } else if (currentStep === 1) {
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
    if (isSubmitting) return;
    
    // ตรวจสอบการล็อกอิน
    if (!user?.user_id) {
      message.error("กรุณาเข้าสู่ระบบก่อนส่งข้อมูล");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Starting submission process...");
      console.log("User:", user);
      console.log("Selected files:", selectedFiles);
      
      // Step 1: อัพโหลดไฟล์ไปยัง Storage ก่อน (ถ้ามี)
      let uploadedAttachments = [];
      
      if (selectedFiles.length > 0) {
        const loadingMessage = message.loading('กำลังอัพโหลดไฟล์...', 0);
        
        try {
          uploadedAttachments = await uploadFilesToSupabase(selectedFiles);
          message.destroy(); // ลบ loading message
          message.success(`อัพโหลด ${uploadedAttachments.length} ไฟล์สำเร็จ`);
          console.log("Upload completed:", uploadedAttachments);
        } catch (error) {
          message.destroy();
          console.error("Upload failed:", error);
          message.error(`เกิดข้อผิดพลาดในการอัพโหลดไฟล์: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Step 2: รวมข้อมูล symptoms
      let combinedSymptoms = symptomsText || "";

      // Add pain areas if selected (only if not already mentioned in symptoms)
      if (selectedBodyParts.length > 0) {
        const painAreasText = `Pain in: ${selectedBodyParts.join(", ")}`;
        if (!combinedSymptoms.toLowerCase().includes("pain in")) {
          combinedSymptoms += combinedSymptoms
            ? `\n\n${painAreasText}`
            : painAreasText;
        }
      }

      // Add pain level
      if (painLevel) {
        combinedSymptoms += `\nPain Level: ${painLevel}/10`;
      }

      // Add duration
      if (duration) {
        combinedSymptoms += `\nDuration: ${duration}`;
      }

      // Add additional information
      if (additionalInfo) {
        combinedSymptoms += `\n\nAdditional Information: ${additionalInfo}`;
      }

      // Step 3: เตรียมข้อมูลสำหรับบันทึกใน database
      const processedData = {
        symptoms_text: combinedSymptoms.trim(),
        severity: severity || "medium",
        triage_level: calculateTriageLevel({
          ...formData,
          symptoms_text: combinedSymptoms.trim()
        }),
        status: "open",
        attachments: uploadedAttachments, // ใช้ลิงค์ที่อัพโหลดแล้ว
        patient_id: user.user_id,
      };

      console.log("Final processed case data:", processedData);

      // Step 4: บันทึกข้อมูลใน database
      const dbLoadingMessage = message.loading('กำลังบันทึกข้อมูล...', 0);
      
      const { data, error } = await supabase
        .from('patient_cases')
        .insert(processedData)
        .select();

      message.destroy();

      if (error) {
        console.error('Database error:', error);
        message.error(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`);
        return;
      }

      // Step 5: แสดงข้อความสำเร็จ
      message.success(
        t(
          "CASE_SUBMITTED",
          "Case submitted successfully! A healthcare provider will review your case."
        )
      );

      console.log("Case saved successfully:", data);

      // Optional: Reset form หรือ redirect
      // resetForm();
      
    } catch (error) {
      console.error('Submission error:', error);
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
    } else if (severity === "moderate" || painLevel >= 5) {
      return "semi_urgent";
    } else {
      return "standard";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
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
      case 1:
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
      case 2:
        return (
          <ReviewStep
            formData={formData}
            selectedBodyParts={selectedBodyParts}
            selectedFiles={selectedFiles}
            t={t}
            calculateTriageLevel={calculateTriageLevel}
          />
        );
      default:
        return null;
    }
  };

  // Review Step Component แยกออกมาและใช้ React.memo
  const ReviewStep = React.memo(
    ({ formData, selectedBodyParts, selectedFiles, t, calculateTriageLevel }) => {
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
                modelUrl={"easy-telemed/src/assets/3DModel/HumanBody.obj"}
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
