import { ethers, network, deployments } from "hardhat"
import { Lottery, VRFCoordinatorV2Mock } from "../typechain-types"
import { BigNumberish } from "ethers";
/**
 * @description Fake off-chain activity that ChainLink Automation Node would perform
 */
async function main() {
    // Create dummy checkData
    const checkData = ethers.keccak256(ethers.toUtf8Bytes(""))
    // Get existing deployment on network
    const lotteryDeployment = await deployments.get('Lottery');
    const contract: Lottery = await ethers.getContractAt(
        'Lottery',
        lotteryDeployment.address,
    );
    // Check if upkeep is needed
    const { upkeepNeeded } = await contract.checkUpkeep(checkData)
    // Perform upkeep
    if (upkeepNeeded) {
        console.log("Upkeep needed!")
        const tx = await contract.performUpkeep(checkData)
        const txReceipt = await tx.wait(1)
        const requestId = Number(txReceipt!.logs[0].topics[2]);
        console.log(`Performed upkeep with RequestId: ${requestId}`)
        if (network.config.chainId == 31337) {
            await fakeAutomation(requestId, contract)
        }
    } else {
        console.log("No upkeep needed!")
    }
}

async function fakeAutomation(requestId: BigNumberish, lottery: Lottery) {
    console.log("We on a local network? Ok let's pretend...")
    // Get the deployed VRFCoordinatorV2Mock contract/ address
    const vrfCoordinatorV2MockDeployment = await deployments.get(
        'VRFCoordinatorV2Mock',
        );
    const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContractAt(
        'VRFCoordinatorV2Mock',
        vrfCoordinatorV2MockDeployment.address,
        );
    // Get Lottery contract address
    const lotteryAddress = await lottery.getAddress()
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lotteryAddress)
    console.log("Responded!")
    const recentWinner = await lottery.getRecentWinner()
    console.log(`The winner is: ${recentWinner}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })