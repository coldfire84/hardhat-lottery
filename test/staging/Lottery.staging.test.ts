import { expect } from 'chai';
import { Lottery } from '../../typechain-types';
import { ethers, deployments, network, getNamedAccounts } from 'hardhat';
import {
  getNetworkType,
  getLotteryEntranceFee,
} from '../../helper-hardhat-config';

getNetworkType(network.name) !== 'testnet'
  ? describe.skip
  : describe('Lottery', () => {
      let deployer: string;
      let contract: Lottery;
      // let player: Signer
      // let interval: number;

      beforeEach(async () => {
        // Do NOT deploy the contract, use the existing testnet deployment
        const lotteryDeployment = await deployments.get('Lottery');
        contract = await ethers.getContractAt(
          'Lottery',
          lotteryDeployment.address,
        );
        ({ deployer } = await getNamedAccounts());
        // interval = Number(await contract.getInterval());
      });

      describe('fulfillRandomnWords', () => {
        it('picks a winner, sends funds, emits a Lottery__WinnerPicked event and resets the lottery', async () => {
          // ----------- Setup
          const contractAddress = contract.getAddress();
          // const deployerStartingBalance = await ethers.provider.getBalance(deployer);
          let deployerBalanceAfterEntrance: bigint;
          await new Promise<void>(async (resolve, reject) => {
            // Setup a listener for WinnerPicked event, which we'll wait for before `resolve`
            contract.once(contract.filters.Lottery__WinnerPicked, async () => {
              // Check Lottery has been reset
              expect(await contract.getNumberOfPlayers()).to.equal(0);
              expect(
                await ethers.provider.getBalance(contractAddress),
              ).to.equal(0);
              expect(await contract.getState()).to.equal(0);
              expect(await contract.getRecentWinner()).to.equal(deployer);
              // Check deployer balance has increased by entrance fee
              const winnerBalance = await ethers.provider.getBalance(deployer);
              expect(winnerBalance).to.equal(
                deployerBalanceAfterEntrance +
                  getLotteryEntranceFee(network.name),
              );
              resolve();
            });
            // Wait for Mocha timeout instead of forcing a timeout
            // setTimeout(() => {
            //   reject(new Error("Lottery__WinnerPicked not emitted"));
            // }, 120000); // Adjust timeout as needed
            // ----------- Test
            const response = await contract.enter({
              value: getLotteryEntranceFee(network.name),
            });
            await response.wait(1);
            const contractBalance =
              await ethers.provider.getBalance(contractAddress);
            expect(contractBalance).to.equal(
              getLotteryEntranceFee(network.name),
            );
            deployerBalanceAfterEntrance =
              await ethers.provider.getBalance(deployer);
            // console.log("Waiting for ChainLink Automation Node to execute upkeep... (max wait time 120 seconds)");
          });
        });
      });
    });
