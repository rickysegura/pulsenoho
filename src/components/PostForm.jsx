// src/components/social/PostForm.jsx
'use client';

import { useState, useRef } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from 'react-hot-toast';
import { X, ImageIcon, Loader2 } from 'lucide-react';

export default function PostForm({ refreshUserDetails }) {
  const { currentUser } = useAuth();
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (3MB max)
    const maxSize = 3 * 1024 * 1024; // 3MB in bytes
    if (file.size > maxSize) {
      toast.error('Image must be smaller than 3MB');
      return;
    }

    setImage(file);

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if ((!newPost.trim() && !image) || posting) return;
    
    setPosting(true);
    
    try {
      // Create post data - we'll only store the userId, not the username
      const postData = {
        text: newPost.trim(),
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        likes: [],
        likeCount: 0,
        commentCount: 0,
        hasImage: false,
        imageURL: ''
      };
      
      // Upload image if one is selected
      if (image) {
        setUploadingImage(true);
        try {
          // Create a unique path for the image
          const imagePath = `posts/${currentUser.uid}_${new Date().getTime()}`;
          const storageRef = ref(storage, imagePath);
          
          // Upload the file
          await uploadBytes(storageRef, image);
          
          // Get download URL
          const downloadURL = await getDownloadURL(storageRef);
          
          // Update post data with image info
          postData.hasImage = true;
          postData.imageURL = downloadURL;
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          toast.error('Failed to upload image, but will post text content');
        } finally {
          setUploadingImage(false);
        }
      }
      
      // Add post document
      await addDoc(collection(db, 'posts'), postData);
      
      // Update user points
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: increment(2)
      });
      
      // Make sure we have the latest user details
      refreshUserDetails(currentUser.uid);
      
      setNewPost('');
      setImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Post shared! +2 points');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="bg-white/10 border-white/20">
      <CardContent className="p-4">
        <form onSubmit={handlePostSubmit} className="space-y-3">
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share what's happening with the community..."
            className="bg-white/10 border-white/20 text-white resize-none"
            rows={3}
          />

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          
          {/* Image Preview or Upload Button */}
          {imagePreview ? (
            <div className="relative mb-2">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full h-auto rounded-md border border-gray-700 max-h-40 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-gray-900/80 text-white p-1 rounded-full hover:bg-red-700/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleImageClick}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-300"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Add Image</span>
            </button>
          )}
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={(!newPost.trim() && !image) || posting || uploadingImage}
            >
              {posting || uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingImage ? 'Uploading...' : 'Posting...'}
                </>
              ) : (
                'Share Update'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}