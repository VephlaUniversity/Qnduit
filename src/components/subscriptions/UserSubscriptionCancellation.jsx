import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";

export default function UserSubscriptionCancellation({ onCancelled }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const handlePreview = async () => {
    const token = getToken();

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/payments/cancellation/preview`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const previewToken = response.data?.previewToken;

      if (!previewToken) {
        throw new Error("The cancellation preview could not be verified.");
      }

      setPreview({ previewToken });
    } catch (error) {
      toast.error(
        friendlyError(
          error,
          "We couldn't load your cancellation details. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const token = getToken();

    if (!token || !preview?.previewToken) {
      toast.error("Please review your cancellation again.");
      setPreview(null);
      return;
    }

    try {
      setConfirming(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/payments/cancellation`,
        {
          previewToken: preview.previewToken,
          requestId: crypto.randomUUID(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Cancellation could not be confirmed."
        );
      }

      setPreview(null);
      toast.success("Your subscription has been canceled.");

      // Refresh subscription data from the backend.
      await onCancelled?.();
    } catch (error) {
      toast.error(
        friendlyError(
          error,
          "We couldn't complete the cancellation. Please refresh and try again."
        )
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mt-5">
      {!preview ? (
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading || confirming}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cancellation details...
            </span>
          ) : (
            "Cancel subscription"
          )}
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="cancel-subscription-title"
          aria-describedby="cancel-subscription-description"
          className="rounded-lg border border-red-500/30 bg-red-950/20 p-4"
        >
          <h3
            id="cancel-subscription-title"
            className="font-semibold text-white"
          >
            Cancel your subscription?
          </h3>

          <p
            id="cancel-subscription-description"
            className="mt-2 text-sm text-gray-300"
          >
            Cancellation takes effect instantly. Your paid subscription
            access will end, and your account will return to the Free plan.
            Continue only if you want to proceed.
          </p>

          <p className="font-semibold text-red-400">
            Important: This action cannot be reversed.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={confirming}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Keep subscription
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Canceling...
                </span>
              ) : (
                "Confirm cancellation"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}