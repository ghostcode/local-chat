/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        macaron: {
          pink: '#F8B4C8',
          peach: '#FCCB9F',
          yellow: '#FDE89A',
          mint: '#B5EAD7',
          blue: '#B5D8EB',
          lav: '#C7CEEA',
          lilac: '#E2C6FF',
          rose: '#FFD1DC',
          'pink-d': '#D4839A',
          'mint-d': '#7BC4A8',
          'blue-d': '#7BAFCB',
          'lav-d': '#9A9FC5'
        },
        surface: {
          main: '#FFF5F7',
          card: '#FFFFFF',
          input: '#F9F4F6',
          sidebar: '#FDF2F5',
          hover: '#FDF0F3',
          msg2: '#FFFFFF',
          msg1: '#E8F5F9'
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif']
      }
    }
  },
  plugins: []
};
