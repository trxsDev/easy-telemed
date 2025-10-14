import React from 'react'
import { Form, Radio, Checkbox, Input, Space, Divider } from 'antd'
import { useTranslation } from 'react-i18next'

const { TextArea } = Input

function Screen({ formData, setFormData, onNext, onPrev }) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const handleFinish = (values) => {
    setFormData({ ...formData, ...values })
    onNext()
  }

  const symptoms = [
    { key: 'fever', label: t('FEVER', 'Fever') },
    { key: 'cough', label: t('COUGH', 'Cough') },
    { key: 'headache', label: t('HEADACHE', 'Headache') },
    { key: 'fatigue', label: t('FATIGUE', 'Fatigue') },
    { key: 'nausea', label: t('NAUSEA', 'Nausea') },
    { key: 'chest_pain', label: t('CHEST_PAIN', 'Chest Pain') },
  ]

  return (
    <div>
      <h3>{t('HEALTH_SCREENING', 'Health Screening')}</h3>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={formData}
      >
        <Form.Item
          name="symptoms"
          label={t('CURRENT_SYMPTOMS', 'Current Symptoms')}
        >
          <Checkbox.Group>
            <Space direction="vertical">
              {symptoms.map(symptom => (
                <Checkbox key={symptom.key} value={symptom.key}>
                  {symptom.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>

        <Divider />

        <Form.Item
          name="pain_level"
          label={t('PAIN_LEVEL', 'Pain Level (1-10)')}
        >
          <Radio.Group>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
              <Radio key={level} value={level}>{level}</Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="medical_history"
          label={t('MEDICAL_HISTORY', 'Medical History')}
        >
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="none">{t('NO_HISTORY', 'No medical history')}</Radio>
              <Radio value="diabetes">{t('DIABETES', 'Diabetes')}</Radio>
              <Radio value="hypertension">{t('HYPERTENSION', 'Hypertension')}</Radio>
              <Radio value="heart_disease">{t('HEART_DISEASE', 'Heart Disease')}</Radio>
              <Radio value="other">{t('OTHER', 'Other')}</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="current_medications"
          label={t('CURRENT_MEDICATIONS', 'Current Medications')}
        >
          <TextArea 
            rows={3} 
            placeholder={t('LIST_MEDICATIONS', 'List any medications you are currently taking')} 
          />
        </Form.Item>

        <Form.Item
          name="allergies"
          label={t('ALLERGIES', 'Allergies')}
        >
          <TextArea 
            rows={2} 
            placeholder={t('LIST_ALLERGIES', 'List any known allergies')} 
          />
        </Form.Item>

        <Form.Item
          name="additional_notes"
          label={t('ADDITIONAL_NOTES', 'Additional Notes')}
        >
          <TextArea 
            rows={3} 
            placeholder={t('ANY_ADDITIONAL_INFO', 'Any additional information you would like to share')} 
          />
        </Form.Item>
      </Form>
    </div>
  )
}

export default Screen