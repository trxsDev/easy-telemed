import React, { useState, useEffect } from 'react'
import { 
  Form, 
  InputNumber, 
  Row, 
  Col,
  Typography,
  Card,
  Space,
  Tag,
  Alert,
  Select
} from 'antd'
import { HeartOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

function PhysicalInformationStep({ form }) {
  const [bmi, setBmi] = useState(null)

  // Calculate BMI when height or weight changes
  const calculateBMI = (height, weight) => {
    if (height && weight && height > 0) {
      const heightInM = height / 100
      const calculatedBMI = weight / (heightInM * heightInM)
      return Math.round(calculatedBMI * 100) / 100
    }
    return null
  }

  // Handle height/weight changes
  const handlePhysicalChange = () => {
    const values = form.getFieldsValue(['height_cm', 'weight_kg'])
    const calculatedBMI = calculateBMI(values.height_cm, values.weight_kg)
    setBmi(calculatedBMI)
  }

  // BMI Category
  const getBMICategory = (bmiValue) => {
    if (!bmiValue) return null
    if (bmiValue < 18.5) return { text: 'Underweight', color: 'blue', description: 'Consider consulting with a healthcare provider' }
    if (bmiValue < 25) return { text: 'Normal weight', color: 'green', description: 'Healthy weight range' }
    if (bmiValue < 30) return { text: 'Overweight', color: 'orange', description: 'Consider lifestyle changes' }
    return { text: 'Obese', color: 'red', description: 'Please consult with a healthcare provider' }
  }

  const bmiCategory = getBMICategory(bmi)

  // Watch for form changes to update BMI
  useEffect(() => {
    const values = form.getFieldsValue(['height_cm', 'weight_kg'])
    if (values.height_cm && values.weight_kg) {
      const calculatedBMI = calculateBMI(values.height_cm, values.weight_kg)
      setBmi(calculatedBMI)
    }
  }, [form])

  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <HeartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Physical Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Please provide your current physical measurements for health assessment
        </p>
        
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              label="Height (cm)"
              name="height_cm"
              rules={[
                { required: true, message: 'Please enter your height' },
                { type: 'number', min: 50, max: 300, message: 'Please enter a valid height (50-300 cm)' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }}
                placeholder="Enter height in centimeters"
                onChange={handlePhysicalChange}
                step={0.1}
                size="large"
                addonAfter="cm"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              label="Weight (kg)"
              name="weight_kg"
              rules={[
                { required: true, message: 'Please enter your weight' },
                { type: 'number', min: 1, max: 500, message: 'Please enter a valid weight (1-500 kg)' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }}
                placeholder="Enter weight in kilograms"
                onChange={handlePhysicalChange}
                step={0.1}
                size="large"
                addonAfter="kg"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="BMI (Auto-calculated)">
              <div style={{ 
                padding: '11px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px', 
                background: '#f5f5f5',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center'
              }}>
                {bmi ? (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text strong style={{ fontSize: '16px' }}>{bmi}</Text>
                      {bmiCategory && (
                        <Tag color={bmiCategory.color} style={{ marginLeft: '8px' }}>
                          {bmiCategory.text}
                        </Tag>
                      )}
                    </div>
                  </Space>
                ) : (
                  <Text type="secondary">Enter height & weight</Text>
                )}
              </div>
            </Form.Item>
          </Col>
        </Row>

        {/* BMI Information Alert */}
        {bmiCategory && (
          <Alert
            message={`BMI: ${bmi} - ${bmiCategory.text}`}
            description={bmiCategory.description}
            type={bmiCategory.color === 'green' ? 'success' : 
                  bmiCategory.color === 'orange' ? 'warning' : 'info'}
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}



        {/* Physical Activity Information */}
        <div style={{ marginTop: '16px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Note:</strong> This information helps healthcare providers assess your overall health status and provide appropriate care recommendations.
          </Text>
        </div>
      </Card>
    </>
  )
}

export default PhysicalInformationStep