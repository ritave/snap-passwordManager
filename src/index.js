import { Mutex } from 'async-mutex';

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

const saveMutext = new Mutex();

wallet.registerRpcMessageHandler(async (originString, requestObject) => {
  const state =
    (await wallet.request({ method: 'snap_manageState', params: ['get'] })) ??
    {};

  let website, username, password;
  switch (requestObject.method) {
    case 'save_password':
      ({ website, username, password } = requestObject);
      await saveMutext.runExclusive(async () => {
        const oldState =
          (await wallet.request({
            method: 'snap_manageState',
            params: ['get'],
          })) ?? {};
        const newState = {
          ...oldState,
          [website]: { username, password },
        };
        await wallet.request({
          method: 'snap_manageState',
          params: ['update', newState],
        });
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
      await wallet.request({ method: 'snap_manageState', params: ['clear'] });
      return 'OK';
    default:
      throw new Error('Method not found.');
  }
});
