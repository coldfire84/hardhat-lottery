/**
 * This script updates the frontend contract definitions to the latest version.
 */
import { ethers, network } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as fs from 'fs';
import { Lottery } from '../typechain-types';
// This is a hack as this path is OUTSIDE of the project
// Deployments are per-network
const CONTRACT_DEPLOYMENTS_FILE =
  '../nextjs-lottery/src/constants/contract-deployments.json';
// ABI is the same across all networks
const CONTRACT_ABI_FILE = '../nextjs-lottery/src/constants/abi.ts';
/**
 * @description Contract deployment map
 */
interface Contracts {
  [key: number]: {
    address: string;
  };
}
/**
 * @description Updates the contract address in the contracts.json file
 * @param chainId 
 * @param address 
 */
async function updateContractAddress(chainId: number, address: string) {
  try {
    const contracts: Contracts = JSON.parse(
      fs.readFileSync(CONTRACT_DEPLOYMENTS_FILE, 'utf-8'),
    );
    let deploymentsChanged = false;
    if (
      chainId in contracts &&
      contracts[chainId].address !== address
    ) {
      contracts[chainId].address = address;
      deploymentsChanged = true;
    } else {
      // Add to map
      contracts[chainId] = {
        address: address,
      };
      deploymentsChanged = true;
    }
    if (deploymentsChanged) {
      fs.writeFileSync(CONTRACT_DEPLOYMENTS_FILE, JSON.stringify(contracts, null, 2));
    }
  } catch (e) {
    console.log(e);
    throw e;
  }
}
/**
 * @description Updates the contract ABI
 * @param contract 
 */
async function updateContractAbi(contract: Lottery) {
  // Create a TS file, that exports as const to allow type inference by wagmi
  const prepend = 'export const abi = '
  const append = " as const;"
  const abi = contract.interface.formatJson();
  try {
    fs.writeFileSync(CONTRACT_ABI_FILE, `${prepend + abi + append}`);
  }
  catch (e) {
    console.log(e);
    throw e;
  }
}
/**
 * @description Main deploy function, used by HardHat
 */
const deploy: DeployFunction = async ({
  deployments,
}: HardhatRuntimeEnvironment) => {
  const chainId = network.config.chainId;
  const lotteryDeployment = await deployments.get('Lottery');
  const contract = await ethers.getContractAt(
    'Lottery',
    lotteryDeployment.address,
  );
  if (!chainId) throw new Error('No network chainId');
  // Only update if a .env variable is set to true
  // if (process.env.UPDATE_FRONTEND_CONTRACTS !== 'true') {
  //   console.log(
  //     'Skipping frontend contract update, set UPDATE_FRONTEND_CONTRACTS=true to update',
  //   );
  //   return;
  // }
  // Update contracts.json with new address
  await updateContractAddress(chainId, lotteryDeployment.address);
  // Update ABI
  await updateContractAbi(contract);
};

deploy.tags = ['all', 'frontend'];
export default deploy;
