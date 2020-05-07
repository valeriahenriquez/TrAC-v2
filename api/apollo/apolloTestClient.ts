import "dotenv/config";

import { createTestClient } from "apollo-server-integration-testing";

import { apolloServer } from "./server";

export const apolloTestClient = async ({
  headers,
}: { headers?: Record<string, string> } = {}) =>
  createTestClient({
    apolloServer: apolloServer as any,
    extendMockRequest: {
      headers,
    },
  });
