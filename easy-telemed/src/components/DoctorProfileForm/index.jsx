import React, { useEffect } from "react";
import { Card, Form, Input, Select, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import specializations from "../../specialization.json";

function DoctorProfileForm({ initialData = {}, loading = false, onSubmit }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        license_no: initialData.license_no || "",
        hospital: initialData.hospital || "",
        country: initialData.country || "",
        specialties: initialData.specialties || [],
        display_name: initialData.display_name || "",
      });
    }
  }, [initialData, form]);

  const handleFinish = (values) => {
    if (onSubmit) {
      onSubmit({
        ...values,
        specialties: values.specialties || [],
      });
    }
  };

  const specialtyOptions = specializations.map((spec) => ({
    label: `${spec.name}${spec.name_th ? ` (${spec.name_th})` : ""}`,
    value: spec.name,
  }));

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>{t("PROFILE_DOCTOR_TITLE")}</h1>
          <p style={{ marginBottom: 0, color: "#595959" }}>
            {t("PROFILE_DOCTOR_DESC")}
          </p>
          <p style={{ marginBottom: 0, color: "#8c8c8c", fontSize: 13 }}>
            {t("PROFILE_DOCTOR_FORM_HELP")}
          </p>
        </div>

        <Form
          layout="vertical"
          form={form}
          initialValues={{ specialties: [] }}
          onFinish={handleFinish}
        >
          <Form.Item name="display_name" label={t("DISPLAY_NAME", "Display name")}> 
            <Input placeholder={t("DISPLAY_NAME_PLACEHOLDER", "e.g. Dr. Samaporn R.")} />
          </Form.Item>
          <Form.Item
            name="license_no"
            label={t("DOCTOR_LICENSE_LABEL")}
            rules={[{ required: true, message: t("DOCTOR_LICENSE_REQUIRED") }]}
          >
            <Input placeholder={t("DOCTOR_LICENSE_PLACEHOLDER") || undefined} />
          </Form.Item>

          <Form.Item name="specialties" label={t("DOCTOR_SPECIALTIES_LABEL")}> 
            <Select
              mode="multiple"
              allowClear
              placeholder={t("DOCTOR_SPECIALTIES_PLACEHOLDER")}
              options={specialtyOptions}
            />
          </Form.Item>

          <Form.Item name="hospital" label={t("DOCTOR_HOSPITAL_LABEL")}> 
            <Input placeholder={t("DOCTOR_HOSPITAL_LABEL") || undefined} />
          </Form.Item>

          <Form.Item name="country" label={t("DOCTOR_COUNTRY_LABEL")}> 
            <Input placeholder={t("DOCTOR_COUNTRY_LABEL") || undefined} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t("SAVE", "Save")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
}

export default DoctorProfileForm;
