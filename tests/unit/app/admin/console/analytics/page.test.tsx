import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from '@/app/(admin)/console/analytics/page';

global.fetch = jest.fn();

describe('AnalyticsPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        totalNuggets: 100,
        activeSessions: 5,
        totalLearners: 20,
        averageMastery: 75,
      }),
    });
  });

  it('should render analytics page', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('should display analytics metrics', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });
});
