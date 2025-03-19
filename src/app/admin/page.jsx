'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, getDoc, updateDoc, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Trash2, 
  Edit, 
  Save, 
  MapPin, 
  ArrowLeft, 
  Plus,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { addSnapshot } from '../../lib/snapshotManager';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [chatRoomRequests, setChatRoomRequests] = useState([]);
  const [approvedChatRooms, setApprovedChatRooms] = useState([]);
  const [newVenue, setNewVenue] = useState({ 
    name: '', 
    type: '', 
    lat: '', 
    lng: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('venues');
  const [editingVenue, setEditingVenue] = useState(null);
  const [statsData, setStatsData] = useState({
    totalVenues: 0,
    totalUsers: 0,
    totalChatRooms: 0
  });
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Fetch isAdmin status
    const checkAdminStatus = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().isAdmin === true) {
          setIsAdmin(true);
        } else {
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/');
      }
    };
    
    checkAdminStatus();
  }, [currentUser, router]);

  // Load data when admin status is confirmed
  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      try {
        // Subscribe to venues collection using the snapshot manager
        addSnapshot(onSnapshot(collection(db, 'venues'), (snapshot) => {
          const venueData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setVenues(venueData);
          
          // Update the stats data with the new venue count
          setStatsData(prev => ({
            ...prev,
            totalVenues: snapshot.docs.length
          }));
          
          setLoading(false);
        }));

        // Load users with the snapshot manager
        addSnapshot(onSnapshot(collection(db, 'users'), (snapshot) => {
          const userData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setUsers(userData);
          
          // Update users count
          setStatsData(prev => ({
            ...prev,
            totalUsers: snapshot.docs.length
          }));
        }));
        
        // Load pending chat room requests
        const pendingRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('approved', '==', false),
          orderBy('createdAt', 'desc')
        );
        
        addSnapshot(onSnapshot(pendingRoomsQuery, async (snapshot) => {
          const requestData = await Promise.all(
            snapshot.docs.map(async (roomDoc) => {
              const data = roomDoc.data();
              let creatorName = 'Unknown User';
              
              try {
                const userRef = doc(db, 'users', data.creatorId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  creatorName = userSnap.data().username || userSnap.data().displayName || creatorName;
                }
              } catch (err) {
                console.error('Error fetching creator data:', err);
              }
              
              return {
                id: roomDoc.id,
                ...data,
                creatorName
              };
            })
          );
          
          setChatRoomRequests(requestData);
        }));
        
        // Load approved chat rooms
        const approvedRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('approved', '==', true),
          orderBy('createdAt', 'desc')
        );
        
        addSnapshot(onSnapshot(approvedRoomsQuery, (snapshot) => {
          const roomsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setApprovedChatRooms(roomsData);
          
          // Update chat rooms count
          setStatsData(prev => ({
            ...prev,
            totalChatRooms: roomsData.length
          }));
        }));

      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
        
        toast.error("Failed to load dashboard data. Please try refreshing.");
      }
    };

    loadData();
    
    // No need for explicit cleanup as the snapshot manager handles this
  }, [isAdmin]);

  const handleAddVenue = async (e) => {
    e.preventDefault();
    if (!newVenue.name || !newVenue.type || !newVenue.lat || !newVenue.lng) return;

    try {
      const docRef = await addDoc(collection(db, 'venues'), {
        name: newVenue.name,
        type: newVenue.type,
        lat: parseFloat(newVenue.lat),
        lng: parseFloat(newVenue.lng),
        address: newVenue.address || ''
      });
      
      // Display success toast
      toast.success(`"${newVenue.name}" has been added successfully.`);
      
      // Reset form
      setNewVenue({ 
        name: '', 
        type: '', 
        lat: '', 
        lng: '',
        address: ''
      });
      
    } catch (error) {
      console.error('Error adding venue:', error);
      
      // Display error toast
      toast.error("An error occurred while adding the venue. Please try again.");
    }
  };

  const handleRemoveVenue = async (venueId, venueName) => {
    if (!confirm('Are you sure you want to delete this venue? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'venues', venueId));
      
      // Display success toast
      toast.success(`"${venueName}" has been removed.`);
      
    } catch (error) {
      console.error('Error removing venue:', error);
      
      // Display error toast
      toast.error("An error occurred while deleting the venue. Please try again.");
    }
  };

  const handleEditVenue = (venue) => {
    setEditingVenue(venue);
  };

  const handleUpdateVenue = async (e) => {
    e.preventDefault();
    
    try {
      const venueRef = doc(db, 'venues', editingVenue.id);
      await updateDoc(venueRef, {
        name: editingVenue.name,
        type: editingVenue.type,
        lat: parseFloat(editingVenue.lat),
        lng: parseFloat(editingVenue.lng),
        address: editingVenue.address || ''
      });
      
      // Display success toast
      toast.success(`"${editingVenue.name}" has been updated successfully.`);
      
      setEditingVenue(null);
    } catch (error) {
      console.error('Error updating venue:', error);
      
      // Display error toast
      toast.error("An error occurred while updating the venue. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditingVenue(null);
  };
  
  const handleApproveChatRoom = async (roomId, roomTitle) => {
    try {
      const roomRef = doc(db, 'chatRooms', roomId);
      await updateDoc(roomRef, {
        approved: true
      });
      
      toast.success(`Chat room "${roomTitle}" has been approved.`);
    } catch (error) {
      console.error('Error approving chat room:', error);
      toast.error("Failed to approve chat room. Please try again.");
    }
  };
  
  const handleRejectChatRoom = async (roomId, roomTitle) => {
    if (!confirm('Are you sure you want to reject this chat room request? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'chatRooms', roomId));
      toast.success(`Chat room request "${roomTitle}" has been rejected.`);
    } catch (error) {
      console.error('Error rejecting chat room:', error);
      toast.error("Failed to reject chat room request. Please try again.");
    }
  };
  
  const handleDeleteChatRoom = async (roomId, roomTitle) => {
    if (!confirm('Are you sure you want to delete this chat room? All messages will be permanently lost.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'chatRooms', roomId));
      toast.success(`Chat room "${roomTitle}" has been deleted.`);
    } catch (error) {
      console.error('Error deleting chat room:', error);
      toast.error("Failed to delete chat room. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 relative">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: 'rgba(34, 197, 94, 0.9)',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: 'rgba(220, 38, 38, 0.9)',
            },
          },
        }}
      />
      
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/dashboard" className="text-gray-300 hover:text-white inline-flex items-center mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Link>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <div>
            <Badge className="bg-indigo-600 text-white">Admin</Badge>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white">{statsData.totalVenues}</div>
              <p className="text-gray-400">Total Venues</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white">{statsData.totalUsers}</div>
              <p className="text-gray-400">Total Users</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white">{users.filter(u => u.isAdmin).length}</div>
              <p className="text-gray-400">Admin Users</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white">{statsData.totalChatRooms}</div>
              <p className="text-gray-400">Chat Rooms</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Tabs defaultValue="venues" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 mb-6">
            <TabsTrigger value="venues" className="data-[state=active]:bg-indigo-600">Venues</TabsTrigger>
            <TabsTrigger value="chatrooms" className="data-[state=active]:bg-indigo-600">Chat Rooms</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-indigo-600">Users</TabsTrigger>
          </TabsList>
          
          {/* Venues Tab */}
          <TabsContent value="venues">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Add New Venue</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddVenue} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Venue Name *</label>
                      <Input
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                        placeholder="e.g. Republic of Pie"
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Venue Type *</label>
                      <Input
                        value={newVenue.type}
                        onChange={(e) => setNewVenue({ ...newVenue, type: e.target.value })}
                        placeholder="e.g. Coffee Shop, Bar, Restaurant"
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Latitude *</label>
                      <Input
                        value={newVenue.lat}
                        onChange={(e) => setNewVenue({ ...newVenue, lat: e.target.value })}
                        placeholder="e.g. 34.1672"
                        type="number"
                        step="any"
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Longitude *</label>
                      <Input
                        value={newVenue.lng}
                        onChange={(e) => setNewVenue({ ...newVenue, lng: e.target.value })}
                        placeholder="e.g. -118.3769"
                        type="number"
                        step="any"
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Address</label>
                    <Input
                      value={newVenue.address}
                      onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
                      placeholder="e.g. 11118 Magnolia Blvd, North Hollywood"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Add Venue
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold text-white">Manage Venues</CardTitle>
                  <p className="text-sm text-gray-400">{venues.length} venues total</p>
                </div>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <p className="text-gray-400 text-center py-6">No venues yet.</p>
                ) : (
                  <div className="space-y-4">
                    {venues.map((venue) => (
                      <div
                        key={venue.id}
                        className="bg-white/5 p-4 rounded-lg border border-white/10 transition-colors"
                      >
                        {editingVenue && editingVenue.id === venue.id ? (
                          <form onSubmit={handleUpdateVenue} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Venue Name</label>
                                <Input
                                  value={editingVenue.name}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, name: e.target.value })}
                                  className="bg-white/10 border-white/20 text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Venue Type</label>
                                <Input
                                  value={editingVenue.type}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, type: e.target.value })}
                                  className="bg-white/10 border-white/20 text-white"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Latitude</label>
                                <Input
                                  value={editingVenue.lat}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, lat: e.target.value })}
                                  type="number"
                                  step="any"
                                  className="bg-white/10 border-white/20 text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Longitude</label>
                                <Input
                                  value={editingVenue.lng}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, lng: e.target.value })}
                                  type="number"
                                  step="any"
                                  className="bg-white/10 border-white/20 text-white"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm text-gray-400 mb-1 block">Address</label>
                              <Input
                                value={editingVenue.address || ''}
                                onChange={(e) => setEditingVenue({ ...editingVenue, address: e.target.value })}
                                className="bg-white/10 border-white/20 text-white"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Save className="h-4 w-4 mr-1" /> Save Changes
                              </Button>
                              <Button type="button" onClick={handleCancelEdit} variant="outline" className="border-white/20 text-white">
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-white flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{venue.name}</span>
                                </h3>
                                <p className="text-gray-400 text-sm">{venue.type}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditVenue(venue)}
                                  className="text-gray-300 hover:text-white hover:bg-white/10"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveVenue(venue.id, venue.name)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-sm">
                              <div className="flex items-center text-gray-300 mt-1">
                                <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                <span>{venue.lat}, {venue.lng}</span>
                              </div>
                              
                              {venue.address && (
                                <div className="flex items-center text-gray-300 mt-1">
                                  <span>{venue.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Chat Rooms Tab */}
          <TabsContent value="chatrooms">
            <div className="space-y-6">
              {/* Pending Chat Room Requests */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-semibold text-white">
                      Pending Chat Room Requests
                    </CardTitle>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                      {chatRoomRequests.length} pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {chatRoomRequests.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">No pending chat room requests.</p>
                  ) : (
                    <div className="space-y-4">
                      {chatRoomRequests.map((room) => (
                        <div
                          key={room.id}
                          className="bg-white/5 p-4 rounded-lg border border-white/10"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white text-lg">{room.title}</h3>
                              <p className="text-gray-400 text-sm">
                                Requested by: {room.creatorName} • {room.createdAt?.toDate().toLocaleString() || 'Recently'}
                              </p>
                              <p className="text-gray-300 mt-2">
                                {room.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveChatRoom(room.id, room.title)}
                                className="border-green-500 text-green-400 hover:bg-green-500/20"
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectChatRoom(room.id, room.title)}
                                className="border-red-500 text-red-400 hover:bg-red-500/20"
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Approved Chat Rooms */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-semibold text-white">
                      Active Chat Rooms
                    </CardTitle>
                    <Badge variant="outline" className="border-indigo-500 text-indigo-400">
                      {approvedChatRooms.length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {approvedChatRooms.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">No active chat rooms.</p>
                  ) : (
                    <div className="space-y-4">
                      {approvedChatRooms.map((room) => (
                        <div
                          key={room.id}
                          className="bg-white/5 p-4 rounded-lg border border-white/10"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <h3 className="font-semibold text-white text-lg">{room.title}</h3>
                                <Badge className="ml-2 bg-green-600 text-white">Active</Badge>
                              </div>
                              <p className="text-gray-400 text-sm">
                                Created: {room.createdAt?.toDate().toLocaleString() || 'Recently'}
                              </p>
                              <p className="text-gray-300 mt-2">
                                {room.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/forum?room=${room.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/20"
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" /> View
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteChatRoom(room.id, room.title)}
                                className="border-red-500 text-red-400 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold text-white">Manage Users</CardTitle>
                  <p className="text-sm text-gray-400">{users.length} users total</p>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-gray-400 text-center py-6">No users found.</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium">
                                {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{user.username || 'Unnamed User'}</h3>
                              <p className="text-sm text-gray-400">{user.email || user.id.substring(0, 8)}</p>
                            </div>
                          </div>
                          <div className="mt-1 text-sm">
                            <span className="text-gray-300">Points: <span className="text-white">{user.points || 0}</span></span>
                            {user.isAdmin && (
                              <Badge className="ml-2 bg-indigo-600 text-white">Admin</Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <Link href={`/profile/${user.id}`}>
                            <Button size="sm" className="text-white border-white/20 hover:bg-white/10">
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}