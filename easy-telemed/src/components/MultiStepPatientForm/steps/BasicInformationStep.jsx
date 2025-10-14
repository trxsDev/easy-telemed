import React from 'react'
import { 
  Form, 
  Input, 
  Row, 
  Col,
  Select,
  DatePicker,
  Typography,
  Card
} from 'antd'
import { 
  UserOutlined,
  PhoneOutlined
} from '@ant-design/icons'

const { Option } = Select
const { Title } = Typography

function BasicInformationStep({ form }) {
  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Basic Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Please provide your basic personal information
        </p>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="First Name"
              name="fname"
              rules={[
                { required: true, message: 'Please enter your first name' },
                { min: 2, message: 'First name must be at least 2 characters' }
              ]}
            >
              <Input 
                placeholder="Enter your first name" 
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Last Name"
              name="lname"
              rules={[
                { required: true, message: 'Please enter your last name' },
                { min: 2, message: 'Last name must be at least 2 characters' }
              ]}
            >
              <Input 
                placeholder="Enter your last name" 
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              label="Date of Birth"
              name="dob"
              rules={[{ required: true, message: 'Please select your date of birth' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                placeholder="Select your birth date"
                format="DD/MM/YYYY"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              label="Sex at Birth"
              name="sex_at_birth"
              rules={[{ required: true, message: 'Please select your sex at birth' }]}
            >
              <Select 
                placeholder="Select sex at birth"
                size="large"
              >
                <Option value="male">Male</Option>
                <Option value="female">Female</Option>
                <Option value="intersex">Intersex</Option>
                <Option value="unknown">Prefer not to say</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              label="Preferred Language"
              name="language_pref"
              rules={[{ required: true, message: 'Please select your preferred language' }]}
            >
              <Select 
                placeholder="Select language"
                size="large"
              >
                <Option value="th">ภาษาไทย (Thai)</Option>
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
                { required: true, message: 'Please enter your phone number' },
                { 
                  pattern: /^[0-9]{10}$/, 
                  message: 'Please enter a valid 10-digit phone number' 
                }
              ]}
            >
              <Input 
                prefix={<PhoneOutlined />}
                placeholder="0812345678" 
                maxLength={10}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </>
  )
}

export default BasicInformationStep