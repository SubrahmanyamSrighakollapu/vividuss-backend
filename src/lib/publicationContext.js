const { AsyncLocalStorage } = require("node:async_hooks");
const transactions = new AsyncLocalStorage();
const requests = new AsyncLocalStorage();
const enabled = () => process.env.VIVIDUSS_PUBLICATION_REVISIONS === "enabled";
function fail(message, statusCode = 409, code = "VERSION_CONFLICT", concurrency) {
  return Object.assign(new Error(message), { statusCode, code, concurrency });
}
function expected(context, state, publish = false) {
  if (!Number.isSafeInteger(context?.draftVersion) || context.draftVersion < 0 ||
      publish && (!Number.isSafeInteger(context?.publicationVersion) || context.publicationVersion < 0)) {
    throw fail("Reload to obtain concurrency tokens before writing.", 428, "VERSION_REQUIRED", tokens(state));
  }
  if (context.draftVersion !== state.draftVersion || publish && context.publicationVersion !== state.publicationVersion) {
    throw fail("A newer draft or publication exists. Your local content has not been replaced.", 409, "VERSION_CONFLICT", tokens(state));
  }
}
function tokens(state) {
  return { enabled: true, draftVersion: state?.draftVersion || 0, publicationVersion: state?.publicationVersion || 0,
    activeRevisionId: state?.activeRevisionId || null };
}
function requestContext(req, res, next) {
  if (!enabled()) return next();
  const parse = (value, prefix) => {
    const match = typeof value === "string" && value.match(new RegExp('^"' + prefix + '-(\\d+)"$'));
    return match ? Number(match[1]) : undefined;
  };
  const context = { draftVersion: parse(req.headers["if-match"], "draft"),
    publicationVersion: parse(req.headers["if-publication-match"], "publication") };
  const json = res.json.bind(res);
  res.json = value => json(context.result && value && !Array.isArray(value)
    ? { ...value, concurrency: context.result } : value);
  return requests.run(context, next);
}
module.exports = { transactions, requests, enabled, expected, tokens, fail, requestContext };
