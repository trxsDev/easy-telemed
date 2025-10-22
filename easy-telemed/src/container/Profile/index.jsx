import { useEffect, useMemo, useState } from "react";
import { Card, message, Result, Space, Spin, Button } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/SupabaseClient";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";
import MultiStepPatientForm from "../../components/MultiStepPatientForm";
import DoctorProfileForm from "../../components/DoctorProfileForm";

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshProfile, loadingUser } = useUserAuthSupabase();

  const [patientInitialData, setPatientInitialData] = useState(null);
  const [doctorInitialData, setDoctorInitialData] = useState(null);
  const [loading, setLoading] = useState(false);

  const role = (user?.role || "guest").toLowerCase();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.user_id) return;

      if (!["patient", "doctor"].includes(role)) {
        setPatientInitialData(null);
        setDoctorInitialData(null);
        return;
      }

      setLoading(true);
      try {
        if (role === "patient") {
          const { data, error } = await supabase
            .from("patient_profiles")
            .select("*")
            .eq("user_id", user.user_id)
            .maybeSingle();

          if (error && error.code !== "PGRST116") throw error;
          setPatientInitialData(data || {});
        } else if (role === "doctor") {
          const { data, error } = await supabase
            .from("doctor_profiles")
            .select("*")
            .eq("user_id", user.user_id)
            .maybeSingle();

          if (error && error.code !== "PGRST116") throw error;

          const initial = {
            license_no: data?.license_no || "",
            hospital: data?.hospital || "",
            country: data?.country || "",
            specialties: Array.isArray(data?.specialties)
              ? data.specialties
              : Array.isArray(data?.specialties?.value)
              ? data.specialties.value
              : [],
            display_name: user?.display_name || "",
          };
          setDoctorInitialData(initial);
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        message.error(t("PROFILE_LOAD_ERROR"));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [role, t, user?.user_id, user?.display_name]);

  const handlePatientSubmit = async (formData) => {
    try {
      const payload = {
        ...formData,
        user_id: user.user_id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("patient_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      const displayName = `${formData.fname || ""} ${formData.lname || ""}`.trim();

      await supabase
        .from("app_users")
        .update({
          display_name: displayName || user.display_name || user.email,
          phone: formData.phone || user.phone,
          verify: true,
          verified_at: new Date().toISOString(),
        })
        .eq("user_id", user.user_id);

      await refreshProfile?.();
      message.success(t("PROFILE_SAVE_SUCCESS"));
      navigate("/easy-telemed/home");
    } catch (error) {
      console.error("Patient profile update failed", error);
      message.error(t("PROFILE_SAVE_ERROR"));
    }
  };

  const handleDoctorSubmit = async (formValues) => {
    try {
      const payload = {
        user_id: user.user_id,
        license_no: formValues.license_no,
        hospital: formValues.hospital || null,
        country: formValues.country || null,
        specialties: formValues.specialties || [],
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("doctor_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      await supabase
        .from("app_users")
        .update({
          display_name: formValues.display_name || user.display_name || user.email,
          verify: true,
          verified_at: new Date().toISOString(),
        })
        .eq("user_id", user.user_id);

      await refreshProfile?.();
      message.success(t("PROFILE_DOCTOR_SAVE_SUCCESS"));
      navigate("/easy-telemed/home");
    } catch (error) {
      console.error("Doctor profile update failed", error);
      if (error?.message) {
        message.error(error.message);
      } else {
        message.error(t("PROFILE_SAVE_ERROR"));
      }
    }
  };

  const content = useMemo(() => {
    if (role === "patient") {
      return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card>
            <h1 style={{ marginBottom: 8 }}>{t("PROFILE_PATIENT_TITLE")}</h1>
            <p style={{ marginBottom: 0, color: "#595959" }}>
              {t("PROFILE_PATIENT_DESC")}
            </p>
            <p style={{ marginBottom: 0, color: "#8c8c8c", fontSize: 13 }}>
              {t("PROFILE_PATIENT_FORM_HELP")}
            </p>
          </Card>
          <MultiStepPatientForm
            initialData={patientInitialData || {}}
            onSubmit={handlePatientSubmit}
            mode={patientInitialData ? "edit" : "create"}
          />
        </Space>
      );
    }

    if (role === "doctor") {
      return (
        <DoctorProfileForm
          initialData={doctorInitialData || { display_name: user?.display_name || "" }}
          onSubmit={handleDoctorSubmit}
        />
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
  }, [doctorInitialData, navigate, patientInitialData, role, t, user?.display_name]);

  if (loadingUser || loading) {
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

  return <div style={{ padding: 24 }}>{content}</div>;
}

export default Profile;
