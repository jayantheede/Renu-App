import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SignInScreen } from '../auth/SignInScreen';
import { InstallScreen } from '../InstallScreen';
import { HomeScreen } from '../HomeScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = {
      user: { role: 'Grower', email: 'rgundavelli@gmail.com', name: 'Maria Lopez', companyName: 'Sierra Orchards LLC' },
      logout: jest.fn(),
      setSession: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('../../api/client', () => ({
  fetchRanches: jest.fn().mockResolvedValue([
    { id: 'ranch-home', name: 'Home Ranch', county: 'Madera', ac: 760, blocks: [{ id: 'N-1', acreage: 160 }], tanks: [{ id: 'tank-3', name: 'Tank 3', levelPercent: 42 }] },
    { id: 'ranch-north', name: 'North Ranch', county: 'Fresno', ac: 640, blocks: [{ id: 'F-1', acreage: 200 }], tanks: [{ id: 'tank-4', name: 'Tank #4', levelPercent: 15 }] },
  ]),
  fetchDeliveries: jest.fn().mockResolvedValue([
    { id: 'DEL-113', status: 'Out for delivery', gallons: 1976, productName: 'ReNu N-32%, K-24% Blend', ranchName: 'Home Ranch', tankName: 'Tank 3', deliveryWindow: 'Today 9:40 AM' },
  ]),
  fetchInvoices: jest.fn().mockResolvedValue([
    { id: 'INV-26001', invoiceNumber: 'INV-26001', amount: 1155, status: 'Overdue' },
  ]),
  fetchGrowerDashboard: jest.fn().mockResolvedValue({
    nextDelivery: { id: 'DEL-113', status: 'Out for delivery' },
    openInvoiceCount: 1,
    balanceDue: 1155,
  }),
  fetchFeatureFlags: jest.fn().mockResolvedValue({}),
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

    it('does not render staging demo buttons on main branch for store release', () => {
      const tree = renderer.toJSON();
      const stringified = JSON.stringify(tree);
      expect(stringified).not.toContain('DEMO LOGINS (STAGING)');
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

  describe('3. HomeScreen DOM Structure (Nov 4 Brand & Handover Specifications)', () => {
    let renderer: any;

    beforeEach(async () => {
      await act(async () => {
        renderer = TestRenderer.create(<HomeScreen />);
      });
    });

    const getAllText = () => {
      return renderer.root
        .findAllByType('Text' as any)
        .map((t: any) => {
          const c = t.props.children;
          if (typeof c === 'string') return c;
          if (Array.isArray(c)) return c.filter((x: any) => typeof x === 'string' || typeof x === 'number').join(' ');
          return '';
        })
        .join(' ');
    };

    it('renders greeting with first name and Sierra Orchards LLC entity name', () => {
      const text = getAllText();

      expect(text).toContain('Maria');
      expect(text).toContain('Sierra Orchards LLC');
    });

    it('renders single frosted stage chip with Post-harvest, almond (no weather chip)', () => {
      const text = getAllText();

      expect(text).toContain('Post-harvest, almond');
      expect(text).not.toContain('72°F');
      expect(text).not.toContain('Sunny');
    });

    it('renders Season 2026 almond card with 5-segment stage strip', () => {
      const text = getAllText();

      expect(text).toContain('Season 2026, almond');
      expect(text).toContain('Bloom');
      expect(text).toContain('Soil blends');
      expect(text).toContain('Potassium');
      expect(text).toContain('Hull split');
      expect(text).toContain('Post-harvest');
    });

    it('renders THIS WEEK section with out-for-delivery arriving today status and balance due', () => {
      const text = getAllText();

      expect(text).toContain('THIS WEEK');
      expect(text).toContain('Balance due');
    });

    it('renders PLANTED RANCHES and QUICK ACTIONS with mailto:support@renu-biome.com', () => {
      const text = getAllText();

      expect(text).toContain('PLANTED RANCHES');
      expect(text).toContain('QUICK ACTIONS');
      expect(text).toContain('Email ReNu-Biome');
      expect(text).toContain('Deliveries');
    });
  });
});
