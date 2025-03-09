// src/app/page.js
'use client';

import { useContext } from 'react';
import VenueList from '../components/VenueList';
import AuthComponent from '../components/AuthComponent';
import UserProfile from '../components/UserProfile';
import Heatmap from '../components/Heatmap';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MapContext } from './ClientLayout';

export default function Home() {
  const { isMapLoaded } = useContext(MapContext);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <header className="w-full mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">North Hollywood Live 🚦</h1>
          <p className="text-lg text-gray-300 mt-2">Vibe check venues in advance</p>
        </div>
      </header>

      <div className="w-full mx-auto flex flex-col md:flex-row gap-6">
        <main className="flex-1">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Vibe Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap isLoaded={isMapLoaded} />
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Venues</CardTitle>
            </CardHeader>
            <CardContent>
              <VenueList />
            </CardContent>
          </Card>
        </main>
        <aside className="w-full md:w-80 flex flex-col gap-6">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <UserProfile />
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Join the Community</CardTitle>
            </CardHeader>
            <CardContent>
              <AuthComponent />
            </CardContent>
          </Card>
        </aside>
      </div>
      <Footer />
    </div>
  );
}