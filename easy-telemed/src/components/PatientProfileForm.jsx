import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  message, 
  Row, 
  Col,
  Select,
  DatePicker,
  InputNumber,
  Checkbox,
  Typography,
  Space,
  Divider,
  Tag
} from 'antd'
import { 
  SaveOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined,
  MedicineBoxOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input
const { Title, Text } = Typography

function PatientProfileForm({ initialData = {}, onSubmit, loading = false, mode = 'create' }) {
  const [form] = Form.useForm()
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
    if (bmiValue < 18.5) return { text: 'Underweight', color: 'blue' }
    if (bmiValue < 25) return { text: 'Normal', color: 'green' }
    if (bmiValue < 30) return { text: 'Overweight', color: 'orange' }
    return { text: 'Obese', color: 'red' }
  }

  const bmiCategory = getBMICategory(bmi)

  // Form submit
  const handleSubmit = async (values) => {
    try {
      // Process form data to match schema
      const formData = {
        ...values,
        // Convert date to proper format
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        lmp_date: values.lmp_date ? values.lmp_date.format('YYYY-MM-DD') : null,
        
        // Ensure JSONB fields are properly formatted
        address: values.address || {},
        emergency_contact: values.emergency_contact || {},
        allergies: values.allergies || [],
        conditions: values.conditions || [],
        medications: values.medications || [],
        surgical_history: values.surgical_history || [],
        immunizations: values.immunizations || [],
        preferred_pharmacy: values.preferred_pharmacy || {},
        insurance: values.insurance || [],
        devices: values.devices || [],
        
        // Ensure numeric fields
        height_cm: values.height_cm ? Number(values.height_cm) : null,
        weight_kg: values.weight_kg ? Number(values.weight_kg) : null,
        gestational_weeks: values.gestational_weeks ? Number(values.gestational_weeks) : null,
        
        // Timestamps
        updated_at: new Date().toISOString()
      }

      if (onSubmit) {
        await onSubmit(formData)
        message.success(mode === 'create' ? 'Profile created successfully!' : 'Profile updated successfully!')
      }
    } catch (error) {
      console.error('Submit error:', error)
      message.error('Failed to save profile')
    }
  }

  // Initialize form with data
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const formValues = {
        ...initialData,
        dob: initialData.dob ? dayjs(initialData.dob) : null,
        lmp_date: initialData.lmp_date ? dayjs(initialData.lmp_date) : null
      }
      form.setFieldsValue(formValues)
      
      // Calculate initial BMI
      if (initialData.height_cm && initialData.weight_kg) {
        setBmi(calculateBMI(initialData.height_cm, initialData.weight_kg))
      }
    }
  }, [initialData, form])

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
          <UserOutlined style={{ marginRight: '8px' }} />
          {mode === 'create' ? 'Create Patient Profile' : 'Edit Patient Profile'}
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            language_pref: 'th',
            consent_telemed: false,
            consent_privacy: true
          }}
        >
          {/* Basic Information */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>
              <UserOutlined style={{ marginRight: '8px' }} />
              Basic Information
            </Title>
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="First Name"
                  name="fname"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input placeholder="Enter first name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Last Name"
                  name="lname"
                  rules={[{ required: true, message: 'Please enter last name' }]}
                >
                  <Input placeholder="Enter last name" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Date of Birth"
                  name="dob"
                  rules={[{ required: true, message: 'Please select date of birth' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Sex at Birth"
                  name="sex_at_birth"
                  rules={[{ required: true, message: 'Please select sex at birth' }]}
                >
                  <Select placeholder="Select sex">
                    <Option value="male">Male</Option>
                    <Option value="female">Female</Option>
                    <Option value="intersex">Intersex</Option>
                    <Option value="unknown">Unknown</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Preferred Language"
                  name="language_pref"
                >
                  <Select placeholder="Select language">
                    <Option value="th">Thai</Option>
                    <Option value="en">English</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Phone Number"
                  name="phone"
                  rules={[
                    { required: true, message: 'Please enter phone number' },
                    { pattern: /^[0-9]{10}$/, message: 'Please enter valid 10-digit phone number' }
                  ]}
                >
                  <Input 
                    prefix={<PhoneOutlined />}
                    placeholder="0XXXXXXXXX" 
                    maxLength={10}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Address Information */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>Address Information</Title>
            
            <Form.Item label="Address (JSON)">
              <Input.Group>
                <Row gutter={8}>
                  <Col span={24}>
                    <Form.Item
                      name={['address', 'street']}
                      style={{ marginBottom: '8px' }}
                    >
                      <Input placeholder="Street address" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={['address', 'city']}
                      style={{ marginBottom: '8px' }}
                    >
                      <Input placeholder="City" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={['address', 'province']}
                      style={{ marginBottom: '8px' }}
                    >
                      <Input placeholder="Province" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={['address', 'postal_code']}
                      style={{ marginBottom: '0' }}
                    >
                      <Input placeholder="Postal code" />
                    </Form.Item>
                  </Col>
                </Row>
              </Input.Group>
            </Form.Item>
          </Card>

          {/* Emergency Contact */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>Emergency Contact</Title>
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Contact Name"
                  name={['emergency_contact', 'name']}
                >
                  <Input placeholder="Emergency contact name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Contact Phone"
                  name={['emergency_contact', 'phone']}
                >
                  <Input placeholder="Emergency contact phone" />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              label="Relationship"
              name={['emergency_contact', 'relationship']}
            >
              <Select placeholder="Select relationship">
                <Option value="spouse">Spouse</Option>
                <Option value="parent">Parent</Option>
                <Option value="child">Child</Option>
                <Option value="sibling">Sibling</Option>
                <Option value="friend">Friend</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          </Card>

          {/* Physical Information */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>
              <HeartOutlined style={{ marginRight: '8px' }} />
              Physical Information
            </Title>
            
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Height (cm)"
                  name="height_cm"
                  rules={[{ type: 'number', min: 50, max: 300, message: 'Invalid height' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }}
                    placeholder="Height in cm"
                    onChange={handlePhysicalChange}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Weight (kg)"
                  name="weight_kg"
                  rules={[{ type: 'number', min: 1, max: 500, message: 'Invalid weight' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }}
                    placeholder="Weight in kg"
                    onChange={handlePhysicalChange}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="BMI (Auto-calculated)">
                  <div style={{ padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: '6px', background: '#f5f5f5' }}>
                    {bmi ? (
                      <Space>
                        <Text strong>{bmi}</Text>
                        {bmiCategory && (
                          <Tag color={bmiCategory.color}>{bmiCategory.text}</Tag>
                        )}
                      </Space>
                    ) : (
                      <Text type="secondary">Enter height & weight</Text>
                    )}
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Medical Information */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>
              <MedicineBoxOutlined style={{ marginRight: '8px' }} />
              Medical Information
            </Title>
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Allergies (JSON Array)"
                  name="allergies"
                  tooltip="Enter as JSON array, e.g., ['peanuts', 'shellfish']"
                >
                  <TextArea 
                    rows={2}
                    placeholder='["allergy1", "allergy2"]'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Medical Conditions (JSON Array)"
                  name="conditions"
                  tooltip="Enter as JSON array"
                >
                  <TextArea 
                    rows={2}
                    placeholder='["diabetes", "hypertension"]'
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Current Medications (JSON Array)"
                  name="medications"
                  tooltip="Enter as JSON array"
                >
                  <TextArea 
                    rows={2}
                    placeholder='["medication1", "medication2"]'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Surgical History (JSON Array)"
                  name="surgical_history"
                  tooltip="Enter as JSON array"
                >
                  <TextArea 
                    rows={2}
                    placeholder='["surgery1", "surgery2"]'
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Immunizations (JSON Array)"
              name="immunizations"
              tooltip="Enter as JSON array"
            >
              <TextArea 
                rows={2}
                placeholder='["covid-19", "flu"]'
              />
            </Form.Item>
          </Card>

          {/* Pregnancy Information (for females) */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>Pregnancy Information</Title>
            
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Currently Pregnant"
                  name="is_pregnant"
                  valuePropName="checked"
                >
                  <Checkbox>Yes, I am currently pregnant</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Gestational Weeks"
                  name="gestational_weeks"
                  dependencies={['is_pregnant']}
                >
                  <InputNumber 
                    style={{ width: '100%' }}
                    placeholder="Weeks"
                    min={0}
                    max={42}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Last Menstrual Period"
                  name="lmp_date"
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Lifestyle */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>Lifestyle Information</Title>
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Smoking Status"
                  name="smoking_status"
                >
                  <Select placeholder="Select smoking status">
                    <Option value="never">Never smoked</Option>
                    <Option value="former">Former smoker</Option>
                    <Option value="current">Current smoker</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Alcohol Use"
                  name="alcohol_use"
                >
                  <Select placeholder="Select alcohol use">
                    <Option value="never">Never</Option>
                    <Option value="rarely">Rarely</Option>
                    <Option value="occasionally">Occasionally</Option>
                    <Option value="weekly">Weekly</Option>
                    <Option value="daily">Daily</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Preferences */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>Preferences & Settings</Title>
            
            <Form.Item
              label="Preferred Pharmacy (JSON)"
              name="preferred_pharmacy"
              tooltip="Enter pharmacy information as JSON"
            >
              <TextArea 
                rows={2}
                placeholder='{"name": "Pharmacy Name", "address": "123 Main St"}'
              />
            </Form.Item>

            <Form.Item
              label="Preferred Contact Method"
              name="preferred_contact_method"
            >
              <Select placeholder="Select preferred contact method">
                <Option value="phone">Phone</Option>
                <Option value="email">Email</Option>
                <Option value="sms">SMS</Option>
                <Option value="app">App notification</Option>
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Insurance Information (JSON Array)"
                  name="insurance"
                  tooltip="Enter as JSON array"
                >
                  <TextArea 
                    rows={2}
                    placeholder='[{"provider": "Company", "id": "123"}]'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Health Devices (JSON Array)"
                  name="devices"
                  tooltip="Enter as JSON array"
                >
                  <TextArea 
                    rows={2}
                    placeholder='["smartwatch", "glucose meter"]'
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Avatar Path"
              name="avatar_path"
            >
              <Input placeholder="Path to profile image" />
            </Form.Item>
          </Card>

          {/* Consent */}
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Title level={4}>Consent & Privacy</Title>
            
            <Form.Item
              name="consent_telemed"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value ? Promise.resolve() : Promise.reject(new Error('Telemedicine consent is required')),
                },
              ]}
            >
              <Checkbox>
                <strong>I consent to telemedicine services</strong>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Required for using telehealth features
                </Text>
              </Checkbox>
            </Form.Item>

            <Form.Item
              name="consent_privacy"
              valuePropName="checked"
            >
              <Checkbox>
                <strong>I agree to the privacy policy</strong>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Your health data will be protected according to our privacy policy
                </Text>
              </Checkbox>
            </Form.Item>
          </Card>

          {/* Submit Button */}
          <Form.Item style={{ textAlign: 'center', marginTop: '32px' }}>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
              size="large"
              icon={<SaveOutlined />}
              style={{ minWidth: '200px' }}
            >
              {mode === 'create' ? 'Create Profile' : 'Update Profile'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default PatientProfileForm