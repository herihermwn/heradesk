/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./dashboard/**/*.{html,tsx,ts,jsx,js}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f5ff",
          100: "#e0ebff",
          200: "#c2d6ff",
          300: "#8fb4fc",
          400: "#5a8ff7",
          500: "#1877f2",  // Facebook blue
          600: "#1565d8",
          700: "#1254b5",
          800: "#0f4391",
          900: "#0a2f6b",
        },
      },
    },
  },
  plugins: [],
};
