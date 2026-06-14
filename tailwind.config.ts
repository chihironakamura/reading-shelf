import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18332d",
        forest: "#205b4b",
        leaf: "#2f7d65",
        cream: "#f7f4ec",
        coral: "#ef7557",
      },
      boxShadow: {
        card: "0 18px 50px rgba(31, 74, 62, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
