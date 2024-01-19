import { expect } from 'chai';
import { Lottery, VRFCoordinatorV2Mock } from '../../typechain-types';
import { ethers, deployments, network } from 'hardhat';
import { Signer, randomBytes } from 'ethers';
import {
  getChainLinkAutomationGasLane,
  getChainLinkAutomationCallbackGasLimit,
  getNetworkType,
  getLotteryEntranceFee,
  getLotteryIntervalSeconds,
} from '../../helper-hardhat-config';
/**
 * Unit Tests: only run tests on local network
 */
getNetworkType(network.name) !== 'local'
  ? describe.skip
  : describe('Lottery', () => {
      let contract: Lottery;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let vrfCoordinatorV2MockContractAddress: string;
      let player: Signer;
      let interval: number;

      beforeEach(async () => {
        // Using hardhat deploy, deploy **everything** to the local network
        await deployments.fixture(['all']);
        // Get 'player' account address (simply the second account)
        const signers = await ethers.getSigners();
        player = signers[1];
        // Get the deployed Lottery contract on the local network
        const lotteryDeployment = await deployments.get('Lottery');
        contract = await ethers.getContractAt(
          'Lottery',
          lotteryDeployment.address,
        );
        // Get the Lottery time interval
        interval = Number(await contract.getInterval());
        // Get the deployed VRFCoordinatorV2Mock contract/ address
        const vrfCoordinatorV2MockDeployment = await deployments.get(
          'VRFCoordinatorV2Mock',
        );
        vrfCoordinatorV2Mock = await ethers.getContractAt(
          'VRFCoordinatorV2Mock',
          vrfCoordinatorV2MockDeployment.address,
        );
        vrfCoordinatorV2MockContractAddress =
          vrfCoordinatorV2MockDeployment.address;
      });

      describe('constructor', () => {
        it('should initialise the Lottery with expected defaults', async () => {
          expect(await contract.getEntranceFee()).to.equal(
            getLotteryEntranceFee(network.name),
          );
          expect(await contract.getState()).to.equal(0);
          expect(await contract.getNumberOfPlayers()).to.equal(0);
          expect(await contract.getNumWords()).to.equal(1);
          expect(await contract.getRequestConfirmations()).to.equal(3);
          expect(await contract.getGasLane()).to.equal(
            getChainLinkAutomationGasLane(network.name),
          );
          expect(await contract.getCallbackGasLimit()).to.equal(
            getChainLinkAutomationCallbackGasLimit(network.name),
          );
          expect(await contract.getVrfCoordinatorAddress()).to.equal(
            vrfCoordinatorV2MockContractAddress,
          );
          expect(await contract.getInterval()).to.equal(
            getLotteryIntervalSeconds(network.name),
          );
          expect(await contract.getSubscriptionId()).not.to.equal(0);
          expect(await contract.getLastTimeStamp()).not.to.be.undefined;
        });
      });

      describe('enter', () => {
        it('should revert when entrance fee too low', async () => {
          const value = ethers.parseEther('0.01');
          await expect(contract.enter({ value })).to.be.revertedWithCustomError(
            contract,
            'Lottery__InvalidEntranceFee',
          );
        });

        it('should revert when entrance fee too high', async () => {
          const value = ethers.parseEther('1');
          await expect(contract.enter({ value })).to.be.revertedWithCustomError(
            contract,
            'Lottery__InvalidEntranceFee',
          );
        });

        it('should revert when lottery is not open', async () => {
          const value = getLotteryEntranceFee(network.name);
          // ----------- Setup
          // Ensure there is at least one player/ funds in order to be able to close the lottery
          const playerContract = contract.connect(player);
          const playerAddress = await player.getAddress();
          await playerContract.enter({ value });
          // Use Hardhat testing methods to move network time forward by interval + 1 seconds
          await network.provider.send('evm_increaseTime', [interval + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          // Finally, execute `performUpkeep` which will close the lottery
          await contract.performUpkeep(randomBytes(32));
          // Test
          await expect(
            playerContract.enter({ value }),
          ).to.be.revertedWithCustomError(contract, 'Lottery__Closed');
          expect(await contract.getPlayer(0)).to.equal(playerAddress);
        });

        it('should allow a player to enter and emit a Lottery__NewPlayer event', async () => {
          const value = getLotteryEntranceFee(network.name);
          const playerAddress = await player.getAddress();
          const playerContract = contract.connect(player);
          await playerContract.enter({ value });
          expect(await contract.getNumberOfPlayers()).to.equal(1);
          await expect(playerContract.enter({ value }))
            .to.emit(contract, 'Lottery__NewPlayer')
            .withArgs(playerAddress);
        });
      });

      describe('checkUpkeep', () => {
        it('should return true if Lottery has payers, funds and interval has passed', async () => {
          const playerContract = contract.connect(player);
          await playerContract.enter({
            value: getLotteryEntranceFee(network.name),
          });
          // Use Hardhat testing methods to move network time forward by interval + 1 seconds
          await network.provider.send('evm_increaseTime', [interval + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          // Test
          const { upkeepNeeded } = await contract.checkUpkeep(randomBytes(32));
          expect(upkeepNeeded).to.equal(true);
        });

        it('should return false if Lottery is closed', async () => {
          // ----------- Setup
          // Ensure there is at least one player/ funds in order to be able to close the lottery
          const playerContract = contract.connect(player);
          await playerContract.enter({
            value: getLotteryEntranceFee(network.name),
          });
          // Use Hardhat testing methods to move network time forward by interval + 1 seconds
          await network.provider.send('evm_increaseTime', [interval + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          // Finally, execute `performUpkeep` which will close the lottery
          await contract.performUpkeep(randomBytes(32));
          // Test
          const { upkeepNeeded } = await contract.checkUpkeep(randomBytes(32));
          expect(upkeepNeeded).to.equal(false);
        });

        it('should return false if Lottery has no players (and thus no funds)', async () => {
          // Use Hardhat testing methods to move network time forward by interval + 1 seconds
          await network.provider.send('evm_increaseTime', [interval + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          const { upkeepNeeded } = await contract.checkUpkeep(randomBytes(32));
          expect(upkeepNeeded).to.equal(false);
        });

        it('should return false if insufficient time has passed', async () => {
          const playerContract = contract.connect(player);
          await playerContract.enter({
            value: getLotteryEntranceFee(network.name),
          });
          const interval = Number(await contract.getInterval());
          // Use Hardhat testing methods to move network time forwrds, but not by a full interval
          await network.provider.send('evm_increaseTime', [interval - 5]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          const { upkeepNeeded } = await contract.checkUpkeep(randomBytes(32));
          expect(upkeepNeeded).to.equal(false);
        });
      });

      describe('performUpkeep', () => {
        it('should revert if upkeep not required', async () => {
          await expect(
            contract.performUpkeep(randomBytes(32)),
          ).to.be.revertedWithCustomError(contract, 'Lottery__UpkeepNotNeeded');
        });

        it('should close lottery and emit a RandomWordsRequested event, if upkeep required', async () => {
          // ----------- Setup
          // Ensure there is at least one player/ funds in order to be able to close the lottery
          const playerContract = contract.connect(player);
          await playerContract.enter({
            value: getLotteryEntranceFee(network.name),
          });
          // Use Hardhat testing methods to move network time forward by interval + 1 seconds
          await network.provider.send('evm_increaseTime', [interval + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          // Test
          const response = await contract.performUpkeep(randomBytes(32));
          const receipt = await response.wait();
          // First Event is from VRF Coordinator
          expect(response).to.emit(
            vrfCoordinatorV2Mock,
            'RandomWordsRequested',
          ); //.withArgs(receipt?.logs[0].topics[1]);
          // Second, redundant Event is from Lottery
          // expect(receipt?.logs[1].topics[1]).not.to.be.undefined;
          // expect(response).to.emit(vrfCoordinatorV2Mock, 'Lottery__RequestedWinner').withArgs(receipt?.logs[1].topics[1]);
          const requestId = Number(receipt!.logs[0].topics[2]);
          expect(requestId).to.equal(1);
        });
      });

      describe('fulfillRandomnWords', () => {
        beforeEach(async () => {
          const playerContract = contract.connect(player);
          await playerContract.enter({
            value: getLotteryEntranceFee(network.name),
          });
          await network.provider.send('evm_increaseTime', [interval + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
        });

        it('can only be called after performUpkeep has executed', async () => {
          const address = await contract.getAddress();
          // test with requestId 0
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, address),
          ).to.be.revertedWith('nonexistent request');
          // test with requestId 1
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, address),
          ).to.be.revertedWith('nonexistent request');
        });

        it('picks a winner, sends funds, emits a Lottery__WinnerPicked event and resets the lottery', async () => {
          // ----------- Setup
          const numPlayers = 5;
          const contractAddress = contract.getAddress();
          // Enter multiple players into the lottery
          const signers = await ethers.getSigners();
          // Start from 2, as 0 is deployer, 1 is player
          // --> (we entered with player in the beforeEach for this describe)
          const offsetIndex = 2;
          for (let i = offsetIndex; i < numPlayers + (offsetIndex - 1); i++) {
            const playerContract = contract.connect(signers[i]);
            await playerContract.enter({
              value: getLotteryEntranceFee(network.name),
            });
          }
          expect(await contract.getNumberOfPlayers()).to.equal(numPlayers);
          // create a map of signers and balances, so we can ensure fund transfer is successful
          const balances: { [key: string]: bigint } = {};
          for (let i = 0; i < signers.length; i++) {
            balances[signers[i].address] = await ethers.provider.getBalance(
              signers[i],
            );
          }
          // Get contract balance after entrants have funded
          const contractBalance =
            await ethers.provider.getBalance(contractAddress);
          // Create a listener for WinnerPicked event, this in turn tests the event itself is emitted
          await new Promise<void>(async (resolve, reject) => {
            // Setup a listener for WinnerPicked event
            contract.once(contract.filters.Lottery__WinnerPicked, async () => {
              const recentWinner = await contract.getRecentWinner();
              // check funds have been transferred
              const winnerBalance =
                await ethers.provider.getBalance(recentWinner);
              // check funds have been transferred
              expect(winnerBalance).to.equal(
                balances[recentWinner] + contractBalance,
              );
              // Check Lottery has been reset
              expect(await contract.getNumberOfPlayers()).to.equal(0);
              expect(
                await ethers.provider.getBalance(contractAddress),
              ).to.equal(0);
              expect(await contract.getState()).to.equal(0);
              resolve();
            });
            // Set a timeout in case event is not emitted
            setTimeout(() => {
              reject(new Error('Lottery__WinnerPicked not emitted'));
            }, 5000); // Adjust timeout as needed
            // ----------- Test
            const performUpkeepTxResponse = await contract.performUpkeep(
              randomBytes(32),
            );
            const performUpkeepTxReceipt = await performUpkeepTxResponse.wait();
            // Use RandomWordsRequested event to get requestId
            const requestId = Number(performUpkeepTxReceipt!.logs[0].topics[2]);
            // Use Lottery__RequestedWinner event to get requestId
            // const requestId = Number(performUpkeepTxReceipt!.logs[1].topics[1]);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              requestId,
              contractAddress,
            );
            // We don't have a specific test for the event itself: the listener above ensure this is emitted
          });
        });
      });
    });
