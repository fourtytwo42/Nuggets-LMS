import { render, screen } from '@testing-library/react';
import ProgressPanel from '@/components/learner/ProgressPanel';

describe('ProgressPanel', () => {
  it('should render progress panel', () => {
    render(<ProgressPanel sessionId="session-id" />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('should display mastery levels', () => {
    render(<ProgressPanel sessionId="session-id" />);
    expect(screen.getByText('Mastery Levels')).toBeInTheDocument();
  });

  it('should display knowledge gaps when present', () => {
    render(<ProgressPanel sessionId="session-id" />);
    // Component shows knowledge gaps from mock data
    expect(screen.getByText('Knowledge Gaps')).toBeInTheDocument();
  });
});
