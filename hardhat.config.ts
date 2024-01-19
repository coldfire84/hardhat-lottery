import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import 'dotenv/config';
import 'solidity-coverage';
import 'hardhat-deploy';
import { decryptKey } from './utils/decrypt-key';
import * as fs from 'fs';
// Setup environment variables
const PRIVATE_KEY =
  process.env.PRIVATE_KEY_PASSWORD && fs.existsSync('./.encryptedKey.json')
    ? decryptKey()
    : process.env.PRIVATE_KEY;
// Network URLs
const SEPOLIA_URL = process.env.SEPOLIA_URL;
// const POLYGON_URL = process.env.POLYGON_URL;
// const ETH_MAINNET_URL = process.env.ETH_MAINNET_URL;

// API Keys
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
// Warn on Account Private Key being set as ENV
if (process.env.PRIVATE_KEY) {
  console.warn(
    'Warning, private key is set as an environment variable: please encrypt and supply PRIVATE_KEY_PASSWORD at runtime.',
  );
}
// Guard/ warnings
if (!SEPOLIA_URL) {
  throw new Error('SEPOLIA_URL is not set');
}
if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is not set');
}
if (!ETHERSCAN_API_KEY) {
  console.warn(
    'ETHERSCAN_API_KEY is not set, disabling etherscan verification',
  );
}
if (!COINMARKETCAP_API_KEY) {
  console.warn('COINMARKETCAP_API_KEY is not set, disabling CoinMarketCap API');
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.19',
      },
      {
        version: '0.6.6',
      },
    ],
  },
  defaultNetwork: 'hardhat',
  etherscan: {
    enabled: ETHERSCAN_API_KEY ? true : false,
    apiKey: ETHERSCAN_API_KEY,
  },
  // Ensure you update helper config when adding a new network
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true' ? true : false,
    outputFile: 'gas-report.txt',
    noColors: true,
    currency: 'GBP',
    coinmarketcap: COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      // assumes position 0 in 'accounts' array for ALL networks is the deployment account
      default: 0,
    },
    player: {
      // assumes position 1 in 'accounts' array for ALL networks is the player account
      // only actually used on local network
      default: 1,
    },
  },
  mocha: {
    // set a LONG timeout to accomodate slow test network
    timeout: 360000,
  },
};

export default config;
