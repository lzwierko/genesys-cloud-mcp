import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AsyncEntry } from '@napi-rs/keyring';
import platformClient from 'purecloud-platform-client-v2';
import {
  getGenesysClient,
  initializeGenesysClient,
  invalidateGenesysLogin,
} from '../src/genesys.ts';

test('invalidation waits for in-flight authentication and permits a later login', async (t) => {
  const config = {
    region: 'mypurecloud.com',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };
  let completeLogin: (() => void) | undefined;
  const inFlight = new Promise<void>((resolve) => {
    completeLogin = resolve;
  });
  let loginStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    loginStarted = resolve;
  });
  const login = t.mock.method(
    platformClient.ApiClient.instance,
    'loginClientCredentialsGrant',
    async () => {
      loginStarted?.();
      await inFlight;
      return {
        accessToken: 'test',
        tokenExpiryTime: Date.now() + 60_000,
        tokenExpiryTimeString: '',
      };
    },
  );
  const deleted = t.mock.method(AsyncEntry.prototype, 'deleteCredential', async () => true);
  const initialization = initializeGenesysClient(config);
  await started;
  const invalidation = invalidateGenesysLogin(config);
  assert.equal(deleted.mock.callCount(), 0);
  completeLogin?.();
  await initialization;
  await invalidation;
  await assert.rejects(getGenesysClient(), /not initialized/);
  assert.equal(deleted.mock.callCount(), 1);

  login.mock.mockImplementation(async () => ({
    accessToken: 'new-test',
    tokenExpiryTime: Date.now() + 60_000,
    tokenExpiryTimeString: '',
  }));
  await initializeGenesysClient(config);
  assert.equal(await getGenesysClient(), platformClient.ApiClient.instance);
});
