import React from 'react'
import { Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import "./styles.css"
import {supabase} from "../../api/SupabaseClient"
import { useUserAuthSupabase } from '../../context/UserAuthContextSupabase';
import MultiStepPatientForm from '../../components/MultiStepPatientForm';

function Profile() {
    const { user, refreshProfile } = useUserAuthSupabase();
    const navigate = useNavigate();

    const updateProfile = async (formData) => {
        const {error} = await supabase
            .from('patient_profiles')
            .insert({ ...formData, user_id: user.user_id })
        console.log('ObSubmit Called');
        console.log('Form submitted:', formData);
        if (error) {throw error}
        console.log('Form submitted successfully');
    }

    const updateAppuser = async (formData) => {
        const displayName = `${formData.fname} ${formData.lname}`;
        console.log("phone", formData.phone)
        const {error} = await supabase
            .from('app_users')
            .update({ 
                display_name: displayName,
                phone: formData.phone,
                verify: true,
                verified_at: new Date().toISOString(),
             })
            .eq('user_id', user.user_id)
        console.log('ObSubmit Called');
        console.log('Form submitted:', formData);
        if (error) {throw error}
        console.log('Form submitted successfully');
    }
    
    const onSubmit = async (formData) => {
        try {
            console.log("onSubmit profile", formData)
            await updateProfile(formData);
            await updateAppuser(formData);
            
            // Refresh the user context to get updated verify status
            await refreshProfile();
            
            message.success('Profile updated successfully! You can now access all features.');
            
            // Navigate to home page after successful profile submission
            setTimeout(() => {
                navigate('/easy-telemed/home');
            }, 1500);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            message.error('Failed to update profile. Please try again.');
        }
    }
  return (
    <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <h1>Complete Your Profile</h1>
            <p style={{ color: '#666', fontSize: '16px' }}>
                Please complete your profile information to access all features of the telemedicine platform.
            </p>
        </div>
        
        <div style={{ width: '100%' }}>
            <MultiStepPatientForm onSubmit={onSubmit} />
        </div>
    </div>
  )
}

export default Profile