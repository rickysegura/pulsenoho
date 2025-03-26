// src/components/SocialFeed.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp, where, deleteDoc, getDocs, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Send, Clock, User, UserPlus, Trash2, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { addSnapshot } from '../lib/snapshotManager';
import UserAvatar from './UserAvatar';

export default function SocialFeed() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [viewMode, setViewMode] = useState('all'); // 'all', 'following', 'popular'
  const [expandedPost, setExpandedPost] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  
  // Load posts
  useEffect(() => {
    if (!currentUser) return;
    
    const loadPostsBasedOnViewMode = () => {
      let postsQuery;
      
      if (viewMode === 'following' && currentUser) {
        // First fetch current user to get following list
        const fetchFollowingPosts = async () => {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            const userFollowing = userSnap.exists() ? userSnap.data().following || [] : [];
            
            // Include the current user in the list of users to fetch posts from
            const usersToFetch = [...userFollowing, currentUser.uid];
            
            if (usersToFetch.length === 0) {
              setPosts([]);
              setLoading(false);
              return;
            }
            
            // Query posts from users the current user is following and the user's own posts
            postsQuery = query(
              collection(db, 'posts'),
              where('userId', 'in', usersToFetch),
              orderBy('timestamp', 'desc'),
              limit(20)
            );
            
            subscribeToQuery(postsQuery);
          } catch (error) {
            console.error('Error fetching following posts:', error);
            setLoading(false);
            toast.error('Failed to load posts');
          }
        };
        
        fetchFollowingPosts();
        return;
      } else if (viewMode === 'popular') {
        // Get posts with most likes
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('likeCount', 'desc'),
          limit(20)
        );
      } else {
        // Default: all posts sorted by timestamp
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      }
      
      subscribeToQuery(postsQuery);
    };
    
    // Helper function to subscribe to a posts query
    const subscribeToQuery = (postsQuery) => {
      const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
        try {
          const fetchedPosts = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const postData = postDoc.data();
              
              // Fetch user details if not already in state
              if (!userDetails[postData.userId]) {
                await fetchUserDetails(postData.userId);
              }
              
              // Fetch comments for this post
              const commentsQuery = query(
                collection(db, `posts/${postDoc.id}/comments`),
                orderBy('timestamp', 'asc')
              );
              
              const commentsSnapshot = await getDocs(commentsQuery);
              const comments = await Promise.all(
                commentsSnapshot.docs.map(async (commentDoc) => {
                  const commentData = commentDoc.data();
                  
                  // Fetch user details for comment if not already in state
                  if (!userDetails[commentData.userId]) {
                    await fetchUserDetails(commentData.userId);
                  }
                  
                  return {
                    id: commentDoc.id,
                    ...commentData,
                    formattedTime: commentData.timestamp?.toDate().toLocaleString() || 'Just now'
                  };
                })
              );
              
              return {
                id: postDoc.id,
                ...postData,
                comments,
                formattedTime: postData.timestamp?.toDate().toLocaleString() || 'Just now',
                liked: postData.likes?.includes(currentUser.uid) || false,
                likeCount: postData.likes?.length || 0
              };
            })
          );
          
          setPosts(fetchedPosts);
          setLoading(false);
        } catch (error) {
          console.error('Error processing posts:', error);
          setLoading(false);
        }
      });
      
      addSnapshot(unsubscribe);
    };
    
    loadPostsBasedOnViewMode();
  }, [currentUser, viewMode, userDetails]);
  
  // Helper function to fetch and store user details
  const fetchUserDetails = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserDetails(prev => ({
          ...prev,
          [userId]: {
            username: userData.username || 'User',
            photoURL: userData.photoURL || '',
            points: userData.points || 0,
            isCurrentUserFollowing: userData.followers?.includes(currentUser.uid) || false
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

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
      // Get user data to include username
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const username = userSnap.exists() ? userSnap.data().username || 'Anonymous' : 'Anonymous';
      
      // Create post data
      const postData = {
        text: newPost.trim(),
        userId: currentUser.uid,
        username,
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
          
          console.log('Image uploaded successfully:', downloadURL);
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          toast.error('Failed to upload image, but will post text content');
          // Continue with submission even if image upload fails
        } finally {
          setUploadingImage(false);
        }
      }
      
      // Add post document
      await addDoc(collection(db, 'posts'), postData);
      
      // Update user points
      await updateDoc(userRef, {
        points: increment(2)
      });
      
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
  
  const handleLikeToggle = async (postId, isLiked) => {
    try {
      const postRef = doc(db, 'posts', postId);
      
      console.log(`Attempting to ${isLiked ? 'unlike' : 'like'} post ${postId}`);
      
      // First operation: Update likes and likeCount
      try {
        if (isLiked) {
          // Unlike - Remove current user from likes array
          await updateDoc(postRef, {
            likes: arrayRemove(currentUser.uid),
            likeCount: increment(-1) // Decrement the like count by 1
          });
          console.log('Unlike operation succeeded');
        } else {
          // Like - Add current user to likes array
          await updateDoc(postRef, {
            likes: arrayUnion(currentUser.uid),
            likeCount: increment(1) // Increment the like count by 1
          });
          console.log('Like operation succeeded');
        }
      } catch (error) {
        console.error('Error in like/unlike operation:', error);
        toast.error('Failed to update like status');
        return; // Exit early if the primary operation fails
      }
      
      // Update local state to reflect like/unlike
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return { 
              ...post, 
              liked: !isLiked,
              likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
            };
          }
          return post;
        })
      );
      
      // Second operation: Add point to post creator (only if liking, not unliking)
      // Only attempt this if the first operation succeeded
      if (!isLiked) {
        try {
          // Get post creator info to add points
          const postSnap = await getDoc(postRef);
          if (postSnap.exists() && postSnap.data().userId !== currentUser.uid) {
            const creatorRef = doc(db, 'users', postSnap.data().userId);
            console.log(`Attempting to update points for user ${postSnap.data().userId}`);
            
            const creatorSnap = await getDoc(creatorRef);
            if (creatorSnap.exists()) {
              await updateDoc(creatorRef, {
                points: increment(1) // Use increment here too for atomic operation
              });
              console.log('Creator points update succeeded');
            }
          }
        } catch (pointsError) {
          console.error('Error updating creator points (but like was successful):', pointsError);
          // Don't show toast error for this - the like itself was successful
        }
      }
    } catch (error) {
      console.error('General error in handleLikeToggle:', error);
      toast.error('Failed to update like');
    }
  };
  
  const handleCommentSubmit = async (postId) => {
    if (!commentText.trim()) return;
    
    try {
      console.log(`Attempting to add comment to post ${postId}`);
      
      // Get user data to include username
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const username = userSnap.exists() ? userSnap.data().username || 'Anonymous' : 'Anonymous';
      
      const comment = {
        text: commentText.trim(),
        userId: currentUser.uid,
        username,
        timestamp: serverTimestamp()
      };
      
      // First operation: Add comment to the post
      let commentRef;
      try {
        commentRef = await addDoc(collection(db, `posts/${postId}/comments`), comment);
        console.log('Comment added successfully');
      } catch (error) {
        console.error('Error adding comment:', error);
        toast.error('Failed to add comment');
        return; // Exit early if the primary operation fails
      }
      
      // Second operation: Update comment count on the post
      try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          commentCount: increment(1) // Use increment for atomic operation
        });
        console.log('Post comment count updated successfully');
        
        // Third operation: If commenting on someone else's post, add a point to the post creator
        const postSnap = await getDoc(postRef);
        if (postSnap.exists() && postSnap.data().userId !== currentUser.uid) {
          const creatorRef = doc(db, 'users', postSnap.data().userId);
          try {
            await updateDoc(creatorRef, {
              points: increment(1) // Use increment here too for atomic operation
            });
            console.log('Creator points updated successfully');
          } catch (pointsError) {
            console.error('Error updating creator points (but comment was successful):', pointsError);
            // Don't show toast error for this - the comment itself was successful
          }
        }
      } catch (updateError) {
        console.error('Error updating comment count (but comment was added):', updateError);
        // Don't exit or show toast error - the comment was added successfully
      }
      
      // Fourth operation: Add a point to the commenter
      try {
        await updateDoc(userRef, {
          points: increment(1) // Use increment here too for atomic operation
        });
        console.log('Commenter points updated successfully');
      } catch (pointsError) {
        console.error('Error updating commenter points (but comment was successful):', pointsError);
        // Don't show toast error for this - the comment itself was successful
      }
      
      setCommentText('');
      setActiveCommentPostId(null);
      toast.success('Comment added! +1 point');
      
      // We'll let the Firestore listener update the UI instead of manually updating state
      // This prevents duplicate comments from appearing
    } catch (error) {
      console.error('General error in handleCommentSubmit:', error);
      toast.error('Failed to add comment');
    }
  };
  
  const toggleCommentForm = (postId) => {
    setActiveCommentPostId(activeCommentPostId === postId ? null : postId);
    setCommentText('');
  };
  
  const handleFollowToggle = async (userId, isFollowing) => {
    if (userId === currentUser.uid) return; // Can't follow yourself
    
    try {
      const userRef = doc(db, 'users', userId);
      const currentUserRef = doc(db, 'users', currentUser.uid);
      
      if (isFollowing) {
        // Unfollow
        await updateDoc(userRef, {
          followers: arrayRemove(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
      } else {
        // Follow
        await updateDoc(userRef, {
          followers: arrayUnion(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
      }
      
      // Update local state
      setUserDetails(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          isCurrentUserFollowing: !isFollowing
        }
      }));
      
      toast.success(isFollowing ? 'Unfollowed user' : 'Now following user');
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };
  
  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      // Delete the post
      await deleteDoc(doc(db, 'posts', postId));
      
      // Update local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };
  
  const toggleExpandPost = (postId) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-white">Recent Activity</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* New Post Form */}
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
        
        {/* View Mode Tabs */}
        <div className="flex space-x-2">
          <Button
            onClick={() => setViewMode('all')}
            size="sm"
            className={viewMode === 'all' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-white/20 text-white'}
          >
            All
          </Button>
          <Button
            onClick={() => setViewMode('following')}
            size="sm"
            className={viewMode === 'following' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-white/20 text-white'}
          >
            Following
          </Button>
          <Button
            onClick={() => setViewMode('popular')}
            size="sm"
            className={viewMode === 'popular' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-white/20 text-white'}
          >
            Popular
          </Button>
        </div>
        
        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                    <div className="h-3 bg-white/10 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                  <div className="h-4 bg-white/10 rounded w-4/5"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
            <p className="text-gray-400 mb-2">
              {viewMode === 'following' 
                ? "You're not following anyone yet, or they haven't posted anything." 
                : "No posts yet. Be the first to share!"}
            </p>
            {viewMode === 'following' && (
              <Button 
                onClick={() => setViewMode('all')}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Discover People
              </Button>
            )}
          </div>
        ) : (
          <div className="h-[600px] overflow-y-auto pr-4">
            <div className="space-y-4">
              {posts.map((post) => (
                <Card 
                  key={post.id} 
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                >
                  <CardContent className="p-4">
                    {/* Post Header with User Info */}
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/profile/${post.userId}`} className="flex items-center gap-2">
                        <UserAvatar 
                          user={{
                            username: post.username,
                            photoURL: userDetails[post.userId]?.photoURL
                          }}
                          size="md"
                        />
                        
                        <div>
                          <p className="font-medium text-white">{post.username}</p>
                          <p className="text-xs text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {post.formattedTime}
                          </p>
                        </div>
                      </Link>
                      
                      <div className="flex items-center space-x-2">
                        {post.userId !== currentUser.uid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={
                              userDetails[post.userId]?.isCurrentUserFollowing
                                ? "text-indigo-400 hover:text-indigo-300"
                                : "text-gray-400 hover:text-white"
                            }
                            onClick={() => handleFollowToggle(post.userId, userDetails[post.userId]?.isCurrentUserFollowing)}
                          >
                            {userDetails[post.userId]?.isCurrentUserFollowing ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {post.userId === currentUser.uid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Post Content */}
                    <div className="mb-3">
                      {post.text && (
                        <p className="text-gray-200 whitespace-pre-wrap">
                          {expandedPost === post.id || post.text.length <= 250 
                            ? post.text 
                            : `${post.text.substring(0, 250)}...`}
                        </p>
                      )}
                      
                      {post.text && post.text.length > 250 && (
                        <button 
                          onClick={() => toggleExpandPost(post.id)}
                          className="text-indigo-400 hover:text-indigo-300 text-sm mt-1"
                        >
                          {expandedPost === post.id ? 'Show less' : 'Read more'}
                        </button>
                      )}
                      
                      {/* Post Image */}
                      {post.hasImage && post.imageURL && (
                        <div className="mt-3">
                          <div className="relative w-full rounded-md border border-white/10 overflow-hidden">
                            <div className="aspect-video flex items-center justify-center bg-gray-900/40">
                              <img 
                                src={post.imageURL} 
                                alt="Post content" 
                                className="max-w-full max-h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Post Actions */}
                    <div className="flex items-center space-x-4 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`hover:bg-white/10 flex items-center ${
                          post.liked ? 'text-red-500' : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => handleLikeToggle(post.id, post.liked)}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${post.liked ? 'fill-red-500' : ''}`} />
                        <span>{post.likeCount || 0}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`hover:bg-white/10 flex items-center ${
                          activeCommentPostId === post.id ? 'text-indigo-400' : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => toggleCommentForm(post.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span>{post.comments?.length || 0}</span>
                      </Button>
                    </div>
                    
                    {/* Comment Form */}
                    {activeCommentPostId === post.id && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex space-x-2">
                          <Input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="bg-white/10 border-white/20 text-white flex-1"
                          />
                          <Button 
                            onClick={() => handleCommentSubmit(post.id)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={!commentText.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Comments */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Comments</h4>
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex space-x-2">
                            <UserAvatar 
                              user={{
                                username: comment.username,
                                photoURL: userDetails[comment.userId]?.photoURL
                              }}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 bg-white/5 p-2 rounded-md">
                              <div className="flex justify-between items-center">
                                <Link href={`/profile/${comment.userId}`} className="text-sm font-medium text-white hover:underline">
                                  {comment.username}
                                </Link>
                                <span className="text-xs text-gray-400">{comment.formattedTime}</span>
                              </div>
                              <p className="text-sm text-gray-300 mt-1">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}