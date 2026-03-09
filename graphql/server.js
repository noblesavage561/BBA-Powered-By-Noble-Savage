const { ApolloServer, gql } = require("apollo-server");

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8000";
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || "*";

const typeDefs = gql`
  type Health {
    status: String!
    timestamp: String!
    db_connected: Boolean!
    redis_connected: Boolean!
  }

  type GraphQLHealth {
    latencyMs: Int!
    requestsPerSecond: Float!
    errorRate: Float!
    historicalLatency: [Int!]!
  }

  type DatabaseHealth {
    activeConnections: Int!
    maxConnections: Int!
    queryRate: Int!
    avgQueryTime: Float!
  }

  type RedisHealth {
    hitRate: Float!
    memoryUsedMb: Float!
    memoryTotalMb: Int!
    keysCount: Int!
    connectedClients: Int!
  }

  type AgentHealth {
    active: Int!
    pending: Int!
    completed: Int!
  }

  type ProcessLog {
    timestamp: String!
    message: String!
    type: String!
    category: String!
  }

  type SystemHealth {
    graphql: GraphQLHealth!
    database: DatabaseHealth!
    redis: RedisHealth!
    agents: AgentHealth!
    recent_logs: [ProcessLog!]!
  }

  type FundingResponse {
    matches: [String!]!
  }

  type Query {
    health: Health!
    fundingMatches(clientId: String!): FundingResponse!
    systemHealth: SystemHealth!
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
    systemHealth: async () => {
      const res = await fetch(`${BACKEND_URL}/api/v1/system/health`);
      if (!res.ok) {
        throw new Error(`System health call failed with status ${res.status}`);
      }
      return res.json();
    },
  },
};

const corsOrigins = CORS_ALLOWED_ORIGINS === "*"
  ? true
  : CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);

const server = new ApolloServer({ typeDefs, resolvers, cors: { origin: corsOrigins } });

server.listen({ port: 4000, host: "0.0.0.0" }).then(({ url }) => {
  console.log(`GraphQL ready at ${url}`);
});
