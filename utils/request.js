function wantsJson(req) {
  return (
    req.originalUrl.startsWith("/api/") ||
    Boolean(req.xhr) ||
    req.is("application/json") === "application/json" ||
    Boolean(req.headers && req.headers.accept && req.headers.accept.includes("application/json"))
  );
}

function safePageRedirect(req) {
  const firstSegment = req.path.split("/").filter(Boolean)[0];
  return firstSegment ? "/" + firstSegment : "/";
}

module.exports = { wantsJson, safePageRedirect };
