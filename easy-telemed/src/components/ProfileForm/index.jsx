import React, { useState } from 'react'
import { Form, Steps, Button, Card, message, Progress } from 'antd'
import { SaveOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import BasicInformationStep from './Steps/BasicInformationStep'
import PhysicalInformationStep from './Steps/PhysicalInformationStep'
import MedicalHistoryStep from './Steps/MedicalHistoryStep'
import LifestyleStep from './Steps/LifestyleStep'
import PreferencesStep from './Steps/PreferencesStep'
import { FORM_STEPS, getInitialFormData, validateStep } from '../../constants/profileFormConstants'
import './ProfileForm.css'

const { Step } = Steps

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

  // Step configuration with components
  const steps = [
    {
      title: t('BASIC_INFORMATION', 'Basic Information'),
      component: BasicInformationStep,
      key: 'basic'
    },
    {
      title: t('PHYSICAL_INFORMATION', 'Physical Information'),
      component: PhysicalInformationStep,
      key: 'physical'
    },
    {
      title: t('MEDICAL_HISTORY', 'Medical History'),
      component: MedicalHistoryStep,
      key: 'medical'
    },
    {
      title: t('LIFESTYLE', 'Lifestyle'),
      component: LifestyleStep,
      key: 'lifestyle'
    },
    {
      title: t('PREFERENCES', 'Preferences'),
      component: PreferencesStep,
      key: 'preferences'
    }
  ]

  // Get current step component
  const CurrentStepComponent = steps[currentStep].component

  // Navigation functions
  const next = async () => {
    try {
    //   console.log('Next button clicked, current step:', currentStep)
    //   console.log('Current formData:', formData)
      
      // Skip form validation for now to test step progression
      // await form.validateFields()
    //   console.log('Form validation skipped for testing')
      
      // Validate current step data using new validation function
      const stepKey = steps[currentStep].key
    //   console.log('Validating step:', stepKey)
      const isValid = validateStep(stepKey, formData)
    //   console.log('Step validation result:', isValid)
      
      if (!isValid) {
        // console.log('Step validation failed')
        message.warning(t('PLEASE_COMPLETE_REQUIRED_FIELDS', 'Please complete all required fields (validation skipped for testing)'))
        // return // Comment out for testing
      }
      
      // Move to next step
      if (currentStep < steps.length - 1) {
        // console.log('Moving to next step:', currentStep + 1)
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
      console.log('onSubmit 0', onSubmit)
      console.log('Form fields validated', formData)
      
      // Validate all steps using new validation function

      const allStepsValid = steps.every(step => validateStep(step.key, formData))
      if (!allStepsValid) {
        message.error(t('PLEASE_COMPLETE_ALL_STEPS', 'Please complete all required information'))
        return
      }

      console.log('onSubmit 1', onSubmit)

      // Prepare data for submission
      const submissionData = {
        ...formData,
        completed_at: new Date().toISOString(),
        profile_completion_percentage: 100
      }

      console.log('onSubmit', onSubmit)
      
      if (onSubmit) {
  await onSubmit(submissionData)
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

  return (

    <div className="profile-form-container">
      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <Progress 
          percent={progress} 
          status="active"
          strokeColor="#1890ff"
          style={{ marginBottom: '8px' }}
        />
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
          {t('STEP_PROGRESS', 'Step {{current}} of {{total}}', { 
            current: currentStep + 1, 
            total: steps.length 
          })}
        </div>
      </div>

      {/* Steps Navigation */}
      <Card style={{ marginBottom: '24px' }}>
        <Steps current={currentStep} size="small" responsive={false}>
          {steps.map((step, index) => (
            <Step
              key={step.key}
              title={step.title}
              description={currentStep === index ? t(`STEP_${index + 1}_DESCRIPTION`, step.title) : ''}
              icon={currentStep > index ? <CheckOutlined /> : undefined}
            />
          ))}
        </Steps>
      </Card>

      {/* Form Content */}
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#1890ff' }}>
            {steps[currentStep].title}
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            {t(`STEP_${currentStep + 1}_DESCRIPTION`, `Complete step ${currentStep + 1} of your health profile`)}
          </p>
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
          {formData && CurrentStepComponent ? (
            <CurrentStepComponent
              formData={formData}
              setFormData={setFormData}
              form={form}
              userType={userType}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Loading form...
            </div>
          )}
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

          {/* Center - Save Draft button */}
          <div>
            <Button
              onClick={saveDraft}
              loading={saving}
              icon={<SaveOutlined />}
              style={{ margin: '0 16px' }}
            >
              {t('SAVE_DRAFT', 'Save Draft')}
            </Button>
          </div>

          {/* Right side - Next/Submit button */}
          <div>
            {currentStep < steps.length - 1 ? (
              <Button 
                type="primary" 
                onClick={() => {
                //   alert('Next button works!')
                //   console.log('Next button clicked!')
                  next()
                }}
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
            <p>{t('REVIEW_MESSAGE', 'Please review your information before submitting. You can always edit your profile later.')}</p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>{t('BASIC_INFO_COMPLETED', 'Basic information completed')}</li>
              <li>{t('PHYSICAL_INFO_COMPLETED', 'Physical information completed')}</li>
              <li>{t('MEDICAL_HISTORY_COMPLETED', 'Medical history completed')}</li>
              <li>{t('LIFESTYLE_INFO_COMPLETED', 'Lifestyle information completed')}</li>
              <li>{t('PREFERENCES_COMPLETED', 'Preferences and consents completed')}</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ProfileForm