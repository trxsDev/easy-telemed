import React, { useEffect, useState, useCallback, use } from 'react';
import { List, Tag, Space, Button, Typography, Skeleton, Empty, Popconfirm, message ,Table} from 'antd';
import { supabase } from '../../api/SupabaseClient';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

/*
  Assumptions about schema:
  Table: doctor_requests
  Columns: id (uuid/int), user_id, full_name, email, license_no, status ('pending'|'approved'|'rejected'), created_at
  On approve: you might want to update the users table / user role separately (not included here; hook your logic in handleApprove)
*/

function DoctorRequestList({ onProcessed, setRequestList ,requestCount}) {
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
  message.error('Failed to load applications');
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
  }, [items]);

  const updateStatus = async (id, status) => {
    setProcessingId(id);
    if (status === 'approved') {
      const { error } = await supabase
        .from('app_users')
        .update({ role: 'doctor', verify: true })
        .eq('user_id', id);
    if (error) {
      message.error('Update failed');
    } else {
      message.success(status === 'approved' ? 'Approved' : 'Rejected');
      onProcessed && onProcessed();
      fetchRequests();
    }
  }
    setProcessingId(null);
  };

  const handleApprove = (id) => {
    updateStatus(id, 'approved')
    console.log("Approved", id)
  };
  const handleReject = (id) => updateStatus(id, 'rejected');

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  // if (!items.length) {
  //   return <Empty description="No pending requests" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  // }



  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchRequests}>Refresh</Button>
        <Text type="secondary">Unverify : {requestCount} | Pending Requests: {items.length} </Text>
        
      </Space>
    </div>
  );
}


export default DoctorRequestList;
