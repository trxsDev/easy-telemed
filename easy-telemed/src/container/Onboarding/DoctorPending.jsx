import React, { useEffect,useState } from 'react';
import { Card, Typography, Upload, Form, Input, Button, Space, Alert, Select, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useUserAuthSupabase } from '../../context/UserAuthContextSupabase';
import specializationData from "../../specialization.json";
import { useTranslation } from "react-i18next";
import { supabase } from '../../api/SupabaseClient';

/* Placeholder onboarding page for doctor_pending role.
   Future enhancements:
   - Upload medical license / credentials
   - Submit specialization, hospital, phone, etc.
   - Allow editing until approved
*/

const { Title, Text } = Typography;

export default function DoctorPending() {
  const { t, i18n } = useTranslation();
  const { user, role, verify } = useUserAuthSupabase();
  const isPending = role === 'doctor' && verify === false;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Load existing data when component mounts
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user?.user_id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('provider_applications')
          .select('*')
          .eq('applicant_user_id', user.user_id)
          .single();

        if (data) {
          setInitialData(data);
          
          // Parse specialties and extract IDs for form
          let specializationIds = [];
          try {
            // Handle both array and JSON string formats
            let specialtiesData = data.specialties;
            if (typeof specialtiesData === 'string') {
              specialtiesData = JSON.parse(specialtiesData);
            }
            
            // Handle both single object and array formats
            if (Array.isArray(specialtiesData)) {
              specializationIds = specialtiesData.map(spec => 
                typeof spec === 'object' && spec.id ? spec.id : spec
              );
            } else if (specialtiesData && typeof specialtiesData === 'object' && specialtiesData.id) {
              // Single specialization object
              specializationIds = [specialtiesData.id];
            }
          } catch (parseError) {
            console.warn('Failed to parse specialties:', parseError);
            specializationIds = [];
          }
          
          // Set form values
          form.setFieldsValue({
            full_name: data.full_name,
            license_no: data.license_no,
            specialization: specializationIds, // Convert objects back to IDs for form
            hospital: data.hospital,
            phone: data.phone
          });
        }
      } catch (error) {
        console.log('No existing data found or error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user?.user_id, form]);

  const uploadCredentials = async (file) => {
    // Upload file to Supabase Storage
    if (!file) {
      throw new Error("You must select a file to upload.");
    }
    
    if (!user?.user_id) {
      message.error('User not authenticated');
      return null;
    }
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user_id}_${Date.now()}_credentials.${fileExt}`;
      const filePath = `doctor_credentials/${fileName}`;

      // Check if user is authenticated before upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('Please log in to upload files');
        return null;
      }

      let { data, error: uploadError } = await supabase.storage
        .from('credentials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Handle specific storage errors
        if (uploadError.message.includes('row-level security policy')) {
          message.error('Upload permission denied. Please contact administrator.');
        } else if (uploadError.message.includes('already exists')) {
          message.error('File already exists. Please rename and try again.');
        } else {
          message.error(`Upload failed: ${uploadError.message}`);
        }
        return null;
      }

      message.success('File uploaded successfully');
      return filePath;
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Failed to upload file');
      return null;
    }
  };
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
        documents: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : '[]'
      };




      // Check if record exists
      const { data: existing, error: checkError } = await supabase
        .from('provider_applications')
        .select('applicant_user_id')
        .eq('applicant_user_id', user?.user_id)
        .single();

      let result;
      if (existing) {
        // Update existing record
        result = await supabase
          .from('provider_applications')
          .update(onboardingData)
          .eq('applicant_user_id', user?.user_id);
      } else {
        // Insert new record
        result = await supabase
          .from('provider_applications')
          .insert(onboardingData);
      }

      if (result.error) {
        console.error('Submit error:', result.error);
        message.error('Failed to submit application');
      } else {
        message.success('Application submitted successfully!');
        console.log('Onboarding submit', onboardingData);
        const obj = JSON.parse(onboardingData.specialties);
        console.log("specializations", obj);
      }

      try {
      const { data, error } = await supabase
        .from('app_users')
        .update({ display_name:  onboardingData.full_name}) // Ensure still pending
        .eq('user_id', user?.user_id);
      if (error) {
        console.error('Error updating user display name:', error);
      } else {
        console.log('User display name updated successfully', data);
      }
    } catch (err) {
      console.error('Error updating user display name:', err);
    }
    } catch (err) {
      console.error('Submit error:', err);
      message.error('An error occurred');
    }

    
  };

  return (
    <div style={{maxWidth: 780, margin: '0 auto', padding: '32px 16px'}}>
      <Card style={{ borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Doctor Onboarding</Title>
            <Text type="secondary">
              {initialData 
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
          {initialData && (
            <Alert 
              type="info" 
              showIcon 
              message="Previous application found" 
              description={`Application status: ${initialData.status || 'pending'}. You can update your information below.`} 
            />
          )}
          <Form 
            form={form}
            layout="vertical" 
            onFinish={handleSubmit} 
            disabled={!isPending}
            loading={loading}
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
                {specializationData.map((spec) => (
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
              name="credentials" 
              valuePropName="fileList" 
              getValueFromEvent={(e) => e?.fileList} 
              extra="PDF / Image files"
            >
              <Upload.Dragger 
                name="files" 
                beforeUpload={async (file) => {
                  try {
                    const uploadedPath = await uploadCredentials(file);
                    if (uploadedPath) {
                      setUploadedFiles(prev => [...prev, uploadedPath]);
                    }
                  } catch (error) {
                    console.error('Upload failed:', error);
                  }
                  return false; // Prevent default upload
                }} 
                multiple 
                maxCount={5} 
                accept=".pdf,.jpg,.jpeg,.png"
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Click or drag files to this area to upload</p>
                <p className="ant-upload-hint">Upload license, certification, or other relevant documents.</p>
              </Upload.Dragger>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                {initialData ? 'Update Information' : 'Submit Information'}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
