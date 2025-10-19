import React from 'react'
import {Table} from 'antd'
import { CheckOutlined } from "@ant-design/icons";
import { Button ,Space,Popconfirm} from 'antd';

function UserTable({userData}) {
    const columns = [
    {
      title: "No",
      key: "no",
      render: (_, __, index) => index + 1,
      width: "20%",
    },
    {
      title: "Full Name",
      dataIndex: "all_user_display_name",
      key: "full_name",
      render: (text) => text || "N/A",
      width: "20%",
    },
    {
      title: "Email",
      dataIndex: "all_user_email",
      key: "email",
      width: "20%",
    },
  ];
    
  return (
    <div>
        <Table dataSource={userData} rowKey="id" columns={columns} pagination={{ pageSize: 5 }} />
            
        
    </div>
  )
}

export default UserTable