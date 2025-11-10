import React, { useEffect, useState, useCallback } from 'react';
import { List, Tag, Space, Button, Typography, Skeleton, Empty, Popconfirm, message } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  approveDoctorRequest,
  rejectDoctorRequest,
  fetchDoctorRequestCount,
} from '../../store/doctorRequestsSlice';
import { selectDoctorRequestsState } from '../../store';

const { Text } = Typography;

/*
  Assumptions about schema:
  Table: doctor_requests
  Columns: id (uuid/int), user_id, full_name, email, license_no, status ('pending'|'approved'|'rejected'), created_at
  On approve: you might want to update the users table / user role separately (not included here; hook your logic in handleApprove)
*/

function DoctorRequestList({
  requests = [],
  loading = false,
  requestingCount,
  onRefresh,
  onProcessed,
  currentUserId,
}) {
  const dispatch = useDispatch();
  const { submitting } = useSelector(selectDoctorRequestsState);
  const [processingId, setProcessingId] = useState(null);

  const refreshList = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const handleApprove = async (record) => {
    if (!record?.application_id || !record?.applicant_user_id) return;
    const key = record.applicant_user_id;
    setProcessingId(key);
    try {
      await dispatch(
        approveDoctorRequest({
          applicationId: record.application_id,
          userId: record.applicant_user_id,
          reviewerId: currentUserId || null,
        })
      ).unwrap();
      message.success('Approved');
      dispatch(fetchDoctorRequestCount());
      refreshList();
      onProcessed?.();
    } catch (error) {
      message.error(error || 'Update failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (record) => {
    if (!record?.application_id) return;
    const key = record.applicant_user_id || record.application_id;
    setProcessingId(key);
    try {
      await dispatch(
        rejectDoctorRequest({
          applicationId: record.application_id,
          reason: null,
          reviewerId: currentUserId || null,
        })
      ).unwrap();
      message.success('Rejected');
      dispatch(fetchDoctorRequestCount());
      refreshList();
      onProcessed?.();
    } catch (error) {
      message.error(error || 'Update failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (!requests.length) {
    return <Empty description="No pending requests" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }



  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={refreshList}>Refresh</Button>
        <Text type="secondary">Unverify : {requestingCount} | Pending Requests: {requests.length} </Text>
        
      </Space>
      <List
        itemLayout="vertical"
        dataSource={requests}
        renderItem={(item) => (
          <List.Item
            key={item.id ?? item.user_id}
            actions={[
              <Popconfirm
                key="approve"
                title="Approve doctor"
                description="Are you sure you want to approve this application?"
                onConfirm={() => handleApprove(item)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={processingId === (item.applicant_user_id || item.user_id)}
                  disabled={submitting}
                >
                  Approve
                </Button>
              </Popconfirm>,
              <Popconfirm
                key="reject"
                title="Reject doctor"
                description="Are you sure you want to reject this application?"
                onConfirm={() => handleReject(item)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={processingId === (item.applicant_user_id || item.user_id)}
                  disabled={submitting}
                >
                  Reject
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space size="small">
                  <span>{item.full_name || item.display_name || 'Unknown Doctor'}</span>
                  <Tag color="blue">{item.email}</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={4}>
                  {item.license_no && (
                    <Text type="secondary">License: {item.license_no}</Text>
                  )}
                  <Text type="secondary">
                    Submitted: {new Date(item.created_at).toLocaleString()}
                  </Text>
                </Space>
              }
            />
            {item.status && <Tag color="gold">Status: {item.status}</Tag>}
          </List.Item>
        )}
      />
    </div>
  );
}


export default DoctorRequestList;
