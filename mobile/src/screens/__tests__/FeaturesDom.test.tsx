import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SignInScreen } from '../auth/SignInScreen';
import { InstallScreen } from '../InstallScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: jest.fn(() => ({
    setSession: jest.fn(),
    user: { role: 'Grower', email: 'sravangaaismartsolutions@gmail.com' }
  })),
}));

describe('DOM & UI Component Tree Testing (ReNu-Biome Requirements)', () => {
  describe('1. SignInScreen DOM Hierarchy & Elements', () => {
    let renderer: any;

    beforeEach(() => {
      act(() => {
        renderer = TestRenderer.create(<SignInScreen navigation={mockNavigation} />);
      });
    });

    it('renders Farmer Pride brand tagline and GROWER PORTAL badge in DOM', () => {
      const tree = renderer.toJSON();
      const stringified = JSON.stringify(tree);

      expect(stringified).toContain("Farmer's Pride");
      expect(stringified).toContain('GROWER PORTAL');
    });

    it('renders input elements for email and password', () => {
      const root = renderer.root;
      const inputs = root.findAllByType('TextInput' as any);
      // At least 2 text inputs (Email and Password)
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('renders official support email support@renu-biome.com in DOM footer', () => {
      const tree = renderer.toJSON();
      const stringified = JSON.stringify(tree);

      expect(stringified).toContain('support@renu-biome.com');
      expect(stringified).toContain('Need an account?');
    });

    it('renders staging demo buttons including Grower button with sravangaaismartsolutions.com', () => {
      const tree = renderer.toJSON();
      const stringified = JSON.stringify(tree);
      expect(stringified).toContain('DEMO LOGINS (STAGING)');
      expect(stringified).toContain('Admin');
      expect(stringified).toContain('Grower');
      // Staff demo button was removed per Developer Handover Nov 2 (Item 16)
      expect(stringified).not.toContain('Staff');
    });
  });

  describe('2. InstallScreen DOM Structure (QR Code & PWA Flow)', () => {
    let renderer: any;

    beforeEach(() => {
      act(() => {
        renderer = TestRenderer.create(<InstallScreen />);
      });
    });

    it('renders Farmer Pride and GROWER PORTAL on the installation view', () => {
      const tree = renderer.toJSON();
      const stringified = JSON.stringify(tree);

      expect(stringified).toContain("Farmer's Pride");
      expect(stringified).toContain('GROWER PORTAL');
      expect(stringified).toContain('Install ReNu-Biome');
    });

    it('renders quick action button to launch or sign into Grower Portal', () => {
      const tree = renderer.toJSON();
      const stringified = JSON.stringify(tree);

      expect(stringified).toContain('Sign In to Grower Portal');
      expect(stringified).toContain('support@renu-biome.com');
    });
  });
});
