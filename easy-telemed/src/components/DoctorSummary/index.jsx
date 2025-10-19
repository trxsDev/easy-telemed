import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, Table, Space, Select, InputNumber, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { fetchDrugs, ensurePrescription, addPrescriptionItems, upsertDischargeSummary } from '../../services/consultationService';

function DoctorSummary({ consultationId, doctorId }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [drugs, setDrugs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prescription, setPrescription] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { drugs: list } = await fetchDrugs();
        setDrugs(list || []);
      } catch (e) {
        message.error(t('doctorSummary.fetchDrugsError'));
      }
    })();
  }, []);

  const drugOptions = useMemo(() => drugs.map((d) => ({ label: `${d.name}${d.strength ? ' ' + d.strength : ''}`, value: d.drug_id, meta: d })), [drugs]);

  const columns = [
    {
      title: t('doctorSummary.drugColumn'),
      dataIndex: 'drug_id',
      render: (value, record, idx) => (
        <Select
          showSearch
          options={drugOptions}
          value={value}
          onChange={(val) => updateItem(idx, { drug_id: val })}
          style={{ width: '100%' }}
          placeholder={t('doctorSummary.drugPlaceholder')}
          filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
        />
      )
    },
    { title: t('doctorSummary.doseColumn'), dataIndex: 'dose', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { dose: e.target.value })} /> },
    { title: t('doctorSummary.routeColumn'), dataIndex: 'route', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { route: e.target.value })} /> },
    { title: t('doctorSummary.frequencyColumn'), dataIndex: 'frequency', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { frequency: e.target.value })} /> },
    { title: t('doctorSummary.durationColumn'), dataIndex: 'duration', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { duration: e.target.value })} /> },
    { title: t('doctorSummary.quantityColumn'), dataIndex: 'quantity', width: 120, render: (v, _, idx) => <InputNumber min={0} value={v} onChange={(val) => updateItem(idx, { quantity: val })} style={{ width: '100%' }} /> },
    { title: t('doctorSummary.instructionColumn'), dataIndex: 'instruction', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { instruction: e.target.value })} /> },
    { title: '', dataIndex: 'actions', width: 80, render: (_, __, idx) => (
      <Button danger onClick={() => removeItem(idx)}>{t('common.delete')}</Button>
    ) },
  ];

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRow = () => setItems((prev) => [...prev, { drug_id: undefined, dose: '', route: '', frequency: '', duration: '', quantity: 0, instruction: '' }]);

  const onSave = async () => {
    try {
      setSaving(true);
      // Ensure we have a prescription
      const pres = prescription || (await ensurePrescription(consultationId, doctorId)).prescription;
      setPrescription(pres);

      const validItems = items.filter((it) => it.drug_id);
      if (validItems.length > 0) {
        await addPrescriptionItems(pres.prescription_id, validItems);
      }

      const values = await form.validateFields();
      await upsertDischargeSummary(consultationId, {
        diagnosis: values.diagnosis || null,
        plan: values.plan || null,
        advice: values.advice || null,
        prescription_id: pres.prescription_id,
      });
      message.success(t('doctorSummary.saveSuccess'));
    } catch (e) {
      message.error(e.message || t('doctorSummary.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title={t('doctorSummary.summaryCardTitle')}>
        <Form form={form} layout="vertical">
          <Form.Item name="diagnosis" label={t('doctorSummary.diagnosisLabel')}>
            <Input.TextArea rows={2} placeholder={t('doctorSummary.diagnosisPlaceholder')} />
          </Form.Item>
          <Form.Item name="plan" label={t('doctorSummary.planLabel')}>
            <Input.TextArea rows={2} placeholder={t('doctorSummary.planPlaceholder')} />
          </Form.Item>
          <Form.Item name="advice" label={t('doctorSummary.adviceLabel')}>
            <Input.TextArea rows={2} placeholder={t('doctorSummary.advicePlaceholder')} />
          </Form.Item>
        </Form>
      </Card>

      <Card title={t('doctorSummary.prescriptionCardTitle')}>
        <div style={{ marginBottom: 8 }}>
          <Button onClick={addRow}>{t('doctorSummary.addMedicationButton')}</Button>
        </div>
        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          rowKey={(_, idx) => `row-${idx}`}
          size="small"
          loading={loading}
        />
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" onClick={onSave} loading={saving}>
          {t('doctorSummary.saveButton')}
        </Button>
      </div>
    </Space>
  );
}

export default DoctorSummary;
