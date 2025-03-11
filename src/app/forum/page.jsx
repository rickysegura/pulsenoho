// src/app/forum/page.js
'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { addSnapshot, removeSnapshot } from '../../lib/snapshotManager';

export default function Forum() {
 const { currentUser } = useAuth();
 const [messages, setMessages] = useState([]);
 const [newMessage, setNewMessage] = useState('');
 const [loading, setLoading] = useState(true);
 const router = useRouter();

 useEffect(() => {
   if (!currentUser) {
     router.push('/');
     return;
   }

   const q = query(
     collection(db, 'forum'), 
     orderBy('timestamp', 'desc'), 
     limit(30)
   );
   
   const unsubscribe = onSnapshot(q, async (snapshot) => {
     try {
       const messageData = await Promise.all(
         snapshot.docs.map(async (messageDoc) => {
           const data = messageDoc.data();
           let photoURL = '';
           
           try {
             const userRef = doc(db, 'users', data.userId);
             const userSnap = await getDoc(userRef);
             photoURL = userSnap.exists() ? userSnap.data().photoURL || '' : '';
           } catch (err) {
             console.error('Error fetching user data:', err);
           }
           
           return {
             id: messageDoc.id,
             userId: data.userId,
             username: data.username || 'Anonymous',
             photoURL,
             text: data.text,
             timestamp: data.timestamp,
             formattedTime: data.timestamp?.toDate().toLocaleTimeString() || 'Sending...'
           };
         })
       );
       
       setMessages(messageData);
       setLoading(false);
     } catch (error) {
       console.error('Error processing messages:', error);
       setLoading(false);
     }
   });

   // Register with snapshot manager instead of manually handling cleanup
   addSnapshot(unsubscribe);
   
   // No need for explicit cleanup as the snapshot manager handles this
 }, [currentUser, router]);

 const handleSendMessage = async (e) => {
   e.preventDefault();
   if (!newMessage.trim()) return;

   try {
     let username = currentUser.displayName || 'Anonymous';
     const userDocRef = doc(db, 'users', currentUser.uid);
     const userSnap = await getDoc(userDocRef);
     if (userSnap.exists()) {
       username = userSnap.data().username || username;
     }

     await addDoc(collection(db, 'forum'), {
       userId: currentUser.uid,
       username,
       text: newMessage.trim(),
       timestamp: serverTimestamp(),
     });
     
     setNewMessage('');
   } catch (error) {
     console.error('Error sending message:', error);
     toast.error('Failed to send message');
   }
 };

 if (loading) {
   return <p className="text-gray-400 text-center">Loading forum...</p>;
 }

 if (!currentUser) return null;

 return (
  <div className="min-h-screen bg-gray-900 text-white flex flex-col">
    <Card className="w-full flex-1 flex flex-col bg-white/10 backdrop-blur-lg border-white/20 shadow-lg rounded-none">
      <CardHeader className="border-b border-white/20 py-3">
        <CardTitle className="text-2xl font-semibold text-white flex justify-between items-center">
           <span>Community Forum</span>
           <Button 
             variant="ghost" 
             size="sm"
             onClick={() => router.push('/dashboard')} 
             className="text-gray-300 hover:text-white"
           >
             Home
           </Button>
         </CardTitle>
       </CardHeader>
       <CardContent className="p-0 flex-1 flex flex-col">
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {messages.map((msg) => (
             <div
               key={msg.id}
               className={`flex items-start gap-3 p-3 rounded-lg ${
                 msg.userId === currentUser.uid
                   ? 'bg-white/20 ml-auto max-w-[70%]'
                   : 'bg-gray-800 mr-auto max-w-[70%]'
               } transition-all hover:bg-opacity-90`}
             >
               {msg.photoURL ? (
                 <Image
                   src={msg.photoURL}
                   alt={`${msg.username}'s avatar`}
                   width={40}
                   height={40}
                   className="rounded-full border-2 border-white/20"
                 />
               ) : (
                 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/20">
                   <span className="text-white font-semibold">{msg.username.charAt(0).toUpperCase()}</span>
                 </div>
               )}
               <div className="flex-1">
                 <p className="text-gray-300 text-sm">
                   <Link href={`/profile/${msg.userId}`} className="font-semibold text-white hover:underline">
                     {msg.username}
                   </Link>{' '}
                   <span className="text-gray-400 text-xs">
                     at {msg.formattedTime}
                   </span>
                 </p>
                 <p className="text-white break-words">{msg.text}</p>
               </div>
             </div>
           ))}
         </div>
         
         <form
           onSubmit={handleSendMessage}
           className="sticky bottom-0 bg-gradient-to-t from-gray-900/80 to-transparent p-4 border-t border-white/20"
         >
           <div className="flex gap-2">
             <Input
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               placeholder="Type your message..."
               className="bg-white/10 border-white/20 text-white flex-1 focus:ring-2 focus:ring-white/30"
             />
             <Button 
               type="submit" 
               className="bg-white/20 text-white hover:bg-white/30"
               disabled={!newMessage.trim()}
             >
               Send
             </Button>
           </div>
         </form>
       </CardContent>
     </Card>
   </div>
 );
}