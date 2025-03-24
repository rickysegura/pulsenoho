// src/app/settings/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserCircle, Camera, ArrowLeft } from 'lucide-react';
import ProfileImageUploader from '../../components/ProfileImageUploader';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [bio, setBio] = useState('');
  const [favoriteVenueId, setFavoriteVenueId] = useState('');
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const photoInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUsername(data.username || '');
          setBio(data.bio || '');
          // Set to 'none' if empty string or falsy
          setFavoriteVenueId(data.favoriteVenueId || 'none');
          setPhotoPreview(data.photoURL || null);
          setEmailNotifications(data.notifications?.email !== false);
          setPushNotifications(data.notifications?.push !== false);
        }

        const venuesSnapshot = await getDocs(collection(db, 'venues'));
        const venueList = venuesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setVenues(venueList);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, router]);

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoUploadComplete = (photoURL) => {
    setPhotoPreview(photoURL);
    toast.success('Profile photo updated!');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updates = {
        username: username.trim(),
        bio: bio.trim(),
        // If favoriteVenueId is 'none', store null or empty string based on your database needs
        favoriteVenueId: favoriteVenueId === 'none' ? null : favoriteVenueId,
        lastUpdated: new Date(),
      };

      if (photo) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, photo);
        const photoURL = await getDownloadURL(storageRef);
        updates.photoURL = photoURL;
      }

      await setDoc(userRef, updates, { merge: true });
      toast.success('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        notifications: {
          email: emailNotifications,
          push: pushNotifications
        }
      }, { merge: true });
      toast.success('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Reset error and success messages
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate inputs
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      // Create credential with current password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      // Reauthenticate user
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
      
      // Clear form and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setPasswordSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error changing password:', error);
      
      // Handle specific error codes
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading your profile...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        {/* Simple Tab Navigation */}
        <div className="mb-8">
          <div className="flex border-b border-white/20">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'profile' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'notifications' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'account' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </div>
        </div>
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white">Edit Profile</CardTitle>
              <p className="text-gray-400 mt-1">
                Update your personal information and public profile
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ProfileImageUploader 
                    userId={currentUser.uid}
                    onUploadComplete={handlePhotoUploadComplete}
                    existingPhotoURL={photoPreview}
                />
                
                <div className="flex-1 w-full">
                  <label className="text-gray-300 text-sm block mb-1">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="bg-white/10 border-white/20 text-white w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-gray-300 text-sm block mb-1">Bio</label>
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  className="bg-white/10 border-white/20 text-white w-full"
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{bio.length}/200 characters</p>
              </div>
              
              <div>
                <label className="text-gray-300 text-sm block mb-1">Favorite Venue</label>
                <Select value={favoriteVenueId} onValueChange={setFavoriteVenueId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white w-full">
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white">Notification Settings</CardTitle>
              <p className="text-gray-400 mt-1">
                Manage how and when you receive notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-400">Receive email alerts for messages and updates</p>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={emailNotifications} 
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-4 h-4 mr-2" 
                    />
                    <span className="text-sm text-gray-300">{emailNotifications ? 'On' : 'Off'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-white font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-400">Receive push notifications for messages and activity</p>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={pushNotifications} 
                      onChange={(e) => setPushNotifications(e.target.checked)}
                      className="w-4 h-4 mr-2" 
                    />
                    <span className="text-sm text-gray-300">{pushNotifications ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveNotifications}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Account Tab */}
        {activeTab === 'account' && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white">Account Settings</CardTitle>
              <p className="text-gray-400 mt-1">
                Manage your account and security settings
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white font-medium mb-1">Email Address</p>
                <p className="text-gray-400">{currentUser.email}</p>
              </div>
              
              <div className="space-y-4">
                <p className="text-white font-medium">Change Password</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Current Password</label>
                    <Input
                      type="password"
                      placeholder="Enter your current password"
                      className="bg-white/10 border-white/20 text-white w-full"
                      value={currentPassword || ''}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm block mb-1">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter your new password"
                      className="bg-white/10 border-white/20 text-white w-full"
                      value={newPassword || ''}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
                      className="bg-white/10 border-white/20 text-white w-full"
                      value={confirmPassword || ''}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      onClick={handleChangePassword}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? "Updating..." : "Update Password"}
                    </Button>
                    {passwordError && (
                      <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-green-400 text-sm mt-2">{passwordSuccess}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="mt-6 text-center">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}