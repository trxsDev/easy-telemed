import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Button, 
  Card, 
  message, 
  Steps,
  Progress
} from 'antd'
import { 
  SaveOutlined,
  LeftOutlined,
  RightOutlined,
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  
} from '@ant-design/icons'
import dayjs from 'dayjs'

// Import individual step components
import BasicInformationStep from './steps/BasicInformationStep'
import AddressInformationStep from './steps/AddressInformationStep'
import EmergencyContactStep from './steps/EmergencyContactStep'
import PhysicalInformationStep from './steps/PhysicalInformationStep'
import MedicalInformationStep from './steps/MedicalInformationStep'
import PregnancyInformationStep from './steps/PregnancyInformationStep'
import LifestyleInformationStep from './steps/LifestyleInformationStep'
import PreferencesStep from './steps/PreferencesStep'
import ConsentStep from './steps/ConsentStep'

const { Step } = Steps

function MultiStepPatientForm({ initialData = {}, onSubmit, loading = false, mode = 'create' }) {
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})

  // Define form steps with their configurations
  const steps = [
    {
      title: 'Basic Info',
      icon: <UserOutlined />,
      description: 'Personal information',
      component: BasicInformationStep,
      fields: ['fname', 'lname', 'dob', 'sex_at_birth', 'language_pref', 'phone']
    },
    {
      title: 'Address',
      icon: <HomeOutlined />,
      description: 'Address information',
      component: AddressInformationStep,
      fields: ['address']
    },
    {
      title: 'Emergency Contact',
      icon: <PhoneOutlined />,
      description: 'Emergency contact details',
      component: EmergencyContactStep,
      fields: ['emergency_contact']
    },
    {
      title: 'Physical Info',
      icon: <HeartOutlined />,
      description: 'Height, weight, BMI',
      component: PhysicalInformationStep,
      fields: ['height_cm', 'weight_kg']
    },
    {
      title: 'Medical Info',
      icon: <MedicineBoxOutlined />,
      description: 'Medical history & conditions',
      component: MedicalInformationStep,
      fields: ['allergies', 'conditions', 'medications', 'surgical_history', 'immunizations']
    },
    {
      title: 'Pregnancy & Lifestyle',
      icon: <HeartOutlined />,
      description: 'Pregnancy, smoking & alcohol',
      component: PregnancyInformationStep,
      fields: ['is_pregnant', 'gestational_weeks', 'lmp_date']
    },
    {
      title: 'Lifestyle',
      icon: <HeartOutlined />,
      description: 'Smoking & alcohol',
      component: LifestyleInformationStep,
      fields: ['smoking_status', 'alcohol_use']
    },
    {
      title: 'Preferences',
      icon: <SettingOutlined />,
      description: 'Settings & preferences',
      component: PreferencesStep,
      fields: ['preferred_pharmacy', 'preferred_contact_method', 'insurance', 'devices', 'avatar_path']
    },
    {
      title: 'Consent',
      icon: <SafetyCertificateOutlined />,
      description: 'Privacy & consent',
      component: ConsentStep,
      fields: ['consent_telemed', 'consent_privacy']
    }
  ]

  // Initialize form with data
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      // Convert dates to dayjs objects for form fields
      const formValues = {
        ...initialData,
        dob: initialData.dob ? dayjs(initialData.dob) : null,
        lmp_date: initialData.lmp_date ? dayjs(initialData.lmp_date) : null
      }
      form.setFieldsValue(formValues)
      setFormData(formValues)
    }
  }, [initialData, form])

  // Handle next step
  const handleNext = async () => {
    try {
      const currentStepFields = steps[currentStep].fields
      
      // Validate current step fields - only validate required ones
      if (currentStepFields && currentStepFields.length > 0) {
        try {
          await form.validateFields(currentStepFields)
        } catch (validationError) {
          console.log('Validation error:', validationError)
          // Check if these are truly required fields
          const requiredFields = ['fname', 'lname', 'dob', 'sex_at_birth', 'phone', 'consent_telemed', 'consent_privacy']
          const failedRequiredFields = currentStepFields.filter(field => 
            requiredFields.includes(field) && validationError.errorFields?.some(ef => ef.name[0] === field)
          )
          
          if (failedRequiredFields.length > 0) {
            throw validationError
          }
          // If only optional fields failed, continue
        }
      }
      
      // Get current form values and merge with existing data
      const values = form.getFieldsValue()
      const updatedData = { ...formData, ...values }
      setFormData(updatedData)
      
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    } catch (error) {
      console.error('Validation failed:', error)
      message.error('Please fill in all required fields before proceeding')
    }
  }

  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Get current form values
      const values = form.getFieldsValue()
      
      // Check required consents
      if (!values.consent_telemed) {
        message.error('Telemedicine consent is required to create your profile')
        return
      }
      
      if (values.consent_privacy === false) {
        message.error('Privacy policy consent is required')
        return
      }
      
      // Merge all form data
      const finalData = { ...formData, ...values }
      
      // Process form data to match schema
      const processedData = processFormData(finalData)
      
      console.log('Final processed data:', processedData) // Debug log
      
      if (onSubmit) {
        await onSubmit(processedData)
        message.success(mode === 'create' ? 'Profile created successfully!' : 'Profile updated successfully!')
      }
    } catch (error) {
      console.error('Submit error:', error)
      message.error('Failed to save profile. Please try again.')
    }
  }

  // Process form data to match database schema
  const processFormData = (values) => {
    console.log('Processing form data:', values) // Debug log
    
    // Only include fields that exist in the database schema
    const processedData = {}
    
    // Basic fields - only add if not null/undefined
    if (values.fname) processedData.fname = values.fname
    if (values.lname) processedData.lname = values.lname
    if (values.dob) processedData.dob = values.dob.format('YYYY-MM-DD')
    if (values.sex_at_birth) processedData.sex_at_birth = values.sex_at_birth
    processedData.language_pref = values.language_pref || 'th'
    if (values.phone) processedData.phone = values.phone
    
    // JSONB fields - only add if not empty
    if (values.address && Object.keys(values.address).length > 0) {
      processedData.address = values.address
    }
    if (values.emergency_contact && Object.keys(values.emergency_contact).length > 0) {
      processedData.emergency_contact = values.emergency_contact
    }
    
    // JSONB arrays - only add if not empty
    const allergies = processArrayField(values.allergies)
    if (allergies.length > 0) processedData.allergies = allergies
    
    const conditions = processArrayField(values.conditions)
    if (conditions.length > 0) processedData.conditions = conditions
    
    const medications = processArrayField(values.medications)
    if (medications.length > 0) processedData.medications = medications
    
    const surgicalHistory = processArrayField(values.surgical_history)
    if (surgicalHistory.length > 0) processedData.surgical_history = surgicalHistory
    
    const immunizations = processArrayField(values.immunizations)
    if (immunizations.length > 0) processedData.immunizations = immunizations
    
    const insurance = processArrayField(values.insurance)
    if (insurance.length > 0) processedData.insurance = insurance
    
    const devices = processArrayField(values.devices)
    if (devices.length > 0) processedData.devices = devices
    
    // Preferred pharmacy
    if (values.preferred_pharmacy) {
      processedData.preferred_pharmacy = processJSONField(values.preferred_pharmacy)
    }
    
    // Physical measurements
    if (values.height_cm) processedData.height_cm = Number(values.height_cm)
    if (values.weight_kg) processedData.weight_kg = Number(values.weight_kg)
    
    // Pregnancy information
    if (values.is_pregnant !== undefined) processedData.is_pregnant = Boolean(values.is_pregnant)
    if (values.gestational_weeks) processedData.gestational_weeks = Number(values.gestational_weeks)
    if (values.lmp_date) processedData.lmp_date = values.lmp_date.format('YYYY-MM-DD')
    
    // Lifestyle
    if (values.smoking_status) processedData.smoking_status = values.smoking_status
    if (values.alcohol_use) processedData.alcohol_use = values.alcohol_use
    
    // Preferences
    if (values.preferred_contact_method) processedData.preferred_contact_method = values.preferred_contact_method
    if (values.avatar_path) processedData.avatar_path = values.avatar_path
    
    // Required consents - always include
    processedData.consent_telemed = Boolean(values.consent_telemed)
    processedData.consent_privacy = Boolean(values.consent_privacy !== false) // default true
    
    console.log('Processed data:', processedData) // Debug log
    return processedData
  }

  // Helper function to process array fields
  const processArrayField = (value) => {
    if (!value) return []
    if (typeof value === 'string') {
      try {
        // Try to parse as JSON first
        return JSON.parse(value)
      } catch {
        // If not JSON, split by comma or newline and clean up
        return value
          .split(/[,\n]/)
          .map(item => item.trim())
          .filter(item => item.length > 0)
      }
    }
    return Array.isArray(value) ? value : []
  }

  // Helper function to process JSON fields
  const processJSONField = (value) => {
    if (!value) return {}
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        // If not valid JSON, try to create a simple object
        return { description: value }
      }
    }
    return typeof value === 'object' ? value : {}
  }

  // Get current step component
  const CurrentStepComponent = steps[currentStep].component

  // Calculate progress percentage
  const progressPercent = ((currentStep + 1) / steps.length) * 100

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {/* Progress indicator */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2>{mode === 'create' ? 'Create Patient Profile' : 'Edit Patient Profile'}</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].description}
          </p>
        </div>
        
        <Progress 
          percent={progressPercent} 
          showInfo={false}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          style={{ marginBottom: '16px' }}
        />
        
        <Steps 
          current={currentStep} 
          size="small"
          items={steps.map((step, idx) => ({
            // title: step.title,
            icon: step.icon,
            // description: step.description
          }))}
        />
      </Card>

      {/* Form content */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            language_pref: 'th',
            consent_privacy: true
          }}
        >
          <CurrentStepComponent form={form} />

          {/* Navigation buttons */}
          <div style={{ 
            marginTop: '32px', 
            textAlign: 'center',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '24px'
          }}>
            <Button 
              style={{ marginRight: '8px' }}
              onClick={handlePrev}
              disabled={currentStep === 0}
              icon={<LeftOutlined />}
            >
              Previous
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button 
                type="primary" 
                onClick={handleNext}
                icon={<RightOutlined />}
              >
                Next
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
                style={{ minWidth: '150px' }}
              >
                {mode === 'create' ? 'Create Profile' : 'Update Profile'}
              </Button>
            )}
          </div>
        </Form>
      </Card>

      {/* Step summary (optional) */}
      <Card size="small" style={{ marginTop: '16px', background: '#f9f9f9' }}>
        <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
          <strong>Tip:</strong> You can navigate back to previous steps to review or edit your information
        </div>
      </Card>
    </div>
  )
}

export default MultiStepPatientForm