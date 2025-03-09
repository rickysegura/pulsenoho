// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
images: {
    remotePatterns: [
    {
        protocol: 'https',
        hostname: 'pbs.twimg.com', // For Twitter profile images
        port: '',
        pathname: '/profile_images/**', // Match Twitter profile image paths
    },
    {
        protocol: 'https',
        hostname: '*.googleapis.com', // For Firebase Storage (covers various subdomains)
        port: '',
        pathname: '/**', // Match any path under Firebase Storage
    },
    ],
},
};

export default nextConfig;