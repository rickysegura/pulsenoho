'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, collection, query, orderBy, addDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Send, ImageIcon, MessageSquare, Loader2, X } from 'lucide-react';
import { addSnapshot, removeSnapshot } from '../../../lib/snapshotManager';
import UserAvatar from '../../../components/UserAvatar';

export default function ChatDetailPage() {
  const { currentUser } = useAuth();
  const { chatId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState(null);
  const messagesEndRef = useRef(null);
  const [messageSending, setMessageSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Get recipient info from URL params or try to extract from chatId
  const recipientId = searchParams.get('recipient') || chatId.split('_').find(id => id !== currentUser?.uid);
  const recipientName = searchParams.get('name');

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Create or check chat document
    const initializeChat = async () => {
      try {
        if (!recipientId) {
          toast.error('Recipient information is missing');
          router.push('/messages');
          return;
        }

        // Check if chat document exists
        const chatRef = doc(db, 'messages', chatId);
        const chatDoc = await getDoc(chatRef);

        // Get recipient details
        const recipientRef = doc(db, 'users', recipientId);
        const recipientDoc = await getDoc(recipientRef);
        
        if (recipientDoc.exists()) {
          setRecipient(recipientDoc.data());
        } else {
          toast.error('Recipient user not found');
          router.push('/messages');
          return;
        }

        // If chat document doesn't exist, create it
        if (!chatDoc.exists()) {
          // Create a new chat with both users as participants
          const participants = [currentUser.uid, recipientId].sort();
          
          // Create the chat document with initial data
          await updateDoc(chatRef, {
            participants,
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
            lastMessage: 'No messages yet',
            // Store unread counts for each participant
            unreadCount: {
              [currentUser.uid]: 0,
              [recipientId]: 0
            }
          }, { merge: true });
        } else {
          // Reset unread count for current user when they open the chat
          const unreadCountUpdate = {};
          unreadCountUpdate[`unreadCount.${currentUser.uid}`] = 0;
          
          await updateDoc(chatRef, unreadCountUpdate);
        }

        // Set up listener for messages
        const messagesRef = collection(db, 'messages', chatId, 'messagesList');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          }));
          
          setMessages(messageList);
          setLoading(false);
          
          // Scroll to bottom on new messages
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, (error) => {
          // Handle errors in the snapshot listener
          console.error('Snapshot listener error:', error);
          // If it's a permission error and the user is no longer logged in, just clean up
          if (error.code === 'permission-denied' && !currentUser) {
            // No need to unsubscribe here as it will be handled by the snapshot manager
          } else {
            toast.error('Error loading messages');
          }
          setLoading(false);
        });

        // Register with snapshot manager instead of using unsubscribeRef
        addSnapshot(unsubscribe);
      } catch (error) {
        console.error('Error initializing chat:', error);
        toast.error('Error loading conversation');
        setLoading(false);
      }
    };

    initializeChat();

    // We don't need to clean up here as the snapshot manager will handle it
    // when the component unmounts or when the user navigates away
  }, [currentUser, chatId, recipientId, router, recipientName]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle removing the selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Check if there's either text or an image to send
    if ((!newMessage.trim() && !selectedImage) || !currentUser || !recipientId || messageSending) {
      return;
    }
    
    setMessageSending(true);
    
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        
        try {
          const storageRef = ref(storage, `chat_images/${chatId}/${Date.now()}_${selectedImage.name}`);
          await uploadBytes(storageRef, selectedImage);
          imageUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to upload image');
          setMessageSending(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }
      
      // Add message to messages collection
      const messagesRef = collection(db, 'messages', chatId, 'messagesList');
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        recipientId: recipientId,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: imageUrl
      });
      
      // Update chat document with last message info
      const chatRef = doc(db, 'messages', chatId);
      
      // Set last message text (prioritize text content, or fallback to [Image] if only an image was sent)
      const lastMessageText = newMessage.trim() || (imageUrl ? '[Image]' : 'No message');
      
      // Increment unread count for recipient
      const chatUpdate = {
        lastMessage: lastMessageText,
        lastMessageTimestamp: serverTimestamp(),
        [`unreadCount.${recipientId}`]: (messages.filter(m => !m.read && m.senderId === currentUser.uid).length + 1)
      };
      
      await updateDoc(chatRef, chatUpdate);
      
      // Clear input and image
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setMessageSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    // If message is from today, don't show date
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // If message is from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show full date
    return messageDate.toLocaleDateString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];
    
    messages.forEach(message => {
      const messageDate = message.timestamp ? message.timestamp.toDateString() : 'Unknown';
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            messages: currentGroup
          });
        }
        
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentGroup
      });
    }
    
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading conversation...</p>
      </div>
    );
  }

  // Add a guard to prevent rendering when currentUser is null
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="text-xl">You need to be logged in to view this conversation.</p>
        <Button 
          onClick={() => router.push('/login')} 
          className="mt-4 bg-indigo-600 hover:bg-indigo-700"
        >
          Log In
        </Button>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-none">
        <div className="container mx-auto max-w-3xl p-4">
          <div className="flex items-center mb-4">
            <Link href="/messages" className="mr-3">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href={`/profile/${recipientId}`}>
              <UserAvatar 
                user={{ 
                  username: recipientName || recipient?.username || 'Chat',
                  photoURL: recipient?.photoURL || null
                }} 
                size="sm"
                className="mr-2 cursor-pointer" 
              />
            </Link>
            <h1 className="text-xl font-bold">
              {recipientName || recipient?.username || 'Chat'}
            </h1>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-4 container mx-auto max-w-3xl">
        {messageGroups.length > 0 ? (
          <div className="space-y-6">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-3">
                <div className="text-center">
                  <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                    {formatMessageDate(group.messages[0].timestamp)}
                  </span>
                </div>
                
                {group.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.senderId !== currentUser.uid && (
                      <div className="mr-2 flex items-end mb-1">
                        <Link href={`/profile/${recipientId}`}>
                          <UserAvatar 
                            user={{ 
                              username: recipient?.username || 'User',
                              photoURL: recipient?.photoURL || null
                            }} 
                            size="sm"
                            className="cursor-pointer" 
                          />
                        </Link>
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg p-3 ${
                        message.senderId === currentUser.uid
                          ? 'bg-indigo-700 text-white'
                          : 'bg-white/10 border border-white/10 text-gray-200'
                      }`}
                    >
                      {/* Display text message if present */}
                      {message.text && (
                        <p className="break-words mb-2">{message.text}</p>
                      )}
                      
                      {/* Display image if present */}
                      {message.imageUrl && (
                        <div className="mt-1 mb-2">
                          <div className="relative h-48 w-full rounded overflow-hidden">
                            <Image 
                              src={message.imageUrl}
                              alt="Shared image"
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className={`text-xs mt-1 ${message.senderId === currentUser.uid ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-6 bg-white/5 rounded-lg border border-white/10 max-w-md">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-indigo-400" />
              <h3 className="text-lg font-medium text-white mb-2">Start the conversation</h3>
              <p className="text-gray-400 mb-4">
                Say hello and start chatting with {recipientName || recipient?.username || 'this user'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Image preview area */}
      {imagePreview && (
        <div className="bg-gray-800 p-3 border-t border-white/10">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-300">Image Preview</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative h-40 w-full rounded overflow-hidden border border-white/20">
              <Image 
                src={imagePreview}
                alt="Selected image"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Message input area */}
      <div className="flex-none bg-gray-900 pt-2 pb-4 border-t border-white/10">
        <div className="container mx-auto max-w-3xl px-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-white/10 border-white/20 text-white pr-10"
                disabled={messageSending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white h-8 w-8 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={messageSending}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={messageSending}
              />
            </div>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={(!newMessage.trim() && !selectedImage) || messageSending}
            >
              {messageSending || uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}