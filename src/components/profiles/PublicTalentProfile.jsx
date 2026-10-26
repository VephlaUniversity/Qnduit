import { useEffect, useState } from "react";
import PublicTalentContent from "./PublicTalentContent";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { NotFound } from "../pages/NotFound";
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
      <main className="min-h-screen bg-[#0F1419] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading talent profile...</p>
      </main>
    );
  }

  // The address matched no page and no public profile: show the 404 page.
  if (notFound) {
    return (
      <NotFound message="We couldn't find a page or a public talent profile at this address. It may have been moved, or the profile may not be public." />
    );
  }

  if (!talent) {
    return (
      <main className="min-h-screen bg-[#0F1419] text-white flex flex-col items-center justify-center px-6 text-center">
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
      </main>
    );
  }

  return <PublicTalentContent talent={talent} />;
};

export default PublicTalentProfile;
