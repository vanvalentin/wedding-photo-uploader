import { useState } from 'react';
import type { MediaPreview } from '../types';
import { Lightbox } from './Lightbox';
import { GalleryMediaThumb } from './GalleryMediaThumb';

export const HIGHLIGHTS_CAROUSEL_SIZE = 16;

interface HighlightsCarouselProps {
  items: MediaPreview[];
}

export function HighlightsCarousel({ items }: HighlightsCarouselProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const openPreview = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) setPreviewIndex(index);
  };

  if (items.length === 0) return null;

  return (
    <>
      <div className="highlights-carousel">
        <div className="highlights-carousel-track">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="highlights-carousel-slide"
              onClick={() => openPreview(item.id)}
              aria-label={item.name}
            >
              <GalleryMediaThumb item={item} alt="" />
            </button>
          ))}
        </div>
      </div>

      <Lightbox
        items={items}
        activeIndex={previewIndex}
        onActiveIndexChange={setPreviewIndex}
      />
    </>
  );
}
