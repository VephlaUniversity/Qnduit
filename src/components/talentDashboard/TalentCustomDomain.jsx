
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Globe,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";

const control =
  "min-h-[44px] rounded-lg border border-white/10 bg-[#1A1A1E] px-4 py-2 text-white placeholder-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";

const action =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-blue-500 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-600/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const primaryAction =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const statusDetails = {
  pending_verification: {
    label: "DNS verification pending",
    color: "text-yellow-400",
    description:
      "Add the DNS records below at your domain provider. Once they have propagated, check verification again.",
  },
  pending_ssl: {
    label: "SSL provisioning",
    color: "text-blue-400",
    description:
      "Your domain ownership has been verified. Cloudflare is provisioning its SSL certificate.",
  },
  active: {
    label: "Active",
    color: "text-green-400",
    description:
      "Your custom domain is connected and its SSL certificate is active.",
  },
  failed: {
    label: "Setup failed",
    color: "text-red-400",
    description:
      "The domain setup encountered an issue. Review the error below and try verification again.",
  },
  disconnected: {
    label: "Disconnected",
    color: "text-gray-400",
    description: "This domain is no longer connected to your portfolio.",
  },
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const normalizeRecords = (domain) => {
  if (!domain) return [];

  const records = [];
  const ownership = domain.ownershipVerification;

  if (ownership && typeof ownership === "object") {
    const record = {
      type: ownership.type || "TXT",
      name: ownership.name,
      value: ownership.value,
      status: ownership.status,
      source: "Domain ownership",
    };

    if (record.name && record.value) records.push(record);
  }

  if (Array.isArray(domain.sslValidationRecords)) {
    domain.sslValidationRecords.forEach((record) => {
      if (!record || typeof record !== "object") return;

      if (record.name && record.value) {
        records.push({
          type: record.type || "TXT",
          name: record.name,
          value: record.value,
          status: record.status,
          source: "SSL validation",
        });
      }
    });
  }

  if (domain.cnameTarget && domain.hostname) {
    records.push({
      type: "CNAME",
      name: domain.hostname,
      value: domain.cnameTarget,
      source: "Domain connection",
    });
  }

  return records.filter(
    (record, index, all) =>
      all.findIndex(
        (item) =>
          item.type === record.type &&
          item.name === record.name &&
          item.value === record.value
      ) === index
  );
};

const TalentCustomDomain = () => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");

  const [domain, setDomain] = useState(null);
  const [eligible, setEligible] = useState(false);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadDomain = useCallback(
    async (signal) => {
      if (!token) {
        setError("Your session could not be verified. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        setError("");

        const { data } = await axios.get(
          `${API_BASE_URL}/api/talents/custom-domain`,
          { headers, signal, timeout: 20000 }
        );

        if (!data?.success) {
          throw new Error("Unable to load your custom domain details.");
        }

        setEligible(data.eligibleForCustomDomain === true);
        setDomain(data.domain || null);
      } catch (err) {
        if (err.code !== "ERR_CANCELED") {
          setError(
            getErrorMessage(
              err,
              "We couldn't load your custom domain details. Please try again."
            )
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [headers, token]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadDomain(controller.signal);
    return () => controller.abort();
  }, [loadDomain]);

  const records = useMemo(() => normalizeRecords(domain), [domain]);

  const copyValue = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => {
        setCopied((current) => (current === key ? "" : current));
      }, 2000);
    } catch {
      setError("Unable to copy this value. Please copy it manually.");
    }
  };

  const refreshDomain = async () => {
    setLoading(true);
    setNotice("");
    setError("");
    const controller = new AbortController();
    await loadDomain(controller.signal);
  };

  const connectDomain = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const value = hostname.trim().toLowerCase();

    if (!value) {
      setError("Enter the domain you want to connect.");
      return;
    }

    setConnecting(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/talents/custom-domain`,
        { hostname: value },
        { headers, timeout: 30000 }
      );

      setDomain(data.domain || null);
      setHostname("");
      setNotice(data.message || "Your domain connection has been created.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "We couldn't connect this domain. Please check it and try again."
        )
      );
    } finally {
      setConnecting(false);
    }
  };

  const verifyDomain = async () => {
    setVerifying(true);
    setError("");
    setNotice("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/talents/custom-domain/verify`,
        {},
        { headers, timeout: 30000 }
      );

      setDomain(data.domain || null);
      setNotice(data.message || "Domain verification status refreshed.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "We couldn't refresh your domain verification. Please try again."
        )
      );
    } finally {
      setVerifying(false);
    }
  };

  const disconnectDomain = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect this custom domain from your portfolio?"
      )
    ) {
      return;
    }

    setDisconnecting(true);
    setError("");
    setNotice("");

    try {
      const { data } = await axios.delete(
        `${API_BASE_URL}/api/talents/custom-domain`,
        { headers, timeout: 30000 }
      );

      setDomain(null);
      setNotice(data.message || "Your custom domain has been disconnected.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "We couldn't disconnect your domain. Please try again."
        )
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const status = statusDetails[domain?.status] || {
    label: "Not connected",
    color: "text-gray-400",
    description: "Connect a domain to use it for your public talent portfolio.",
  };

  const isActive = domain?.status === "active";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-blue-600" />
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Custom Domain
          </h1>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          Connect a domain you own and use it as the address for your public
          talent portfolio.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-3 py-16 text-gray-400"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading custom domain settings…
        </div>
      ) : (
        <div className="space-y-6">
          {!eligible && !domain ? (
            <section className="rounded-lg border border-white/5 bg-[#1A1A1E] p-6">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">
                  Custom domains require an eligible paid plan
                </h2>
              </div>
              <p className="text-sm leading-6 text-gray-400">
                Upgrade to an eligible paid talent plan to connect your own
                domain to your public portfolio.
              </p>
            </section>
          ) : !domain ? (
            <section className="rounded-lg border border-white/5 bg-[#1A1A1E] p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-white">
                  Connect your domain
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Enter a domain that you already own. You will update its DNS
                  records with your domain provider after connecting it here.
                </p>
              </div>

              {!eligible ? (
                <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
                  Your current subscription is not eligible to connect a custom
                  domain. You can manage your subscription from My Packages.
                </p>
              ) : (
                <form onSubmit={connectDomain} className="space-y-4">
                  <div>
                    <label
                      htmlFor="custom-hostname"
                      className="mb-2 block text-sm font-medium text-gray-300"
                    >
                      Your domain
                    </label>
                    <input
                      id="custom-hostname"
                      type="text"
                      autoComplete="url"
                      maxLength={253}
                      value={hostname}
                      onChange={(event) => setHostname(event.target.value)}
                      placeholder="www.yourdomain.com"
                      className={`${control} w-full`}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Enter the hostname only, without https:// or a trailing
                      slash. For example: www.yourdomain.com
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={connecting || !hostname.trim()}
                    className={primaryAction}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        Connect Domain
                      </>
                    )}
                  </button>
                </form>
              )}
            </section>
          ) : (
            <>
              <section className="rounded-lg border border-white/5 bg-[#1A1A1E] p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="mb-2 text-sm text-gray-400">
                      Connected hostname
                    </p>
                    <h2 className="break-all text-xl font-semibold text-white">
                      {domain.hostname}
                    </h2>
                    <p className={`mt-3 text-sm font-medium ${status.color}`}>
                      {status.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {status.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={refreshDomain}
                    disabled={loading}
                    className={action}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                {isActive && (
                  <div className="mt-5">
                    <a
                      href={`https://${domain.hostname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={action}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Portfolio
                    </a>
                  </div>
                )}

                {domain.lastError && (
                  <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                    {domain.lastError}
                  </p>
                )}
              </section>

              {!isActive && records.length > 0 && (
                <section className="rounded-lg border border-white/5 bg-[#1A1A1E] p-6">
                  <h2 className="text-lg font-semibold text-white">
                    Required DNS records
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Open your domain provider's DNS settings and add the
                    records below. Keep the values exactly as provided.
                  </p>

                  <div className="mt-5 space-y-4">
                    {records.map((record, index) => {
                      const key = `${record.type}-${record.name}-${index}`;

                      return (
                        <div
                          key={key}
                          className="rounded-lg border border-white/5 bg-[#202024] p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-white">
                              {record.source}
                            </span>
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                              {record.type}
                            </span>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div>
                              <p className="mb-1 text-xs text-gray-500">
                                Name / Host
                              </p>
                              <div className="flex items-start justify-between gap-3">
                                <code className="min-w-0 break-all text-gray-200">
                                  {record.name}
                                </code>
                                <button
                                  type="button"
                                  aria-label="Copy DNS record name"
                                  onClick={() => copyValue(record.name, `${key}-name`)}
                                  className="shrink-0 text-gray-400 hover:text-white"
                                >
                                  {copied === `${key}-name` ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="mb-1 text-xs text-gray-500">
                                Value / Target
                              </p>
                              <div className="flex items-start justify-between gap-3">
                                <code className="min-w-0 break-all text-gray-200">
                                  {record.value}
                                </code>
                                <button
                                  type="button"
                                  aria-label="Copy DNS record value"
                                  onClick={() => copyValue(record.value, `${key}-value`)}
                                  className="shrink-0 text-gray-400 hover:text-white"
                                >
                                  {copied === `${key}-value` ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-gray-500">
                    DNS changes can take time to propagate. Do not remove
                    existing records unless you know they are no longer needed.
                  </p>
                </section>
              )}

              {!isActive && (
                <section className="rounded-lg border border-white/5 bg-[#1A1A1E] p-6">
                  <h2 className="text-lg font-semibold text-white">
                    Check domain status
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    After adding the DNS records, use this button to ask
                    Cloudflare to refresh the domain verification and SSL
                    status.
                  </p>
                  <button
                    type="button"
                    onClick={verifyDomain}
                    disabled={verifying || disconnecting}
                    className={`${primaryAction} mt-4`}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Verify DNS and SSL
                      </>
                    )}
                  </button>
                </section>
              )}

              <section className="rounded-lg border border-red-500/10 bg-[#1A1A1E] p-6">
                <h2 className="text-lg font-semibold text-white">
                  Disconnect domain
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  This removes the custom domain connection from your
                  portfolio. You can connect it again later if it is available.
                </p>
                <button
                  type="button"
                  onClick={disconnectDomain}
                  disabled={disconnecting || verifying}
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {disconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {disconnecting ? "Disconnecting…" : "Disconnect Domain"}
                </button>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TalentCustomDomain;
