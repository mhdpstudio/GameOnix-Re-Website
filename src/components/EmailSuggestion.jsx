import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

import "../style/email-suggestion.css";

/**
 * Inline "Did you mean ...?" hint shown under an email field.
 * Renders nothing when there is no suggestion to show.
 */
export default function EmailSuggestion({
  suggestion,
  onAccept,
  onDismiss,
}) {
  if (!suggestion) return null;

  return (
    <div className="email-suggestion" role="status" aria-live="polite">
      <FontAwesomeIcon
        icon={faLightbulb}
        className="email-suggestion-icon"
        aria-hidden="true"
      />

      <span className="email-suggestion-text">
        Did you mean{" "}
        <button
          type="button"
          className="email-suggestion-accept"
          onClick={() => onAccept(suggestion)}
        >
          {suggestion}
        </button>
        ?
      </span>

      <button
        type="button"
        className="email-suggestion-keep"
        onClick={onDismiss}
        aria-label="Keep the email address as typed"
      >
        Keep as typed
      </button>
    </div>
  );
}
