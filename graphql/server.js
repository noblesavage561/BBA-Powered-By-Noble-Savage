const { ApolloServer, gql } = require("apollo-server");

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8000";

const typeDefs = gql`
  type Health {
    status: String!
    timestamp: String!
    db_connected: Boolean!
    redis_connected: Boolean!
  }

  type FundingResponse {
    matches: [String!]!
  }

  type Query {
    health: Health!
    fundingMatches(clientId: String!): FundingResponse!
  }
`;

const resolvers = {
  Query: {
    health: async () => {
      const res = await fetch(`${BACKEND_URL}/api/v1/health`);
      if (!res.ok) {
        throw new Error(`Backend health call failed with status ${res.status}`);
      }
      return res.json();
    },
    fundingMatches: async (_, { clientId }) => {
      const res = await fetch(`${BACKEND_URL}/api/v1/funding-matches/${clientId}`);
      if (!res.ok) {
        throw new Error(`Funding call failed with status ${res.status}`);
      }
      const data = await res.json();
      const formatted = (data.matches || []).map((m) => {
        const name = m?.partner?.name || "Unknown";
        const score = m?.match_score ?? 0;
        return `${name} (${score}%)`;
      });
      return { matches: formatted };
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000, host: "0.0.0.0" }).then(({ url }) => {
  console.log(`GraphQL ready at ${url}`);
});
