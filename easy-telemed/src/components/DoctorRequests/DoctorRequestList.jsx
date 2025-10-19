import React, { useEffect, useState, useCallback } from 'react';
import { List, Tag, Space, Button, Typography, Skeleton, Empty, Popconfirm, message } from 'antd';
import { supabase } from '../../api/SupabaseClient';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/*
  Assumptions about schema:
  Table: doctor_requests
  Columns: id (uuid/int), user_id, full_name, email, license_no, status ('pending'|'approved'|'rejected'), created_at
  On approve: you might want to update the users table / user role separately (not included here; hook your logic in handleApprove)
*/

function DoctorRequestList({ onProcessed, setRequestList, requestCount }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [processingId, setProcessingId] = useState(null);

 const fetchRequests = useCallback(async () => {
  setLoading(true);

 // supabase v2
const { data, error } = await supabase
  .from('v_provider_applications_with_user')
  .select('*')
  .eq('role_requested', 'doctor')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

if (error) {
  message.error(t('doctorRequests.fetchListError'));
} else {
  setItems(data ?? []);
}

  setLoading(false);
}, []);


  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel('doctor-requests-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_requests' }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  useEffect(() => {
    setRequestList(items);
  }, [items, setRequestList]);

  const updateStatus = async (id, status) => {
    setProcessingId(id);
    try {
      if (status === 'approved') {
        const { error: approveError } = await supabase
          .from('app_users')
          .update({ role: 'doctor', verify: true })
          .eq('user_id', id);
        if (approveError) throw approveError;
      }

      const { error: requestError } = await supabase
        .from('doctor_requests')
        .update({ status })
        .eq('user_id', id);

      if (requestError) {
        throw requestError;
      }

      message.success(status === 'approved' ? t('doctorRequests.approveSuccess') : t('doctorRequests.rejectSuccess'));
      onProcessed?.();
      fetchRequests();
    } catch (error) {
      console.error('Failed to update doctor request status', error);
      message.error(t('doctorRequests.updateFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (id) => {
    updateStatus(id, 'approved')
    console.log("Approved", id)
  };
  const handleReject = (id) => updateStatus(id, 'rejected');

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (!items.length) {
    return <Empty description={t('doctorRequests.emptyState')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }



  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchRequests}>{t('doctorRequests.refresh')}</Button>
        <Text type="secondary">
          {t('doctorRequests.pendingSummary', { unverified: requestCount, pending: items.length })}
        </Text>
      </Space>
      <List
        itemLayout="vertical"
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            key={item.id ?? item.user_id}
            actions={[
              <Popconfirm
                key="approve"
                title={t('doctorRequests.approveConfirmTitle')}
                description={t('doctorRequests.approveConfirmDescription')}
                onConfirm={() => handleApprove(item.user_id)}
                okText={t('common.yes')}
                cancelText={t('common.no')}
              >
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={processingId === item.user_id}
                  disabled={processingId === item.user_id}
                >
                  {t('common.approve')}
                </Button>
              </Popconfirm>,
              <Popconfirm
                key="reject"
                title={t('doctorRequests.rejectConfirmTitle')}
                description={t('doctorRequests.rejectConfirmDescription')}
                onConfirm={() => handleReject(item.user_id)}
                okText={t('common.yes')}
                cancelText={t('common.no')}
              >
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={processingId === item.user_id}
                  disabled={processingId === item.user_id}
                >
                  {t('common.reject')}
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space size="small">
                  <span>{item.full_name || item.display_name || t('doctorRequests.unknownDoctor')}</span>
                  <Tag color="blue">{item.email}</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={4}>
                  {item.license_no && (
                    <Text type="secondary">{t('doctorRequests.licenseLabel', { license: item.license_no })}</Text>
                  )}
                  <Text type="secondary">
                    {t('doctorRequests.submittedLabel', { date: new Date(item.created_at).toLocaleString() })}
                  </Text>
                </Space>
              }
            />
            {item.status && <Tag color="gold">{t('doctorRequests.statusLabel', { status: item.status })}</Tag>}
          </List.Item>
        )}
      />
    </div>
  );
}


export default DoctorRequestList;
