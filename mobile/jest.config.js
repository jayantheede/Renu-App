module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    '^react-native/setup-env$': '<rootDir>/setup-env-mock.js',
    '^test-renderer$': 'react-test-renderer'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
