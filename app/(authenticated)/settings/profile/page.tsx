'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CheckTimezone from './check-timezone';
import logger from '@/lib/logger';
import { useRouter } from 'next/navigation';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    timezone: '',
  });

  // Try to refresh profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (user && !profile) {
        logger.debug('ProfilePage', 'User exists but no profile - triggering manual refresh');
        try {
          const refreshedProfile = await refreshProfile();
          logger.debug('ProfilePage', 'Manually refreshed profile:', refreshedProfile);
        } catch (error) {
          logger.error('ProfilePage', 'Failed to manually refresh profile:', error);
        }
      }
    };
    
    loadProfile();
  }, [user, profile, refreshProfile]);
  
  // Load initial data
  useEffect(() => {
    if (profile) {
      logger.debug('ProfilePage', 'Setting form data from profile:', profile);
      setFormData({
        full_name: profile.full_name || '',
        timezone: profile.timezone || '',
      });
    }
  }, [profile]);

  // Directly check Supabase for profile data if needed
  useEffect(() => {
    const checkDatabase = async () => {
      if (user && !profile) {
        logger.debug('ProfilePage', 'No profile in state but user exists, checking database directly');
        const supabase = createClientComponentClient();
        
        try {
          // First check if profile exists
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) {
            if (error.code === 'PGRST116') {
              // No profile found, create one
              logger.info('ProfilePage', 'Profile not found in database, creating one directly');
              
              const newProfile = {
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                avatar_url: user.user_metadata?.avatar_url || null,
                timezone: null, // Use null for database
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              logger.debug('ProfilePage', 'Creating profile with data:', newProfile);
              
              const { data: createdProfile, error: createError } = await supabase
                .from('profiles')
                .insert([newProfile])
                .select('*')
                .single();
                
              if (createError) {
                logger.error('ProfilePage', 'Error creating profile directly:', createError);
              } else {
                logger.info('ProfilePage', 'Profile created directly:', createdProfile);
                // Set form data from created profile
                setFormData({
                  full_name: createdProfile.full_name || '',
                  timezone: createdProfile.timezone || '',
                });
                
                // Try to refresh the profile in the auth context
                await refreshProfile();
              }
            } else {
              logger.error('ProfilePage', 'Error checking profile directly:', error);
            }
          } else if (data) {
            logger.info('ProfilePage', 'Found profile directly in database:', data);
            // We found profile data in Supabase but it's not in our auth state
            setFormData({
              full_name: data.full_name || '',
              timezone: data.timezone || '',
            });
            
            // Try to refresh the profile in the auth context
            await refreshProfile();
          }
        } catch (err) {
          logger.error('ProfilePage', 'Exception checking database:', err);
        }
      }
    };
    
    checkDatabase();
  }, [user, profile, refreshProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    
    logger.debug('ProfilePage', 'Submitting profile update with data:', formData);

    try {
      // Create a clean copy of the form data to send to the API
      const dataToUpdate: Record<string, any> = {};
      
      // Only include non-empty values that have actually changed from the profile
      if (formData.full_name !== undefined && formData.full_name !== null && formData.full_name.trim() !== '') {
        dataToUpdate.full_name = formData.full_name.trim();
      }
      
      if (formData.timezone !== undefined && formData.timezone !== null) {
        dataToUpdate.timezone = formData.timezone;
      }
      
      // Prevent empty updates
      if (Object.keys(dataToUpdate).length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'No changes to save' 
        });
        setIsSaving(false);
        return;
      }
      
      logger.debug('ProfilePage', 'Cleaned data for update:', dataToUpdate);
      
      // The updateProfile function now returns the updated profile
      const updatedProfile = await updateProfile(dataToUpdate);
      logger.debug('ProfilePage', 'Profile update result:', updatedProfile);
      
      if (!updatedProfile) {
        logger.warn('ProfilePage', 'No profile data returned from update, forcing refresh');
        // If updateProfile doesn't return data, force a refresh
        const refreshedProfile = await refreshProfile();
        if (!refreshedProfile) {
          throw new Error('Failed to update and refresh profile');
        }
        
        // Set the form data with the refreshed profile
        setFormData({
          full_name: refreshedProfile.full_name || '',
          timezone: refreshedProfile.timezone || '',
        });
        
        // Set success message
        setMessage({ 
          type: 'success', 
          text: 'Profile updated successfully!' 
        });
        
        return;
      }
      
      // Update the form data with the values from the updated profile
      setFormData({
        full_name: updatedProfile.full_name || '',
        timezone: updatedProfile.timezone || '',
      });
      
      // Set success message
      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      });
    } catch (error) {
      logger.error('ProfilePage', 'Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createClientComponentClient();
      
      // Upload the file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update the profile with the new avatar URL
      await updateProfile({ avatar_url: publicUrl });
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
    } catch (error) {
      logger.error('ProfilePage', 'Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Failed to upload profile picture. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.email) {
      setMessage({ 
        type: 'error', 
        text: 'Please type your email address correctly to confirm deletion.' 
      });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      // Delete the user's profile first
      const supabase = createClientComponentClient();
      
      // Delete from profiles table
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      // Delete from auth
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;
      
      // Sign out
      await supabase.auth.signOut();
      
      // Redirect to home page
      router.push('/?deleted=true');
    } catch (error) {
      logger.error('ProfilePage', 'Error deleting account:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400 mt-2">Manage your profile information and preferences</p>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-6 ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-dark-500 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Profile Picture</h2>
        <div className="flex items-center space-x-6">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || 'Profile'}
              className="h-20 w-20 rounded-full"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-medium">
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <label className="block">
              <span className="sr-only">Choose profile photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  file:cursor-pointer cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
            <p className="mt-1 text-sm text-gray-400">
              PNG, JPG or GIF up to 2MB
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-dark-500 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="mt-1 block w-full rounded-md bg-dark-600 border border-dark-400 text-white px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-400 text-gray-400 px-3 py-2 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-400">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-300">
              Timezone
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="mt-1 block w-full rounded-md bg-dark-600 border border-dark-400 text-white px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a timezone</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isSaving
                  ? 'bg-blue-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-dark-500 rounded-lg border border-dark-400 overflow-hidden">
        <div className="p-6 border-b border-dark-400 bg-red-900/20">
          <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
        </div>
        <div className="p-6">
          {isDeleteConfirmOpen ? (
            <div>
              <p className="text-red-300 font-medium mb-4">
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </p>
              <div className="mb-4">
                <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-300 mb-2">
                  To confirm, type your email address:
                </label>
                <input
                  type="email"
                  id="confirm-email"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={user?.email}
                  className="w-full px-3 py-2 bg-dark-600 border border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-70 ${isDeleting ? 'cursor-not-allowed' : ''}`}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-dark-400 hover:bg-dark-500 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Delete Account</h3>
                <p className="text-gray-400 mt-1">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="mt-4 md:mt-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 