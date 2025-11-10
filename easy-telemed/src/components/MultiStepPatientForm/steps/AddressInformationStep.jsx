import React from 'react'
import { 
  Form, 
  Input, 
  Row, 
  Col,
  Typography,
  Card
} from 'antd'
import { HomeOutlined } from '@ant-design/icons'

const { Title } = Typography

function AddressInformationStep({ form: _form }) {
  return (
    <>
      <Card size="small" style={{ marginBottom: '24px', border: 'none', boxShadow: 'none' }}>
        <Title level={4}>
          <HomeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Address Information
        </Title>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Please provide your current address for healthcare delivery and emergency services
        </p>
        
        <Form.Item label="Complete Address">
          <Input.Group>
            <Row gutter={8}>
              <Col span={24}>
                <Form.Item
                  name={['address', 'street']}
                  style={{ marginBottom: '16px' }}
                  rules={[
                    { required: true, message: 'Please enter your street address' }
                  ]}
                >
                  <Input 
                    placeholder="House number, street name, building name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['address', 'city']}
                  style={{ marginBottom: '16px' }}
                  rules={[
                    { required: true, message: 'Please enter your city' }
                  ]}
                >
                  <Input 
                    placeholder="City/District"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['address', 'province']}
                  style={{ marginBottom: '16px' }}
                  rules={[
                    { required: true, message: 'Please enter your province' }
                  ]}
                >
                  <Input 
                    placeholder="Province/State"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['address', 'postal_code']}
                  style={{ marginBottom: '0' }}
                  rules={[
                    { required: true, message: 'Please enter postal code' },
                    { pattern: /^[0-9]{5}$/, message: 'Please enter valid 5-digit postal code' }
                  ]}
                >
                  <Input 
                    placeholder="Postal code"
                    maxLength={5}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Input.Group>
        </Form.Item>

        <Form.Item
          label="Country"
          name={['address', 'country']}
          initialValue="Thailand"
        >
          <Input 
            placeholder="Country"
            size="large"
            disabled
          />
        </Form.Item>
      </Card>
    </>
  )
}

export default AddressInformationStep