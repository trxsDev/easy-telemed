import React from 'react'
import { 
  Form, 
  Input, 
  Typography,
  Card,
  Divider,
  Alert,
  Tooltip
} from 'antd'
import { 
  MedicineBoxOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { TextArea } = Input
const { Title, Text } = Typography

function MedicalInformationStep({ form: _form }) {

  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <MedicineBoxOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Medical History & Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Please provide your medical history to help healthcare providers give you the best care
        </p>

        <Alert
          message="Privacy Notice"
          description="All medical information is encrypted and only accessible to authorized healthcare providers treating you."
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* Allergies Section */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            Allergies 
            <Tooltip title="Include food allergies, drug allergies, environmental allergies, etc.">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
            </Tooltip>
          </Title>
          
          <Form.Item
            name="allergies"
            label="Known Allergies"
            tooltip="List all known allergies including foods, medications, and environmental allergens"
          >
            <TextArea 
              rows={3}
              placeholder="Example: Penicillin, Peanuts, Shellfish (separate with commas or new lines)"
              size="large"
            />
          </Form.Item>
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            If you have no known allergies, you can leave this field empty or write "None known"
          </Text>
        </div>

        <Divider />

        {/* Medical Conditions Section */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            Medical Conditions
            <Tooltip title="Include chronic conditions, ongoing health issues, diagnosed conditions">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
            </Tooltip>
          </Title>
          
          <Form.Item
            name="conditions"
            label="Current Medical Conditions"
            tooltip="List any ongoing medical conditions, chronic illnesses, or diagnosed health issues"
          >
            <TextArea 
              rows={3}
              placeholder="Example: Diabetes Type 2, Hypertension, Asthma (separate with commas or new lines)"
              size="large"
            />
          </Form.Item>
        </div>

        <Divider />

        {/* Current Medications Section */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            Current Medications
            <Tooltip title="Include prescription medications, over-the-counter drugs, supplements, vitamins">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
            </Tooltip>
          </Title>
          
          <Form.Item
            name="medications"
            label="Current Medications & Supplements"
            tooltip="Include dosage and frequency if known (e.g., 'Metformin 500mg twice daily')"
          >
            <TextArea 
              rows={3}
              placeholder="Example: Lisinopril 10mg daily, Vitamin D 1000IU daily, Aspirin 81mg (separate with commas or new lines)"
              size="large"
            />
          </Form.Item>
        </div>

        <Divider />

        {/* Surgical History Section */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            Surgical History
            <Tooltip title="Include all previous surgeries, procedures, and approximate dates">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
            </Tooltip>
          </Title>
          
          <Form.Item
            name="surgical_history"
            label="Previous Surgeries & Procedures"
            tooltip="Include the type of surgery and approximate year if known"
          >
            <TextArea 
              rows={3}
              placeholder="Example: Appendectomy (2018), Knee surgery (2020), Dental extractions (2021)"
              size="large"
            />
          </Form.Item>
        </div>

        <Divider />

        {/* Immunizations Section */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>
            Immunizations & Vaccinations
            <Tooltip title="Include recent vaccinations, especially COVID-19, flu, and travel vaccines">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
            </Tooltip>
          </Title>
          
          <Form.Item
            name="immunizations"
            label="Recent Vaccinations"
            tooltip="Include vaccination name and approximate date"
          >
            <TextArea 
              rows={3}
              placeholder="Example: COVID-19 booster (2024), Annual flu vaccine (2024), Hepatitis B series (completed)"
              size="large"
            />
          </Form.Item>
        </div>

        {/* Family Medical History */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>
            Family Medical History (Optional)
            <Tooltip title="Genetic conditions, chronic diseases, or significant health issues in immediate family">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
            </Tooltip>
          </Title>
          
          <Form.Item
            name="family_history"
            label="Significant Family Medical History"
          >
            <TextArea 
              rows={2}
              placeholder="Example: Father - diabetes, Mother - hypertension, Grandmother - heart disease"
              size="large"
            />
          </Form.Item>
        </div>

        {/* Additional Notes */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Important:</strong> This information will be shared with healthcare providers to ensure safe and effective treatment. 
            Please be as complete and accurate as possible. You can always update this information later.
          </Text>
        </div>
      </Card>
    </>
  )
}

export default MedicalInformationStep