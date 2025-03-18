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

    const mintEventFilter = evmBridge.filters.MintEvent();
    
    // Set up a listener for the MintEvent using ethers 6 event API.
    evmBridge.on(mintEventFilter, (tokenMint, tokenOwner, amount, event) => {
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

    const burnEventFilter = evmBridge.filters.BurnEvent();

    // Set up a listener for the BurnEvent using ethers 6 event API.
    evmBridge.on(burnEventFilter, (event) => {
      // @ts-ignore - event is a string and TS complains as he wants strong types
      if (!event.args) return;
      // @ts-ignore
      const tokenBurn = event.args[0];
      // @ts-ignore
      const tokenOwner = event.args[1];
      // @ts-ignore
      const amount = event.args[2];

      console.log("BurnEvent emitted:");
      console.log("Token Burn Address:", tokenBurn);
      console.log("Token Owner:", tokenOwner);
      console.log("Amount:", amount);
    });

    console.log("Listening for BurnEvent events");
  }

}