# NoHo Live

A real-time venue crowd monitoring app for North Hollywood, built with Next.js and Firebase.

![NoHo Live Screenshot](public/screenshot.png)

## Features

- **Real-time Venue Monitoring**: See how busy venues are right now
- **Vibe Check System**: Submit and view crowd levels on a 1-5 scale
- **User Authentication**: Create an account to participate
- **Point System**: Earn points for contributing venue vibes
- **User Profiles**: Customize your profile and follow other users
- **Heat Map**: Visual representation of venue busyness across NoHo

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Mapping**: Google Maps API
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Firebase project
- Google Maps API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/noho-live.git
   cd noho-live
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env.local` file with your Firebase and Google Maps credentials:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the app.

## Firebase Setup

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password)
3. Set up Firestore Database with the following collections:
   - `users`
   - `venues`
   - `forum`
4. Set up Firebase Storage for user avatars
5. Configure Firestore rules using the provided `firestore.rules` file

## Project Structure

```
noho-live/
├── public/           # Static assets
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── contexts/     # Context providers
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utility functions and Firebase setup
│   └── ui/           # UI components (shadcn/ui)
├── .env.local        # Environment variables (not tracked)
├── next.config.js    # Next.js config
└── tailwind.config.js # Tailwind CSS config
```

## Feature Roadmap

- [ ] Venue photo uploads
- [ ] Venue owner accounts
- [ ] Events calendar
- [ ] Push notifications for venue status changes
- [ ] Dark/light theme toggle
- [ ] Mobile app version

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built by Ricky Segura
- UI components powered by shadcn/ui
- Mapping powered by Google Maps
- Backend infrastructure by Firebase

---

Feel free to contribute by opening issues or submitting pull requests!