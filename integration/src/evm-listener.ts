import { ethers } from "ethers";
import { BridgeErc20, BridgeErc20__factory, EvmBridge, EvmBridge__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly


export class EvmListener {
  evmBridgeAddress: string;
  provider: ethers.WebSocketProvider;

  constructor(wsUrl: string, evmBridgeAddress: string) {
    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.evmBridgeAddress = evmBridgeAddress;
  }

  public async listenForMintEvent(): Promise<void> {
    const evmBridge: EvmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.provider);

    // Set up a listener for the MintEvent using ethers 6 event API.
    evmBridge.on("MintEvent", (tokenMint, tokenOwner, amount, event) => {
      console.log("MintEvent emitted:");
      console.log("Token Mint Address:", tokenMint);
      console.log("Token Owner:", tokenOwner);
      console.log("Amount:", amount.toString());
      console.log("Event details:", event);
    });

    console.log("Listening for MintEvent events...");
  }

  public async listenForBurnEvent(): Promise<void> {
    const evmBridge: EvmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.provider);

    // Set up a listener for the BurnEvent using ethers 6 event API.
    evmBridge.on("BurnEvent", (tokenMint, tokenOwner, amount, event) => {
      console.log("BurnEvent emitted:");
      console.log("Token Burn Address:", tokenMint);
      console.log("Token Owner:", tokenOwner);
      console.log("Amount:", amount.toString());
      console.log("Event details:", event);
    });

    console.log("Listening for BurnEvent events");
  }

}