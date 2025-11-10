import React from 'react'
import { Card, Typography } from 'antd'
import ProfileForm from '../components/ProfileForm/ProfileForm'

const { Title, Text } = Typography

function ProfileFormDemo() {
  const handleSubmit = async (formData) => {
    console.log('Form submitted:', formData)
    // Here you would normally save to database
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(formData)
      }, 1000)
    })
  }

  const handleSave = async (formData) => {
    console.log('Draft saved:', formData)
    // Here you would normally save draft to database
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(formData)
      }, 500)
    })
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5', 
      padding: '24px' 
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        marginBottom: '24px'
      }}>
        <Card>
          <Title level={1} style={{ textAlign: 'center', marginBottom: '8px' }}>
            Patient Profile Form Demo
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            Complete multi-step health profile form based on Supabase database schema
          </Text>
        </Card>
      </div>

      <ProfileForm
        mode="create"
        userType="patient"
        onSubmit={handleSubmit}
        onSave={handleSave}
      />
    </div>
  )
}

export default ProfileFormDemo