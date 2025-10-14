import React from 'react'
import { 
  Form, 
  Select, 
  Input, 
  Checkbox, 
  Card, 
  Row, 
  Col, 
  Switch,
  Radio,
  Divider,
  Typography
} from 'antd'
import { useTranslation } from 'react-i18next'
import { 
  COMMUNICATION_PREFERENCES,
  APPOINTMENT_PREFERENCES,
  INSURANCE_PROVIDERS,
  DEVICE_TYPES
} from '../../../constants/profileFormConstants'

const { Option } = Select
const { TextArea } = Input
const { Text, Title } = Typography

function PreferencesStep({ formData, setFormData, form }) {
  const { t } = useTranslation()

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleInsuranceChange = (field, value) => {
    const newInsurance = { ...formData.insurance_info, [field]: value }
    setFormData(prev => ({ ...prev, insurance_info: newInsurance }))
  }

  const handleConsentChange = (field, value) => {
    const newConsent = { ...formData.consent_info, [field]: value }
    setFormData(prev => ({ ...prev, consent_info: newConsent }))
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Communication Preferences */}
      <Card title={t('COMMUNICATION_PREFERENCES', 'Communication Preferences')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="preferred_communication_method"
          label={t('PREFERRED_COMMUNICATION_METHOD', 'Preferred communication method')}
        >
          <Select
            mode="multiple"
            placeholder={t('SELECT_COMMUNICATION_METHODS', 'Select your preferred communication methods')}
            value={formData.preferred_communication_method}
            onChange={(value) => handleChange('preferred_communication_method', value)}
          >
            {COMMUNICATION_PREFERENCES.map(method => (
              <Option key={method.value} value={method.value}>
                {t(method.label, method.label)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="language_preference"
          label={t('PREFERRED_LANGUAGE', 'Preferred language for consultations')}
        >
          <Radio.Group
            value={formData.language_preference}
            onChange={(e) => handleChange('language_preference', e.target.value)}
          >
            <Radio value="th">{t('THAI', 'Thai')}</Radio>
            <Radio value="en">{t('ENGLISH', 'English')}</Radio>
            <Radio value="both">{t('BOTH', 'Both')}</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item 
          name="appointment_reminders"
          label={t('APPOINTMENT_REMINDERS', 'Appointment reminders')}
        >
          <Checkbox.Group
            value={formData.appointment_reminders}
            onChange={(value) => handleChange('appointment_reminders', value)}
          >
            <Row>
              <Col span={12}>
                <Checkbox value="email">{t('EMAIL', 'Email')}</Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="sms">{t('SMS', 'SMS')}</Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="phone">{t('PHONE_CALL', 'Phone call')}</Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="app">{t('APP_NOTIFICATION', 'App notification')}</Checkbox>
              </Col>
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="reminder_timing"
              label={t('REMINDER_TIMING', 'How early do you want reminders?')}
            >
              <Select
                placeholder={t('SELECT_TIMING', 'Select timing')}
                value={formData.reminder_timing}
                onChange={(value) => handleChange('reminder_timing', value)}
              >
                <Option value="1hour">{t('1_HOUR_BEFORE', '1 hour before')}</Option>
                <Option value="2hours">{t('2_HOURS_BEFORE', '2 hours before')}</Option>
                <Option value="1day">{t('1_DAY_BEFORE', '1 day before')}</Option>
                <Option value="2days">{t('2_DAYS_BEFORE', '2 days before')}</Option>
                <Option value="1week">{t('1_WEEK_BEFORE', '1 week before')}</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="best_contact_time"
              label={t('BEST_CONTACT_TIME', 'Best time to contact you')}
            >
              <Select
                placeholder={t('SELECT_TIME', 'Select time')}
                value={formData.best_contact_time}
                onChange={(value) => handleChange('best_contact_time', value)}
              >
                <Option value="morning">{t('MORNING', 'Morning (6-12)')}</Option>
                <Option value="afternoon">{t('AFTERNOON', 'Afternoon (12-17)')}</Option>
                <Option value="evening">{t('EVENING', 'Evening (17-21)')}</Option>
                <Option value="anytime">{t('ANYTIME', 'Anytime')}</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Healthcare Preferences */}
      <Card title={t('HEALTHCARE_PREFERENCES', 'Healthcare Preferences')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="preferred_appointment_types"
          label={t('PREFERRED_APPOINTMENT_TYPES', 'Preferred appointment types')}
        >
          <Checkbox.Group
            value={formData.preferred_appointment_types}
            onChange={(value) => handleChange('preferred_appointment_types', value)}
          >
            {APPOINTMENT_PREFERENCES.map(type => (
              <Checkbox key={type.value} value={type.value}>
                {t(type.label, type.label)}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>

        <Form.Item 
          name="preferred_pharmacy"
          label={t('PREFERRED_PHARMACY', 'Preferred pharmacy')}
        >
          <Input
            placeholder={t('ENTER_PHARMACY_NAME', 'Enter pharmacy name and location')}
            value={formData.preferred_pharmacy}
            onChange={(e) => handleChange('preferred_pharmacy', e.target.value)}
          />
        </Form.Item>

        <Form.Item 
          name="doctor_gender_preference"
          label={t('DOCTOR_GENDER_PREFERENCE', 'Doctor gender preference')}
        >
          <Radio.Group
            value={formData.doctor_gender_preference}
            onChange={(e) => handleChange('doctor_gender_preference', e.target.value)}
          >
            <Radio value="no_preference">{t('NO_PREFERENCE', 'No preference')}</Radio>
            <Radio value="male">{t('MALE_DOCTOR', 'Male doctor')}</Radio>
            <Radio value="female">{t('FEMALE_DOCTOR', 'Female doctor')}</Radio>
          </Radio.Group>
        </Form.Item>

        {/* <Form.Item 
          name="accessibility_needs"
          label={t('ACCESSIBILITY_NEEDS', 'Accessibility needs')}
        >
          <TextArea
            placeholder={t('DESCRIBE_ACCESSIBILITY_NEEDS', 'Describe any accessibility needs or accommodations required')}
            value={formData.accessibility_needs}
            onChange={(e) => handleChange('accessibility_needs', e.target.value)}
            rows={3}
          />
        </Form.Item> */}
      </Card>

      {/* Insurance Information */}
      <Card title={t('INSURANCE_INFORMATION', 'Insurance Information')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="has_insurance"
          label={t('DO_YOU_HAVE_HEALTH_INSURANCE', 'Do you have health insurance?')}
        >
          <Radio.Group
            value={formData.insurance_info?.has_insurance}
            onChange={(e) => handleInsuranceChange('has_insurance', e.target.value)}
          >
            <Radio value={true}>{t('YES', 'Yes')}</Radio>
            <Radio value={false}>{t('NO', 'No')}</Radio>
          </Radio.Group>
        </Form.Item>

        {formData.insurance_info?.has_insurance && (
          <>
            <Form.Item 
              name="insurance_provider"
              label={t('INSURANCE_PROVIDER', 'Insurance provider')}
            >
              <Select
                placeholder={t('SELECT_INSURANCE_PROVIDER', 'Select your insurance provider')}
                value={formData.insurance_info?.provider}
                onChange={(value) => handleInsuranceChange('provider', value)}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {INSURANCE_PROVIDERS.map(provider => (
                  <Option key={provider} value={provider}>
                    {provider}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="insurance_id"
                  label={t('INSURANCE_ID', 'Insurance ID/Policy number')}
                >
                  <Input
                    placeholder={t('ENTER_INSURANCE_ID', 'Enter insurance ID')}
                    value={formData.insurance_info?.policy_number}
                    onChange={(e) => handleInsuranceChange('policy_number', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="insurance_group"
                  label={t('GROUP_NUMBER', 'Group number (if applicable)')}
                >
                  <Input
                    placeholder={t('ENTER_GROUP_NUMBER', 'Enter group number')}
                    value={formData.insurance_info?.group_number}
                    onChange={(e) => handleInsuranceChange('group_number', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item 
              name="insurance_notes"
              label={t('INSURANCE_NOTES', 'Insurance notes')}
            >
              <TextArea
                placeholder={t('INSURANCE_NOTES_PLACEHOLDER', 'Any special notes about your insurance coverage')}
                value={formData.insurance_info?.notes}
                onChange={(e) => handleInsuranceChange('notes', e.target.value)}
                rows={2}
              />
            </Form.Item>
          </>
        )}
      </Card>

      {/* Device Information */}
      <Card title={t('DEVICE_INFORMATION', 'Device & Technology Information')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="devices_used"
          label={t('DEVICES_USED', 'Devices you use for healthcare')}
        >
          <Checkbox.Group
            value={formData.devices_used}
            onChange={(value) => handleChange('devices_used', value)}
          >
            {DEVICE_TYPES.map(device => (
              <Checkbox key={device.value} value={device.value}>
                {t(device.label, device.label)}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>

        <Form.Item 
          name="tech_comfort_level"
          label={t('TECHNOLOGY_COMFORT_LEVEL', 'Technology comfort level')}
        >
          <Radio.Group
            value={formData.tech_comfort_level}
            onChange={(e) => handleChange('tech_comfort_level', e.target.value)}
          >
            <Radio value="beginner">{t('BEGINNER', 'Beginner - Need help with technology')}</Radio>
            <Radio value="intermediate">{t('INTERMEDIATE', 'Intermediate - Comfortable with basic functions')}</Radio>
            <Radio value="advanced">{t('ADVANCED', 'Advanced - Very comfortable with technology')}</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item 
          name="internet_quality"
          label={t('INTERNET_CONNECTION_QUALITY', 'Internet connection quality')}
        >
          <Radio.Group
            value={formData.internet_quality}
            onChange={(e) => handleChange('internet_quality', e.target.value)}
          >
            <Radio value="excellent">{t('EXCELLENT', 'Excellent - High speed, stable')}</Radio>
            <Radio value="good">{t('GOOD', 'Good - Generally reliable')}</Radio>
            <Radio value="fair">{t('FAIR', 'Fair - Sometimes slow or unstable')}</Radio>
            <Radio value="poor">{t('POOR', 'Poor - Often problems with connection')}</Radio>
          </Radio.Group>
        </Form.Item>
      </Card>

      {/* Privacy and Consent */}
      <Card title={t('PRIVACY_CONSENT', 'Privacy & Consent')}>
        <Title level={5}>{t('DATA_SHARING_PREFERENCES', 'Data Sharing Preferences')}</Title>
        
        <Form.Item 
          name="share_data_for_research"
          label={t('SHARE_DATA_FOR_RESEARCH', 'Share anonymized data for medical research')}
        >
          <Switch
            checked={formData.consent_info?.share_data_for_research}
            onChange={(checked) => handleConsentChange('share_data_for_research', checked)}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            {t('RESEARCH_DATA_DESCRIPTION', 'Your data will be anonymized and used to improve healthcare services')}
          </div>
        </Form.Item>

        <Form.Item 
          name="marketing_communications"
          label={t('MARKETING_COMMUNICATIONS', 'Receive marketing communications')}
        >
          <Switch
            checked={formData.consent_info?.marketing_communications}
            onChange={(checked) => handleConsentChange('marketing_communications', checked)}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            {t('MARKETING_DESCRIPTION', 'Receive information about new services and health tips')}
          </div>
        </Form.Item>

        <Form.Item 
          name="emergency_data_access"
          label={t('EMERGENCY_DATA_ACCESS', 'Allow emergency access to my medical data')}
        >
          <Switch
            checked={formData.consent_info?.emergency_data_access}
            onChange={(checked) => handleConsentChange('emergency_data_access', checked)}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            {t('EMERGENCY_ACCESS_DESCRIPTION', 'Medical professionals can access your data in emergency situations')}
          </div>
        </Form.Item>

        <Divider />

        <Title level={5}>{t('FAMILY_ACCESS', 'Family Access')}</Title>
        
        <Form.Item 
          name="family_access_consent"
          label={t('ALLOW_FAMILY_ACCESS', 'Allow family members to access my health information')}
        >
          <Switch
            checked={formData.consent_info?.family_access_consent}
            onChange={(checked) => handleConsentChange('family_access_consent', checked)}
          />
        </Form.Item>

        {formData.consent_info?.family_access_consent && (
          <Form.Item 
            name="authorized_family_members"
            label={t('AUTHORIZED_FAMILY_MEMBERS', 'Authorized family members')}
          >
            <TextArea
              placeholder={t('LIST_FAMILY_MEMBERS', 'List names and relationships of family members who can access your information')}
              value={formData.consent_info?.authorized_family_members}
              onChange={(e) => handleConsentChange('authorized_family_members', e.target.value)}
              rows={3}
            />
          </Form.Item>
        )}

        <Divider />

        <Form.Item 
          name="additional_notes"
          label={t('ADDITIONAL_NOTES', 'Additional notes or special requests')}
        >
          <TextArea
            placeholder={t('ADDITIONAL_NOTES_PLACEHOLDER', 'Any additional information you would like your healthcare providers to know')}
            value={formData.additional_notes}
            onChange={(e) => handleChange('additional_notes', e.target.value)}
            rows={4}
          />
        </Form.Item>

        <div style={{ 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: '6px', 
          padding: '16px', 
          marginTop: '24px' 
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {t('PRIVACY_NOTICE', 'By completing this profile, you acknowledge that you have read and understood our Privacy Policy and Terms of Service. Your health information is protected and will only be shared with authorized healthcare providers involved in your care.')}
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default PreferencesStep