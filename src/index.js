import { Mutex } from 'async-mutex';
import * as passworder from '@metamask/browser-passworder';

function fuzzySearch(haystack, needle) {
  let regexPattern = '.*';
  for (let i = 0; i < needle.length; i++) {
    regexPattern += needle[i] + '.*';
  }
  const regex = new RegExp(regexPattern);

  return haystack.reduce((results, possibillity) => {
    if (possibillity.search(regex) !== -1) {
      results.push(possibillity);
    }
    return results;
  }, []);
}

async function getPasswords(entropy) {
  const state = await wallet.request({
    method: 'snap_manageState',
    params: ['get'],
  });
  if (
    state === null ||
    (typeof state === 'object' && state.passwords === undefined)
  ) {
    return {};
  }
  return await passworder.decrypt(entropy.key, state.passwords);
}

async function savePasswords(entropy, newState) {
  const encryptedState = {
    passwords: await passworder.encrypt(entropy.key, newState),
  };
  await wallet.request({
    method: 'snap_manageState',
    params: ['update', encryptedState],
  });
}

const saveMutext = new Mutex();

wallet.registerRpcMessageHandler(async (originString, requestObject) => {
  const entropy = await wallet.request({
    method: 'snap_getBip44Entropy_69420',
  });
  const state = await getPasswords(entropy);

  let website, username, password;
  switch (requestObject.method) {
    case 'save_password':
      ({ website, username, password } = requestObject);
      await saveMutext.runExclusive(async () => {
        const oldState = await getPasswords(entropy);
        const newState = {
          ...oldState,
          [website]: { username, password },
        };
        await savePasswords(entropy, newState);
      });
      return 'OK';
    case 'get_password':
      ({ website } = requestObject);
      const showPassword = await wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: 'Confirm password request?',
            description: 'Do you want to display the password in plaintext?',
            textAreaContent: `The DApp "${originString}" is asking to display the account and password for "${website}" website`,
          },
        ],
      });
      if (!showPassword) {
        return undefined;
      }
      return state[website];
    case 'search':
      const { pattern } = requestObject;
      return fuzzySearch(Object.keys(state), pattern);
    case 'clear':
      await wallet.request({
        method: 'snap_manageState',
        params: ['update', {}],
      });
      return 'OK';
    default:
      throw new Error('Method not found.');
  }
});
