import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IngestionManagementPage from '@/app/(admin)/console/ingestion/page';

// Mock fetch
global.fetch = jest.fn();

describe('IngestionManagementPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('should render ingestion management page', async () => {
    render(<IngestionManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Content Ingestion Management')).toBeInTheDocument();
    });
  });

  it('should show watched folders section', async () => {
    render(<IngestionManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Watched Folders')).toBeInTheDocument();
    });
  });

  it('should show monitored URLs section', async () => {
    render(<IngestionManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Monitored URLs')).toBeInTheDocument();
    });
  });

  it('should open add folder modal', async () => {
    render(<IngestionManagementPage />);
    await waitFor(() => {
      const addButton = screen.getAllByText('Add Folder')[0];
      fireEvent.click(addButton);
      expect(screen.getByText('Add Watched Folder')).toBeInTheDocument();
    });
  });
});
