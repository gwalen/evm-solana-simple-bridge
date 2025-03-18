// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/EvmBridge.sol";
import "../src/BridgeErc20.sol";

contract BurnTokenScript is Script {
    function run() external {
        // Example burn amount: 1000 tokens (assuming 18 decimals)
        uint256 burnAmount = 1000 * 1e18;
        
        // Get deployer's private key and contract addresses from environment variables.
        // TODO: change for some other key
        // TODO: mint tokens for alice (use broadcast with owner ??ć)
        uint256 alicePrivateKey = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6; //vm.envUint("PRIVATE_KEY");
        address evmBridgeAddress = 0x663F3ad617193148711d28f5334eE4Ed07016602; //vm.envAddress("EVM_BRIDGE_ADDRESS");
        address bridgeErc20Address = 0x8438Ad1C834623CfF278AB6829a248E37C2D7E3f;

        // Connect to the deployed contracts.
        EvmBridge evmBridge = EvmBridge(evmBridgeAddress);
        BridgeErc20 token = BridgeErc20(bridgeErc20Address);

        // Begin broadcasting transactions from the deployer's (or user's) account.
        vm.startBroadcast(alicePrivateKey);

        // Call burnAndBridge() on the EvmBridge contract.
        // This will trigger the BridgeErc20 token's burn method,
        // burning `burnAmount` tokens from msg.sender.
        evmBridge.burnAndBridge(token, burnAmount);

        vm.stopBroadcast();
    }
}