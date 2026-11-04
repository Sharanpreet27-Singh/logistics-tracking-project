/** Warm "delivery" palette: cream paper, sunflower yellow trucks, ember charts, ink text. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F6F2EB', dark: '#ECE6DB', deep: '#DED5C4' },
        ink: { DEFAULT: '#17191D', soft: '#6F737B', mute: '#A2A6AE' },
        sun: { DEFAULT: '#F7B500', dark: '#D99E00', soft: '#FFF4CF' },
        ember: { DEFAULT: '#E8553F', soft: '#FDEAE6' },
        berry: { DEFAULT: '#D14A8E', soft: '#FBE4EF' },
        leaf: { DEFAULT: '#1F9D55', soft: '#E3F5EA' },
        sky: { DEFAULT: '#2563EB', soft: '#E4ECFD' },
        line: '#ECE7DE',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,25,29,.04), 0 10px 30px -16px rgba(23,25,29,.14)',
        float: '0 16px 40px -12px rgba(23,25,29,.28)',
      },
      borderRadius: { '4xl': '28px' },
    },
  },
  plugins: [],
};
