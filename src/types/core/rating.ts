/**
 * Represents a user's rating in the Mostro system.
 *
 * Rating Calculation Methodology:
 * 1. Each new rating is added to total_rating
 * 2. total_reviews is incremented for each new rating
 * 3. Average rating = total_rating / total_reviews
 * 4. The rating is calculated iteratively to build reputation over time
 *
 * Example:
 * If a user receives three 5-star ratings:
 * - total_rating would be 15 (5 + 5 + 5)
 * - total_reviews would be 3
 * - average rating would be 15/3 = 5
 *
 * @property total_reviews - Total number of ratings received
 * @property total_rating - Sum of all ratings received (cumulative)
 * @property last_rating - Most recent rating received
 * @property max_rate - Maximum possible rating value (typically 5)
 * @property min_rate - Minimum possible rating value (typically 1)
 */
export interface Rating {
  total_reviews: number;
  total_rating: number;
  last_rating: number;
  max_rate: number;
  min_rate: number;
}

/**
 * Calculates the average rating for a user.
 * Returns 0 if no reviews are present.
 *
 * @param rating - Rating object containing review data
 * @returns number - Average rating between min_rate and max_rate, or 0 if no reviews
 */
export function calculateAverageRating(rating: Rating): number {
  return rating.total_reviews > 0 ? rating.total_rating / rating.total_reviews : 0;
}

/**
 * Rating utility functions for validation and calculations
 */
export const RatingUtils = {
  calculateAverage: calculateAverageRating,

  /**
   * Validates if a new rating value is within allowed bounds
   * @param rating - Current rating object
   * @param value - New rating value to validate
   */
  isValidRating: (rating: Rating, value: number): boolean => {
    return value >= rating.min_rate && value <= rating.max_rate;
  },

  /**
   * Validates if a Rating object has valid properties
   * @param rating - Rating object to validate
   */
  isValidRatingObject: (rating: Rating): boolean => {
    return (
      rating.total_reviews >= 0 &&
      rating.total_rating >= 0 &&
      rating.last_rating >= rating.min_rate &&
      rating.last_rating <= rating.max_rate &&
      rating.min_rate <= rating.max_rate
    );
  },

  /**
   * Adds a new rating to the existing rating object
   * @param currentRating - Current rating object
   * @param newRatingValue - New rating value to add
   */
  addNewRating: (currentRating: Rating, newRatingValue: number): Rating => {
    if (!RatingUtils.isValidRating(currentRating, newRatingValue)) {
      throw new Error('Invalid rating value');
    }

    return {
      ...currentRating,
      total_reviews: currentRating.total_reviews + 1,
      total_rating: currentRating.total_rating + newRatingValue,
      last_rating: newRatingValue,
    };
  },
};
