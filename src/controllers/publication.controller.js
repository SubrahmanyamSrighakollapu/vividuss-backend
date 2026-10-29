const { getAuth } = require("@clerk/express");
const publication = require("../services/publication.service");
async function respond(req, res, action) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
  try { return res.json({ success: true, data: await action(userId) }); }
  catch (error) {
    return res.status(error.statusCode || 500).json({ success: false,
      message: error.statusCode && error.statusCode < 500 ? error.message : "Publication operation failed",
      code: error.code || "PUBLICATION_FAILED", ...(error.concurrency ? { concurrency: error.concurrency } : {}),
      ...(error.details ? { errors: error.details } : {}) });
  }
}
const state = (req, res) => respond(req, res, userId => publication.getState(req.params.id, userId));
const list = (req, res) => respond(req, res, userId => publication.list(req.params.id, userId, req.query));
const get = (req, res) => respond(req, res, userId => publication.getRevision(req.params.id, req.params.revisionId, userId));
const restore = (req, res) => respond(req, res, userId => publication.publish(req.params.id, userId, { restoreId: req.params.revisionId }));
const layout = (req, res) => respond(req, res, userId => publication.setLayout(req.params.id, userId, req.body?.globalLayout));
module.exports = { state, list, get, restore, layout };
