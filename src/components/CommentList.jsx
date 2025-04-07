// src/components/social/CommentList.jsx
'use client';

import { useState, useEffect } from 'react';
import { doc, deleteDoc, collection, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import UserAvatar from './UserAvatar';
import Link from 'next/link';
import { Button } from './ui/button';
import { MessageSquare, Trash2, Clock, Reply } from 'lucide-react';
import CommentForm from './CommentForm';
import { toast } from 'react-hot-toast';

export default function CommentList({ 
  postId, 
  comments, 
  currentUser, 
  userDetails,
  refreshUserDetails 
}) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [localComments, setLocalComments] = useState([]);
  
  // Update local comments when prop comments change
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  const handleDeleteComment = async (commentId, isReply = false, parentCommentId = null) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      // Path to the comment/reply to delete
      let commentRef;
      if (isReply && parentCommentId) {
        commentRef = doc(db, `posts/${postId}/comments/${parentCommentId}/replies/${commentId}`);
      } else {
        commentRef = doc(db, `posts/${postId}/comments/${commentId}`);
      }
      
      // Update local state immediately for a responsive UI
      if (isReply && parentCommentId) {
        // Delete a reply
        setLocalComments(prevComments => 
          prevComments.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: comment.replies.filter(reply => reply.id !== commentId)
              };
            }
            return comment;
          })
        );
      } else {
        // Delete a top-level comment
        setLocalComments(prevComments => 
          prevComments.filter(comment => comment.id !== commentId)
        );
      }
      
      // Delete the comment from Firestore
      await deleteDoc(commentRef);
      
      // If it's a top-level comment, update the post's comment count
      if (!isReply) {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        
        if (postSnap.exists()) {
          await updateDoc(postRef, {
            commentCount: increment(-1)
          });
        }
      }
      
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
      
      // Revert local state change if the operation failed
      setLocalComments(comments);
    }
  };
  
  const toggleReplyForm = (commentId) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };
  
  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // Helper function to get username from userDetails
  const getUsernameById = (userId) => {
    return userDetails[userId]?.username || 'User';
  };

  // If no comments to display
  if (localComments.length === 0) {
    return <div className="text-gray-400 text-sm mt-2">No comments yet</div>;
  }

  return (
    <div className="space-y-3 mt-2">
      {localComments.map((comment) => {
        // Get the comment author's username from userDetails
        const commentUsername = getUsernameById(comment.userId);
        
        return (
          <div key={comment.id} className="space-y-2">
            {/* Main comment */}
            <div className="flex space-x-2">
              <UserAvatar 
                user={{
                  username: commentUsername,
                  photoURL: userDetails[comment.userId]?.photoURL
                }}
                size="sm"
                className="flex-shrink-0"
              />
              <div className="flex-1 bg-white/5 p-2 rounded-md">
                <div className="flex justify-between items-center">
                  <Link href={`/profile/${comment.userId}`} className="text-sm font-medium text-white hover:underline">
                    {commentUsername}
                  </Link>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400">{comment.formattedTime}</span>
                    
                    {/* Only show delete button if user is the comment author */}
                    {currentUser.uid === comment.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-6 w-6 p-0 ml-1"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-300 mt-1">{comment.text}</p>

                {/* Comment actions */}
                <div className="flex items-center mt-1 space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-gray-400 hover:text-white h-6 p-0 px-1 text-xs ${replyingTo === comment.id ? 'text-indigo-400' : ''}`}
                    onClick={() => toggleReplyForm(comment.id)}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  
                  {comment.replies && comment.replies.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white h-6 p-0 px-1 text-xs"
                      onClick={() => toggleReplies(comment.id)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="ml-8">
                <CommentForm
                  postId={postId}
                  commentId={comment.id}
                  currentUser={currentUser}
                  refreshUserDetails={refreshUserDetails}
                  onCommentSubmitted={() => setReplyingTo(null)}
                  placeholder="Write a reply..."
                />
              </div>
            )}
            
            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && expandedReplies[comment.id] && (
              <div className="ml-8 space-y-2">
                {comment.replies.map((reply) => {
                  // Get the reply author's username from userDetails
                  const replyUsername = getUsernameById(reply.userId);
                  
                  return (
                    <div key={reply.id} className="flex space-x-2">
                      <UserAvatar 
                        user={{
                          username: replyUsername,
                          photoURL: userDetails[reply.userId]?.photoURL
                        }}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 bg-white/5 p-2 rounded-md">
                        <div className="flex justify-between items-center">
                          <Link href={`/profile/${reply.userId}`} className="text-sm font-medium text-white hover:underline">
                            {replyUsername}
                          </Link>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-400">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {reply.formattedTime}
                            </span>
                            
                            {/* Only show delete button if user is the reply author */}
                            {currentUser.uid === reply.userId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 h-6 w-6 p-0 ml-1"
                                onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{reply.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}