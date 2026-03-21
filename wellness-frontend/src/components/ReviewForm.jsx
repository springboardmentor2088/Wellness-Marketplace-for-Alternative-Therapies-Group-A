import { useState } from "react";
import toast from "react-hot-toast";
import { submitReview } from "../services/reviewService";

export default function ReviewForm({ practitionerId, practitionerName, sessionId, onSuccess, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [behaviourRating, setBehaviourRating] = useState(0);
  const [hoveredBehaviourRating, setHoveredBehaviourRating] = useState(0);
  const [treatmentEffectivenessRating, setTreatmentEffectivenessRating] = useState(0);
  const [hoveredTreatmentEffectivenessRating, setHoveredTreatmentEffectivenessRating] = useState(0);
  const [recommendPractitioner, setRecommendPractitioner] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select an overall rating");
      return;
    }
    if (behaviourRating === 0) {
      toast.error("Please select a behaviour rating");
      return;
    }
    if (treatmentEffectivenessRating === 0) {
      toast.error("Please select a treatment effectiveness rating");
      return;
    }
    if (recommendPractitioner === null) {
      toast.error("Please select whether you recommend this practitioner");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview(practitionerId, rating, behaviourRating, treatmentEffectivenessRating, recommendPractitioner, comment, sessionId);
      toast.success("Review submitted successfully!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting review:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to submit review";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800">Leave a Review</h3>
          <p className="text-sm text-gray-500 mt-1">
            Rate your experience with {practitionerName}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Overall Rating */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Overall Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={`overall-${star}`}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                >
                  <span
                    className={
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Behaviour Rating */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Behaviour Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={`behaviour-${star}`}
                  type="button"
                  onClick={() => setBehaviourRating(star)}
                  onMouseEnter={() => setHoveredBehaviourRating(star)}
                  onMouseLeave={() => setHoveredBehaviourRating(0)}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                >
                  <span
                    className={
                      star <= (hoveredBehaviourRating || behaviourRating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Treatment Effectiveness Rating */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Treatment Effectiveness Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={`treatment-${star}`}
                  type="button"
                  onClick={() => setTreatmentEffectivenessRating(star)}
                  onMouseEnter={() => setHoveredTreatmentEffectivenessRating(star)}
                  onMouseLeave={() => setHoveredTreatmentEffectivenessRating(0)}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                >
                  <span
                    className={
                      star <= (hoveredTreatmentEffectivenessRating || treatmentEffectivenessRating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recommend Practitioner */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Recommend Practitioner
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRecommendPractitioner(true)}
                className={`flex-1 py-2 rounded-lg border font-semibold flex justify-center items-center gap-2 transition ${
                  recommendPractitioner === true
                    ? "bg-teal-50 border-teal-500 text-teal-700"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>👍</span> Yes
              </button>
              <button
                type="button"
                onClick={() => setRecommendPractitioner(false)}
                className={`flex-1 py-2 rounded-lg border font-semibold flex justify-center items-center gap-2 transition ${
                  recommendPractitioner === false
                    ? "bg-red-50 border-red-500 text-red-700"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>👎</span> No
              </button>
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
