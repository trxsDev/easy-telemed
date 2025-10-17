import { supabase } from "../api/SupabaseClient";

const AVAILABILITY_COLUMN = "availability_schedule";

const ensureDoctorProfileFromApplication = async (doctorId) => {
  if (!doctorId) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("doctor_profiles")
    .select("user_id, specialties, hospital, license_no")
    .eq("user_id", doctorId)
    .maybeSingle();

  if (profileError) {
    console.warn("Failed to fetch doctor profile", profileError);
  }

  const needsProfile = !profile;

  const { data: application, error: applicationError } = await supabase
    .from("provider_applications")
    .select("specialties, hospital, license_no")
    .eq("applicant_user_id", doctorId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (applicationError) {
    console.warn("Failed to fetch provider application", applicationError);
    return profile ?? null;
  }

  if (!application) {
    return profile ?? null;
  }

  const payload = {
    specialties: application.specialties ?? profile?.specialties ?? null,
    hospital: application.hospital ?? profile?.hospital ?? null,
    license_no: application.license_no ?? profile?.license_no ?? null,
  };

  if (needsProfile) {
    const { data: inserted, error: insertError } = await supabase
      .from("doctor_profiles")
      .insert({ user_id: doctorId, ...payload })
      .select("user_id, specialties, hospital, license_no")
      .maybeSingle();

    if (insertError) {
      console.warn("Failed to create doctor profile", insertError);
      return profile ?? null;
    }

    return inserted;
  }

  const { specialties, hospital, license_no } = profile;
  const shouldUpdate =
    payload.specialties !== specialties ||
    payload.hospital !== hospital ||
    payload.license_no !== license_no;

  if (!shouldUpdate) {
    return profile;
  }

  const { data: updated, error: updateError } = await supabase
    .from("doctor_profiles")
    .update(payload)
    .eq("user_id", doctorId)
    .select("user_id, specialties, hospital, license_no")
    .maybeSingle();

  if (updateError) {
    console.warn("Failed to update doctor profile", updateError);
    return profile;
  }

  return updated;
};

const normalizeScheduleValue = (rawSchedule) => {
  if (!rawSchedule) {
    return null;
  }

  if (typeof rawSchedule === "string") {
    try {
      return JSON.parse(rawSchedule);
    } catch (error) {
      console.warn("Failed to parse availability_schedule JSON", error);
      return null;
    }
  }

  if (Array.isArray(rawSchedule)) {
    return rawSchedule;
  }

  if (typeof rawSchedule === "object") {
    return rawSchedule;
  }

  return null;
};

export const fetchDoctorSchedule = async (doctorId) => {
  if (!doctorId) {
    throw new Error("doctorId is required to fetch schedule");
  }

  const { data, error } = await supabase
    .from("doctor_status")
    .select(`doctor_id, is_active, ${AVAILABILITY_COLUMN}`)
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      doctor_id: doctorId,
      is_active: false,
      availability: null,
    };
  }

  return {
    doctor_id: data.doctor_id,
    is_active: Boolean(data.is_active),
    availability: normalizeScheduleValue(data[AVAILABILITY_COLUMN]),
  };
};

export const upsertDoctorSchedule = async (doctorId, { isActive, availability }) => {
  if (!doctorId) {
    throw new Error("doctorId is required to upsert schedule");
  }

  const payload = {
    doctor_id: doctorId,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };

  if (availability) {
    payload[AVAILABILITY_COLUMN] = availability;
  } else {
    payload[AVAILABILITY_COLUMN] = null;
  }

  const selectColumns = `doctor_id, is_active, ${AVAILABILITY_COLUMN}`;

  const { data: updatedData, error: updateError } = await supabase
    .from("doctor_status")
    .update(payload)
    .eq("doctor_id", doctorId)
    .select(selectColumns)
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (updatedData) {
    await ensureDoctorProfileFromApplication(doctorId);
    return updatedData;
  }

  const insertPayload = {
    ...payload,
    created_at: new Date().toISOString(),
  };

  const { data: insertedData, error: insertError } = await supabase
    .from("doctor_status")
    .insert(insertPayload)
    .select(selectColumns)
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  await ensureDoctorProfileFromApplication(doctorId);

  return insertedData;
};
