import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://1bf01c6a65c2039cada8e02d3e9ac22b@o4511839915868160.ingest.us.sentry.io/4511839921111040",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
