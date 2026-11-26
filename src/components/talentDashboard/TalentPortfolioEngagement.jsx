
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../hooks/useAuth";
import { useTalentSubscription } from "../hooks/useTalentSubscription";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import { browserSessions } from "../utils/requestSafety";
import { API_BASE_URL } from "../utils/api";

const AVAILABILITY_OPTIONS = [
  { value: "open_to_work", label: "Open to Work" },
  {
    value: "available_for_freelance",
    label: "Available for Freelance",
  },
  {
    value: "open_to_contract_roles",
    label: "Open to Contract Roles",
  },
];

const DEFAULT_SETTINGS = {
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
};

const control =
  "min-h-[44px] w-full rounded-lg border border-white/10 bg-[#0E0E10] px-4 py-2 text-sm text-white placeholder-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";

const primaryButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const secondaryButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#1A1A1E] p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-lg bg-blue-500/10 p-2">
          <Icon className="h-5 w-5 text-blue-400" />
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

const TalentPortfolioEngagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const entitlement = useTalentSubscription();

  const {
    loading: entitlementLoading,
    error: entitlementError,
    refresh,
  } = entitlement;

  const actor =
    user?.userType === "talent"
      ? `talent:${user.id || user._id}`
      : null;

  const token = actor
    ? browserSessions().find(
        session => session.actor === actor
        )?.token
    : null;

  const paid = hasTalentPublicAccess(entitlement);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedSettings, setSavedSettings] = useState(null);

  useEffect(() => {
    if (entitlementLoading) return;

    if (entitlementError || !paid || !token) {
      setLoadingSettings(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const sessionIsCurrent = () =>
      browserSessions().some(
        session =>
          session.actor === actor &&
          session.token === token
      );

    const loadSettings = async () => {
      setLoadingSettings(true);
      setError("");
      setNotice("");

      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/talents/portfolio-engagement`,
          {
            signal: controller.signal,
            timeout: 15000,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (
          cancelled ||
          controller.signal.aborted ||
          !sessionIsCurrent()
        ) return;

        if (data?.success !== true || !data.settings) {
          throw new Error("Unable to verify your portfolio settings.");
        }

        const next = {
          contactFormEnabled:
            data.settings.contactFormEnabled === true,

          availability: Array.isArray(data.settings.availability)
            ? data.settings.availability
            : [],

          primaryAction: {
            enabled:
              data.settings.primaryAction?.enabled === true,
            label:
              data.settings.primaryAction?.label || "Contact Me",
            type:
              data.settings.primaryAction?.type === "external"
                ? "external"
                : "contact",
            url: data.settings.primaryAction?.url || "",
          },
          booking: {
            enabled: data.settings.booking?.enabled === true,
            provider:
              data.settings.booking?.provider === "cal.com"
                ? "cal.com"
                : "calendly",
            label:
              data.settings.booking?.label || "Book an Interview",
            url: data.settings.booking?.url || "",
          },
        };

        setSettings(next);
        setSavedSettings(JSON.stringify(next));
      } catch (err) {
        if (!cancelled && err.code !== "ERR_CANCELED") {
          setError(
            getErrorMessage(
              err,
              "We couldn't load your portfolio engagement settings."
            )
          );
        }
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    actor,
    token,
    paid,
    entitlementLoading,
    entitlementError,
  ]);

  const updateField = (field, value) => {
    setSettings(previous => ({
      ...previous,
      [field]: value,
    }));
    setNotice("");
  };

  const updateAction = (field, value) => {
    setSettings(previous => ({
      ...previous,
      primaryAction: {
        ...previous.primaryAction,
        [field]: value,
      },
    }));
    setNotice("");
  };

  const updateBooking = (field, value) => {
    setSettings(previous => ({
      ...previous,
      booking: {
        ...previous.booking,
        [field]: value,
      },
    }));

    setNotice("");
  };

  const changeActionType = type => {
    setSettings(previous => ({
        ...previous,
        primaryAction: {
        ...previous.primaryAction,
        type,
        url: type === "contact" ? "" : previous.primaryAction.url,
        enabled:
            type === "contact" && !previous.contactFormEnabled
            ? false
            : previous.primaryAction.enabled,
        },
    }));

    setNotice("");
    };

  const toggleAvailability = value => {
    setSettings(previous => ({
      ...previous,
      availability: previous.availability.includes(value)
        ? previous.availability.filter(item => item !== value)
        : [...previous.availability, value],
    }));
    setNotice("");
  };

  const handleContactToggle = enabled => {
    setSettings(previous => ({
      ...previous,
      contactFormEnabled: enabled,
      primaryAction: {
        ...previous.primaryAction,
        ...(enabled ? {} : (
          previous.primaryAction.type === "contact"
            ? { enabled: false }
            : {}
        )),
      },
    }));

    setNotice("");
  };

  const dirty =
    savedSettings !== null &&
    JSON.stringify(settings) !== savedSettings;

  const saveSettings = async event => {
    event.preventDefault();

    if (!paid || !token || !dirty || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    const sessionIsCurrent = () =>
      browserSessions().some(
        session =>
          session.actor === actor &&
          session.token === token
      );

    try {
      const { data } = await axios.put(
        `${API_BASE_URL}/api/talents/portfolio-engagement`,
        settings,
        {
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!sessionIsCurrent()) return;

      if (data?.success !== true || !data.settings) {
        throw new Error("Your settings save could not be confirmed.");
      }

      const next = {
        contactFormEnabled:
          data.settings.contactFormEnabled === true,

        availability: Array.isArray(data.settings.availability)
          ? data.settings.availability
          : [],

        primaryAction: {
          enabled:
            data.settings.primaryAction?.enabled === true,
          label:
            data.settings.primaryAction?.label || "Contact Me",
          type:
            data.settings.primaryAction?.type === "external"
              ? "external"
              : "contact",
          url: data.settings.primaryAction?.url || "",
        },
        booking: {
          enabled: data.settings.booking?.enabled === true,
          provider:
            data.settings.booking?.provider === "cal.com"
              ? "cal.com"
              : "calendly",
          label:
            data.settings.booking?.label || "Book an Interview",
          url: data.settings.booking?.url || "",
        },
      };

      setSettings(next);
      setSavedSettings(JSON.stringify(next));
      setNotice("Your portfolio engagement settings have been saved.");
      toast.success("Portfolio settings saved.");
    } catch (err) {
      if (sessionIsCurrent()) {
        setError(
          getErrorMessage(
            err,
            "We couldn't save your settings. Please try again."
          )
        );
      }
    } finally {
      if (sessionIsCurrent()) setSaving(false);
    }
  };

  if (entitlementLoading || loadingSettings) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading portfolio engagement settings...
      </div>
    );
  }

  if (entitlementError) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-sm text-red-300">
            {entitlementError}
          </p>

          <button
            type="button"
            onClick={refresh}
            className={`${secondaryButton} mt-4`}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!paid) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-blue-600" />
            <h1 className="text-2xl font-semibold text-white md:text-3xl">
              Portfolio Engagement
            </h1>
          </div>
        </header>

        <section className="rounded-xl border border-white/5 bg-[#1A1A1E] p-6 md:p-8">
          <ShieldCheck className="mb-4 h-9 w-9 text-blue-400" />

          <h2 className="text-lg font-semibold text-white">
            Unlock Portfolio Engagement
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Upgrade your Talent subscription to receive enquiries,
            display your professional availability and customise
            your public portfolio's primary action.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/talent-dashboard/my-plan")
            }
            className={`${primaryButton} mt-6`}
          >
            View My Plan
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 text-white">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-blue-600" />

          <h1 className="text-2xl font-semibold md:text-3xl">
            Portfolio Engagement
          </h1>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          Manage how employers, recruiters and visitors interact
          with your public portfolio.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {notice}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-6">

        {/* CONTACT FORM */}

        <Section
          icon={Mail}
          title="Employer Enquiries"
          description="Allow visitors to contact you directly through your public portfolio."
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.contactFormEnabled}
              onChange={event =>
                handleContactToggle(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-blue-600"
            />

            <span>
              <span className="block text-sm font-medium text-white">
                Enable contact form
              </span>

              <span className="mt-1 block text-sm text-gray-400">
                Visitors will be able to submit their name, email
                address and enquiry directly from your portfolio.
              </span>
            </span>
          </label>

          {settings.contactFormEnabled && (
            <div className="mt-5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm text-blue-300">
                Your enquiry form will appear on your public
                portfolio. Submissions will be available in your
                Qnduit Enquiries inbox.
              </p>
            </div>
          )}
        </Section>

        {/* AVAILABILITY */}

        <Section
          icon={Briefcase}
          title="Professional Availability"
          description="Choose the opportunities you are currently open to. You can select more than one."
        >
          <div className="space-y-3">
            {AVAILABILITY_OPTIONS.map(option => {
              const checked =
                settings.availability.includes(option.value);

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    checked
                      ? "border-blue-500/40 bg-blue-500/5"
                      : "border-white/10 bg-[#202024] hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggleAvailability(option.value)
                    }
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span className="text-sm text-white">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Your selected labels will be displayed on your public portfolio.
          </p>
        </Section>

        {/* PRIMARY ACTION */}

        <Section
          icon={ExternalLink}
          title="Primary Portfolio Action"
          description="Customise the main action visitors see instead of the free Qnduit registration button."
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.primaryAction.enabled}
              onChange={event =>
                updateAction("enabled", event.target.checked)
              }
              disabled={
                settings.primaryAction.type === "contact" &&
                !settings.contactFormEnabled
              }
              className="mt-1 h-4 w-4 accent-blue-600"
            />

            <span>
              <span className="block text-sm font-medium text-white">
                Enable custom primary action
              </span>

              <span className="mt-1 block text-sm text-gray-400">
                Display your customised action button on your public portfolio.
              </span>
            </span>
          </label>

          <div className="mt-6 space-y-5">

            <div>
              <label
                htmlFor="primary-action-label"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Button text
              </label>

              <input
                id="primary-action-label"
                type="text"
                value={settings.primaryAction.label}
                onChange={event =>
                  updateAction("label", event.target.value)
                }
                maxLength={40}
                minLength={2}
                placeholder="Contact Me"
                className={control}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                {["Hire Me", "Contact Me", "Download My CV"].map(
                  label => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        updateAction("label", label)
                      }
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-blue-500 hover:text-blue-400"
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="primary-action-type"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Button action
              </label>

              <select
                id="primary-action-type"
                value={settings.primaryAction.type}
                onChange={event => changeActionType(event.target.value)}
                className={control}
              >
                <option value="contact">
                  Open Contact Form
                </option>

                <option value="external">
                  Open External Link
                </option>
              </select>
            </div>

            {settings.primaryAction.type === "contact" ? (
              <div className="rounded-lg border border-white/10 bg-[#202024] p-4">
                {!settings.contactFormEnabled ? (
                  <p className="text-sm text-yellow-300">
                    Enable your contact form above before selecting this action.
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    Clicking the button on your public portfolio
                    will take visitors to your contact enquiry form.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="primary-action-url"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Destination URL
                </label>

                <input
                  id="primary-action-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={settings.primaryAction.url}
                  onChange={event =>
                    updateAction("url", event.target.value)
                  }
                  maxLength={2048}
                  placeholder="https://example.com/your-cv.pdf"
                  className={control}
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Provide a public HTTPS link. For Download My CV,
                  use the externally accessible CV URL you wish to share.
                  The existing private Qnduit CV endpoints are not made public.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-white/10 bg-[#202024] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                Button preview
              </p>

              {settings.primaryAction.enabled ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white opacity-90"
                >
                  {settings.primaryAction.label || "Your action"}
                  <ExternalLink className="h-4 w-4" />
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  Enable your primary action to display its preview.
                </p>
              )}
            </div>
          </div>
        </Section>

        <Section
          icon={CalendarDays}
          title="External Booking"
          description="Allow employers and visitors to schedule an interview or meeting with you through Calendly or Cal.com."
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.booking.enabled}
              onChange={event =>
                updateBooking("enabled", event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-blue-600"
            />

            <span>
              <span className="block text-sm font-medium text-white">
                Enable booking button
              </span>

              <span className="mt-1 block text-sm text-gray-400">
                Display a booking button on your public portfolio.
              </span>
            </span>
          </label>

          <div className="mt-6 space-y-5">

            <div>
              <label
                htmlFor="booking-provider"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Booking provider
              </label>

              <select
                id="booking-provider"
                value={settings.booking.provider}
                onChange={event =>
                  updateBooking("provider", event.target.value)
                }
                className={control}
              >
                <option value="calendly">Calendly</option>
                <option value="cal.com">Cal.com</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="booking-label"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Booking button text
              </label>

              <input
                id="booking-label"
                type="text"
                value={settings.booking.label}
                onChange={event =>
                  updateBooking("label", event.target.value)
                }
                minLength={2}
                maxLength={40}
                placeholder="Book an Interview"
                className={control}
              />

              <p className="mt-2 text-xs text-gray-500">
                This text will appear on your public portfolio.
              </p>
            </div>

            <div>
              <label
                htmlFor="booking-url"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Booking URL
              </label>

              <input
                id="booking-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={settings.booking.url}
                onChange={event =>
                  updateBooking("url", event.target.value)
                }
                maxLength={2048}
                placeholder={
                  settings.booking.provider === "cal.com"
                    ? "https://cal.com/yourname/30min"
                    : "https://calendly.com/yourname/interview"
                }
                className={control}
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Paste your public scheduling link from the selected provider.
                Only valid HTTPS links from Calendly or Cal.com are accepted.
              </p>
            </div>

            {settings.booking.enabled && !settings.booking.url.trim() && (
              <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-300">
                Add your booking URL before saving this feature as enabled.
              </p>
            )}

            <div className="rounded-lg border border-white/10 bg-[#202024] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                Button preview
              </p>

              {settings.booking.enabled ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white opacity-90"
                >
                  {settings.booking.label || "Book an Interview"}
                  <CalendarDays className="h-4 w-4" />
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  Enable booking to display its button on your public portfolio.
                </p>
              )}
            </div>

            <p className="text-xs leading-5 text-gray-500">
              Visitors will complete their bookings through your selected
              scheduling provider. QNDUIT does not manage your calendar,
              available time slots or booking confirmations.
            </p>

          </div>
        </Section>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Your settings only affect your public portfolio.
          </p>

          <button
            type="submit"
            disabled={!dirty || saving}
            className={primaryButton}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default TalentPortfolioEngagement;
