// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/BridgeErc20.sol";
import "../src/EvmBridge.sol";

contract Deploy is Script {
    function run() external {
        // owner is a deployer (he has to also register tokens)
        uint256 deployerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY_EVM");
        address owner = vm.envAddress("OWNER");
        address relayer = vm.envAddress("RELAYER");

        console.log(deployerPrivateKey);

        // Begin broadcasting transactions using the deployer's private key.
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the EvmBridge contract and initialize it.
        EvmBridge evmBridge = new EvmBridge();
        evmBridge.initialize(owner, relayer);

        // Deploy the BridgeErc20 token contract, setting the bridge address to the deployed EvmBridge.
        BridgeErc20 token = new BridgeErc20();
        token.initialize("Test Token", "TT", owner, address(evmBridge));

        // Register the token with the EvmBridge. Here we use a sample foreign token identifier.
        bytes32 foreignId = keccak256(abi.encodePacked("FOREIGN_TOKEN"));
        evmBridge.registerForeignToken(token, foreignId);

        vm.stopBroadcast();

        // Log deployed contract addresses.
        console.log("EvmBridge deployed at:", address(evmBridge));
        console.log("BridgeErc20 deployed at:", address(token));
    }
}
// anvil key (2): 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
// forge script scripts/Deploy.s.sol --rpc-url http://localhost:8545 --private-key $OWNER_PRIVATE_KEY_EVM --broadcast
// forge script scripts/Deploy.s.sol --rpc-url http://localhost:8545 --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d --broadcast

// TMP:
//   EvmBridge deployed at: 0x663F3ad617193148711d28f5334eE4Ed07016602
//   BridgeErc20 deployed at: 0x8438Ad1C834623CfF278AB6829a248E37C2D7E3f