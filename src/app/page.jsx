// src/app/page.js
'use client';

import { useState, useEffect } from 'react';
import VenueList from '../components/VenueList';
import AuthComponent from '../components/AuthComponent';
import UserProfile from '../components/UserProfile';
import Heatmap from '../components/Heatmap';
import { LoadScript } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import Footer from '@/components/Footer';

export default function Home() {
  const [sortMode, setSortMode] = useState('hot');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const handleMapLoad = () => {
    console.log('Google Maps API loaded at page level');
    setIsMapLoaded(true);
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_FIREBASE_API_KEY}
      libraries={['visualization']}
      onLoad={handleMapLoad}
    >
      <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
        <header className="w-full max-w-5xl mx-auto mb-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight">NoHo Live</h1>
            <p className="text-lg text-gray-300 mt-2">Vibe check in advance</p>
          </div>
        </header>

        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
          <main className="flex-1">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Vibe Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <Heatmap isLoaded={isMapLoaded} />
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-semibold">Venues</CardTitle>
                  <Tabs value={sortMode} onValueChange={setSortMode}>
                    <TabsList className="bg-white/10">
                      <TabsTrigger value="hot" className="text-white">Hot</TabsTrigger>
                      <TabsTrigger value="new" className="text-white">New</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <VenueList sortMode={sortMode} />
              </CardContent>
            </Card>
          </main>
          <aside className="w-full md:w-80 flex flex-col gap-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Your Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <UserProfile />
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Join the Party</CardTitle>
              </CardHeader>
              <CardContent>
                <AuthComponent />
              </CardContent>
            </Card>
          </aside>
        </div>
        <Footer />
      </div>
    </LoadScript>
  );
}