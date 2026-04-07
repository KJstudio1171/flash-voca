import type { Config } from "jest";

const config: Config = {
  preset: "jest-expo/ios",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
