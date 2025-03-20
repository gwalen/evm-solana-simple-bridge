import { ethers } from "ethers";
import { EvmBridge, EvmBridge__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../../solana-bridge/target/types/solana_bridge";
import * as solanaBridgeIdl from "../../solana-bridge/target/idl/solana_bridge.json";
import * as fs from "fs";
import path from "path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { ALICE, RELAYER } from "../../solana-bridge/tests/consts";
import { evmAddressTo32Bytes } from "../../solana-bridge/tests/utils";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";


export class EvmListener {
  evmBridgeAddress: string;
  evmProvider: ethers.WebSocketProvider;
  evmBridge: EvmBridge;
  solanaProgram: anchor.Program<SolanaBridge>;
  solanaProvider: anchor.AnchorProvider;
  solanaTokenAddress: string;

  constructor(
    evmWsUrl: string, 
    solanaRpcUrl: string, 
    evmBridgeAddress: string,
    solanaTokenAddress: string
  ) {
    this.evmProvider = new ethers.WebSocketProvider(evmWsUrl);
    this.evmBridgeAddress = evmBridgeAddress;
    this.solanaProvider = this.createAnchorProvider(solanaRpcUrl);
    this.solanaProgram = new Program(solanaBridgeIdl as SolanaBridge, this.solanaProvider);
    this.solanaTokenAddress = solanaTokenAddress;
    this.evmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.evmProvider)
  }

  public async listenForMintEvent(): Promise<void> {
    const mintEventFilter = this.evmBridge.filters.MintEvent();

    this.evmBridge.on(mintEventFilter, (event) => {
      // @ts-ignore - event is a string and TS complains as he wants strong types
      if (!event.args) return;
      // @ts-ignore
      const tokenBurn = event.args[0];
      // @ts-ignore
      const tokenOwner = event.args[1];
      // @ts-ignore
      const amount = event.args[2];

      console.log(">> EVM - MintEvent emitted:");
      console.log("   Token Burn Address:", tokenBurn);
      console.log("   Token Owner:", tokenOwner);
      console.log("   Amount:", amount);
    });

    console.log(">> EVM - Listening for MintEvent events...");
  }

  public async listenForBurnEvent(): Promise<void> {
    const burnEventFilter = this.evmBridge.filters.BurnEvent();

    this.evmBridge.on(burnEventFilter, async (event) => {
      // @ts-ignore - event is a string and TS complains as he wants strong types
      if (!event.args) return;
      // @ts-ignore
      const tokenBurn: string = event.args[0];
      // @ts-ignore
      const tokenOwner: string = event.args[1];
      // @ts-ignore
      const amount: number = event.args[2];

      console.log(">> EVM - BurnEvent emitted:");
      console.log("   Token Burn Address:", tokenBurn);
      console.log("   Token Owner:", tokenOwner);
      console.log("   Amount:", amount);

      await this.mintTokensToSolana(amount, tokenBurn);
    });

    console.log(">> EVM - Listening for BurnEvent events");
  }


  async mintTokensToSolana(amountToMint: number, evmTokenAddress: string) {
    const evmAddressAs32Bytes = evmAddressTo32Bytes(evmTokenAddress);

    const tx = await this.solanaProgram.methods
      .mintAndBridge(evmAddressAs32Bytes, new anchor.BN(amountToMint))
      .accounts({
        relayer: RELAYER.publicKey,
        tokenReceiver: ALICE.publicKey,
        tokenMint: new PublicKey(this.solanaTokenAddress)
      })
      .signers([RELAYER])
      .rpc()
      .catch(e => console.error(e));

    console.log("Mint tokens to solana tx: ", tx);
  }

  createAnchorProvider(rpcUrl: string) {
    const testKeyPath = path.join(__dirname, "../../solana-bridge/tests/keys/pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ.json"); // use script dir as base dir
    const privateKeySolanaStr = fs.readFileSync(testKeyPath, "utf-8");
    const privateKeySolanaParsed = JSON.parse(privateKeySolanaStr) as number[];
    const solanaPrivateKey = new Uint8Array(privateKeySolanaParsed);
    let solanaConnection = new anchor.web3.Connection(rpcUrl, "confirmed");

    const solanaKeypair = Keypair.fromSecretKey(solanaPrivateKey);
    const solanaAnchorWallet = new anchor.Wallet(solanaKeypair);

    const provider = new anchor.AnchorProvider(
      solanaConnection,
      solanaAnchorWallet,
      {
        commitment: "confirmed"
      }
    );
    return provider;
  }
}