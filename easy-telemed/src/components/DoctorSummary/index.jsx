import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, Table, Space, Select, InputNumber, message } from 'antd';
import { fetchDrugs, ensurePrescription, addPrescriptionItems, upsertDischargeSummary } from '../../services/consultationService';

function DoctorSummary({ consultationId, doctorId }) {
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
        message.error('โหลดรายการยาไม่สำเร็จ');
      }
    })();
  }, []);

  const drugOptions = useMemo(() => drugs.map((d) => ({ label: `${d.name}${d.strength ? ' ' + d.strength : ''}`, value: d.drug_id, meta: d })), [drugs]);

  const columns = [
    {
      title: 'ยา',
      dataIndex: 'drug_id',
      render: (value, record, idx) => (
        <Select
          showSearch
          options={drugOptions}
          value={value}
          onChange={(val) => updateItem(idx, { drug_id: val })}
          style={{ width: '100%' }}
          placeholder="เลือกยา"
          filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
        />
      )
    },
    { title: 'ขนาดยา', dataIndex: 'dose', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { dose: e.target.value })} /> },
    { title: 'วิธีให้ยา', dataIndex: 'route', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { route: e.target.value })} /> },
    { title: 'ความถี่', dataIndex: 'frequency', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { frequency: e.target.value })} /> },
    { title: 'ระยะเวลา', dataIndex: 'duration', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { duration: e.target.value })} /> },
    { title: 'จำนวน', dataIndex: 'quantity', width: 120, render: (v, _, idx) => <InputNumber min={0} value={v} onChange={(val) => updateItem(idx, { quantity: val })} style={{ width: '100%' }} /> },
    { title: 'คำแนะนำ', dataIndex: 'instruction', render: (v, _, idx) => <Input value={v} onChange={(e) => updateItem(idx, { instruction: e.target.value })} /> },
    { title: '', dataIndex: 'actions', width: 80, render: (_, __, idx) => (
      <Button danger onClick={() => removeItem(idx)}>ลบ</Button>
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
      message.success('บันทึกสรุปผลเรียบร้อย');
    } catch (e) {
      message.error(e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="สรุปผลการรักษา">
        <Form form={form} layout="vertical">
          <Form.Item name="diagnosis" label="การวินิจฉัย">
            <Input.TextArea rows={2} placeholder="ใส่การวินิจฉัย" />
          </Form.Item>
          <Form.Item name="plan" label="แผนการรักษา">
            <Input.TextArea rows={2} placeholder="ใส่แผนการรักษา" />
          </Form.Item>
          <Form.Item name="advice" label="คำแนะนำ">
            <Input.TextArea rows={2} placeholder="ใส่คำแนะนำ" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="สั่งยา">
        <div style={{ marginBottom: 8 }}>
          <Button onClick={addRow}>เพิ่มรายการยา</Button>
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
          บันทึกสรุปผลและใบสั่งยา
        </Button>
      </div>
    </Space>
  );
}

export default DoctorSummary;
