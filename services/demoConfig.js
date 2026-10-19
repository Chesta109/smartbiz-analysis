const DEFAULT_DEMO_BUSINESS_NAME = "SmartBiz Shared Demo";
const DEFAULT_DEMO_ACCOUNT_NAME = "SmartBiz Demo Access";

function config() {
  return {
    email: String(process.env.DEMO_ACCOUNT_EMAIL || "").trim().toLowerCase(),
    passwordHash: String(process.env.DEMO_ACCESS_PASSWORD_HASH || "").trim(),
    businessName: process.env.DEMO_BUSINESS_NAME || DEFAULT_DEMO_BUSINESS_NAME,
    accountName: process.env.DEMO_ACCOUNT_NAME || DEFAULT_DEMO_ACCOUNT_NAME,
  };
}

function isConfigured() {
  const { email, passwordHash } = config();
  return Boolean(email && /^\$2[aby]\$\d{2}\$/.test(passwordHash));
}

module.exports = {
  DEFAULT_DEMO_ACCOUNT_NAME,
  DEFAULT_DEMO_BUSINESS_NAME,
  config,
  isConfigured,
};
