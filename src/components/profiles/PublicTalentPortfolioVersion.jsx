
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

import PublicTalentContent from "./PublicTalentContent";
import PublicTalentPresentation from "./PublicTalentPresentation";
import { NotFound } from "../pages/NotFound";
import { API_BASE_URL } from "../utils/api";

export default function PublicTalentPortfolioVersion() {
  const { username, slug } = useParams();

  const [talent, setTalent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchVersion = async () => {
      setLoading(true);
      setUnavailable(false);
      setLoadError(false);
      setTalent(null);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/talents/public/${encodeURIComponent(username)}/portfolio-versions/${encodeURIComponent(slug)}`,
          { signal: controller.signal }
        );

        const result = response.data;

        if (
          result?.success !== true ||
          !result?.talent?.username ||
          !result?.talent?.portfolioVersion ||
          !Array.isArray(result.talent.portfolioVersion.projectKeys) ||
          typeof result.talent.requiresQnduitBranding !== "boolean"
        ) {
          throw new Error("Invalid public portfolio version response.");
        }

        if (!cancelled) setTalent(result.talent);
      } catch (error) {
        if (!cancelled) {
          setLoadError(true);
          setUnavailable(
            error.response?.status === 404 ||
            error.response?.status === 403
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVersion();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [username, slug]);

  if (loading) {
    return (
      <PublicTalentPresentation>
        <p className="text-gray-400">
          Loading targeted portfolio...
        </p>
      </PublicTalentPresentation>
    );
  }

  if (!talent) {
    const message = unavailable
      ? "This targeted portfolio is unavailable. It may have been unpublished or moved."
      : loadError
        ? "We couldn't load this portfolio. Please try again."
        : "This targeted portfolio does not exist.";

    return (
      <PublicTalentPresentation centerContent>
        <NotFound
          embedded
          title="Portfolio unavailable"
          message={message}
        />
      </PublicTalentPresentation>
    );
  }

  return <PublicTalentContent talent={talent} />;
}
