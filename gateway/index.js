import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import cors from "cors";
import express from "express";
import { useServer } from "graphql-ws/use/ws";
import { createServer } from "http";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import { config } from "./src/config/environment.js";
import resolvers from "./src/schema/resolvers.js";
import typeDefs from "./src/schema/typeDefs.js";
// import Player from "./src/models/Player.js";
// import Game from "./src/models/Game.js";

mongoose
  .connect(config.MONGODB_URI, {
    dbName: "tic-tac-toe",
  })
  .then(() => {
    console.log("✅ Database connected successfully");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });

// Create the schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create an Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

// Hand in the schema we just created and have the WebSocketServer start listening
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

app.use(express.json()); // Register globally, before all routes

// Set up Express middleware
app.use(
  "/graphql",
  cors({
    origin: ["http://localhost:5173", "http://192.168.1.188:5173"],
    credentials: true,
  }),
  expressMiddleware(server, {
    context: async ({ req }) => {
      return { req };
    },
  })
);

const PORT = config.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`);
});

// const { url, subscriptionUrl } = await startStandaloneServer(server);
// console.log(`🚀 Server ready at ${url}`);
// console.log(`📡 Subscriptions ready at ${subscriptionUrl}`);

// import express from "express";
// import cors from "cors";
// import { ApolloServer } from "@apollo/server";
// import { expressMiddleware } from "@apollo/server/express4";
// import typeDefs from "./src/schema/typeDefs.js";
// import resolvers from "./src/schema/resolvers.js";

// const app = express();

// app.use(cors());
// app.use(express.json()); // Register JSON middleware first

// const server = new ApolloServer({
//   typeDefs,
//   resolvers,
// });

// await server.start();

// app.use(
//   "/graphql",
//   expressMiddleware(server, {
//     context: async ({ req }) => ({
//       // your context here
//     }),
//   })
// );

// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`🚀 Gateway running at http://localhost:${PORT}/graphql`);
// });
