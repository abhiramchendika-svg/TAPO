// Extends app.json. Set EXPO_BASE_URL to host the web build under a sub-path,
// e.g. `EXPO_BASE_URL=/tapo npx expo export --platform web` for https://example.com/tapo/.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
