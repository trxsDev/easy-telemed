import React from 'react'
import { 
  Form, 
  Row, 
  Col,
  Select,
  InputNumber,
  Typography,
  Card,
  Alert,
  Divider
} from 'antd'
import { HeartOutlined } from '@ant-design/icons'

const { Option } = Select
const { Title, Text } = Typography

function LifestyleInformationStep({ form: _form }) {
  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <HeartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Lifestyle & Habits Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          This information helps healthcare providers understand factors that may affect your health and treatment options
        </p>

        <Alert
          message="Confidential Information"
          description="Your lifestyle information is kept confidential and is only used to provide better healthcare recommendations."
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* Smoking Information */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={5}>Smoking Status</Title>
          
          <Form.Item
            label="Smoking Status"
            name="smoking_status"
            tooltip="Select the option that best describes your smoking history"
          >
            <Select 
              placeholder="Select smoking status"
              size="large"
            >
              <Option value="never">Never smoked</Option>
              <Option value="former">Former smoker (quit)</Option>
              <Option value="current">Current smoker</Option>
              <Option value="occasional">Occasional/social smoker</Option>
            </Select>
          </Form.Item>
        </div>

        <Divider />

        {/* Alcohol Information */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>Alcohol Consumption</Title>
          
          <Form.Item
            label="Alcohol Use Frequency"
            name="alcohol_use"
            tooltip="How often do you consume alcoholic beverages?"
          >
            <Select 
              placeholder="Select alcohol use frequency"
              size="large"
            >
              <Option value="never">Never</Option>
              <Option value="rarely">Rarely (few times per year)</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="few_times_week">Few times per week</Option>
              <Option value="daily">Daily</Option>
            </Select>
          </Form.Item>
        </div>

        {/* Additional Information */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Note:</strong> This lifestyle information helps healthcare providers:
            <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
              <li>Assess health risks and provide appropriate screening</li>
              <li>Make safe medication recommendations</li>
              <li>Provide personalized lifestyle counseling</li>
              <li>Monitor for potential health complications</li>
            </ul>
            All information is kept strictly confidential.
          </Text>
        </div>
      </Card>
    </>
  )
}

export default LifestyleInformationStep