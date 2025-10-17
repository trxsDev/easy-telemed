import React from 'react'
import { 
  Form, 
  Checkbox,
  Typography,
  Card,
  Alert,
  Divider,
  Space
} from 'antd'
import { SafetyCertificateOutlined, InfoCircleOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

function ConsentStep({ form: _form }) {
  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <SafetyCertificateOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Consent & Privacy Agreement
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Please review and provide consent for telemedicine services and data privacy policies
        </p>

        <Alert
          message="Important Legal Information"
          description="Please read each section carefully before providing your consent. These agreements are required to use our telemedicine services."
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* Telemedicine Consent */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            <InfoCircleOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            Telemedicine Services Consent
          </Title>
          
          <Card size="small" style={{ background: '#f6ffed', marginBottom: '16px' }}>
            <Paragraph style={{ marginBottom: '16px' }}>
              <Text strong>By checking the box below, I understand and agree that:</Text>
            </Paragraph>
            
            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li>Telemedicine involves the use of electronic communications to provide healthcare services remotely</li>
              <li>I will receive healthcare services through video calls, phone calls, and secure messaging</li>
              <li>Technical difficulties may occasionally disrupt telemedicine sessions</li>
              <li>Emergency situations require immediate in-person medical care, not telemedicine</li>
              <li>My healthcare provider will determine if my condition is appropriate for telemedicine treatment</li>
              <li>I have the right to request in-person consultation at any time</li>
              <li>Telemedicine may not be as complete as an in-person examination</li>
            </ul>

            <Alert
              message="Emergency Situations"
              description="In case of medical emergencies, please call 1669 (Thailand emergency services) or go to the nearest emergency room immediately."
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </Card>

          <Form.Item
            name="consent_telemed"
            valuePropName="checked"
            rules={[
              {
                required: true,
                message: 'Telemedicine consent is required to use our services'
              }
            ]}
          >
            <Checkbox style={{ fontSize: '16px' }}>
              <Text strong>
                I consent to receive telemedicine services and understand the limitations and risks involved
              </Text>
            </Checkbox>
          </Form.Item>
        </div>

        <Divider />

        {/* Privacy Policy Consent */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            <InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Privacy Policy & Data Protection
          </Title>
          
          <Card size="small" style={{ background: '#f0f9ff', marginBottom: '16px' }}>
            <Paragraph style={{ marginBottom: '16px' }}>
              <Text strong>Our commitment to protecting your health information:</Text>
            </Paragraph>
            
            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li>All health information is encrypted and stored securely according to international standards</li>
              <li>Your medical data will only be accessed by authorized healthcare providers treating you</li>
              <li>We comply with Thailand's Personal Data Protection Act (PDPA) and international privacy laws</li>
              <li>Your information will not be shared with third parties without your explicit consent</li>
              <li>You have the right to access, correct, or delete your personal health information</li>
              <li>Video consultations are recorded only for quality assurance and with your consent</li>
              <li>You can request a copy of our complete privacy policy at any time</li>
            </ul>

            <Alert
              message="Data Rights"
              description="You have the right to access, modify, or delete your personal data at any time. Contact our privacy officer for assistance."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </Card>

          <Form.Item
            name="consent_privacy"
            valuePropName="checked"
            rules={[
              {
                required: true,
                message: 'Privacy policy consent is required'
              }
            ]}
          >
            <Checkbox style={{ fontSize: '16px' }}>
              <Text strong>
                I have read and agree to the privacy policy and consent to the collection and use of my health information
              </Text>
            </Checkbox>
          </Form.Item>
        </div>



        {/* Contact Information */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Questions or Concerns?</strong><br />
            If you have any questions about these consents or our privacy practices, please contact us:<br />
            📧 Email: privacy@easy-telemed.com<br />
            📞 Phone: 02-XXX-XXXX<br />
            🏥 Privacy Officer: Available Mon-Fri 9AM-5PM
          </Text>
        </div>
      </Card>
    </>
  )
}

export default ConsentStep