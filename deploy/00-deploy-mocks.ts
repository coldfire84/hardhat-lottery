import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getNetworkType } from '../helper-hardhat-config';

// Set BASE_FEE as 'Premium' price
const BASE_FEE = ethers.parseEther('0.25');
// A value that represents LINK : ETH
const GAS_PRICE_LINK = 1e9;

// No need for main function/ calling of the main function
const deploy: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  // If we are on a local development network, we need to deploy mocks!
  if (getNetworkType(network.name) === 'local') {
    log('Local network detected, deploying mocks...');
    await deploy('VRFCoordinatorV2Mock', {
      contract: 'VRFCoordinatorV2Mock',
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK], // constructor arguments, identified from source code/ GitHub
    });
    log('Mocks Deployed!');
    log('----------------------------------');
    log(
      "You are deploying to a local network, you'll need a local network running to interact",
    );
    log(
      'Please run `yarn hardhat console` to interact with the deployed smart contracts!',
    );
    log('----------------------------------');
  } else {
    log('Network not a development network, no need to deploy mocks');
  }
};
deploy.tags = ['all', 'mocks'];
export default deploy;
