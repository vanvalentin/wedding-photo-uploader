import { useMemo, useState } from 'react';
import type { MediaPreview } from '../types';
import { Lightbox } from './Lightbox';

export const HIGHLIGHTS_CAROUSEL_SIZE = 16;

interface HighlightsCarouselProps {
  items: MediaPreview[];
}

export function HighlightsCarousel({ items }: HighlightsCarouselProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const loopItems = useMemo(() => [...items, ...items], [items]);

  const openPreview = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) setPreviewIndex(index);
  };

  if (items.length === 0) return null;

  const durationSeconds = Math.max(items.length * 4, 24);

  return (
    <>
      <div
        className="highlights-carousel"
        style={{ ['--carousel-duration' as string]: `${durationSeconds}s` }}
      >
        <div className="highlights-carousel-track" aria-hidden={items.length === 0}>
          {loopItems.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              className="highlights-carousel-slide"
              onClick={() => openPreview(item.id)}
              aria-label={item.name}
              tabIndex={index < items.length ? 0 : -1}
            >
              {item.isVideo ? (
                <>
                  <img src={item.previewUrl} alt="" loading="lazy" />
                  <span className="video-badge" aria-hidden="true">
                    ▶
                  </span>
                </>
              ) : (
                <img src={item.previewUrl} alt="" loading="lazy" />
              )}
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
