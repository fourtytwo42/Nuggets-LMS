import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NuggetStorePage from '@/app/(admin)/console/nuggets/page';

global.fetch = jest.fn();

describe('NuggetStorePage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'nugget-1',
          content: 'Test content',
          status: 'ready',
          metadata: {},
          createdAt: new Date(),
        },
      ],
    });
  });

  it('should render nugget store page', async () => {
    render(<NuggetStorePage />);
    await waitFor(() => {
      expect(screen.getByText('Nugget Store')).toBeInTheDocument();
    });
  });

  it('should filter nuggets by search query', async () => {
    render(<NuggetStorePage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search nuggets...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(screen.getByText(/Test content/i)).toBeInTheDocument();
    });
  });
});
