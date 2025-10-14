import React, { useState } from 'react'
import { 
  Form, 
  Select, 
  Input, 
  DatePicker, 
  Row, 
  Col, 
  Card, 
  Button, 
  List, 
  Tag, 
  Space,
  Modal,
  Checkbox,
  Radio,
  InputNumber
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { 
  COMMON_CONDITIONS, 
  COMMON_ALLERGIES, 
  ALLERGY_REACTIONS,
  MEDICATION_FREQUENCY 
} from '../../../constants/profileFormConstants'

const { Option } = Select
const { TextArea } = Input

function MedicalHistoryStep({ formData, setFormData, form }) {
  const { t } = useTranslation()
  const [modalVisible, setModalVisible] = useState({
    allergy: false,
    medication: false,
    surgery: false,
    immunization: false
  })
  const [editingItem, setEditingItem] = useState(null)
  const [tempData, setTempData] = useState({})

  // Handle adding/editing allergies
  const handleAllergyModal = (item = null) => {
    setEditingItem(item)
    setTempData(item || { name: '', reaction: '', severity: 'mild' })
    setModalVisible(prev => ({ ...prev, allergy: true }))
  }

  const saveAllergy = () => {
    const allergies = [...formData.allergies]
    if (editingItem) {
      const index = allergies.findIndex(a => a.id === editingItem.id)
      allergies[index] = { ...tempData, id: editingItem.id }
    } else {
      allergies.push({ ...tempData, id: Date.now() })
    }
    setFormData(prev => ({ ...prev, allergies }))
    setModalVisible(prev => ({ ...prev, allergy: false }))
    setTempData({})
  }

  // Handle adding/editing medications
  const handleMedicationModal = (item = null) => {
    setEditingItem(item)
    setTempData(item || { name: '', dose: '', frequency: '', notes: '' })
    setModalVisible(prev => ({ ...prev, medication: true }))
  }

  const saveMedication = () => {
    const medications = [...formData.medications]
    if (editingItem) {
      const index = medications.findIndex(m => m.id === editingItem.id)
      medications[index] = { ...tempData, id: editingItem.id }
    } else {
      medications.push({ ...tempData, id: Date.now() })
    }
    setFormData(prev => ({ ...prev, medications }))
    setModalVisible(prev => ({ ...prev, medication: false }))
    setTempData({})
  }

  // Handle adding/editing surgical history
  const handleSurgeryModal = (item = null) => {
    setEditingItem(item)
    setTempData(item || { name: '', date: null, notes: '' })
    setModalVisible(prev => ({ ...prev, surgery: true }))
  }

  const saveSurgery = () => {
    const surgical_history = [...formData.surgical_history]
    if (editingItem) {
      const index = surgical_history.findIndex(s => s.id === editingItem.id)
      surgical_history[index] = { ...tempData, id: editingItem.id }
    } else {
      surgical_history.push({ ...tempData, id: Date.now() })
    }
    setFormData(prev => ({ ...prev, surgical_history }))
    setModalVisible(prev => ({ ...prev, surgery: false }))
    setTempData({})
  }

  // Handle adding/editing immunizations
  const handleImmunizationModal = (item = null) => {
    setEditingItem(item)
    setTempData(item || { vaccine: '', date: null })
    setModalVisible(prev => ({ ...prev, immunization: true }))
  }

  const saveImmunization = () => {
    const immunizations = [...formData.immunizations]
    if (editingItem) {
      const index = immunizations.findIndex(i => i.id === editingItem.id)
      immunizations[index] = { ...tempData, id: editingItem.id }
    } else {
      immunizations.push({ ...tempData, id: Date.now() })
    }
    setFormData(prev => ({ ...prev, immunizations }))
    setModalVisible(prev => ({ ...prev, immunization: false }))
    setTempData({})
  }

  // Delete functions
  const deleteItem = (type, id) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }))
  }

  // Handle pregnancy information (only for female patients)
  const handlePregnancyChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const showPregnancySection = formData.sex_at_birth === 'female'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Medical Conditions */}
      <Card title={t('MEDICAL_CONDITIONS', 'Medical Conditions')} style={{ marginBottom: '24px' }}>
        <Form.Item 
          name="conditions"
          label={t('CURRENT_CONDITIONS', 'Current Medical Conditions')}
        >
          <Select
            mode="multiple"
            placeholder={t('SELECT_CONDITIONS', 'Select your medical conditions')}
            value={formData.conditions}
            onChange={(value) => setFormData(prev => ({ ...prev, conditions: value }))}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {COMMON_CONDITIONS.map(condition => (
              <Option key={condition} value={condition}>
                {condition}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Card>

      {/* Allergies */}
      <Card 
        title={t('ALLERGIES', 'Allergies')}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleAllergyModal()}
          >
            {t('ADD_ALLERGY', 'Add Allergy')}
          </Button>
        }
        style={{ marginBottom: '24px' }}
      >
        <List
          dataSource={formData.allergies}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => handleAllergyModal(item)}
                  size="small"
                />,
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={() => deleteItem('allergies', item.id)}
                  size="small"
                  danger
                />
              ]}
            >
              <div>
                <strong>{item.name}</strong>
                <div>
                  <Tag color={item.severity === 'severe' ? 'red' : item.severity === 'moderate' ? 'orange' : 'blue'}>
                    {item.severity}
                  </Tag>
                  {item.reaction}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: t('NO_ALLERGIES', 'No allergies recorded') }}
        />
      </Card>

      {/* Current Medications */}
      <Card 
        title={t('CURRENT_MEDICATIONS', 'Current Medications')}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleMedicationModal()}
          >
            {t('ADD_MEDICATION', 'Add Medication')}
          </Button>
        }
        style={{ marginBottom: '24px' }}
      >
        <List
          dataSource={formData.medications}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => handleMedicationModal(item)}
                  size="small"
                />,
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={() => deleteItem('medications', item.id)}
                  size="small"
                  danger
                />
              ]}
            >
              <div>
                <strong>{item.name}</strong> - {item.dose}
                <div style={{ color: '#666', fontSize: '12px' }}>
                  {item.frequency} {item.notes && `• ${item.notes}`}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: t('NO_MEDICATIONS', 'No medications recorded') }}
        />
      </Card>

      {/* Surgical History */}
      <Card 
        title={t('SURGICAL_HISTORY', 'Surgical History')}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleSurgeryModal()}
          >
            {t('ADD_SURGERY', 'Add Surgery')}
          </Button>
        }
        style={{ marginBottom: '24px' }}
      >
        <List
          dataSource={formData.surgical_history}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => handleSurgeryModal(item)}
                  size="small"
                />,
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={() => deleteItem('surgical_history', item.id)}
                  size="small"
                  danger
                />
              ]}
            >
              <div>
                <strong>{item.name}</strong>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  {item.date && new Date(item.date).toLocaleDateString()}
                  {item.notes && ` • ${item.notes}`}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: t('NO_SURGERIES', 'No surgeries recorded') }}
        />
      </Card>

      {/* Immunizations */}
      <Card 
        title={t('IMMUNIZATIONS', 'Immunizations')}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleImmunizationModal()}
          >
            {t('ADD_IMMUNIZATION', 'Add Immunization')}
          </Button>
        }
        style={{ marginBottom: showPregnancySection ? '24px' : '0' }}
      >
        <List
          dataSource={formData.immunizations}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => handleImmunizationModal(item)}
                  size="small"
                />,
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={() => deleteItem('immunizations', item.id)}
                  size="small"
                  danger
                />
              ]}
            >
              <div>
                <strong>{item.vaccine}</strong>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  {item.date && new Date(item.date).toLocaleDateString()}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: t('NO_IMMUNIZATIONS', 'No immunizations recorded') }}
        />
      </Card>

      {/* Pregnancy Information (only for female patients) */}
      {showPregnancySection && (
        <Card title={t('PREGNANCY_INFORMATION', 'Pregnancy Information')}>
          <Form.Item name="is_pregnant">
            <Checkbox
              checked={formData.is_pregnant}
              onChange={(e) => handlePregnancyChange('is_pregnant', e.target.checked)}
            >
              {t('CURRENTLY_PREGNANT', 'Currently pregnant')}
            </Checkbox>
          </Form.Item>

          {formData.is_pregnant && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="gestational_weeks"
                  label={t('GESTATIONAL_WEEKS', 'Gestational Weeks')}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder={t('ENTER_WEEKS', 'Enter weeks')}
                    value={formData.gestational_weeks}
                    onChange={(value) => handlePregnancyChange('gestational_weeks', value)}
                    min={0}
                    max={42}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="lmp_date"
                  label={t('LAST_MENSTRUAL_PERIOD', 'Last Menstrual Period')}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder={t('SELECT_DATE', 'Select date')}
                    value={formData.lmp_date}
                    onChange={(date) => handlePregnancyChange('lmp_date', date)}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Card>
      )}

      {/* Modals */}
      {/* Allergy Modal */}
      <Modal
        title={editingItem ? t('EDIT_ALLERGY', 'Edit Allergy') : t('ADD_ALLERGY', 'Add Allergy')}
        open={modalVisible.allergy}
        onOk={saveAllergy}
        onCancel={() => setModalVisible(prev => ({ ...prev, allergy: false }))}
      >
        <Form layout="vertical">
          <Form.Item label={t('ALLERGEN', 'Allergen')}>
            <Select
              placeholder={t('SELECT_ALLERGEN', 'Select or type allergen')}
              value={tempData.name}
              onChange={(value) => setTempData(prev => ({ ...prev, name: value }))}
              showSearch
              allowClear
            >
              {COMMON_ALLERGIES.map(allergy => (
                <Option key={allergy} value={allergy}>
                  {allergy}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label={t('REACTION', 'Reaction')}>
            <Select
              mode="multiple"
              placeholder={t('SELECT_REACTIONS', 'Select reactions')}
              value={tempData.reaction}
              onChange={(value) => setTempData(prev => ({ ...prev, reaction: value }))}
            >
              {ALLERGY_REACTIONS.map(reaction => (
                <Option key={reaction} value={reaction}>
                  {reaction}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label={t('SEVERITY', 'Severity')}>
            <Radio.Group
              value={tempData.severity}
              onChange={(e) => setTempData(prev => ({ ...prev, severity: e.target.value }))}
            >
              <Radio value="mild">{t('MILD', 'Mild')}</Radio>
              <Radio value="moderate">{t('MODERATE', 'Moderate')}</Radio>
              <Radio value="severe">{t('SEVERE', 'Severe')}</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* Medication Modal */}
      <Modal
        title={editingItem ? t('EDIT_MEDICATION', 'Edit Medication') : t('ADD_MEDICATION', 'Add Medication')}
        open={modalVisible.medication}
        onOk={saveMedication}
        onCancel={() => setModalVisible(prev => ({ ...prev, medication: false }))}
      >
        <Form layout="vertical">
          <Form.Item label={t('MEDICATION_NAME', 'Medication Name')}>
            <Input
              placeholder={t('ENTER_MEDICATION_NAME', 'Enter medication name')}
              value={tempData.name}
              onChange={(e) => setTempData(prev => ({ ...prev, name: e.target.value }))}
            />
          </Form.Item>
          
          <Form.Item label={t('DOSE', 'Dose')}>
            <Input
              placeholder={t('ENTER_DOSE', 'e.g., 500mg, 1 tablet')}
              value={tempData.dose}
              onChange={(e) => setTempData(prev => ({ ...prev, dose: e.target.value }))}
            />
          </Form.Item>
          
          <Form.Item label={t('FREQUENCY', 'Frequency')}>
            <Select
              placeholder={t('SELECT_FREQUENCY', 'Select frequency')}
              value={tempData.frequency}
              onChange={(value) => setTempData(prev => ({ ...prev, frequency: value }))}
            >
              {MEDICATION_FREQUENCY.map(freq => (
                <Option key={freq} value={freq}>
                  {freq}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label={t('NOTES', 'Notes')}>
            <TextArea
              placeholder={t('ADDITIONAL_NOTES', 'Additional notes (optional)')}
              value={tempData.notes}
              onChange={(e) => setTempData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Surgery Modal */}
      <Modal
        title={editingItem ? t('EDIT_SURGERY', 'Edit Surgery') : t('ADD_SURGERY', 'Add Surgery')}
        open={modalVisible.surgery}
        onOk={saveSurgery}
        onCancel={() => setModalVisible(prev => ({ ...prev, surgery: false }))}
      >
        <Form layout="vertical">
          <Form.Item label={t('SURGERY_NAME', 'Surgery Name')}>
            <Input
              placeholder={t('ENTER_SURGERY_NAME', 'Enter surgery name')}
              value={tempData.name}
              onChange={(e) => setTempData(prev => ({ ...prev, name: e.target.value }))}
            />
          </Form.Item>
          
          <Form.Item label={t('DATE', 'Date')}>
            <DatePicker
              style={{ width: '100%' }}
              placeholder={t('SELECT_DATE', 'Select date')}
              value={tempData.date}
              onChange={(date) => setTempData(prev => ({ ...prev, date }))}
            />
          </Form.Item>
          
          <Form.Item label={t('NOTES', 'Notes')}>
            <TextArea
              placeholder={t('ADDITIONAL_NOTES', 'Additional notes (optional)')}
              value={tempData.notes}
              onChange={(e) => setTempData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Immunization Modal */}
      <Modal
        title={editingItem ? t('EDIT_IMMUNIZATION', 'Edit Immunization') : t('ADD_IMMUNIZATION', 'Add Immunization')}
        open={modalVisible.immunization}
        onOk={saveImmunization}
        onCancel={() => setModalVisible(prev => ({ ...prev, immunization: false }))}
      >
        <Form layout="vertical">
          <Form.Item label={t('VACCINE_NAME', 'Vaccine Name')}>
            <Input
              placeholder={t('ENTER_VACCINE_NAME', 'Enter vaccine name')}
              value={tempData.vaccine}
              onChange={(e) => setTempData(prev => ({ ...prev, vaccine: e.target.value }))}
            />
          </Form.Item>
          
          <Form.Item label={t('DATE', 'Date')}>
            <DatePicker
              style={{ width: '100%' }}
              placeholder={t('SELECT_DATE', 'Select date')}
              value={tempData.date}
              onChange={(date) => setTempData(prev => ({ ...prev, date }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MedicalHistoryStep