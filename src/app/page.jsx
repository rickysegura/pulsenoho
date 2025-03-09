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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Hero Section with Heatmap */}
      <div className="relative w-full">
        <Heatmap isLoaded={isMapLoaded} />
        <div className="absolute top-0 left-0 w-full p-6">
          <div className="bg-black/10 backdrop-blur-sm inline-block px-4 py-2 rounded-lg">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md">
              NoHo Live 🚦
            </h1>
            <p className="text-lg md:text-xl text-gray-200 drop-shadow-md">
              Vibe check venues in advance
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto flex flex-col md:flex-row gap-6 px-4 mt-6">
        <main className="flex-1">
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

      {/* Footer */}
      <Footer />
    </div>
  );
}