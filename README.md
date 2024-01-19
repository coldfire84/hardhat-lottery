# Hardhat Lottery

Uses ChainLink Automations, ChainLink VRF (for random number generation).

Updated for ethersv6 and ChainLink Automations (vs legacy Keepers).

Verifiably random, decentralised lottery.

## Setup

## ChainLink VRF

> Only required for Tesnet deployments/ testing.

> It is possible to setup VRF programatically, this is not covered here.

1. Browse to [https://vrf.chain.link/](https://vrf.chain.link/) and create and fund a new subscription.
2. Add subscriptionId to `helper-hardhat-config.ts` under the relevant network.
3. Deploy the contract to the testnet, using `yarn hardhat deploy --network <name>`
4. Add the newly deployted Lottery contract address as a consumer to the VRF subscription.

### ChainLink VRF (programatically)

> Not implemented.

Essentially this boils down to:
1. Deploy Subscription Manager contract
2. Get the subscription Id
3. Send LINK to the topUpSbnscription function on the Subscription Manager contract
4. Deploy the Lottery contract
5. Add Lottery contract as a consumer to Subscription Manager contract via `addConsumer` function


## ChainLink Automation

> ChainLink Automation transactions are visibile on the `internal transactions` tab in Etherscan.

> It is possible to configure a time-based automation, which does not require implementation of the AutomationCompatibleInterface, this is not covered here.

1. Browse to [https://automation.chain.link/](https://automation.chain.link/) and register a new Custom Logic Upkeep on the deployed Lottery Contract Address.