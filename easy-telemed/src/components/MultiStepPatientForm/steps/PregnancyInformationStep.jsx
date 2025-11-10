import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input,
  InputNumber, 
  Row, 
  Col,
  Checkbox,
  DatePicker,
  Typography,
  Card,
  Alert,
  Select
} from 'antd'
import { HeartOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

function PregnancyInformationStep({ form }) {
  const [isPregnant, setIsPregnant] = useState(false)
  const [sexAtBirth, setSexAtBirth] = useState(null)

  // Watch for sex at birth changes
  useEffect(() => {
    const sexValue = form.getFieldValue('sex_at_birth')
    setSexAtBirth(sexValue)
  }, [form])

  // Watch for pregnancy status changes
  const handlePregnancyChange = (checked) => {
    setIsPregnant(checked)
    if (!checked) {
      // Clear pregnancy-related fields when not pregnant
      form.setFieldsValue({
        gestational_weeks: null,
        due_date: null
      })
    }
  }

  // Skip this step if sex at birth is not female
  if (sexAtBirth && sexAtBirth !== 'female') {
    return (
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <HeartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Pregnancy Information
        </Title>
        
        <Alert
          message="This section is not applicable"
          description="Pregnancy information is only relevant for individuals assigned female at birth."
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
        
        {/* Hidden field to ensure form validation passes */}
        <Form.Item name="pregnancy_na" style={{ display: 'none' }}>
          <input type="hidden" value="true" />
        </Form.Item>
      </Card>
    )
  }

  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <HeartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Pregnancy & Reproductive Health Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          This information helps healthcare providers provide appropriate care and medication recommendations
        </p>

        {/* Current Pregnancy Status */}
        <div style={{ marginBottom: '24px' }}>
          <Form.Item
            name="is_pregnant"
            valuePropName="checked"
            style={{ marginBottom: '16px' }}
          >
            <Checkbox onChange={(e) => handlePregnancyChange(e.target.checked)}>
              <strong>I am currently pregnant</strong>
            </Checkbox>
          </Form.Item>

          {isPregnant && (
            <Alert
              message="Congratulations on your pregnancy!"
              description="Please provide additional information to help us provide the best prenatal care."
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
        </div>

        {/* Pregnancy Details (shown only if pregnant) */}
        {isPregnant && (
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f6ffed', borderRadius: '8px' }}>
            <Title level={5}>Current Pregnancy Details</Title>
            
            <Form.Item
              label="Gestational Weeks"
              name="gestational_weeks"
              rules={[
                { required: isPregnant, message: 'Please enter gestational weeks' },
                { type: 'number', min: 1, max: 42, message: 'Please enter valid gestational weeks (1-42)' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }}
                placeholder="How many weeks pregnant?"
                min={1}
                max={42}
                size="large"
                addonAfter="weeks"
              />
            </Form.Item>
          </div>
        )}

        {/* Last Menstrual Period */}
        <div style={{ marginBottom: '24px' }}>
          <Form.Item
            label="Last Menstrual Period (LMP)"
            name="lmp_date"
            tooltip="Date of the first day of your last menstrual period"
          >
            <DatePicker 
              style={{ width: '100%' }}
              placeholder="Select LMP date"
              format="DD/MM/YYYY"
              size="large"
            />
          </Form.Item>
        </div>

        {/* Privacy Notice */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Privacy:</strong> This reproductive health information is confidential and will only be used by healthcare providers to ensure safe and appropriate medical care.
          </Text>
        </div>
      </Card>
    </>
  )
}

export default PregnancyInformationStep