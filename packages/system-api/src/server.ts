import 'reflect-metadata';
import express from 'express';
import { ApolloServerPluginLandingPageGraphQLPlayground as Playground } from 'apollo-server-core';
import config from './config';
import { ApolloServer } from 'apollo-server-express';
import { createSchema } from './schema';
import { ApolloLogs } from './config/logger/apollo.logger';
import { createServer } from 'http';
import logger from './config/logger/logger';
import getSessionMiddleware from './core/middlewares/sessionMiddleware';
import { MyContext } from './types';
import { __prod__ } from './config/constants/constants';
import cors from 'cors';
import datasource from './config/datasource';
import appsService from './modules/apps/apps.service';
import { runUpdates } from './core/updates/run';
import recover from './core/updates/recover-migrations';
import { cloneRepo, updateRepo } from './helpers/repo-helpers';
import startJobs from './core/jobs/jobs';

let corsOptions = {
  credentials: true,
  origin: function (origin: any, callback: any) {
    if (!__prod__) {
      return callback(null, true);
    }
    // disallow requests with no origin
    if (!origin) return callback(new Error('Not allowed by CORS'), false);

    if (config.CLIENT_URLS.includes(origin)) {
      return callback(null, true);
    }

    const message = "The CORS policy for this origin doesn't allow access from the particular origin.";
    return callback(new Error(message), false);
  },
};

const main = async () => {
  try {
    const app = express();
    const port = 3001;

    app.use(express.static(`${config.ROOT_FOLDER}/repos/${config.APPS_REPO_ID}`));
    app.use(cors(corsOptions));
    app.use(getSessionMiddleware());

    await datasource.initialize();

    const schema = await createSchema();
    const httpServer = createServer(app);
    const plugins = [ApolloLogs];

    if (!__prod__) {
      plugins.push(Playground({ settings: { 'request.credentials': 'include' } }));
    }

    const apolloServer = new ApolloServer({
      schema,
      context: ({ req, res }): MyContext => ({ req, res }),
      plugins,
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, cors: corsOptions });

    try {
      await datasource.runMigrations();
    } catch (e) {
      logger.error(e);
      await recover();
    }

    // Run migrations
    await runUpdates();

    httpServer.listen(port, async () => {
      await cloneRepo(config.APPS_REPO_URL, config.APPS_REPO_BRANCH);
      await updateRepo(config.APPS_REPO_URL, config.APPS_REPO_BRANCH);
      startJobs();
      // Start apps
      appsService.startAllApps();
      console.info(`Server running on port ${port} 🚀 Production => ${__prod__}`);
    });
  } catch (error) {
    console.log(error);
    logger.error(error);
  }
};

main();
