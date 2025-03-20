import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../../solana-node/target/types/solana_node";
import * as solanaNodeIdl from "../../solana-node/target/idl/solana_node.json";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { BridgeErc20, BridgeErc20__factory, EvmBridge, EvmBridge__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly


export class SolanaListener {
  // we do not need to pass solanaBridgeAddress as it is a part of IDL
  evmBridgeAddress: string;
  evmProvider: ethers.JsonRpcProvider;
  program: anchor.Program<SolanaNode>;
  solanaProvider: anchor.AnchorProvider;
  evmBridge: EvmBridge;
  evmToken: BridgeErc20;
  evmRelayerWallet: ethers.Wallet;
  evmAliceWallet: ethers.Wallet;

  constructor(
    evmRpcUrl: string, 
    solanaRpcUrl: string, 
    evmBridgeAddress: string,
    evmTokenAddress: string,
    alicePrivateKey: string,
    relayerPrivateKey: string
  ) {
    this.evmProvider = new ethers.JsonRpcProvider(evmRpcUrl);
    this.evmRelayerWallet = new ethers.Wallet(relayerPrivateKey, this.evmProvider);
    this.evmAliceWallet = new ethers.Wallet(alicePrivateKey, this.evmProvider);

    this.evmBridgeAddress = evmBridgeAddress;
    this.solanaProvider = this.createAnchorProvider(solanaRpcUrl);
    this.program = new Program(solanaNodeIdl as SolanaNode, this.solanaProvider);

    this.evmBridge = EvmBridge__factory.connect(evmBridgeAddress, this.evmRelayerWallet);
    this.evmToken = BridgeErc20__factory.connect(evmTokenAddress, this.evmRelayerWallet);
  }

  public async listenForMintEvent(): Promise<void> {
    
    this.program.addEventListener('mintEvent', (event, slot) => {
      console.log(">> SOLANA << MintEvent emitted:");
      console.log("Token Mint Address:", event.tokenMint.toBase58());
      console.log("Token Owner:", event.tokenOwner.toBase58());
      console.log("Amount:", event.amount.toNumber());
    });

    console.log(">> SOLANA << Listening for MintEvent events...");
  }

  public async listenForBurnEvent(): Promise<void> {
    
    this.program.addEventListener('burnEvent', async (event, slot) => {
      console.log(">> SOLANA << BurnEvent emitted:");
      console.log("Token Mint Address:", event.tokenMint.toBase58());
      console.log("Token Owner:", event.tokenOwner.toBase58());
      console.log("Amount:", event.amount.toNumber());

      await this.mintTokensToEvm(event.amount.toNumber(), event.tokenMint);
    });

    console.log(">> SOLANA << Listening for BurnEvent events...");
  }

  async mintTokensToEvm(amountToMint: number, solanaToken: PublicKey) {
    console.log("Alice (receiver) wallet address:, ", this.evmAliceWallet.address)

    const tx = await this.evmBridge.mintAndBridge(
      this.evmToken, 
      solanaToken.toBytes(),
      this.evmAliceWallet.address,
      amountToMint
    );

    await tx.wait();
    console.log("Mint Transaction to EVM sent. Hash:", tx.hash);
  }

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