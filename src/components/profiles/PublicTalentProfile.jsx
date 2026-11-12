import { useEffect, useState } from "react";
import PublicTalentContent from "./PublicTalentContent";
import { NotFound } from "../pages/NotFound";
import { useParams } from "react-router-dom";
import axios from "axios";
import PublicTalentPresentation from "./PublicTalentPresentation";
import { API_BASE_URL } from "../utils/api";

const PublicTalentProfile = () => {
  const { username } = useParams();
  const [talent, setTalent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      setLoadError(false);
      setTalent(null);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/talents/public/${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );

        if (!cancelled) {
          if (response.data?.success !== true || !response.data?.talent?.username
            || typeof response.data.talent.requiresQnduitBranding !== "boolean") throw new Error("Invalid public profile response");
          setTalent(response.data.talent);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(true);
          setNotFound(
            error.response?.status === 404 || error.response?.status === 403,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [username]);

  if (loading) {
    return (
      <PublicTalentPresentation>
        <p className="text-gray-400">Loading talent profile...</p>
      </PublicTalentPresentation>
    );
  }

  // All unavailable states reuse the original message and home navigation.
  if (notFound || !talent) {
    const message = notFound
      ? "We couldn’t find this public Talent profile. It may have been moved or may no longer be public."
      : loadError
        ? "We couldn’t load this profile. Please try again."
        : "This public listing does not exist or is not currently available.";
    return (
      <PublicTalentPresentation centerContent>
        <NotFound embedded title="Profile unavailable" message={message} />
      </PublicTalentPresentation>
    );
  }

  return <PublicTalentContent talent={talent} />;
};

export default PublicTalentProfile;
