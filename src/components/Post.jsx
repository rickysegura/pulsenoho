// src/components/social/Post.jsx
'use client';

import { useState, useRef } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import UserAvatar from './UserAvatar';
import { toast } from 'react-hot-toast';
import { Heart, MessageCircle, Clock, User, UserPlus, Trash2 } from 'lucide-react';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

export default function Post({ post, currentUser, userDetails, refreshUserDetails }) {
  const [expandedPost, setExpandedPost] = useState(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const isProcessingLike = useRef(null);
  
  // Get the username from userDetails
  const username = userDetails[post.userId]?.username || 'User';
  
  const handleLikeToggle = async (postId, isLiked) => {
    // Prevent duplicate clicks by checking a ref
    if (isProcessingLike.current) return;
    isProcessingLike.current = postId;
    
    try {
      const postRef = doc(db, 'posts', postId);
      
      console.log(`Attempting to ${isLiked ? 'unlike' : 'like'} post ${postId}`);
      
      // First operation: Update likes and likeCount
      try {
        // Prevent optimistic UI updates to avoid conflicts with Firestore listener
        // The onSnapshot listener will update the UI when the server confirms the change
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
      
      // Second operation: Add point to post creator (only if liking, not unliking)
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
    } finally {
      isProcessingLike.current = null;
    }
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
      refreshUserDetails(userId);
      
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
      
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };
  
  const toggleExpandPost = (postId) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };
  
  const toggleCommentForm = (postId) => {
    setActiveCommentPostId(activeCommentPostId === postId ? null : postId);
  };

  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
      <CardContent className="p-4">
        {/* Post Header with User Info */}
        <div className="flex justify-between items-start mb-2">
          <Link href={`/profile/${post.userId}`} className="flex items-center gap-2">
            <UserAvatar 
              user={{
                username,
                photoURL: userDetails[post.userId]?.photoURL
              }}
              size="md"
            />
            
            <div>
              <p className="font-medium text-white">{username}</p>
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
            <span>{post.commentCount || post.comments?.length || 0}</span>
          </Button>
        </div>
        
        {/* Comment Form */}
        {activeCommentPostId === post.id && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <CommentForm 
              postId={post.id} 
              currentUser={currentUser} 
              refreshUserDetails={refreshUserDetails}
              onCommentSubmitted={() => {}}
            />
          </div>
        )}
        
        {/* Comments */}
        {post.comments && post.comments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-gray-300">Comments</h4>
            <CommentList 
              postId={post.id}
              comments={post.comments}
              currentUser={currentUser}
              userDetails={userDetails}
              refreshUserDetails={refreshUserDetails}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}