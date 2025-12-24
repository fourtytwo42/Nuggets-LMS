import { render, screen, fireEvent } from '@testing-library/react';
import AdminConsolePage from '@/app/(admin)/console/page';

describe('AdminConsolePage', () => {
  it('should render admin console', () => {
    render(<AdminConsolePage />);
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
  });

  it('should show overview tab by default', () => {
    render(<AdminConsolePage />);
    expect(screen.getByText('Total Nuggets')).toBeInTheDocument();
  });

  it('should switch tabs when clicked', () => {
    render(<AdminConsolePage />);
    const overviewTab = screen.getByText('Overview');
    fireEvent.click(overviewTab);
    expect(screen.getByText('Total Nuggets')).toBeInTheDocument();
  });
});
