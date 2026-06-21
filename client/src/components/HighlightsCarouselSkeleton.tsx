import { HIGHLIGHTS_CAROUSEL_SIZE } from './HighlightsCarousel';

export function HighlightsCarouselSkeleton() {
  return (
    <div className="highlights-carousel" aria-hidden="true">
      <div className="highlights-carousel-track">
        {Array.from({ length: HIGHLIGHTS_CAROUSEL_SIZE }, (_, index) => (
          <div key={index} className="highlights-carousel-slide skeleton" />
        ))}
      </div>
    </div>
  );
}
