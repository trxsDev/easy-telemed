import React, { useState } from 'react'
import { Card, Typography, Button, Space, Result, message, Spin } from 'antd'
import { MailOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useUserAuthSupabase } from '../../context/UserAuthContextSupabase'
import { supabase } from '../../api/SupabaseClient'

const { Title, Text, Paragraph } = Typography

function PendingEmail() {
  console.log("PendingEmail Rendered");
  const navigate = useNavigate();
  const { authUser, logOut, refreshProfile } = useUserAuthSupabase();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  // Resend verification email
  const handleResendEmail = async () => {
    setResending(true);
    try {
      // Supabase resend confirmation
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authUser?.email,
        options: {
          emailRedirectTo: `${window.location.origin}/easy-telemed/home`, // Full URL for email redirect
      },
      });
      
      if (error) throw error;
      
      message.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Resend error:', error);
      message.error('Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Check verification status
  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      // Get latest auth user data directly from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      // Check if email is verified
      if (user && user.email_confirmed_at) {
        // Email is verified, refresh profile and navigate
        if (refreshProfile) {
          await refreshProfile();
        }
        message.success('Email verified successfully!');
        navigate('/easy-telemed/home');
      } else {
        message.warning('Email is not yet verified. Please check your email and click the verification link.');
      }
      
    } catch (error) {
      console.error('Check verification error:', error);
      message.error('Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  // Sign out and go to signin
  const handleSignOut = async () => {
    try {
      await logOut();
      navigate('/signin');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          maxWidth: '500px', 
          width: '100%',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        <Result
          icon={<MailOutlined style={{ color: '#1890ff', fontSize: '64px' }} />}
          title="Verify Your Email"
          subTitle="Please check your email and click the verification link to continue"
        />
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Paragraph>
            We've sent a verification email to:
            <br />
            <Text strong style={{ color: '#1890ff' }}>
              {authUser?.email}
            </Text>
          </Paragraph>
          
          <Paragraph type="secondary">
            Click the verification link in your email to activate your account.
            If you don't see the email, check your spam folder.
          </Paragraph>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: '30px' }}>
          <Button 
            type="primary" 
            block 
            size="large"
            loading={checking}
            icon={checking ? <Spin size="small" /> : <ReloadOutlined />}
            onClick={handleCheckVerification}
          >
            {checking ? 'Checking...' : 'I\'ve Verified My Email'}
          </Button>
          
          <Button 
            block 
            size="large"
            loading={resending}
            onClick={handleResendEmail}
            disabled={resending}
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          
          <Button 
            type="text" 
            block
            icon={<HomeOutlined />}
            onClick={handleSignOut}
            style={{ marginTop: '20px' }}
          >
            Sign Out & Return to Sign In
          </Button>
        </Space>

        <div style={{ marginTop: '30px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Having trouble?</strong>
            <br />
            • Check your spam/junk folder
            <br />
            • Make sure you're checking the correct email address
            <br />
            • Try resending the verification email
            <br />
            • Contact support if the problem persists
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default PendingEmail
