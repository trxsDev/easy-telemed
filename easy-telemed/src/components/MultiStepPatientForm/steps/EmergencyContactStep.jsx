import React from 'react'
import { 
  Form, 
  Input, 
  Row, 
  Col,
  Select,
  Typography,
  Card
} from 'antd'
import { PhoneOutlined } from '@ant-design/icons'

const { Option } = Select
const { Title } = Typography

function EmergencyContactStep({ form: _form }) {
  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Emergency Contact Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Please provide someone we can contact in case of emergency
        </p>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Contact Person Name"
              name={['emergency_contact', 'name']}
              rules={[
                { required: true, message: 'Please enter emergency contact name' },
                { min: 2, message: 'Name must be at least 2 characters' }
              ]}
            >
              <Input 
                placeholder="Full name of emergency contact"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Contact Phone Number"
              name={['emergency_contact', 'phone']}
              rules={[
                { required: true, message: 'Please enter emergency contact phone' },
                { 
                  pattern: /^[0-9]{10}$/, 
                  message: 'Please enter valid 10-digit phone number' 
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
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Relationship to You"
              name={['emergency_contact', 'relationship']}
              rules={[
                { required: true, message: 'Please select relationship' }
              ]}
            >
              <Select 
                placeholder="Select relationship"
                size="large"
              >
                <Option value="spouse">Spouse/Partner</Option>
                <Option value="parent">Parent</Option>
                <Option value="child">Child</Option>
                <Option value="sibling">Sibling</Option>
                <Option value="friend">Friend</Option>
                <Option value="relative">Other Relative</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Alternative Phone (Optional)"
              name={['emergency_contact', 'alt_phone']}
              rules={[
                { 
                  pattern: /^[0-9]{10}$/, 
                  message: 'Please enter valid 10-digit phone number' 
                }
              ]}
            >
              <Input 
                prefix={<PhoneOutlined />}
                placeholder="Alternative contact number"
                maxLength={10}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Contact Address (Optional)"
          name={['emergency_contact', 'address']}
        >
          <Input.TextArea 
            rows={2}
            placeholder="Emergency contact address (if different from yours)"
            size="large"
          />
        </Form.Item>
      </Card>
    </>
  )
}

export default EmergencyContactStep