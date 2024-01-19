import { ethers } from 'hardhat';

type NetworkType = 'local' | 'testnet' | 'mainnet';

interface NetworkConfig {
  type: NetworkType;
  // ethUsdPriceFeed?: string;
  blockConfirmations?: number;
  entranceFee: bigint;
  lotteryIntervalSeconds: number;
  chainLinkSubscriptionId?: string;
  chainLinkVrfCoordinatorV2Address?: string;
  chainLinkAutomationGasLane: string;
  chainLinkAutomationCallbackGasLimit: number;
  // chainLinkAutomationInterval: number;
}

// Price Feed Address, values can be obtained at https://docs.chain.link/data-feeds/price-feeds/addresses
const networkConfig: { [key: string]: NetworkConfig } = {
  // Local Development
  localhost: {
    type: 'local',
    lotteryIntervalSeconds: 30,
    entranceFee: ethers.parseEther('0.1'),
    // this is a mock address, not a real one
    chainLinkAutomationGasLane:
      '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
    chainLinkAutomationCallbackGasLimit: 200000,
    // chainLinkAutomationInterval: 30,
  },
  hardhat: {
    type: 'local',
    lotteryIntervalSeconds: 30,
    entranceFee: ethers.parseEther('0.1'),
    // this is a mock address, not a real one
    chainLinkAutomationGasLane:
      '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
    chainLinkAutomationCallbackGasLimit: 200000,
    // chainLinkAutomationInterval: 30,
  },
  // Sepolia
  sepolia: {
    type: 'testnet',
    lotteryIntervalSeconds: 60,
    entranceFee: ethers.parseEther('0.1'),
    // ethUsdPriceFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    blockConfirmations: 5,
    // Manually create a subscription on the network here: https://vrf.chain.link/sepolia/new
    // Deploy Lottery Contract
    // Add LINK
    // Add tesnet deployed contract address as a consumer to the subscription
    chainLinkSubscriptionId: '8323',
    // See: https://docs.chain.link/vrf/v2/subscription/supported-networks/#sepolia-testnet
    chainLinkVrfCoordinatorV2Address:
      '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
    chainLinkAutomationGasLane:
      '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
    chainLinkAutomationCallbackGasLimit: 200000,
    // chainLinkAutomationInterval: 30,
  },
};

// export function getEthUsdPriceFeedAddress(
//   networkName: string,
// ): string | undefined {
//   const network = networkConfig[networkName];
//   return network?.ethUsdPriceFeed;
// }

export function getLotteryEntranceFee(networkName: string): bigint {
  const network = networkConfig[networkName];
  return network?.entranceFee;
}

export function getLotteryIntervalSeconds(networkName: string): number {
  const network = networkConfig[networkName];
  return network?.lotteryIntervalSeconds;
}

export function getVrfCoordinatorV2Address(
  networkName: string,
): string | undefined {
  const network = networkConfig[networkName];
  return network?.chainLinkVrfCoordinatorV2Address;
}

export function getChainLinkAutomationGasLane(
  networkName: string,
): string | undefined {
  const network = networkConfig[networkName];
  return network?.chainLinkAutomationGasLane;
}

// export function getChainLinkAutomationInterval(
//   networkName: string,
// ): number | undefined {
//   const network = networkConfig[networkName];
//   return network?.chainLinkAutomationInterval;
// }

export function getChainLinkSubscriptionId(
  networkName: string,
): string | undefined {
  const network = networkConfig[networkName];
  return network?.chainLinkSubscriptionId;
}

export function getChainLinkAutomationCallbackGasLimit(
  networkName: string,
): number | undefined {
  const network = networkConfig[networkName];
  return network?.chainLinkAutomationCallbackGasLimit;
}

export function getBlockConfirmations(networkName: string): number | undefined {
  const network = networkConfig[networkName];
  return network?.blockConfirmations;
}

export function getNetworkType(networkName: string): NetworkType | undefined {
  const network = networkConfig[networkName];
  return network?.type;
}
