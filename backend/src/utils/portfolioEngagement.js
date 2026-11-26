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
  booking: {
    enabled: false,
    provider: "calendly",
    label: "Book an Interview",
    url: "",
  },
});

function normalizeBookingUrl(value, provider) {
  if (!value) return "";

  if (typeof value !== "string") return "";

  const url = portfolioExternalUrl(value.trim());

  if (!url || !url.startsWith("https://")) return "";

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    const allowedHosts = {
      calendly: "calendly.com",
      "cal.com": "cal.com",
    };

    const root = allowedHosts[provider];

    if (!root || !(hostname === root || hostname.endsWith(`.${root}`))) {
      return "";
    }

    return url;
  } catch {
    return "";
  }
}

export function normalizePortfolioEngagement(input) {
  const fail = message => ({ error: message });

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("Invalid portfolio engagement settings.");
  }

  const allowedFields = [
    "contactFormEnabled",
    "availability",
    "primaryAction",
    "booking",
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

    const booking = input.booking ?? defaultPortfolioEngagement().booking;

    if (!booking || typeof booking !== "object" || Array.isArray(booking)) {
        return fail("Invalid booking settings.");
    }

    const bookingFields = ["enabled", "provider", "label", "url"];

    if (Object.keys(booking).some(key => !bookingFields.includes(key))) {
        return fail("Unexpected booking field.");
    }

    if (typeof booking.enabled !== "boolean") {
        return fail("Choose whether your booking button is enabled.");
    }

    if (!["calendly", "cal.com"].includes(booking.provider)) {
        return fail("Select Calendly or Cal.com as your booking provider.");
    }

    const bookingLabel = typeof booking.label === "string"
        ? booking.label.trim()
        : "";

    if (bookingLabel.length < 2 || bookingLabel.length > 40) {
        return fail("Booking button text must contain between 2 and 40 characters.");
    }

    const rawBookingUrl = typeof booking.url === "string"
        ? booking.url.trim()
        : "";

    let bookingUrl = "";

    if (rawBookingUrl) {
        bookingUrl = normalizeBookingUrl(rawBookingUrl, booking.provider);

        if (!bookingUrl) {
        return fail(
            "Enter a valid HTTPS booking URL from your selected provider."
        );
        }
    }

    if (booking.enabled && !bookingUrl) {
        return fail("Enter your booking URL before enabling the booking button.");
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
        booking: {
            enabled: booking.enabled,
            provider: booking.provider,
            label: bookingLabel,
            url: bookingUrl,
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
    booking: value.booking.enabled
      ? {
          provider: value.booking.provider,
          label: value.booking.label,
          url: value.booking.url,
        }
      : null,
  };
}