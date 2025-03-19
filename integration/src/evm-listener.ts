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
    // TODO: move to class field
    const evmBridge: EvmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.provider);

    const mintEventFilter = evmBridge.filters.MintEvent();
    
    evmBridge.on(mintEventFilter, (event) => {
      // @ts-ignore - event is a string and TS complains as he wants strong types
      if (!event.args) return;
      // @ts-ignore
      const tokenBurn = event.args[0];
      // @ts-ignore
      const tokenOwner = event.args[1];
      // @ts-ignore
      const amount = event.args[2];

      console.log(">> EVM << MintEvent emitted:");
      console.log("Token Burn Address:", tokenBurn);
      console.log("Token Owner:", tokenOwner);
      console.log("Amount:", amount);
    });

    console.log(">> EVM << Listening for MintEvent events...");
  }

  public async listenForBurnEvent(): Promise<void> {
    const evmBridge: EvmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.provider);

    const burnEventFilter = evmBridge.filters.BurnEvent();

    evmBridge.on(burnEventFilter, (event) => {
      // @ts-ignore - event is a string and TS complains as he wants strong types
      if (!event.args) return;
      // @ts-ignore
      const tokenBurn = event.args[0];
      // @ts-ignore
      const tokenOwner = event.args[1];
      // @ts-ignore
      const amount = event.args[2];

      console.log(">> EVM << BurnEvent emitted:");
      console.log("Token Burn Address:", tokenBurn);
      console.log("Token Owner:", tokenOwner);
      console.log("Amount:", amount);
    });

    console.log(">> EVM << Listening for BurnEvent events");
  }

}