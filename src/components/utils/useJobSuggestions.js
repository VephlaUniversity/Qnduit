import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "./api";

const EMPTY = { titles: [], companies: [], locations: [] };

// Suggestions for what has been typed so far (job titles, companies, places).
// Waits for a short pause in typing and ignores answers to older keystrokes.
export function useJobSuggestions(query, enabled = true) {
  const [suggestions, setSuggestions] = useState(EMPTY);
  const cache = useRef(new Map());

  useEffect(() => {
    const text = String(query || "").trim();
    if (!enabled || text.length < 2) {
      setSuggestions(EMPTY);
      return undefined;
    }

    const key = text.toLowerCase();
    if (cache.current.has(key)) {
      setSuggestions(cache.current.get(key));
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/jobs/suggest`, {
          params: { q: text },
          signal: controller.signal,
        });
        const data = {
          titles: res.data.titles || [],
          companies: res.data.companies || [],
          locations: res.data.locations || [],
        };
        cache.current.set(key, data);
        setSuggestions(data);
      } catch {
        // Suggestions are a convenience; searching still works without them.
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return suggestions;
}
