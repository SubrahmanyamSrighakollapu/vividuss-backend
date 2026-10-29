require("dotenv").config();
const { validateEnvironment } = require("./config/environment");
const { createApp } = require("./app");
const { origins } = validateEnvironment();
const app = createApp({ origins });
const port = process.env.PORT || 5000;
async function start() {
  await require("./services/publication.service").assertSchemaReady();
  const server = app.listen(port, () => console.log("Backend listening on port " + server.address().port));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });
