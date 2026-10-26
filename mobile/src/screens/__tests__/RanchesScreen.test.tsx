import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { RanchesScreen } from '../RanchesScreen';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = {
      user: { role: 'grower', email: 'grower@renu-biome.com' },
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('../../api/client', () => ({
  fetchRanches: jest.fn().mockImplementation(() => new Promise(() => {})),
  fetchDeliveries: jest.fn().mockImplementation(() => new Promise(() => {})),
  fetchPrograms: jest.fn().mockImplementation(() => new Promise(() => {})),
  fetchSamples: jest.fn().mockImplementation(() => new Promise(() => {})),
  fetchFeatureFlags: jest.fn().mockImplementation(() => new Promise(() => {})),
  submitRanch: jest.fn(),
  submitBlock: jest.fn(),
  submitTankSetup: jest.fn(),
  addTankMedicine: jest.fn(),
  deleteTankMedicine: jest.fn(),
  updateTankTracker: jest.fn(),
  addTankReport: jest.fn(),
  deleteTankReport: jest.fn(),
  submitSample: jest.fn(),
  replyToRecommendation: jest.fn(),
  importBlocks: jest.fn(),
  exportBlocks: jest.fn(),
}));

describe('RanchesScreen Render', () => {
  it('renders RanchesScreen without crashing and stays stable', () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RanchesScreen route={{ params: {} }} />);
    });
    expect(renderer.toJSON()).toBeTruthy();
  });
});
