// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import { AutomationCompatibleInterface } from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Lottery__InvalidEntranceFee();
error Lottery__FailedToSendWinnings();
error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);
error Lottery__Closed();

/**
 * @title A sample Lottery Contract
 * @author Chris Bradford
 * @notice This contract is for creating a sample lottery contract
 * @dev This implements the Chainlink VRF and Chainlink Automation
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
  /* Type Declarations */
  enum LotteryState { OPEN, CLOSED }

  /* ChainLink VRF Variables */
  VRFCoordinatorV2Interface private immutable VRF_COORDINATOR;
  bytes32 private immutable GAS_LANE;
  uint64 private immutable SUBSCRIPTION_ID;
  uint32 private immutable CALLBACK_GAS_LIMIT;
  uint8 private constant NUM_WORDS = 1;

  /* ChainLink Automation Variables */
  LotteryState private state;
  uint256 private lastTimeStamp;

  /* Lottery Variables */
  uint256 private immutable ENTRANCE_FEE;
  uint256 private immutable INTERVAL;
  address private recent_winner;
  address payable[] private players;

  /* Misc. Variables */
  uint16 private constant REQUEST_CONFIRMATIONS = 3;

  /* Events, will be written to logs */
  event Lottery__NewPlayer(address indexed player);
  event Lottery__WinnerPicked(address indexed winner);
  // event Lottery__RequestedWinner(uint256 indexed requestId);

  /* Functions */
  constructor(address vrfCoordinatorV2, uint256 entranceFee, bytes32 gasLane, uint64 subscriptionId, uint32 callbackGasLimit, uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2) {
    ENTRANCE_FEE = entranceFee;
    VRF_COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    GAS_LANE = gasLane; 
    SUBSCRIPTION_ID = subscriptionId;
    CALLBACK_GAS_LIMIT = callbackGasLimit;
    INTERVAL = interval;
    lastTimeStamp = block.timestamp;
    state = LotteryState.OPEN;
  }

  /**
   * @dev This is the function that players call to enter the lottery.
   * It requires a minimum amount of ETH to be sent.
   * It also requires the lottery to be open.
   */
  function enter() public payable {
    if(msg.value != ENTRANCE_FEE) revert Lottery__InvalidEntranceFee();
    if(state == LotteryState.CLOSED) revert Lottery__Closed();
    players.push(payable(msg.sender));  // cast address as payable
    emit Lottery__NewPlayer(msg.sender);
  }

   /**
   * @dev This is the function that the Chainlink Automation nodes call
   * when using a custom automation and AutomationCompatibleInterface
   * (the Automation looks for `upkeepNeeded` to return 'true').
   * This is executed **off-chain** by a ChainLink Automation Node, 
   *  if upkeep needed, on-chain upkeep is performed.
   * Can use on-chain data and a specified checkData parameter to perform 
   *  complex calculations off-chain and then send the result to performUpkeep 
   *  as `performData`.
   * Automation will be executed roughly every block.
   */
   function checkUpkeep(
      // bytes allows for a HUGE variety of inputs, albeit we're not using this in this example
      bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        // Lottery should be 'OPEN'
        bool isOpen = (state == LotteryState.OPEN);
        // Lottery time interval should have passed
        bool intervalExpired = ((block.timestamp - lastTimeStamp) > INTERVAL);
        // Lottery should have players
        bool hasPlayers = players.length > 0;
        // Lottery should have funds
        bool hasFunds = address(this).balance > 0;
        // If **all** of these are true, upkeep is needed
        upkeepNeeded = (isOpen && intervalExpired && hasPlayers && hasFunds);
    }

  /**
   * @dev Once `checkUpkeep` is returning `true`, this function is called
   * and it kicks off a Chainlink VRF call to get a random winner. On-chain.
  */
  function performUpkeep(bytes calldata /* performData */) external override {
    // Check if upkeep is actually needed/ execute guards
    (bool upkeepNeeded, ) = checkUpkeep("");
    if(!upkeepNeeded) revert Lottery__UpkeepNotNeeded(address(this).balance, players.length, uint256(state));
    // ChainLink VRF is a 2 transaction process, by design (to avoid manipulation)
    // 1. Request a random number
    state = LotteryState.CLOSED;
    uint256 requestId = VRF_COORDINATOR.requestRandomWords(
      GAS_LANE,
      SUBSCRIPTION_ID,
      REQUEST_CONFIRMATIONS,
      CALLBACK_GAS_LIMIT,
      NUM_WORDS
    );
    // Redundant event as Chainlink VRF will emit an event with the requestId
    // emit Lottery__RequestedWinner(requestId);
    // We don't use the performData in this example. The performData is generated by the Automation Node's call to your checkUpkeep function
  }

  /**
   * @dev This is the function that Chainlink VRF node
   * calls to send the money to the random winner.
   */
  function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
    // 2. Receive the random number and use it!
    // Use modulo to get a random index of players array
    // modulo is simply remainder of division, will always be less than divisor
    uint256 winnerIndex = randomWords[0] % players.length;
    address payable winner = players[winnerIndex];
    recent_winner = winner;
    // Send winner the balance of the contract
    (bool success,) = winner.call{value: address(this).balance}("");
    // THIS SHOULD NOT REVERT --> https://docs.chain.link/vrf/v2/security#fulfillrandomwords-must-not-revert
    if(!success) revert Lottery__FailedToSendWinnings();
    emit Lottery__WinnerPicked(winner);
    // Reset lottery
    state = LotteryState.OPEN;
    players = new address payable[](0);
    lastTimeStamp = block.timestamp;
  }

  /* Getter Functions */

  function getState() public view returns (LotteryState) {
    return state;
  }

  function getEntranceFee() public view returns (uint256) {
    return ENTRANCE_FEE;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return players[index];
  }

  function getRecentWinner() public view returns (address) {
    return recent_winner;
  }

  function getLastTimeStamp() public view returns (uint256) {
    return lastTimeStamp;
  }

  function getInterval() public view returns (uint256) {
    return INTERVAL;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return players.length;
  }

  /* pure function because variable is constant */
  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }
  /* pure function because variable is constant */
  function getRequestConfirmations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }

  function getVrfCoordinatorAddress() public view returns (address) {
    return address(VRF_COORDINATOR);
  }

  function getGasLane() public view returns (bytes32) {
    return GAS_LANE;
  }

  function getCallbackGasLimit() public view returns (uint32) {
    return CALLBACK_GAS_LIMIT;
  }

  function getSubscriptionId() public view returns (uint64) {
    return SUBSCRIPTION_ID;
  }
}