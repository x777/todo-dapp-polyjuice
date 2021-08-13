require('babel-register');
require('babel-polyfill');
require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider-privkey');
const { PolyjuiceHDWalletProvider } = require("@polyjuice-provider/truffle");
const { PolyjuiceHttpProvider } = require("@polyjuice-provider/web3");

// use .env file
const privateKeys = process.env.PRIVATE_KEYS || ""



const providerConfig = {
  rollupTypeHash: process.env.ROLLUP_TYPE_HASH,
  ethAccountLockCodeHash: process.env.ETH_ACCOUNT_LOCK_CODE_HASH,
  web3Url: process.env.WEB3_PROVIDER_URL
};

console.log(providerConfig)

const polyjuiceHttpProvider = new PolyjuiceHttpProvider(
  providerConfig.web3Url,
  providerConfig
);

const polyjuiceTruffleProvider = new PolyjuiceHDWalletProvider(
  [
    {
      privateKeys: [process.env.PRIVATE_KEY],
      providerOrUrl: polyjuiceHttpProvider,
    },
  ],
  providerConfig
);

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", 
      port: 8545,
      network_id: "*" // Match any network id //71393
    },
    godwoken: {
      provider: ()=> polyjuiceTruffleProvider,
      gasPrice: "0",
      network_id: 71393,
    }
  },
  contracts_directory: './contracts/',
  contracts_build_directory: './build/contracts/',
  compilers: {
    solc: {
      // version: "0.8.0",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}