// src/components/ProfileImageUploader.jsx
'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';
import { Camera, Loader2 } from 'lucide-react';

export default function ProfileImageUploader({ userId, onUploadComplete, existingPhotoURL = null }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(existingPhotoURL);
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    // Create a preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    
    try {
      // Create a reference to the user's avatar in Firebase Storage
      const storageRef = ref(storage, `avatars/${userId}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const photoURL = await getDownloadURL(storageRef);
      
      // Update the user document in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { photoURL });
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete(photoURL);
      }
      
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
      // Reset preview on error
      setPreviewUrl(existingPhotoURL);
    } finally {
      setUploading(false);
      // Clean up object URL
      if (objectUrl && objectUrl !== existingPhotoURL) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* User avatar display */}
      <div 
        className="relative w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden cursor-pointer group"
        onClick={handleFileSelect}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Profile preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-16 h-16 text-white/70 bg-indigo-800 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold">
              {userId.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Overlay with icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera className="w-6 h-6 text-white" />
        </div>
        
        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>
      
      {/* Upload button */}
      <Button 
        onClick={handleFileSelect}
        size="sm"
        className="mt-2 border-white/20 text-white hover:bg-white/10"
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Change Photo'}
      </Button>
      
      <p className="text-xs text-gray-400 mt-1">
        Click to upload (max 2MB)
      </p>
    </div>
  );
}