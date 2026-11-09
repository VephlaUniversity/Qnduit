import { useEffect, useState } from "react";
import PublicTalentContent from "./PublicTalentContent";
import { Link, useParams } from "react-router-dom";
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
          if (response.data?.success !== true || !response.data?.talent?.username) throw new Error("Invalid public profile response");
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

  // Keep unavailable public profiles inside the same branded presentation.
  if (notFound) {
    return (
      <PublicTalentPresentation><h1 className="text-3xl font-bold">Profile unavailable</h1><p className="mt-4 text-gray-400">We couldn’t find this public Talent profile. It may have been moved or may no longer be public.</p></PublicTalentPresentation>
    );
  }

  if (!talent) {
    return (
      <PublicTalentPresentation>
        <h1 className="text-3xl font-bold mb-3">Profile unavailable</h1>
        <p className="text-gray-400 mb-6">
          {loadError && !notFound
            ? "We couldn’t load this profile. Please try again."
            : "This public listing does not exist or is not currently available."}
        </p>
        <Link
          to="/"
          className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg"
        >
          Return to QNDUIT
        </Link>
      </PublicTalentPresentation>
    );
  }

  return <PublicTalentContent talent={talent} />;
};

export default PublicTalentProfile;
