import type { Config } from "jest";

const config: Config = {
  preset: "jest-expo/ios",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@react-native-google-signin/google-signin$":
      "<rootDir>/__mocks__/@react-native-google-signin/google-signin.ts",
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock.js",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.worktrees/"],
};

export default config;
