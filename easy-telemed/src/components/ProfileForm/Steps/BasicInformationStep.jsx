import React from 'react'
import { Form, Input, Select, DatePicker, Row, Col, Card, Divider } from 'antd'
import { useTranslation } from 'react-i18next'
import { 
  SEX_AT_BIRTH_OPTIONS, 
  LANGUAGE_OPTIONS, 
  RELATIONSHIP_OPTIONS,
  THAI_PROVINCES 
} from '../../../constants/profileFormConstants'

const { Option } = Select

function BasicInformationStep({ formData, setFormData, form: _form }) {
  const { t } = useTranslation()

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Personal Information */}
      <Card title={t('PERSONAL_INFORMATION', 'Personal Information')} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="fname"
              label={t('fname', 'First Name')}
              rules={[
                { required: true, message: t('fname_REQUIRED', 'First name is required') }
              ]}
            >
              <Input 
                placeholder={t('ENTER_fname', 'Enter your first name')}
                value={formData.fname}
                onChange={(e) => handleFieldChange('fname', e.target.value)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="lname"
              label={t('lname', 'Last Name')}
              rules={[
                { required: true, message: t('lname_REQUIRED', 'Last name is required') }
              ]}
            >
              <Input 
                placeholder={t('ENTER_lname', 'Enter your last name')}
                value={formData.lname}
                onChange={(e) => handleFieldChange('lname', e.target.value)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="dob"
              label={t('dob', 'Date of Birth')}
              rules={[
                { required: true, message: t('DOB_REQUIRED', 'Date of birth is required') }
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder={t('SELECT_DATE', 'Select date')}
                value={formData.dob}
                onChange={(date) => handleFieldChange('dob', date)}
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="sex_at_birth"
              label={t('SEX_AT_BIRTH', 'Sex at Birth')}
              rules={[
                { required: true, message: t('SEX_REQUIRED', 'Sex at birth is required') }
              ]}
            >
              <Select 
                placeholder={t('SELECT_SEX', 'Select sex at birth')}
                value={formData.sex_at_birth}
                onChange={(value) => handleFieldChange('sex_at_birth', value)}
              >
                {SEX_AT_BIRTH_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {t(option.label, option.label)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="language_preference"
              label={t('PREFERRED_LANGUAGE', 'Preferred Language')}
            >
              <Select 
                placeholder={t('SELECT_LANGUAGE', 'Select preferred language')}
                value={formData.language_preference}
                onChange={(value) => handleFieldChange('language_preference', value)}
              >
                {LANGUAGE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {t(option.label, option.label)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="phone_number"
              label={t('PHONE_NUMBER', 'Phone Number')}
              rules={[
                { required: true, message: t('PHONE_REQUIRED', 'Phone number is required') },
                { pattern: /^[0-9]{10}$/, message: t('PHONE_INVALID', 'Please enter a valid 10-digit phone number') }
              ]}
            >
              <Input 
                placeholder={t('ENTER_PHONE', 'Enter your phone number')}
                value={formData.phone_number}
                onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                maxLength={10}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Address Information */}
      <Card title={t('ADDRESS_INFORMATION', 'Address Information')} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Form.Item 
              name="address"
              label={t('ADDRESS', 'Address')}
            >
              <Input 
                placeholder={t('ENTER_ADDRESS', 'Enter your address')}
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="city"
              label={t('CITY', 'City')}
            >
              <Input 
                placeholder={t('ENTER_CITY', 'Enter your city')}
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="province"
              label={t('PROVINCE', 'Province')}
            >
              <Select
                showSearch
                placeholder={t('SELECT_PROVINCE', 'Select province')}
                value={formData.province}
                onChange={(value) => handleFieldChange('province', value)}
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {THAI_PROVINCES.map(province => (
                  <Option key={province} value={province}>
                    {province}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="postal_code"
              label={t('POSTAL_CODE', 'Postal Code')}
            >
              <Input 
                placeholder={t('ENTER_POSTAL_CODE', 'Enter postal code')}
                value={formData.postal_code}
                onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                maxLength={5}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="country"
              label={t('COUNTRY', 'Country')}
            >
              <Input 
                value={formData.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                disabled
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Emergency Contact */}
      <Card title={t('EMERGENCY_CONTACT', 'Emergency Contact')} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="emergency_contact_name"
              label={t('EMERGENCY_CONTACT_NAME', 'Emergency Contact Name')}
            >
              <Input 
                placeholder={t('ENTER_EMERGENCY_CONTACT_NAME', 'Enter emergency contact name')}
                value={formData.emergency_contact_name}
                onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="emergency_contact_relationship"
              label={t('RELATIONSHIP', 'Relationship')}
            >
              <Select 
                placeholder={t('SELECT_RELATIONSHIP', 'Select relationship')}
                value={formData.emergency_contact_relationship}
                onChange={(value) => handleFieldChange('emergency_contact_relationship', value)}
              >
                {RELATIONSHIP_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {t(option.label, option.label)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="emergency_contact_phone"
              label={t('EMERGENCY_CONTACT_PHONE', 'Emergency Contact Phone')}
            >
              <Input 
                placeholder={t('ENTER_EMERGENCY_CONTACT_PHONE', 'Enter emergency contact phone')}
                value={formData.emergency_contact_phone}
                onChange={(e) => handleFieldChange('emergency_contact_phone', e.target.value)}
                maxLength={10}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default BasicInformationStep