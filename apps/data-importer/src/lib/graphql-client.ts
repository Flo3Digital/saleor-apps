import { createClient as urqlCreateClient, fetchExchange, cacheExchange, Client } from "urql";
import { useAppBridge } from "@saleor/app-sdk/app-bridge";

/**
 * Returns a GraphQL client that is attached to the Saleor app bridge.
 * Throws an error if the app bridge is not found.
 * @returns {Object} The GraphQL client object.
 */
export const GraphQLClient = (): Client => {
  const { appBridge } = useAppBridge();

  if (!appBridge) throw new Error("App bridge not found. Cannot attach GraphQL client");

  console.log("token", appBridge.getState().token);
  const client = urqlCreateClient({
    url: appBridge.getState().saleorApiUrl,
    requestPolicy: "network-only",
    suspense: false,
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${String(appBridge.getState().token)}`,
      },
    },
    exchanges: [cacheExchange, fetchExchange],
  });

  console.log("client", client);
  return client;
};
