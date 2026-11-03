/** Palette taken from road furniture: asphalt, lane-marking yellow, concrete. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        asphalt: { 950: '#12181F', 900: '#1B2430', 800: '#26323F', 700: '#34424F', 600: '#4A5A69' },
        lane: { DEFAULT: '#F2B705', dark: '#C99700', soft: '#FFF4CC' },
        concrete: { DEFAULT: '#EEF0EC', dark: '#DDE1DA' },
        go: '#1F9D55',
        stop: '#D64545',
        steel: '#5B6B7B',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
