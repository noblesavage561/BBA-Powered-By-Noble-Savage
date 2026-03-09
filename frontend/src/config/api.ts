type ApiConfig = {
  apiBaseUrl: string;
  graphqlUrl: string;
  systemHealthWsUrl: string;
};

declare const process: { env?: Record<string, string | undefined> } | undefined;

function getProcessApiUrl(): string {
  if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "";
}

function deriveCodespaceHost(hostname: string, port: number): string {
  return hostname.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`);
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getApiConfig(): ApiConfig {
  if (typeof window === "undefined") {
    const apiBaseUrl = getProcessApiUrl() || "http://127.0.0.1:8000";
    return {
      apiBaseUrl,
      graphqlUrl: `${apiBaseUrl}/graphql`,
      systemHealthWsUrl: "ws://127.0.0.1:8000/ws/system",
    };
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  const isCodespace = hostname.includes(".app.github.dev");

  const processApiUrl = getProcessApiUrl();

  const apiBaseUrl = processApiUrl || (
    isCodespace
      ? `${protocol}//${deriveCodespaceHost(hostname, 8000)}`
      : "http://127.0.0.1:8000"
  );

  const graphqlUrl = isCodespace
    ? joinUrl(window.location.origin, "/graphql")
    : joinUrl(window.location.origin, "/graphql");

  const systemHealthWsUrl = isCodespace
    ? `${wsProtocol}//${window.location.host}/ws/system`
    : `${wsProtocol}//${window.location.host}/ws/system`;

  return {
    apiBaseUrl,
    graphqlUrl,
    systemHealthWsUrl,
  };
}
