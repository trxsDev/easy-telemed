import React, { useEffect } from 'react'
import { Form, InputNumber, Row, Col, Card, Alert, Statistic } from 'antd'
import { useTranslation } from 'react-i18next'

function PhysicalInformationStep({ formData, setFormData, form }) {
  const { t } = useTranslation()

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Calculate BMI
  const calculateBMI = () => {
    if (formData.height_cm && formData.weight_kg) {
      const heightInMeters = formData.height_cm / 100
      const bmi = formData.weight_kg / (heightInMeters * heightInMeters)
      return Math.round(bmi * 100) / 100
    }
    return null
  }

  const getBMICategory = (bmi) => {
    if (!bmi) return null
    if (bmi < 18.5) return { category: 'Underweight', color: '#1890ff' }
    if (bmi < 25) return { category: 'Normal weight', color: '#52c41a' }
    if (bmi < 30) return { category: 'Overweight', color: '#faad14' }
    return { category: 'Obese', color: '#ff4d4f' }
  }

  const bmi = calculateBMI()
  const bmiInfo = getBMICategory(bmi)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Card title={t('PHYSICAL_MEASUREMENTS', 'Physical Measurements')}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="height_cm"
              label={t('HEIGHT', 'Height (cm)')}
              rules={[
                { required: true, message: t('HEIGHT_REQUIRED', 'Height is required') },
                { type: 'number', min: 50, max: 250, message: t('HEIGHT_RANGE', 'Height must be between 50-250 cm') }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }}
                placeholder={t('ENTER_HEIGHT', 'Enter your height in cm')}
                value={formData.height_cm}
                onChange={(value) => handleFieldChange('height_cm', value)}
                min={50}
                max={250}
                precision={1}
                formatter={value => `${value} cm`}
                parser={value => value.replace(' cm', '')}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item 
              name="weight_kg"
              label={t('WEIGHT', 'Weight (kg)')}
              rules={[
                { required: true, message: t('WEIGHT_REQUIRED', 'Weight is required') },
                { type: 'number', min: 10, max: 300, message: t('WEIGHT_RANGE', 'Weight must be between 10-300 kg') }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }}
                placeholder={t('ENTER_WEIGHT', 'Enter your weight in kg')}
                value={formData.weight_kg}
                onChange={(value) => handleFieldChange('weight_kg', value)}
                min={10}
                max={300}
                precision={1}
                formatter={value => `${value} kg`}
                parser={value => value.replace(' kg', '')}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* BMI Display */}
        {bmi && (
          <div style={{ marginTop: '24px' }}>
            <Alert
              message={t('BMI_CALCULATION', 'BMI Calculation')}
              description={
                <div style={{ marginTop: '16px' }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                      <Statistic
                        title={t('BMI_VALUE', 'BMI')}
                        value={bmi}
                        precision={1}
                        valueStyle={{ color: bmiInfo?.color }}
                      />
                    </Col>
                    <Col xs={24} sm={16}>
                      <Statistic
                        title={t('BMI_CATEGORY', 'Category')}
                        value={bmiInfo?.category}
                        valueStyle={{ color: bmiInfo?.color, fontSize: '16px' }}
                      />
                    </Col>
                  </Row>
                  
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                    <div><strong>{t('BMI_REFERENCE', 'BMI Reference:')}</strong></div>
                    <div>• {t('BMI_UNDERWEIGHT', 'Underweight')}: &lt; 18.5</div>
                    <div>• {t('BMI_NORMAL', 'Normal weight')}: 18.5 - 24.9</div>
                    <div>• {t('BMI_OVERWEIGHT', 'Overweight')}: 25.0 - 29.9</div>
                    <div>• {t('BMI_OBESE', 'Obese')}: ≥ 30.0</div>
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        )}

        {/* Health Tips */}
        <div style={{ marginTop: '24px' }}>
          <Card size="small" title={t('HEALTH_TIPS', 'Health Tips')}>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p>{t('HEALTH_TIP_1', '• Maintain a balanced diet with plenty of fruits and vegetables')}</p>
              <p>{t('HEALTH_TIP_2', '• Engage in regular physical activity for at least 30 minutes daily')}</p>
              <p>{t('HEALTH_TIP_3', '• Stay hydrated by drinking adequate water throughout the day')}</p>
              <p>{t('HEALTH_TIP_4', '• Get sufficient sleep (7-9 hours for adults)')}</p>
              <p>{t('HEALTH_TIP_5', '• Regular health check-ups are important for preventive care')}</p>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  )
}

export default PhysicalInformationStep