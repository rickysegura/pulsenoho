// src/app/page.js
import VenueList from '../components/VenueList';
import AuthComponent from '../components/AuthComponent';
import UserProfile from '../components/UserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-white text-center">
            NoHo Live
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <AuthComponent />
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <UserProfile />
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <VenueList />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}