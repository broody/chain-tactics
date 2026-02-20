import type { PropsWithChildren } from "react";
import { cacheExchange, createClient, fetchExchange, Provider } from "urql";
import { TORII_GRAPHQL_URL } from "./config";

const graphqlClient = createClient({
  url: TORII_GRAPHQL_URL,
  exchanges: [cacheExchange, fetchExchange],
});

export default function GraphQLProvider({ children }: PropsWithChildren) {
  return <Provider value={graphqlClient}>{children}</Provider>;
}
