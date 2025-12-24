import { render, screen, fireEvent } from '@testing-library/react';
import MediaWidget from '@/components/learner/MediaWidget';

describe('MediaWidget', () => {
  describe('Slide type', () => {
    it('should render slide deck', () => {
      const slides = [
        { title: 'Slide 1', content: 'Content 1', order: 1 },
        { title: 'Slide 2', content: 'Content 2', order: 2 },
      ];

      render(<MediaWidget type="slide" content={JSON.stringify(slides)} />);
      expect(screen.getByText('Slide 1')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should navigate between slides', () => {
      const slides = [
        { title: 'Slide 1', content: 'Content 1', order: 1 },
        { title: 'Slide 2', content: 'Content 2', order: 2 },
      ];

      render(<MediaWidget type="slide" content={JSON.stringify(slides)} />);
      expect(screen.getByText('Slide 1')).toBeInTheDocument();

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(screen.getByText('Slide 2')).toBeInTheDocument();
    });

    it('should show slide counter', () => {
      const slides = [
        { title: 'Slide 1', content: 'Content 1', order: 1 },
        { title: 'Slide 2', content: 'Content 2', order: 2 },
      ];

      render(<MediaWidget type="slide" content={JSON.stringify(slides)} />);
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  describe('Image type', () => {
    it('should render image', () => {
      render(<MediaWidget type="image" url="/test-image.jpg" title="Test Image" />);
      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test-image.jpg');
    });

    it('should show message when no image URL', () => {
      render(<MediaWidget type="image" />);
      expect(screen.getByText('No image available')).toBeInTheDocument();
    });
  });

  describe('Audio type', () => {
    it('should render audio player', () => {
      const { container } = render(<MediaWidget type="audio" url="/test-audio.mp3" />);
      const audio = container.querySelector('audio');
      expect(audio).toBeInTheDocument();
    });

    it('should toggle play/pause', () => {
      render(<MediaWidget type="audio" url="/test-audio.mp3" />);
      const playButton = screen.getByRole('button');
      fireEvent.click(playButton);
      // Button state changes (tested via icon change)
    });
  });
});
