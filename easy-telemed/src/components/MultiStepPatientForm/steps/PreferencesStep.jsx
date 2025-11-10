import React from 'react'
import { 
  Form, 
  Input,
  Row, 
  Col,
  Select,
  Typography,
  Card,
  Divider
} from 'antd'
import { SettingOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Option } = Select
const { Title, Text } = Typography

function PreferencesStep({ form: _form }) {
  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <SettingOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Preferences & Healthcare Settings
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Configure your healthcare preferences to personalize your telemedicine experience
        </p>

        {/* Communication Preferences */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>Communication Preferences</Title>
          
          <Form.Item
            label="Preferred Contact Method"
            name="preferred_contact_method"
            tooltip="How would you like healthcare providers to contact you?"
          >
            <Select 
              placeholder="Select preferred contact method"
              size="large"
            >
              <Option value="phone">Phone call</Option>
              <Option value="sms">Text message (SMS)</Option>
              <Option value="email">Email</Option>
              <Option value="app">App notification</Option>
              <Option value="video_call">Video call</Option>
            </Select>
          </Form.Item>
        </div>

        <Divider />

        {/* Pharmacy Information */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>Healthcare Preferences</Title>
          
          <Form.Item
            label="Preferred Pharmacy Information"
            name="preferred_pharmacy"
            tooltip="Enter your preferred pharmacy information for prescription deliveries"
          >
            <TextArea 
              rows={2}
              placeholder="Pharmacy name, address, and phone number (e.g., Boots Pharmacy, Central World, Bangkok, 02-123-4567)"
              size="large"
            />
          </Form.Item>
        </div>

        <Divider />

        {/* Insurance Information */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>Insurance Information</Title>
          
          <Form.Item
            label="Insurance Information"
            name="insurance"
            tooltip="List your health insurance providers and policy numbers"
          >
            <TextArea 
              rows={3}
              placeholder="Insurance provider name, policy number, group number (e.g., Thai Health Insurance, Policy: TH123456789, Group: ABC001)"
              size="large"
            />
          </Form.Item>
        </div>

        <Divider />

        {/* Health Monitoring Devices */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>Health Monitoring Devices</Title>
          
          <Form.Item
            label="Health Devices & Wearables"
            name="devices"
            tooltip="List any health monitoring devices you use (helps with remote monitoring)"
          >
            <TextArea 
              rows={2}
              placeholder="Health devices you use (e.g., Apple Watch, Fitbit, blood pressure monitor, glucose meter, smart scale)"
              size="large"
            />
          </Form.Item>
        </div>

        {/* Profile Picture */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>Profile Settings</Title>
          
          <Form.Item
            label="Profile Picture Path (Optional)"
            name="avatar_path"
            tooltip="Path or URL to your profile picture"
          >
            <Input 
              placeholder="Profile image path or URL"
              size="large"
            />
          </Form.Item>
        </div>

        {/* Information Note */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Note:</strong> These preferences help us provide personalized healthcare services. You can update these settings anytime from your profile. All preferences are optional and can be modified based on your changing needs.
          </Text>
        </div>
      </Card>
    </>
  )
}

export default PreferencesStep