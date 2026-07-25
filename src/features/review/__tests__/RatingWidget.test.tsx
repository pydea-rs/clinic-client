import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { RatingWidget } from '../RatingWidget';

describe('RatingWidget', () => {
  const getStarElements = () => {
    return document.querySelectorAll('svg');
  };

  describe('getStarColor (star threshold logic)', () => {
    it('should color all 5 stars yellow for rating 5.0', () => {
      render(<RatingWidget averageRating={5.0} totalReviews={10} />);
      const stars = getStarElements();
      expect(stars).toHaveLength(5);
      stars.forEach((star) => {
        expect(star.classList.contains('text-yellow-400')).toBe(true);
      });
    });

    it('should color no stars yellow for rating 0', () => {
      render(<RatingWidget averageRating={0} totalReviews={0} />);
      const stars = getStarElements();
      stars.forEach((star) => {
        expect(star.classList.contains('text-gray-300')).toBe(true);
      });
    });

    it('should color stars up to rating threshold (3.0 → stars 1-3 yellow)', () => {
      render(<RatingWidget averageRating={3.0} totalReviews={5} />);
      const stars = getStarElements();
      expect(stars[0].classList.contains('text-yellow-400')).toBe(true);
      expect(stars[1].classList.contains('text-yellow-400')).toBe(true);
      expect(stars[2].classList.contains('text-yellow-400')).toBe(true);
      expect(stars[3].classList.contains('text-gray-300')).toBe(true);
      expect(stars[4].classList.contains('text-gray-300')).toBe(true);
    });

    it('should use 0.25 tolerance (rating 3.75 colors star 4 yellow)', () => {
      render(<RatingWidget averageRating={3.75} totalReviews={5} />);
      const stars = getStarElements();
      expect(stars[3].classList.contains('text-yellow-400')).toBe(true);
      expect(stars[4].classList.contains('text-gray-300')).toBe(true);
    });

    it('should NOT color star 4 yellow when rating is 3.74 (below threshold)', () => {
      render(<RatingWidget averageRating={3.74} totalReviews={5} />);
      const stars = getStarElements();
      expect(stars[2].classList.contains('text-yellow-400')).toBe(true);
      expect(stars[3].classList.contains('text-gray-300')).toBe(true);
    });

    it('should color star 1 yellow for rating 0.75 (boundary)', () => {
      render(<RatingWidget averageRating={0.75} totalReviews={1} />);
      const stars = getStarElements();
      expect(stars[0].classList.contains('text-yellow-400')).toBe(true);
      expect(stars[1].classList.contains('text-gray-300')).toBe(true);
    });

    it('should NOT color star 1 for rating 0.74', () => {
      render(<RatingWidget averageRating={0.74} totalReviews={1} />);
      const stars = getStarElements();
      expect(stars[0].classList.contains('text-gray-300')).toBe(true);
    });

    it('should color all 5 stars for rating 4.75 (star 5 threshold)', () => {
      render(<RatingWidget averageRating={4.75} totalReviews={10} />);
      const stars = getStarElements();
      stars.forEach((star) => {
        expect(star.classList.contains('text-yellow-400')).toBe(true);
      });
    });
  });

  describe('distribution bar percentages', () => {
    it('should render correct bar widths from distribution', () => {
      const distribution = { 1: 2, 2: 3, 3: 5, 4: 10, 5: 20 };
      const totalReviews = 40;
      render(
        <RatingWidget
          averageRating={4.0}
          totalReviews={totalReviews}
          distribution={distribution}
        />,
      );
      const bars = document.querySelectorAll('[style*="width"]');
      const widths = Array.from(bars).map((b) => (b as HTMLElement).style.width);
      expect(widths).toEqual(['50%', '25%', '12.5%', '7.5%', '5%']);
    });

    it('should render 0% bars when totalReviews is 0 (division-by-zero guard)', () => {
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      render(
        <RatingWidget
          averageRating={0}
          totalReviews={0}
          distribution={distribution}
        />,
      );
      const bars = document.querySelectorAll('[style*="width"]');
      const widths = Array.from(bars).map((b) => (b as HTMLElement).style.width);
      widths.forEach((w) => expect(w).toBe('0%'));
    });

    it('should not render distribution section when prop is omitted', () => {
      render(<RatingWidget averageRating={3.5} totalReviews={10} />);
      const bars = document.querySelectorAll('[style*="width"]');
      expect(bars).toHaveLength(0);
    });
  });

  describe('review count display', () => {
    it('should display singular "review" for 1 review', () => {
      render(<RatingWidget averageRating={5.0} totalReviews={1} />);
      expect(screen.getByText('1 review')).toBeInTheDocument();
    });

    it('should display plural "reviews" for multiple reviews', () => {
      render(<RatingWidget averageRating={4.0} totalReviews={25} />);
      expect(screen.getByText('25 reviews')).toBeInTheDocument();
    });

    it('should display plural "reviews" for 0 reviews', () => {
      render(<RatingWidget averageRating={0} totalReviews={0} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });
  });

  describe('average rating display', () => {
    it('should display rating formatted to 1 decimal place', () => {
      render(<RatingWidget averageRating={4.567} totalReviews={10} />);
      expect(screen.getByText('4.6')).toBeInTheDocument();
    });

    it('should display whole number with .0', () => {
      render(<RatingWidget averageRating={3} totalReviews={5} />);
      expect(screen.getByText('3.0')).toBeInTheDocument();
    });
  });
});
