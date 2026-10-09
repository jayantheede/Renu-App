import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  multiSet: jest.fn().mockResolvedValue(null),
  multiRemove: jest.fn().mockResolvedValue(null),
  multiGet: jest.fn().mockResolvedValue([['@auth_token', null], ['@auth_user', null]]),
}));

// Mock for React 19 test-renderer where createRoot was removed
const testRenderer = require('react-test-renderer');
if (!testRenderer.createRoot) {
  testRenderer.createRoot = function(options) {
    let instance = null;
    return {
      render: function(element) {
        if (instance) {
          instance.update(element);
        } else {
          instance = testRenderer.create(element, options);
        }
      },
      unmount: function() {
        if (instance) {
          instance.unmount();
          instance = null;
        }
      },
      get container() {
        return instance;
      }
    };
  };
}
