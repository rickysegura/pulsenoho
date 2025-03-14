'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, getDoc, updateDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Trash2, Edit, Save, MapPin, Users, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { addSnapshot, removeSnapshot } from '../../lib/snapshotManager';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
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
    totalVibes: 0
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

  // Load venues and users when admin status is confirmed
  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      try {
        // Subscribe to venues collection using the snapshot manager
        const unsubscribeVenues = onSnapshot(collection(db, 'venues'), (snapshot) => {
          const venueData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setVenues(venueData);
          setLoading(false);
        });
        
        // Register with snapshot manager
        addSnapshot(unsubscribeVenues);

        // Load users with the snapshot manager
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const userData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setUsers(userData);
        });
        
        // Register with snapshot manager
        addSnapshot(unsubscribeUsers);

        // Load basic statistics
        const venuesSnapshot = await getDocs(collection(db, 'venues'));
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        setStatsData({
          totalVenues: venuesSnapshot.size,
          totalUsers: usersSnapshot.size,
          totalVibes: 0 // Simplified - not calculating total vibes
        });

        // No need for explicit cleanup as the snapshot manager handles this
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
    
    // No need for explicit cleanup as the snapshot manager handles this
  }, [isAdmin]);

  const handleAddVenue = async (e) => {
    e.preventDefault();
    if (!newVenue.name || !newVenue.type || !newVenue.lat || !newVenue.lng) return;

    try {
      await addDoc(collection(db, 'venues'), {
        name: newVenue.name,
        type: newVenue.type,
        lat: parseFloat(newVenue.lat),
        lng: parseFloat(newVenue.lng),
        address: newVenue.address || ''
      });
      
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
    }
  };

  const handleRemoveVenue = async (venueId) => {
    if (!confirm('Are you sure you want to delete this venue? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'venues', venueId));
    } catch (error) {
      console.error('Error removing venue:', error);
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
      
      setEditingVenue(null);
    } catch (error) {
      console.error('Error updating venue:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingVenue(null);
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
        </div>
        
        {/* Main Content */}
        <Tabs defaultValue="venues" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 mb-6">
            <TabsTrigger value="venues" className="data-[state=active]:bg-indigo-600">Venues</TabsTrigger>
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
                                  onClick={() => handleRemoveVenue(venue.id)}
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