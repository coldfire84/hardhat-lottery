import { network, ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getChainLinkAutomationGasLane,
  getChainLinkAutomationCallbackGasLimit,
  getBlockConfirmations,
  getChainLinkSubscriptionId,
  getVrfCoordinatorV2Address,
  getNetworkType,
  getLotteryEntranceFee,
  getLotteryIntervalSeconds,
} from '../helper-hardhat-config';
import { DeployFunction } from 'hardhat-deploy/types';
import { verifyContract } from '../utils/verify-contract';

const FUND_AMOUNT = ethers.parseEther('30');

// No need for main function/ calling of the main function
const deploy: DeployFunction = async ({
  getNamedAccounts,
  deployments,
}: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts(); // uses named 'deployer' account from hardhat.config.ts 'namedAccounts'
  // Build args array for constructor
  const interval = getLotteryIntervalSeconds(network.name);
  const entranceFee = getLotteryEntranceFee(network.name);
  const gasLane = getChainLinkAutomationGasLane(network.name);
  const callbackGasLimit = getChainLinkAutomationCallbackGasLimit(network.name);
  let subscriptionId = getChainLinkSubscriptionId(network.name);
  let vrfCoordinatorV2Address = getVrfCoordinatorV2Address(network.name);
  // On local network, get VRF Coordinator and create a mock subscription
  if (getNetworkType(network.name) === 'local') {
    // Get the deployed VRFCoordinatorV2Mock contract
    const vrfCoordinatorV2Mock = await deployments.get('VRFCoordinatorV2Mock');
    const vrfCoordinatorV2MockContract = await ethers.getContractAt(
      'VRFCoordinatorV2Mock',
      vrfCoordinatorV2Mock.address,
    );
    // Create a mock subscription
    const response = await vrfCoordinatorV2MockContract.createSubscription();
    const receipt = await response.wait();
    // Get mock subscriptionId
    /**
     * As-per: https://ethereum.stackexchange.com/a/152754
     * he logs property contains an array of log objects emitted during the transaction.
     * Each log object has a topics property that holds an array of topic values.
     * The topic value you need should be at index 1 of the topics array.
     */
    if (!receipt?.logs[0]?.topics[1]) throw new Error('No subscription ID');
    subscriptionId = BigInt(receipt.logs[0].topics[1]).toString();
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    // Fund the mock subscription
    await vrfCoordinatorV2MockContract.fundSubscription(
      subscriptionId,
      FUND_AMOUNT,
    );
  }
  if (!vrfCoordinatorV2Address || !subscriptionId) {
    throw new Error('VRF Coordinator invalid/ unknown network');
  }
  log('Deploying Lottery and waiting for confirmations...');
  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  const result = await deploy('Lottery', {
    from: deployer,
    args,
    log: true,
    waitConfirmations: getBlockConfirmations(network.name) || 1,
  });
  log(`Contract deployed to ${result.address}`);
  // Local only: add Lottery contract as a consumer to the mock VRF Coordinator
  // --> without this you'll get `reverted with custom error 'InvalidConsumer()'` on calls to `requestRandomWords`
  if (getNetworkType(network.name) === 'local') {
    // Get the deployed VRFCoordinatorV2Mock contract
    const vrfCoordinatorV2Mock = await deployments.get('VRFCoordinatorV2Mock');
    const vrfCoordinatorV2MockContract = await ethers.getContractAt(
      'VRFCoordinatorV2Mock',
      vrfCoordinatorV2Mock.address,
    );
    await vrfCoordinatorV2MockContract.addConsumer(
      subscriptionId,
      result.address,
    );
  }
  // Could add else here to add Lottery contract as a consumer to the real VRF Coordinator
  // https://docs.chain.link/vrf/v2/subscription/examples/programmatic-subscription
  // Essentially this boils down to:
  // 1. Deploy Subscription Manager contract]
  // 2. Get the subscription Id
  // 3. Send LINK to the topUpSunscription function on the Subscription Manager contract
  // 4. Deploy the Lottery contract
  // 5. Add Lottery contract as a consumer to Subscription Manager contract via `addConsumer` function

  // Similarly for Automation
  // 1. Register a new Custom Logic Upkeep oin the Lottery Contract Address
  // Non-local only: verify contract
  if (
    getNetworkType(network.name) !== 'local' &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log('----------------------------------------------------');
    log('Verifying contract on Etherscan...');
    await verifyContract(result.address, args);
  }
  log('----------------------------------------------------');
};
deploy.tags = ['all', 'Lottery'];
export default deploy;
