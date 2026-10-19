const test = require("node:test");
const assert = require("node:assert/strict");

function loadServiceWithUserModel(userModel) {
  const userModelPath = require.resolve("../../models/userModel");
  const servicePath = require.resolve("../../services/settingsService");
  const originalUserModel = require.cache[userModelPath];
  delete require.cache[servicePath];
  require.cache[userModelPath] = { id: userModelPath, filename: userModelPath, loaded: true, exports: userModel };
  return {
    service: require("../../services/settingsService"),
    restore() {
      delete require.cache[servicePath];
      if (originalUserModel) require.cache[userModelPath] = originalUserModel;
      else delete require.cache[userModelPath];
    },
  };
}

test("settings updates only a name and keeps email and verification unchanged", async () => {
  const calls = [];
  const { service, restore } = loadServiceWithUserModel({
    updateName: async (id, name) => {
      calls.push({ id, name });
      return { id, name, email: "registered@example.test", email_verified: 1, password: "hidden" };
    },
  });
  try {
    const user = await service.updateProfile(42, { name: "Updated Name" });
    assert.deepEqual(calls, [{ id: 42, name: "Updated Name" }]);
    assert.deepEqual(user, { id: 42, name: "Updated Name", email: "registered@example.test", email_verified: 1 });
  } finally {
    restore();
  }
});

test("settings rejects a crafted email field before any database update", async () => {
  let called = false;
  const { service, restore } = loadServiceWithUserModel({
    updateName: async () => { called = true; },
  });
  try {
    await assert.rejects(
      () => service.updateProfile(42, { name: "Updated Name", email: "attacker@example.test" }),
      { type: "EMAIL_CHANGE_DISABLED" },
    );
    assert.equal(called, false);
  } finally {
    restore();
  }
});
