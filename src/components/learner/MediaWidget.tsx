'use client';

import { useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

export interface MediaWidgetProps {
  type: 'slide' | 'image' | 'audio';
  url?: string;
  content?: string;
  title?: string;
}

export default function MediaWidget({ type, url, content, title }: MediaWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  if (type === 'slide') {
    const slides = content ? JSON.parse(content) : [];
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title || 'Slide Deck'}</h3>
        {slides.length > 0 ? (
          <div>
            <div className="bg-gray-100 rounded-lg p-6 min-h-[300px] mb-4">
              <h4 className="text-xl font-semibold mb-2">{slides[currentSlide]?.title}</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{slides[currentSlide]?.content}</p>
            </div>
            {slides.length > 1 && (
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  {currentSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No slides available</p>
        )}
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title || 'Image'}</h3>
        {url ? (
          <img src={url} alt={title || 'Learning image'} className="w-full rounded-lg" />
        ) : (
          <p className="text-gray-500">No image available</p>
        )}
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title || 'Audio'}</h3>
        {url ? (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>
            <audio src={url} controls className="flex-1" />
          </div>
        ) : (
          <p className="text-gray-500">No audio available</p>
        )}
      </div>
    );
  }

  return null;
}
