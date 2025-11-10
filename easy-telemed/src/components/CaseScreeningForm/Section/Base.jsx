import React from 'react'
import { Form, Input, Select, DatePicker, Row, Col } from 'antd'
import { useTranslation } from 'react-i18next'

const { Option } = Select

function Base({ formData, setFormData, onNext }) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const handleFinish = (values) => {
    setFormData({ ...formData, ...values })
    onNext()
  }

  return (
    <div>
      <h3>{t('BASIC_INFORMATION', 'Basic Information')}</h3>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={formData}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label={t('fname', 'First Name')}
              rules={[{ required: true, message: t('REQUIRED_FIELD', 'This field is required') }]}
            >
              <Input placeholder={t('ENTER_fname', 'Enter first name')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="lastName"
              label={t('lname', 'Last Name')}
              rules={[{ required: true, message: t('REQUIRED_FIELD', 'This field is required') }]}
            >
              <Input placeholder={t('ENTER_lname', 'Enter last name')} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="age"
              label={t('AGE', 'Age')}
              rules={[{ required: true, message: t('REQUIRED_FIELD', 'This field is required') }]}
            >
              <Input type="number" placeholder={t('ENTER_AGE', 'Enter age')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="gender"
              label={t('GENDER', 'Gender')}
              rules={[{ required: true, message: t('REQUIRED_FIELD', 'This field is required') }]}
            >
              <Select placeholder={t('SELECT_GENDER', 'Select gender')}>
                <Option value="male">{t('MALE', 'Male')}</Option>
                <Option value="female">{t('FEMALE', 'Female')}</Option>
                <Option value="other">{t('OTHER', 'Other')}</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="phone"
          label={t('PHONE_NUMBER', 'Phone Number')}
          rules={[{ required: true, message: t('REQUIRED_FIELD', 'This field is required') }]}
        >
          <Input placeholder={t('ENTER_PHONE', 'Enter phone number')} />
        </Form.Item>

        <Form.Item
          name="email"
          label={t('EMAIL', 'Email')}
          rules={[
            { required: true, message: t('REQUIRED_FIELD', 'This field is required') },
            { type: 'email', message: t('INVALID_EMAIL', 'Please enter a valid email') }
          ]}
        >
          <Input placeholder={t('ENTER_EMAIL', 'Enter email')} />
        </Form.Item>
      </Form>
    </div>
  )
}

export default Base