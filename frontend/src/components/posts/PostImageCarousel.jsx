import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUrl';

const PostImageCarousel = ({ post, linkToDetail = false }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Touch & Mouse Drag state for swiping
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);

  // Extract all images for the post
  const imageList = React.useMemo(() => {
    if (!post) return [];
    if (Array.isArray(post.images) && post.images.length > 0) {
      return post.images.map((item) => (typeof item === 'string' ? item : item.image));
    }
    if (post.image) {
      return [post.image];
    }
    return [];
  }, [post]);

  if (imageList.length === 0) {
    return null;
  }

  const handleNext = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentIndex < imageList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDotClick = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const handleImageClick = (e) => {
    if (hasMovedRef.current) {
      // Swiping was performed; don't trigger click navigation
      return;
    }
    if (linkToDetail && post.id) {
      navigate(`/posts/${post.id}`);
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e) => {
    if (imageList.length <= 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (imageList.length <= 1) return;
    const deltaX = Math.abs(e.touches[0].clientX - startXRef.current);
    const deltaY = Math.abs(e.touches[0].clientY - startYRef.current);
    if (deltaX > 10 || deltaY > 10) {
      hasMovedRef.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (imageList.length <= 1 || !hasMovedRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = startXRef.current - endX;

    // Minimum swipe threshold 40px
    if (diffX > 40) {
      handleNext();
    } else if (diffX < -40) {
      handlePrev();
    }
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 50);
  };

  // Mouse Drag handlers
  const handleMouseDown = (e) => {
    if (imageList.length <= 1) return;
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || imageList.length <= 1) return;
    const diff = Math.abs(e.clientX - startXRef.current);
    if (diff > 10) {
      hasMovedRef.current = true;
    }
  };

  const handleMouseUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (hasMovedRef.current && imageList.length > 1) {
      const diffX = startXRef.current - e.clientX;
      if (diffX > 40) {
        handleNext();
      } else if (diffX < -40) {
        handlePrev();
      }
    }
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 50);
  };

  // Single Image Post: Display cleanly without carousel controls
  if (imageList.length === 1) {
    const singleContent = (
      <div className="w-full bg-black/5 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
        <img
          src={getImageUrl(imageList[0])}
          alt="Post content"
          className="max-h-[600px] w-full object-contain transition-transform"
          loading="lazy"
        />
      </div>
    );

    if (linkToDetail && post.id) {
      return (
        <div
          onClick={() => navigate(`/posts/${post.id}`)}
          className="block w-full cursor-pointer"
        >
          {singleContent}
        </div>
      );
    }
    return singleContent;
  }

  // Multi-Image Carousel: Instagram-Style stacked post
  return (
    <div
      className={`relative w-full overflow-hidden bg-black/5 dark:bg-slate-950 select-none ${
        linkToDetail ? 'cursor-pointer' : ''
      }`}
      onClick={handleImageClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Slider track — moves smoothly between slides */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {imageList.map((src, index) => (
          <div
            key={index}
            className="w-full flex-shrink-0 flex items-center justify-center max-h-[600px] bg-black/5 dark:bg-slate-950"
          >
            <img
              src={getImageUrl(src)}
              alt={`Post content ${index + 1}`}
              className="max-h-[600px] w-full object-contain"
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Image Counter Badge (Top-Right) */}
      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-0.5 rounded-full pointer-events-none z-10 shadow-xs">
        {currentIndex + 1}/{imageList.length}
      </div>

      {/* Previous Navigation Button */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 text-gray-800 dark:text-white flex items-center justify-center shadow-md backdrop-blur-xs z-10 transition-transform active:scale-95"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Next Navigation Button */}
      {currentIndex < imageList.length - 1 && (
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 text-gray-800 dark:text-white flex items-center justify-center shadow-md backdrop-blur-xs z-10 transition-transform active:scale-95"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Pagination Indicator Dots (Bottom-Center) */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
        {imageList.map((_, dotIndex) => {
          const isActive = dotIndex === currentIndex;
          return (
            <button
              key={dotIndex}
              type="button"
              onClick={(e) => handleDotClick(e, dotIndex)}
              className={`pointer-events-auto rounded-full transition-all duration-200 ${
                isActive
                  ? 'w-2 h-2 bg-brand-blue dark:bg-brand-teal scale-110 shadow-sm'
                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90 shadow-xs'
              }`}
              aria-label={`Go to slide ${dotIndex + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PostImageCarousel;
