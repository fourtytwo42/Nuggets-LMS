import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      await user.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should render without title', () => {
    render(<Modal {...defaultProps} title={undefined} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    let modal = document.querySelector('.max-w-md');
    expect(modal).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="lg" />);
    modal = document.querySelector('.max-w-2xl');
    expect(modal).toBeInTheDocument();
  });
});
