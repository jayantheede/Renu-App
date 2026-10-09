import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SignInScreen } from './SignInScreen';
import { Alert } from 'react-native';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

// Mock useAuthStore
jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: jest.fn(() => ({
    setSession: jest.fn(),
  })),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly without crashing', () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<SignInScreen navigation={mockNavigation} />);
    });
    const tree = renderer.toJSON();
    expect(tree).toBeTruthy();
  });
});
