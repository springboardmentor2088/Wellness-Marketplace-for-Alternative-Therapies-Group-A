import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getProductReviews } from "../services/reviewService";

export default function ProductReviewsModal({ product, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const result = await getProductReviews(product.id);
      setData(result);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={star <= rating ? "text-yellow-400" : "text-gray-300"}>★</span>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Reviews</h3>
            <p className="text-sm text-gray-500 mt-1">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-600"></div>
          </div>
        ) : (
          <>
            {/* Average Rating Summary */}
            {data && data.totalReviews > 0 && (
              <div className="bg-teal-50 rounded-xl p-4 mb-6 text-center">
                <div className="text-3xl font-bold text-teal-700">{data.averageRating}</div>
                <div className="text-lg mb-1">{renderStars(Math.round(data.averageRating))}</div>
                <p className="text-sm text-gray-600">{data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""}</p>
              </div>
            )}

            {/* Reviews List */}
            {data && data.reviews && data.reviews.length > 0 ? (
              <div className="space-y-4">
                {data.reviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">{review.userName}</p>
                        <div className="text-sm">{renderStars(review.rating)}</div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No reviews yet for this product.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
