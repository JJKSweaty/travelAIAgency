import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12151f",
        paper: "#f7f4ef",
        mist: "#dfe7ea",
        reef: "#0f766e",
        coral: "#e85d4f",
        gold: "#d99b32"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(18, 21, 31, 0.12)",
        subtle: "0 10px 30px rgba(18, 21, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
