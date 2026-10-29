const { getAuth } = require("@clerk/express");
function requireUser(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
  return next();
}
module.exports = requireUser;
