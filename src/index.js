import { Mutex } from 'async-mutex';

function fuzzySearch(haystack, needle) {
  let regexPattern = '.*';
  for (let i = 0; i < needle.length; i++) {
    regexPattern += needle[i] + '.*';
  }
  const regex = new RegExp(regexPattern);

  return haystack.reduce((results, possibility) => {
    if (possibility.search(regex) !== -1) {
      results.push(possibility);
    }
    return results;
  }, []);
}

async function getPasswords() {
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
  return state.passwords;
}

async function savePasswords(newState) {
  // The state is automatically encrypted behind the scenes by MetaMask using snap-specific keys
  await wallet.request({
    method: 'snap_manageState',
    params: ['update', { passwords: newState }],
  });
}

const saveMutex = new Mutex();

module.exports.onRpcRequest = async ({ origin, request }) => {
  const state = await getPasswords();

  let website, username, password;
  switch (request.method) {
    case 'save_password':
      ({ website, username, password } = request.params);
      await saveMutex.runExclusive(async () => {
        const oldState = await getPasswords();
        const newState = {
          ...oldState,
          [website]: { username, password },
        };
        await savePasswords(newState);
      });
      return 'OK';
    case 'get_password':
      ({ website } = request.params);
      const showPassword = await wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: 'Confirm password request?',
            description: 'Do you want to display the password in plaintext?',
            textAreaContent: `The DApp "${origin}" is asking to display the account and password for "${website}" website`,
          },
        ],
      });
      if (!showPassword) {
        return undefined;
      }
      return state[website];
    case 'search':
      const { pattern } = request.params;
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
};
