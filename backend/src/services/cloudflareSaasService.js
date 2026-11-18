const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

function getCloudflareConfig() {
  const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_SAAS_ZONE_ID, CLOUDFLARE_SAAS_CNAME_TARGET } =
    process.env;

  if (
    !CLOUDFLARE_API_TOKEN ||
    !CLOUDFLARE_SAAS_ZONE_ID ||
    !CLOUDFLARE_SAAS_CNAME_TARGET
  ) {
    throw new Error("Cloudflare for SaaS has not been configured.");
  }

  return {
    token: CLOUDFLARE_API_TOKEN,
    zoneId: CLOUDFLARE_SAAS_ZONE_ID,
    cnameTarget: CLOUDFLARE_SAAS_CNAME_TARGET,
  };
}

async function cloudflareRequest(path, options = {}) {
  const { token } = getCloudflareConfig();

  const response = await fetch(`${CLOUDFLARE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Cloudflare returned an invalid response.");
  }

  if (!response.ok || !payload.success) {
    const message = payload.errors
      ?.map(error => error.message)
      .filter(Boolean)
      .join("; ");

    throw new Error(message || "Cloudflare request failed.");
  }

  return payload.result;
}

export async function createCloudflareHostname(hostname, talentId) {
  const { zoneId, cnameTarget } = getCloudflareConfig();

  const result = await cloudflareRequest(
    `/zones/${zoneId}/custom_hostnames`,
    {
      method: "POST",
      body: JSON.stringify({
        hostname,
        ssl: {
          method: "txt",
          type: "dv",
          settings: {
            min_tls_version: "1.2",
            http2: "on",
            tls_1_3: "on",
          },
        },
        custom_metadata: {
          application: "qnduit",
          talentId: String(talentId),
        },
      }),
    }
  );

  return {
    id: result.id,
    hostname: result.hostname,
    status: result.status,
    sslStatus: result.ssl?.status || "pending",
    ownershipVerification: result.ownership_verification || null,
    sslValidationRecords: result.ssl?.validation_records || [],
    cnameTarget,
  };
}

export async function getCloudflareHostname(hostnameId) {
  const { zoneId } = getCloudflareConfig();

  return cloudflareRequest(
    `/zones/${zoneId}/custom_hostnames/${encodeURIComponent(hostnameId)}`
  );
}

export async function deleteCloudflareHostname(hostnameId) {
  const { zoneId } = getCloudflareConfig();

  return cloudflareRequest(
    `/zones/${zoneId}/custom_hostnames/${encodeURIComponent(hostnameId)}`,
    { method: "DELETE" }
  );
}