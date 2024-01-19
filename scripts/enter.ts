import { ethers, deployments } from "hardhat"
import { Lottery } from "../typechain-types";

async function main() {
    // Get existing deployment on network
    const lotteryDeployment = await deployments.get('Lottery');
    const contract: Lottery = await ethers.getContractAt(
        'Lottery',
        lotteryDeployment.address,
    );
    const entranceFee = await contract.getEntranceFee()
    await contract.enter({ value: entranceFee })
    console.log("Entered!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })