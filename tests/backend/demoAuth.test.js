const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");

test("demo login accepts only the configured bcrypt password and the expected demo tenant", async () => {
  const originalEmail = process.env.DEMO_ACCOUNT_EMAIL;
  const originalHash = process.env.DEMO_ACCESS_PASSWORD_HASH;
  process.env.DEMO_ACCOUNT_EMAIL = "demo@example.test";
  process.env.DEMO_ACCESS_PASSWORD_HASH = await bcrypt.hash("shared-demo-password", 4);

  const userModelPath = require.resolve("../../models/userModel");
  const authServicePath = require.resolve("../../services/authService");
  const originalUserModel = require.cache[userModelPath];
  delete require.cache[authServicePath];
  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: {
      findDemoAccount: async ({ email }) => email === "demo@example.test"
        ? { id: 7, business_id: 11, name: "SmartBiz Demo Access", email, password: "not-returned", role: "manager", email_verified: 1 }
        : null,
    },
  };

  try {
    const authService = require("../../services/authService");
    const user = await authService.loginDemo("shared-demo-password");
    assert.deepEqual(user, { id: 7, business_id: 11, name: "SmartBiz Demo Access", email: "demo@example.test", role: "manager", email_verified: 1 });
    await assert.rejects(() => authService.loginDemo("wrong-password"), { type: "AUTHENTICATION_ERROR" });
  } finally {
    delete require.cache[authServicePath];
    if (originalUserModel) require.cache[userModelPath] = originalUserModel;
    else delete require.cache[userModelPath];
    if (originalEmail === undefined) delete process.env.DEMO_ACCOUNT_EMAIL;
    else process.env.DEMO_ACCOUNT_EMAIL = originalEmail;
    if (originalHash === undefined) delete process.env.DEMO_ACCESS_PASSWORD_HASH;
    else process.env.DEMO_ACCESS_PASSWORD_HASH = originalHash;
  }
});
