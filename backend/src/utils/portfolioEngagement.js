import { portfolioExternalUrl } from "./publicTalentProfile.js";

import {
  PORTFOLIO_AVAILABILITY,
  PORTFOLIO_AVAILABILITY_VALUES,
} from "../constants/portfolioEngagement.js";

export {
  PORTFOLIO_AVAILABILITY,
  PORTFOLIO_AVAILABILITY_VALUES,
};

export const defaultPortfolioEngagement = () => ({
  contactFormEnabled: false,
  availability: [],
  primaryAction: {
    enabled: false,
    label: "Contact Me",
    type: "contact",
    url: "",
  },
});

export function normalizePortfolioEngagement(input) {
  const fail = message => ({ error: message });

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("Invalid portfolio engagement settings.");
  }

  const allowedFields = [
    "contactFormEnabled",
    "availability",
    "primaryAction",
  ];

  if (Object.keys(input).some(key => !allowedFields.includes(key))) {
    return fail("Unexpected portfolio engagement field.");
  }

  const contactFormEnabled = input.contactFormEnabled;

  if (typeof contactFormEnabled !== "boolean") {
    return fail("Choose whether your contact form is enabled.");
  }

  const availability = input.availability;

  if (
    !Array.isArray(availability) ||
    availability.length > PORTFOLIO_AVAILABILITY_VALUES.length ||
    availability.some(value =>
      typeof value !== "string" ||
      !PORTFOLIO_AVAILABILITY_VALUES.includes(value)
    )
  ) {
    return fail("Select valid availability options.");
  }

  const uniqueAvailability = [...new Set(availability)];

  if (uniqueAvailability.length !== availability.length) {
    return fail("Duplicate availability options are not allowed.");
  }

  const action = input.primaryAction;

  if (!action || typeof action !== "object" || Array.isArray(action)) {
    return fail("Invalid primary action settings.");
  }

  const actionFields = ["enabled", "label", "type", "url"];

  if (Object.keys(action).some(key => !actionFields.includes(key))) {
    return fail("Unexpected primary action field.");
  }

  if (typeof action.enabled !== "boolean") {
    return fail("Choose whether your primary action is enabled.");
  }

  const label = typeof action.label === "string"
    ? action.label.trim()
    : "";

  if (label.length < 2 || label.length > 40) {
    return fail("Primary action text must contain between 2 and 40 characters.");
  }

  if (!["contact", "external"].includes(action.type)) {
    return fail("Select a valid primary action type.");
  }

  const rawUrl = typeof action.url === "string"
    ? action.url.trim()
    : "";

  let url = "";

  if (action.type === "contact") {
    if (rawUrl) {
      return fail("A contact action does not require an external URL.");
    }

    if (action.enabled && !contactFormEnabled) {
      return fail("Enable your contact form before using it as your primary action.");
    }
  }

  if (action.type === "external") {
    if (rawUrl) {
      url = portfolioExternalUrl(rawUrl);

      if (!url || !url.startsWith("https://")) {
        return fail("Enter a valid public HTTPS destination.");
      }
    }

    if (action.enabled && !url) {
      return fail("Enter a destination for your primary action.");
    }
  }

  return {
    value: {
      contactFormEnabled,
      availability: uniqueAvailability,
      primaryAction: {
        enabled: action.enabled,
        label,
        type: action.type,
        url,
      },
    },
  };
}

export function publicPortfolioEngagement(settings, paidEligible) {
  if (paidEligible !== true) return undefined;

  const normalized = normalizePortfolioEngagement(
    settings || defaultPortfolioEngagement()
  );

  // Invalid legacy data must never break public portfolio rendering.
  const value = normalized.value || defaultPortfolioEngagement();

  return {
    availability: value.availability.map(item =>
      PORTFOLIO_AVAILABILITY.find(option => option.value === item)
    ).filter(Boolean),

    contactFormEnabled: value.contactFormEnabled,

    primaryAction: value.primaryAction.enabled
      ? {
          label: value.primaryAction.label,
          type: value.primaryAction.type,
          url: value.primaryAction.url,
        }
      : null,
  };
}