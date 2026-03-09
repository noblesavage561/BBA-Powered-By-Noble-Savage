export function getApiConfig() {
  const protocol = window.location.protocol;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  const origin = window.location.origin;
  const host = window.location.host;

  return {
    apiBaseUrl: origin,
    graphqlUrl: `${origin}/graphql`,
    systemHealthWsUrl: `${wsProtocol}//${host}/ws/system`,
  };
}
