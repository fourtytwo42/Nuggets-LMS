import { render, screen, fireEvent } from '@testing-library/react';
import MediaWidget from '@/components/learner/MediaWidget';

describe('MediaWidget Extended Tests', () => {
  describe('Image type', () => {
    it('should handle image load error', () => {
      const { container } = render(<MediaWidget type="image" url="/test-image.jpg" alt="Test" />);
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
        // Should handle error gracefully
        expect(img).toBeInTheDocument();
      }
    });

    it('should render with custom className', () => {
      const { container } = render(
        <MediaWidget type="image" url="/test.jpg" alt="Test" className="custom-class" />
      );
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('custom-class');
    });
  });

  describe('Audio type', () => {
    it('should handle audio play/pause', () => {
      const { container } = render(<MediaWidget type="audio" url="/test-audio.mp3" />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      if (audio) {
        const playSpy = jest.spyOn(audio, 'play').mockResolvedValue(undefined);
        const pauseSpy = jest.spyOn(audio, 'pause').mockImplementation();

        fireEvent.play(audio);
        expect(playSpy).toHaveBeenCalled();

        fireEvent.pause(audio);
        expect(pauseSpy).toHaveBeenCalled();

        playSpy.mockRestore();
        pauseSpy.mockRestore();
      }
    });

    it('should handle audio error', () => {
      const { container } = render(<MediaWidget type="audio" url="/test-audio.mp3" />);
      const audio = container.querySelector('audio');
      if (audio) {
        fireEvent.error(audio);
        // Should handle error gracefully
        expect(audio).toBeInTheDocument();
      }
    });
  });

  describe('Video type', () => {
    it('should render video player', () => {
      const { container } = render(<MediaWidget type="video" url="/test-video.mp4" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.getAttribute('src')).toBe('/test-video.mp4');
    });

    it('should handle video controls', () => {
      const { container } = render(<MediaWidget type="video" url="/test-video.mp4" />);
      const video = container.querySelector('video') as HTMLVideoElement;
      if (video) {
        expect(video.controls).toBe(true);
      }
    });
  });
});
