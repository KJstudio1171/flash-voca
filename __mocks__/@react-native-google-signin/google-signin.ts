export const GoogleSignin = {
  configure: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  isSignedIn: jest.fn().mockResolvedValue(false),
  getCurrentUser: jest.fn().mockReturnValue(null),
  getTokens: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
};

export const statusCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
};
