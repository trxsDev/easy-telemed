import React, { useState } from 'react'
import { 
  Form, 
  Steps, 
  Button, 
  Card, 
  message, 
  Progress,
  Typography,
  Result,
  Space
} from 'antd'
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  CheckOutlined,
  UserOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import BasicInformationStep from './Steps/BasicInformationStep'
import PhysicalInformationStep from './Steps/PhysicalInformationStep'
import MedicalHistoryStep from './Steps/MedicalHistoryStep'
import LifestyleStep from './Steps/LifestyleStep'
import PreferencesStep from './Steps/PreferencesStep'
import { FORM_STEPS, getInitialFormData, validateStep } from '../../constants/profileFormConstants'

const { Step } = Steps
const { Title, Text } = Typography

function ProfileForm({ userType = 'patient', initialData = {}, onSubmit, onSave, mode = 'create' }) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  
  // Initialize form data
  const [formData, setFormData] = useState(() => ({
    ...getInitialFormData(),
    ...initialData
  }))
  
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Step configuration with icons
  const steps = [
    {
      title: t('BASIC_INFORMATION', 'Basic Information'),
      icon: <UserOutlined />,
      component: BasicInformationStep,
      key: 'basic'
    },
    {
      title: t('PHYSICAL_INFORMATION', 'Physical Information'),
      icon: <HeartOutlined />,
      component: PhysicalInformationStep,
      key: 'physical'
    },
    {
      title: t('MEDICAL_HISTORY', 'Medical History'),
      icon: <MedicineBoxOutlined />,
      component: MedicalHistoryStep,
      key: 'medical'
    },
    {
      title: t('LIFESTYLE', 'Lifestyle'),
      icon: <EnvironmentOutlined />,
      component: LifestyleStep,
      key: 'lifestyle'
    },
    {
      title: t('PREFERENCES', 'Preferences'),
      icon: <SettingOutlined />,
      component: PreferencesStep,
      key: 'preferences'
    }
  ]

  // Get current step component
  const CurrentStepComponent = steps[currentStep].component

  // Navigation functions
  const next = async () => {
    try {
      // Validate current step
      await form.validateFields()
      
      // Validate current step data
      const stepKey = steps[currentStep].key
      const isValid = validateStep(stepKey, formData)
      
      if (!isValid) {
        message.error(t('PLEASE_COMPLETE_REQUIRED_FIELDS', 'Please complete all required fields'))
        return
      }
      
      // Move to next step
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      console.error('Validation failed:', error)
      message.error(t('VALIDATION_ERROR', 'Please fill in all required fields'))
    }
  }

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle step click (allow going to previous completed steps)
  const handleStepClick = (stepIndex) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Save draft
  const saveDraft = async () => {
    setSaving(true)
    try {
      if (onSave) {
        await onSave(formData)
        message.success(t('DRAFT_SAVED', 'Draft saved successfully'))
      }
    } catch (error) {
      console.error('Save failed:', error)
      message.error(t('SAVE_ERROR', 'Failed to save draft'))
    } finally {
      setSaving(false)
    }
  }

  // Submit form
  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Validate all fields
      await form.validateFields()
      
      // Validate all steps
      const allStepsValid = steps.every(step => validateStep(step.key, formData))
      
      if (!allStepsValid) {
        message.error(t('PLEASE_COMPLETE_ALL_STEPS', 'Please complete all required information'))
        setLoading(false)
        return
      }

      // Prepare data for submission
      const submissionData = {
        ...formData,
        completed_at: new Date().toISOString(),
        profile_completion_percentage: 100
      }
      
      if (onSubmit) {
        await onSubmit(submissionData)
        setCompleted(true)
        message.success(t('PROFILE_SAVED', 'Profile saved successfully'))
      }
    } catch (error) {
      console.error('Submit failed:', error)
      if (error.errorFields) {
        message.error(t('VALIDATION_ERROR', 'Please fill in all required fields'))
      } else {
        message.error(t('SUBMIT_ERROR', 'Failed to save profile'))
      }
    } finally {
      setLoading(false)
    }
  }

  // Calculate progress
  const progress = Math.round(((currentStep + 1) / steps.length) * 100)

  // Show completion screen
  if (completed) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title={t('PROFILE_COMPLETED', 'Profile Completed Successfully!')}
          subTitle={t('PROFILE_COMPLETED_MESSAGE', 'Your health profile has been saved. You can now access personalized healthcare services.')}
          extra={[
            <Button type="primary" key="dashboard" size="large">
              {t('GO_TO_DASHBOARD', 'Go to Dashboard')}
            </Button>,
            <Button key="edit" onClick={() => setCompleted(false)}>
              {t('EDIT_PROFILE', 'Edit Profile')}
            </Button>
          ]}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Title level={2}>
          {mode === 'edit' ? t('EDIT_HEALTH_PROFILE', 'Edit Health Profile') : t('CREATE_HEALTH_PROFILE', 'Create Your Health Profile')}
        </Title>
        <Text type="secondary">
          {t('PROFILE_DESCRIPTION', 'Complete your health profile to receive personalized healthcare services')}
        </Text>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <Progress 
          percent={progress} 
          showInfo={false}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <Text type="secondary">
            {t('STEP_PROGRESS', 'Step {{current}} of {{total}}', { 
              current: currentStep + 1, 
              total: steps.length 
            })}
          </Text>
        </div>
      </div>

      {/* Steps Navigation */}
      <Card style={{ marginBottom: '24px' }}>
        <Steps 
          current={currentStep} 
          size="small"
          onChange={handleStepClick}
          responsive={false}
        >
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              icon={step.icon}
              style={{ cursor: index <= currentStep ? 'pointer' : 'default' }}
            />
          ))}
        </Steps>
      </Card>

      {/* Form Content */}
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            {steps[currentStep].title}
          </Title>
          <Text type="secondary">
            {t(`STEP_${currentStep + 1}_DESCRIPTION`, `Complete step ${currentStep + 1} of your health profile`)}
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues, _allValues) => {
            // Update form data when form values change
            setFormData(prev => ({ ...prev, ...changedValues }))
          }}
          initialValues={formData}
        >
          <CurrentStepComponent
            formData={formData}
            setFormData={setFormData}
            form={form}
            userType={userType}
          />
        </Form>
      </Card>

      {/* Navigation Buttons */}
      <Card style={{ marginTop: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Left side - Back button */}
          <div>
            {currentStep > 0 && (
              <Button 
                onClick={prev}
                icon={<ArrowLeftOutlined />}
                size="large"
              >
                {t('PREVIOUS', 'Previous')}
              </Button>
            )}
          </div>

          {/* Center - Save Draft and Step info */}
          <Space>
            <Button
              onClick={saveDraft}
              loading={saving}
              icon={<SaveOutlined />}
            >
              {t('SAVE_DRAFT', 'Save Draft')}
            </Button>
            <Text type="secondary">
              {t('STEP_INFO', 'Step {{current}} of {{total}}', { 
                current: currentStep + 1, 
                total: steps.length 
              })}
            </Text>
          </Space>

          {/* Right side - Next/Submit button */}
          <div>
            {currentStep < steps.length - 1 ? (
              <Button 
                type="primary" 
                onClick={next}
                icon={<ArrowRightOutlined />}
                size="large"
              >
                {t('NEXT', 'Next')}
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
                icon={<CheckOutlined />}
                size="large"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                {mode === 'edit' ? t('UPDATE_PROFILE', 'Update Profile') : t('COMPLETE_PROFILE', 'Complete Profile')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Form Summary (only show on last step) */}
      {currentStep === steps.length - 1 && (
        <Card 
          title={t('FORM_SUMMARY', 'Form Summary')} 
          style={{ marginTop: '24px' }}
          size="small"
        >
          <div style={{ fontSize: '12px', color: '#666' }}>
            <Text>{t('REVIEW_MESSAGE', 'Please review your information before submitting. You can always edit your profile later.')}</Text>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>{t('BASIC_INFO_COMPLETED', 'Basic information completed')}</li>
              <li>{t('PHYSICAL_INFO_COMPLETED', 'Physical information completed')}</li>
              <li>{t('MEDICAL_HISTORY_COMPLETED', 'Medical history completed')}</li>
              <li>{t('LIFESTYLE_INFO_COMPLETED', 'Lifestyle information completed')}</li>
              <li>{t('PREFERENCES_COMPLETED', 'Preferences and consents completed')}</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Help Text */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {t('PROFILE_HELP_TEXT', 'You can save your progress and return to complete your profile later')}
        </Text>
      </div>
    </div>
  )
}

export default ProfileForm