# Password Manager snap

This is an example Metamask Snap that allows the user to manage their passwords for websites and store them securely in Metamask.

https://user-images.githubusercontent.com/1614945/164003634-69949fd6-9946-4550-9aa3-edbbb8b5fb4c.mov

### How This Works

This Snap uses the entropy for [Garlicoin](https://garlicoin.io/) to encrypt the user's passwords. It requests the following permissions: 

```JSON
"initialPermissions": {
  "snap_confirm": {},
  "snap_manageState": {},
  "snap_getBip44Entropy_69420": {}
},
```

_* 69420 is the chain ID for Garlicoin._

It then uses [@MetaMask/browser-passworder](https://github.com/metamask/browser-passworder) to encrypt the full state with the encryption key being the Bip44 entropy derived by MetaMask. 

```Javascript
import * as passworder from '@metamask/browser-passworder';

const entropy = await wallet.request({
  method: 'snap_getBip44Entropy_69420',
});

const newState = {
  [website]: { username, password },
};

const encryptedState = {
  passwords: await passworder.encrypt(entropy.key, newState),
};

wallet.request({
  method: 'snap_manageState',
  params: ['update', encryptedState],
});
```

It also has some extra features like using [async-mutex](https://www.npmjs.com/package/async-mutex) for async-safe state management and fuzzy searching for retrieving specific passwords. Follow the steps below to run this snap locally and see how it works.

### Setup

```shell
yarn install
yarn build
yarn serve
```

### Testing and Linting

Run `yarn test` to run the tests once.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.