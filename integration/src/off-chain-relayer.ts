import { EvmListener } from "./evm-listener";
import { SolanaListener } from "./solana-listener";

export class OffChainRelayer {
  private evmListener: EvmListener;
  private solanaListener: SolanaListener;

  constructor(
    evmWsRpcUrl: string,
    solanaRpcUrl: string,
    evmBridgeAddress: string,
    solanaTokenAddress: string,
    evmRpcUrl: string,
    evmTokenAddress: string,
    aliceRelayerPrivateKey: string,
    evmRelayerPrivateKey: string
  ) {
    this.evmListener = new EvmListener(
      evmWsRpcUrl,
      solanaRpcUrl,
      evmBridgeAddress,
      solanaTokenAddress
    );
    this.solanaListener = new SolanaListener(
      evmRpcUrl,
      solanaRpcUrl,
      evmBridgeAddress,
      evmTokenAddress,
      aliceRelayerPrivateKey,
      evmRelayerPrivateKey
    );
  }

  startListening() {
    console.log("Starting Evm listeners...");
    this.evmListener.listenForBurnEvent();
    this.evmListener.listenForMintEvent();
    console.log("Starting Solana listeners...");
    this.solanaListener.listenForBurnEvent();
    this.solanaListener.listenForMintEvent();
  }
}