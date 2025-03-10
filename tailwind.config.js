/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Custom colors can be defined here for consistent usage
        'app-background': '#121212',
        'card-background': 'rgba(255, 255, 255, 0.05)',
        'card-hover': 'rgba(255, 255, 255, 0.1)',
        'status-quiet': '#22c55e',
        'status-moderate': '#eab308',
        'status-busy': '#ef4444',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/postcss'),
    require('tailwindcss-animate'),
  ],
};