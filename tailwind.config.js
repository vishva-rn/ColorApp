/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins-Regular'],
        'poppins-medium': ['Poppins-Medium'],
        'poppins-semibold': ['Poppins-SemiBold'],
        'poppins-bold': ['Poppins-Bold'],
        'poppins-light': ['Poppins-Light'],
        mersin: ['Mersin-Regular'],
        'mersin-medium': ['Mersin-Medium'],
        'mersin-bold': ['Mersin-Bold'],
        'mersin-bolditalic': ['Mersin-BoldItalic'],
        'mersin-semibold': ['Mersin-SemiBold'],
        'mersin-light': ['Mersin-Light'],
        'mersin-thinitalic': ['Mersin-ThinItalic'],
        'mersin-mediumitalic': ['Mersin-MediumItalic'],
        fraunces: ['Fraunces-Regular'],
      },
      colors: {
        screen: '#F7F2EF',
      },
    },
  },
  plugins: [],
};
