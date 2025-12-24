import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/(admin)/console/settings/page';

global.fetch = jest.fn();

describe('SettingsPage', () => {
  it('should render settings page', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should allow editing settings', () => {
    render(<SettingsPage />);
    const storageInput = screen.getByDisplayValue('./storage');
    fireEvent.change(storageInput, { target: { value: '/new/path' } });
    expect(storageInput).toHaveValue('/new/path');
  });

  it('should save settings', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    render(<SettingsPage />);
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
