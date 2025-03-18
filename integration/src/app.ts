import { ethers } from "ethers";
import { BridgeErc20, BridgeErc20__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly
import { EvmListener } from "./evm-listener";

const EVM_BRIDGE_CONTRACT_ADDRESS="0x663F3ad617193148711d28f5334eE4Ed07016602";

export async function appListen(evmBridgeContractAddress: string) {
  // Create a WebSocketProvider so the connection remains open.
  // const provider = new ethers.WebSocketProvider("ws://localhost:8545");

  const evmListener = new EvmListener("ws://localhost:8545", evmBridgeContractAddress);
  // start listening for burn events
  evmListener.listenForBurnEvent();
  // start listening for mint events
  evmListener.listenForMintEvent();

  // Replace with your deployed contract address.
  // const bridgeErc20Address = "0xYourContractAddressHere";
  // // Connect to the contract using the TypeChain factory.
  // const bridgeErc20: BridgeErc20 = BridgeErc20__factory.connect(bridgeErc20Address, provider);

  // // Set up a listener for the MintEvent using ethers 6 event API.
  // bridgeErc20.on("MintEvent", (tokenMint, tokenOwner, amount, event) => {
  //   console.log("MintEvent emitted:");
  //   console.log("Token Mint Address:", tokenMint);
  //   console.log("Token Owner:", tokenOwner);
  //   console.log("Amount:", amount.toString());
  //   console.log("Event details:", event);
  // });

  // console.log("Listening for MintEvent events...");
  
  // Prevent the process from exiting.
  // await new Promise(() => {});
}

appListen(EVM_BRIDGE_CONTRACT_ADDRESS).catch(console.error);