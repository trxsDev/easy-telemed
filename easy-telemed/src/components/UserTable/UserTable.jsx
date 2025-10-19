import React from 'react'
import { Table } from 'antd'
import { useTranslation } from 'react-i18next'

function UserTable({userData}) {
    const { t } = useTranslation()
    const columns = [
    {
      title: t('userTable.noColumn'),
      key: "no",
      render: (_, __, index) => index + 1,
      width: "20%",
    },
    {
      title: t('userTable.fullNameColumn'),
      dataIndex: "all_user_display_name",
      key: "full_name",
      render: (text) => text || t('common.notAvailable'),
      width: "20%",
    },
    {
      title: t('userTable.emailColumn'),
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
