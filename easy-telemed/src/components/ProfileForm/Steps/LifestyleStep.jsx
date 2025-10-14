import React from 'react'
import { Form, Select, Input, Radio, Card, Row, Col, Checkbox, InputNumber } from 'antd'
import { useTranslation } from 'react-i18next'
import { 
  SMOKING_STATUS_OPTIONS,
  ALCOHOL_CONSUMPTION_OPTIONS,
  EXERCISE_FREQUENCY_OPTIONS,
  STRESS_LEVEL_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  DIET_TYPE_OPTIONS
} from '../../../constants/profileFormConstants'

const { Option } = Select
const { TextArea } = Input

function LifestyleStep({ formData, setFormData, form }) {
  const { t } = useTranslation()

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSleepChange = (field, value) => {
    const newSleepData = { ...formData.sleep_hours_info, [field]: value }
    setFormData(prev => ({ ...prev, sleep_hours_info: newSleepData }))
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Smoking Information */}
      <Card title={t('SMOKING_INFORMATION', 'Smoking Information')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="smoking_status"
          label={t('SMOKING_STATUS', 'Smoking Status')}
        >
          <Radio.Group
            value={formData.smoking_status}
            onChange={(e) => handleChange('smoking_status', e.target.value)}
          >
            {SMOKING_STATUS_OPTIONS.map(option => (
              <Radio key={option.value} value={option.value}>
                {t(option.label, option.label)}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {formData.smoking_status === 'current' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="cigarettes_per_day"
                label={t('CIGARETTES_PER_DAY', 'Cigarettes per day')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={t('ENTER_NUMBER', 'Enter number')}
                  value={formData.cigarettes_per_day}
                  onChange={(value) => handleChange('cigarettes_per_day', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="smoking_years"
                label={t('YEARS_OF_SMOKING', 'Years of smoking')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={t('ENTER_YEARS', 'Enter years')}
                  value={formData.smoking_years}
                  onChange={(value) => handleChange('smoking_years', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {formData.smoking_status === 'former' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="quit_smoking_date"
                label={t('QUIT_SMOKING_DATE', 'When did you quit?')}
              >
                <Input
                  placeholder={t('ENTER_QUIT_DATE', 'e.g., 2 years ago, January 2022')}
                  value={formData.quit_smoking_date}
                  onChange={(e) => handleChange('quit_smoking_date', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="smoking_years"
                label={t('YEARS_SMOKED', 'Years smoked')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={t('ENTER_YEARS', 'Enter years')}
                  value={formData.smoking_years}
                  onChange={(value) => handleChange('smoking_years', value)}
                  min={0}
                  max={100}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Card>

      {/* Alcohol Consumption */}
      <Card title={t('ALCOHOL_CONSUMPTION', 'Alcohol Consumption')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="alcohol_consumption"
          label={t('ALCOHOL_CONSUMPTION_FREQUENCY', 'How often do you drink alcohol?')}
        >
          <Select
            placeholder={t('SELECT_FREQUENCY', 'Select frequency')}
            value={formData.alcohol_consumption}
            onChange={(value) => handleChange('alcohol_consumption', value)}
          >
            {ALCOHOL_CONSUMPTION_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {t(option.label, option.label)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {formData.alcohol_consumption && 
         formData.alcohol_consumption !== 'never' && 
         formData.alcohol_consumption !== 'rarely' && (
          <Form.Item 
            name="drinks_per_week"
            label={t('DRINKS_PER_WEEK', 'Typical drinks per week')}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={t('ENTER_NUMBER_DRINKS', 'Enter number of drinks')}
              value={formData.drinks_per_week}
              onChange={(value) => handleChange('drinks_per_week', value)}
              min={0}
              max={100}
            />
          </Form.Item>
        )}
      </Card>

      {/* Exercise and Physical Activity */}
      <Card title={t('EXERCISE_PHYSICAL_ACTIVITY', 'Exercise & Physical Activity')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="exercise_frequency"
          label={t('EXERCISE_FREQUENCY', 'How often do you exercise?')}
        >
          <Select
            placeholder={t('SELECT_FREQUENCY', 'Select frequency')}
            value={formData.exercise_frequency}
            onChange={(value) => handleChange('exercise_frequency', value)}
          >
            {EXERCISE_FREQUENCY_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {t(option.label, option.label)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="exercise_types"
          label={t('EXERCISE_TYPES', 'Types of exercise/activities')}
        >
          <Checkbox.Group
            value={formData.exercise_types}
            onChange={(value) => handleChange('exercise_types', value)}
          >
            <Row>
              <Col span={8}>
                <Checkbox value="walking">{t('WALKING', 'Walking')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="running">{t('RUNNING', 'Running')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="cycling">{t('CYCLING', 'Cycling')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="swimming">{t('SWIMMING', 'Swimming')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="gym">{t('GYM_WEIGHTS', 'Gym/Weights')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="yoga">{t('YOGA_PILATES', 'Yoga/Pilates')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="sports">{t('SPORTS', 'Sports')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="dancing">{t('DANCING', 'Dancing')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="other">{t('OTHER', 'Other')}</Checkbox>
              </Col>
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item 
          name="exercise_duration"
          label={t('TYPICAL_EXERCISE_DURATION', 'Typical exercise duration (minutes)')}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={t('ENTER_MINUTES', 'Enter minutes per session')}
            value={formData.exercise_duration}
            onChange={(value) => handleChange('exercise_duration', value)}
            min={0}
            max={480}
          />
        </Form.Item>
      </Card>

      {/* Diet and Nutrition */}
      <Card title={t('DIET_NUTRITION', 'Diet & Nutrition')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="diet_type"
          label={t('DIET_TYPE', 'Diet type')}
        >
          <Select
            placeholder={t('SELECT_DIET_TYPE', 'Select your diet type')}
            value={formData.diet_type}
            onChange={(value) => handleChange('diet_type', value)}
          >
            {DIET_TYPE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {t(option.label, option.label)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="dietary_restrictions"
          label={t('DIETARY_RESTRICTIONS', 'Dietary restrictions or allergies')}
        >
          <TextArea
            placeholder={t('DESCRIBE_DIETARY_RESTRICTIONS', 'Describe any dietary restrictions, food allergies, or special dietary needs')}
            value={formData.dietary_restrictions}
            onChange={(e) => handleChange('dietary_restrictions', e.target.value)}
            rows={3}
          />
        </Form.Item>
      </Card>

      {/* Sleep Patterns */}
      <Card title={t('SLEEP_PATTERNS', 'Sleep Patterns')} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="average_sleep_hours"
              label={t('AVERAGE_SLEEP_HOURS', 'Average sleep hours per night')}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={t('ENTER_HOURS', 'Enter hours')}
                value={formData.sleep_hours_info?.average}
                onChange={(value) => handleSleepChange('average', value)}
                min={0}
                max={24}
                step={0.5}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="sleep_quality"
              label={t('SLEEP_QUALITY', 'Sleep quality')}
            >
              <Select
                placeholder={t('SELECT_QUALITY', 'Select quality')}
                value={formData.sleep_quality}
                onChange={(value) => handleChange('sleep_quality', value)}
              >
                {SLEEP_QUALITY_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {t(option.label, option.label)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="bedtime"
              label={t('USUAL_BEDTIME', 'Usual bedtime')}
            >
              <Input
                placeholder={t('ENTER_TIME', 'e.g., 10:30 PM')}
                value={formData.sleep_hours_info?.bedtime}
                onChange={(e) => handleSleepChange('bedtime', e.target.value)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item 
              name="wake_time"
              label={t('USUAL_WAKE_TIME', 'Usual wake time')}
            >
              <Input
                placeholder={t('ENTER_TIME', 'e.g., 6:30 AM')}
                value={formData.sleep_hours_info?.wake_time}
                onChange={(e) => handleSleepChange('wake_time', e.target.value)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item 
          name="sleep_issues"
          label={t('SLEEP_ISSUES', 'Sleep issues')}
        >
          <Checkbox.Group
            value={formData.sleep_issues}
            onChange={(value) => handleChange('sleep_issues', value)}
          >
            <Row>
              <Col span={12}>
                <Checkbox value="difficulty_falling_asleep">
                  {t('DIFFICULTY_FALLING_ASLEEP', 'Difficulty falling asleep')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="frequent_waking">
                  {t('FREQUENT_WAKING', 'Frequent waking')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="early_waking">
                  {t('EARLY_WAKING', 'Early morning waking')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="snoring">
                  {t('SNORING', 'Snoring')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="sleep_apnea">
                  {t('SLEEP_APNEA', 'Sleep apnea')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="restless_legs">
                  {t('RESTLESS_LEGS', 'Restless legs')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="insomnia">
                  {t('INSOMNIA', 'Insomnia')}
                </Checkbox>
              </Col>
              <Col span={12}>
                <Checkbox value="none">
                  {t('NO_SLEEP_ISSUES', 'No sleep issues')}
                </Checkbox>
              </Col>
            </Row>
          </Checkbox.Group>
        </Form.Item>
      </Card>

      {/* Stress and Mental Health */}
      <Card title={t('STRESS_MENTAL_HEALTH', 'Stress & Mental Health')}>
        <Form.Item 
          name="stress_level"
          label={t('CURRENT_STRESS_LEVEL', 'Current stress level')}
        >
          <Select
            placeholder={t('SELECT_STRESS_LEVEL', 'Select your stress level')}
            value={formData.stress_level}
            onChange={(value) => handleChange('stress_level', value)}
          >
            {STRESS_LEVEL_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {t(option.label, option.label)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="stress_factors"
          label={t('MAIN_STRESS_FACTORS', 'Main stress factors')}
        >
          <Checkbox.Group
            value={formData.stress_factors}
            onChange={(value) => handleChange('stress_factors', value)}
          >
            <Row>
              <Col span={8}>
                <Checkbox value="work">{t('WORK', 'Work')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="family">{t('FAMILY', 'Family')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="financial">{t('FINANCIAL', 'Financial')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="health">{t('HEALTH', 'Health')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="relationships">{t('RELATIONSHIPS', 'Relationships')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="studies">{t('STUDIES', 'Studies')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="social">{t('SOCIAL', 'Social')}</Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox value="other">{t('OTHER', 'Other')}</Checkbox>
              </Col>
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item 
          name="coping_mechanisms"
          label={t('COPING_MECHANISMS', 'Stress coping mechanisms')}
        >
          <TextArea
            placeholder={t('DESCRIBE_COPING_METHODS', 'Describe how you typically cope with stress')}
            value={formData.coping_mechanisms}
            onChange={(e) => handleChange('coping_mechanisms', e.target.value)}
            rows={3}
          />
        </Form.Item>

        <Form.Item 
          name="mental_health_history"
          label={t('MENTAL_HEALTH_HISTORY', 'Mental health history')}
        >
          <TextArea
            placeholder={t('MENTAL_HEALTH_HISTORY_PLACEHOLDER', 'Any history of anxiety, depression, or other mental health conditions (optional)')}
            value={formData.mental_health_history}
            onChange={(e) => handleChange('mental_health_history', e.target.value)}
            rows={3}
          />
        </Form.Item>
      </Card>
    </div>
  )
}

export default LifestyleStep