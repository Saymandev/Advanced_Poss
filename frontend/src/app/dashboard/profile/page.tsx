'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
    useChangePasswordMutation,
    useChangePinMutation,
    useGetProfileQuery,
    useUpdateProfileMutation,
    useUploadAvatarMutation,
} from '@/lib/api/endpoints/usersApi';
import { setUser } from '@/lib/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
    CheckCircleIcon,
    KeyIcon,
    LockClosedIcon,
    PencilIcon,
    PhotoIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { data: profile, isLoading, refetch } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();
  const [changePin, { isLoading: isChangingPin }] = useChangePinMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadAvatarMutation();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatar: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [pinData, setPinData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        avatar: profile.avatar || '',
      });
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const updated = await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        avatar: formData.avatar.trim() || undefined,
      }).unwrap();

      // Update Redux store
      dispatch(setUser({ ...user, ...updated }));

      toast.success('Profile updated successfully');
      setIsEditModalOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
        passwordData.newPassword,
      )
    ) {
      newErrors.newPassword =
        'Password must contain uppercase, lowercase, number and special character';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }).unwrap();

      toast.success('Password changed successfully');
      setIsPasswordModalOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to change password');
    }
  };

  const handleChangePin = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!pinData.currentPin) {
      newErrors.currentPin = 'Current PIN is required';
    }
    if (!pinData.newPin) {
      newErrors.newPin = 'New PIN is required';
    } else if (pinData.newPin.length < 4 || pinData.newPin.length > 6) {
      newErrors.newPin = 'PIN must be 4-6 digits';
    } else if (!/^\d+$/.test(pinData.newPin)) {
      newErrors.newPin = 'PIN must contain only digits';
    }
    if (pinData.newPin !== pinData.confirmPin) {
      newErrors.confirmPin = 'PINs do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await changePin({
        currentPin: pinData.currentPin,
        newPin: pinData.newPin,
      }).unwrap();

      toast.success('PIN changed successfully');
      setIsPinModalOpen(false);
      setPinData({
        currentPin: '',
        newPin: '',
        confirmPin: '',
      });
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to change PIN');
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error('Please select an image file');
      return;
    }

    try {
      const result = await uploadAvatar(avatarFile).unwrap();
      
      toast.success('Avatar uploaded successfully');
      
      // Update form data with new avatar URL
      setFormData((prev) => ({
        ...prev,
        avatar: result.avatarUrl,
      }));
      
      // Clear file and preview
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refetch profile to get updated avatar
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to upload avatar');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    const roleMap: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = {
      owner: 'success',
      manager: 'info',
      chef: 'warning',
      waiter: 'secondary',
      cashier: 'secondary',
      super_admin: 'info',
    };
    return roleMap[role?.toLowerCase()] || 'secondary';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Failed to load profile. Please try again.
        </p>
      </div>
    );
  }

  const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account information and settings
          </p>
        </div>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
               {/* Avatar */}
               <div className="relative inline-block">
                 {(avatarPreview || profile.avatar) ? (
                   <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 mx-auto">
                     <Image
                       src={avatarPreview || profile.avatar || ''}
                       alt={displayName}
                       fill
                       className="object-cover"
                     />
                   </div>
                 ) : (
                   <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto border-4 border-gray-200 dark:border-gray-700">
                     {initials || <UserCircleIcon className="w-20 h-20" />}
                   </div>
                 )}
                 <input
                   ref={fileInputRef}
                   type="file"
                   accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                   onChange={handleAvatarFileSelect}
                   className="hidden"
                 />
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg border-2 border-white dark:border-gray-800"
                   title="Change avatar"
                 >
                   <PhotoIcon className="w-4 h-4" />
                 </button>
               </div>
               {avatarFile && (
                 <div className="space-y-2">
                   <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                     {avatarFile.name}
                   </p>
                   <Button
                     variant="primary"
                     className="w-full"
                     onClick={handleAvatarUpload}
                     disabled={isUploadingAvatar}
                   >
                     {isUploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                   </Button>
                   <Button
                     variant="secondary"
                     className="w-full"
                     onClick={() => {
                       setAvatarFile(null);
                       setAvatarPreview(null);
                       if (fileInputRef.current) {
                         fileInputRef.current.value = '';
                       }
                     }}
                   >
                     Cancel
                   </Button>
                 </div>
               )}

              {/* Name and Role */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {displayName || 'No Name'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {profile.email}
                </p>
                <div className="mt-2">
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    {profile.role?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

               {/* Action Buttons */}
               <div className="space-y-2 pt-4">
                 <Button
                   variant="primary"
                   className="w-full"
                   onClick={() => setIsEditModalOpen(true)}
                 >
                   <PencilIcon className="w-4 h-4 mr-2" />
                   Edit Profile
                 </Button>
                 <Button
                   variant="secondary"
                   className="w-full"
                   onClick={() => setIsPasswordModalOpen(true)}
                 >
                   <KeyIcon className="w-4 h-4 mr-2" />
                   Change Password
                 </Button>
                 <Button
                   variant="secondary"
                   className="w-full"
                   onClick={() => setIsPinModalOpen(true)}
                 >
                   <LockClosedIcon className="w-4 h-4 mr-2" />
                   Change PIN
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profile.firstName || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profile.lastName || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profile.email}
                    </p>
                    {profile.isEmailVerified ? (
                      <Badge variant="success" className="mt-1">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="mt-1">
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profile.phone || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profile.role?.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  {profile.employeeId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Employee ID
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {profile.employeeId}
                      </p>
                    </div>
                  )}
                  {profile.branch?.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Branch
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {profile.branch.name}
                      </p>
                    </div>
                  )}
                  {profile.shift && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shift
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">
                        {profile.shift}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Status
                    </label>
                    <Badge variant={profile.isActive ? 'success' : 'warning'}>
                      {profile.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {profile.lastLogin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Login
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(profile.lastLogin).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {profile.joinedDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Joined Date
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(profile.joinedDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Security
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Two-Factor Authentication
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Badge variant={profile.twoFactorEnabled ? 'success' : 'secondary'}>
                      {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setErrors({});
          if (profile) {
            setFormData({
              firstName: profile.firstName || '',
              lastName: profile.lastName || '',
              phone: profile.phone || '',
              avatar: profile.avatar || '',
            });
          }
        }}
        title="Edit Profile"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => {
                setFormData({ ...formData, firstName: e.target.value });
                setErrors({ ...errors, firstName: '' });
              }}
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => {
                setFormData({ ...formData, lastName: e.target.value });
                setErrors({ ...errors, lastName: '' });
              }}
              error={errors.lastName}
              required
            />
          </div>
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              setErrors({ ...errors, phone: '' });
            }}
            error={errors.phone}
            placeholder="+1234567890"
          />
          <Input
            label="Avatar URL"
            value={formData.avatar}
            onChange={(e) => {
              setFormData({ ...formData, avatar: e.target.value });
            }}
            placeholder="https://example.com/avatar.jpg"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setErrors({});
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        }}
        title="Change Password"
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => {
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              });
              setErrors({ ...errors, currentPassword: '' });
            }}
            error={errors.currentPassword}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => {
              setPasswordData({
                ...passwordData,
                newPassword: e.target.value,
              });
              setErrors({ ...errors, newPassword: '' });
            }}
            error={errors.newPassword}
            required
            helperText="Must contain uppercase, lowercase, number and special character"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => {
              setPasswordData({
                ...passwordData,
                confirmPassword: e.target.value,
              });
              setErrors({ ...errors, confirmPassword: '' });
            }}
            error={errors.confirmPassword}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setErrors({});
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change PIN Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setErrors({});
          setPinData({
            currentPin: '',
            newPin: '',
            confirmPin: '',
          });
        }}
        title="Change PIN"
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Current PIN"
            type="password"
            value={pinData.currentPin}
            onChange={(e) => {
              setPinData({
                ...pinData,
                currentPin: e.target.value.replace(/\D/g, ''), // Only digits
              });
              setErrors({ ...errors, currentPin: '' });
            }}
            error={errors.currentPin}
            required
            maxLength={6}
          />
          <Input
            label="New PIN"
            type="password"
            value={pinData.newPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only digits
              setPinData({
                ...pinData,
                newPin: value,
              });
              setErrors({ ...errors, newPin: '' });
            }}
            error={errors.newPin}
            required
            helperText="Must be 4-6 digits"
            maxLength={6}
          />
          <Input
            label="Confirm New PIN"
            type="password"
            value={pinData.confirmPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only digits
              setPinData({
                ...pinData,
                confirmPin: value,
              });
              setErrors({ ...errors, confirmPin: '' });
            }}
            error={errors.confirmPin}
            required
            maxLength={6}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsPinModalOpen(false);
                setErrors({});
                setPinData({
                  currentPin: '',
                  newPin: '',
                  confirmPin: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePin}
              disabled={isChangingPin}
            >
              {isChangingPin ? 'Changing...' : 'Change PIN'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

