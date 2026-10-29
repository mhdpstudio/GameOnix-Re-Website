import { useCallback, useState } from "react";

import {
  hasTypedDomain,
  suggestEmailCorrection,
} from "../utils/email";

/**
 * Keeps track of the addresses a visitor chose to keep as typed, so the same
 * suggestion never blocks the same value twice.
 */
export function useEmailTypoGuard() {
  const [keptAddresses, setKeptAddresses] = useState({});

  const getSuggestion = useCallback(
    (field, value) => {
      const normalized = String(value ?? "").trim().toLowerCase();

      if (!normalized) return null;
      if (keptAddresses[field] === normalized) return null;

      return suggestEmailCorrection(normalized);
    },
    [keptAddresses]
  );

  const getLiveSuggestion = useCallback(
    (field, value) => {
      if (!hasTypedDomain(value)) return null;

      return getSuggestion(field, value);
    },
    [getSuggestion]
  );

  const keepTypedEmail = useCallback((field, value) => {
    setKeptAddresses((previous) => ({
      ...previous,
      [field]: String(value ?? "").trim().toLowerCase(),
    }));
  }, []);

  return { getSuggestion, getLiveSuggestion, keepTypedEmail };
}
