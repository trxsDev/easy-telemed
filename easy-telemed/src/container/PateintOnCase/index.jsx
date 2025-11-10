import React from "react";
import { useTranslation } from "react-i18next";
import CaseScreeningForm from "../../components/CaseScreeningForm";

function PatientOnCase() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("PATIENT_ON_CASE_TITLE", "Patient Case")}</h1>
      <CaseScreeningForm />
    </div>
  );
}

export default PatientOnCase;
