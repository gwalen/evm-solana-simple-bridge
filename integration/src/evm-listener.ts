import { ethers } from "ethers";
import { BridgeErc20, BridgeErc20__factory, EvmBridge, EvmBridge__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../../solana-node/target/types/solana_node";
import * as solanaNodeIdl from "../../solana-node/target/idl/solana_node.json";
import * as fs from "fs";
import path from "path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { ALICE, RELAYER } from "../../solana-node/tests/consts";
import { evmAddressTo32Bytes } from "../../solana-node/tests/utils";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";


export class EvmListener {
  evmBridgeAddress: string;
  evmProvider: ethers.WebSocketProvider;
  program: anchor.Program<SolanaNode>;
  solanaProvider: anchor.AnchorProvider;
  evmTokenAddress: string;
  solanaTokenAddress: string;

  constructor(
    evmWsUrl: string, 
    solanaRpcUrl: string, 
    evmBridgeAddress: string,
    evmTokenAddress: string,
    solanaTokenAddress: string
  ) {
    this.evmProvider = new ethers.WebSocketProvider(evmWsUrl);
    this.evmBridgeAddress = evmBridgeAddress;
    this.solanaProvider = this.createAnchorProvider(solanaRpcUrl);
    this.program = new Program(solanaNodeIdl as SolanaNode, this.solanaProvider);
    this.evmTokenAddress = evmTokenAddress;
    this.solanaTokenAddress = solanaTokenAddress;
  }

  public async listenForMintEvent(): Promise<void> {
    // TODO: move to class field
    const evmBridge: EvmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.evmProvider);

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
    const evmBridge: EvmBridge = EvmBridge__factory.connect(this.evmBridgeAddress, this.evmProvider);

    const burnEventFilter = evmBridge.filters.BurnEvent();

    evmBridge.on(burnEventFilter, async (event) => {
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

      await this.mintTokensToSolana(amount);
    });

    console.log(">> EVM << Listening for BurnEvent events");
  }


  async mintTokensToSolana(amountToMint: number) {
    const evmAddressAs32Bytes = evmAddressTo32Bytes(this.evmTokenAddress);

    //// TODO: this is just for testing remove reading the balances
    const aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
      this.solanaProvider.connection,
      ALICE,  // payer
      new PublicKey(this.solanaTokenAddress),
      ALICE.publicKey, // ata owner
    )).address;

    const aliceTokenAmountBefore = Number(
      (await this.solanaProvider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount
    );

    ////

    const tx = await this.program.methods
      .mintAndBridge(evmAddressAs32Bytes, new anchor.BN(amountToMint))
      .accounts({
        relayer: RELAYER.publicKey,
        tokenReceiver: ALICE.publicKey,
        tokenMint: new PublicKey(this.solanaTokenAddress)
      })
      .signers([RELAYER])
      .rpc()
      .catch(e => console.error(e));

    console.log("Tx mint to solana: ", tx);

    const aliceTokenAmountAfter = Number(
      (await this.solanaProvider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount
    );

    console.log("XXX : after mint alice balance change: ", aliceTokenAmountAfter - aliceTokenAmountBefore);
  }

  // TODO: use imported function
  createAnchorProvider(rpcUrl: string) {
    const testKeyPath = path.join(__dirname, "../../solana-node/tests/keys/pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ.json"); // use script dir as base dir
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