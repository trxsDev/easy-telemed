import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Upload, Form, Input, Button, Space, Alert, Select, message, Spin } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useUserAuthSupabase } from '../../context/UserAuthContextSupabase';
import specializationData from "../../specialization.json";
import {
  fetchDoctorApplication,
  uploadDoctorCredential,
  submitDoctorApplication,
  selectDoctorOnboardingState,
  removeDocumentPath,
} from '../../store/doctorOnboardingSlice';

/* Placeholder onboarding page for doctor_pending role.
   Future enhancements:
   - Upload medical license / credentials
   - Submit specialization, hospital, phone, etc.
   - Allow editing until approved
*/

const { Title, Text } = Typography;

export default function DoctorPending() {
  const { user, role, verify } = useUserAuthSupabase();
  const isPending = role === 'doctor' && verify === false;
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { application, documents, loading, submitting, uploading, error } = useSelector(selectDoctorOnboardingState);
  const [localSpecializationOptions] = useState(() => specializationData);

  useEffect(() => {
    if (!user?.user_id) return;
    dispatch(fetchDoctorApplication(user.user_id));
  }, [dispatch, user?.user_id]);

  useEffect(() => {
    if (!application) {
      form.resetFields();
      return;
    }

    let specializationIds = [];
    try {
      let specialtiesData = application.specialties;
      if (typeof specialtiesData === 'string') {
        specialtiesData = JSON.parse(specialtiesData);
      }
      if (Array.isArray(specialtiesData)) {
        specializationIds = specialtiesData.map((spec) =>
          typeof spec === 'object' && spec.id ? spec.id : spec
        );
      } else if (specialtiesData && typeof specialtiesData === 'object' && specialtiesData.id) {
        specializationIds = [specialtiesData.id];
      }
    } catch (parseError) {
      console.warn('Failed to parse specialties:', parseError);
      specializationIds = [];
    }

    form.setFieldsValue({
      full_name: application.full_name,
      license_no: application.license_no,
      specialization: specializationIds,
      hospital: application.hospital,
      phone: application.phone,
    });
  }, [application, form]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const uploadFileList = useMemo(
    () =>
      documents.map((path, idx) => ({
        uid: `${idx}`,
        name: path.split("/").pop(),
        status: "done",
        url: path,
      })),
    [documents]
  );

  const handleSubmit = async (values) => {
    try {
      // Map selected specialization IDs to full objects
      const selectedSpecializationIds = Array.isArray(values.specialization) 
        ? values.specialization 
        : [values.specialization];
      
      const fullSpecializations = selectedSpecializationIds.map(selectedId => 
        specializationData.find(spec => spec.id === selectedId)
      ).filter(Boolean); // Remove any undefined values

      const onboardingData = {
        applicant_user_id: user?.user_id,
        created_at: new Date().toISOString(),
        license_no: values.license_no,
        specialties: fullSpecializations.length === 1 
          ? JSON.stringify(fullSpecializations[0])
          : JSON.stringify(fullSpecializations),
        hospital: values.hospital,
        phone: values.phone,
        full_name: values.full_name,
        role_requested: 'doctor',
        status: 'pending',
        documents: documents.length > 0 ? JSON.stringify(documents) : '[]'
      };
      if (application?.application_id) {
        onboardingData.application_id = application.application_id;
      }

      await dispatch(
        submitDoctorApplication({
          userId: user?.user_id,
          applicationData: onboardingData,
          displayName: onboardingData.full_name,
        })
      ).unwrap();
      message.success('Application submitted successfully!');
    } catch (err) {
      console.error('Submit error:', err);
      message.error('An error occurred');
    }

    
  };

  return (
    <div style={{maxWidth: 780, margin: '0 auto', padding: '32px 16px'}}>
      <Card style={{ borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <Spin />
          </div>
        ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Doctor Onboarding</Title>
            <Text type="secondary">
              {application 
                ? "Update your professional information" 
                : "Please provide professional information while waiting for admin approval."
              }
            </Text>
          </div>
         {isPending && (
            <Alert 
              type="warning" 
              showIcon 
              message="Your account is pending approval" 
              description="Once admin verifies your documents, you'll gain full access to Telemed features." 
            />
          )}
          {application && (
            <Alert 
              type="info" 
              showIcon 
              message="Previous application found" 
              description={`Application status: ${application.status || 'pending'}. You can update your information below.`} 
            />
          )}
          <Form 
            form={form}
            layout="vertical" 
            onFinish={handleSubmit} 
            disabled={!isPending}
          >
            <Form.Item label="Full Name" name="full_name" rules={[{ required: true, message: 'Enter full name'}]}>
              <Input placeholder="Dr. John Smith" />
            </Form.Item>
            <Form.Item label="Medical License Number" name="license_no" rules={[{ required: true, message: 'Enter license number'}]}>
              <Input placeholder="e.g. MLC-123456" />
            </Form.Item>
             <Form.Item label="Specialization" name="specialization" rules={[{ required: true, message: 'Enter specialization'}]}>
              <Select 
              placeholder="Select your specialization(s)" 
                mode="multiple"
                maxTagCount={3}
                maxTagTextLength={20}
              >
                {localSpecializationOptions.map((spec) => (
                  <Select.Option key={spec.id} value={spec.id}>
                    {spec.name} ({spec.name_th})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
             <Form.Item label="Hospital/Clinic" name="hospital" rules={[{ required: true, message: 'Enter hospital or clinic name'}]}>
              <Input placeholder="e.g. Bangkok General Hospital" />
            </Form.Item>
            <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: 'Enter phone number'}]}>
              <Input placeholder="e.g. +66-xxx-xxx-xxxx" />
            </Form.Item>
            <Form.Item 
              label="Upload Credentials" 
              extra="PDF / Image files"
            >
              <Upload.Dragger 
                name="files" 
                beforeUpload={async (file) => {
                  if (!user?.user_id) {
                    message.error('User not authenticated');
                    return Upload.LIST_IGNORE;
                  }
                  try {
                    await dispatch(
                      uploadDoctorCredential({
                        userId: user.user_id,
                        file,
                      })
                    ).unwrap();
                    message.success('File uploaded successfully');
                  } catch (uploadError) {
                    console.error('Upload failed:', uploadError);
                    message.error(uploadError.message || 'Upload failed');
                  }
                  return false; // Prevent default upload
                }} 
                multiple 
                maxCount={5} 
                accept=".pdf,.jpg,.jpeg,.png"
                fileList={uploadFileList}
                onRemove={(file) => {
                  dispatch(removeDocumentPath(file.url || file.name));
                  return true;
                }}
                disabled={uploading}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Click or drag files to this area to upload</p>
                <p className="ant-upload-hint">Upload license, certification, or other relevant documents.</p>
              </Upload.Dragger>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting}>
                {application ? 'Update Information' : 'Submit Information'}
              </Button>
            </Form.Item>
          </Form>
        </Space>
        )}
      </Card>
    </div>
  );
}
