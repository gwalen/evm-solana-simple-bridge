import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../target/types/solana_node";
import * as solanaNodeIdl from "../target/idl/solana_node.json";
import { ALICE, OWNER } from "../tests/consts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createAnchorProvider, evmAddressTo32Bytes, SolanaDeployments } from "../tests/utils";
import * as fs from "fs";
import path from "path";


export async function registerEvmTokenOnSolana(
  evmTokenAddress: string, 
  solanaTokenAddress: string
) {
  /**
   * NOTE: this script will be run from integration tests and not in solana-node context
   *       therefore we must start it with SolanaNode not related to local workspace.
   *       We can not use: const program = anchor.workspace.SolanaNode as Program<SolanaNode>;
   *       as it refers to anchor workspace.
   */
  const provider = createAnchorProvider("http://127.0.0.1:8899");
  const program = new Program(solanaNodeIdl as SolanaNode, provider);
  const providerWallet = provider.wallet as anchor.Wallet;
  // console.log("anchor.Wallet payer :", providerWallet.payer)

  // const deploymentsJsonPath = path.resolve(__dirname, "../deployments.json");
  // const deploymentsJson = fs.readFileSync(deploymentsJsonPath, "utf-8");
  // const deployments: SolanaDeployments = JSON.parse(deploymentsJson);
  // const mintAddress = new PublicKey(deployments.solanaTokenAddress);

  const evmAddressAs32Bytes = evmAddressTo32Bytes(evmTokenAddress);

  const tx = await program.methods
    .registerForeignToken(evmAddressAs32Bytes)
    .accounts({
      owner: providerWallet.publicKey,
      localMint: new PublicKey(solanaTokenAddress)
    })
    .signers([providerWallet.payer])
    .rpc() 
    .catch(e => console.error(e));

  console.log("Tx register token: ", tx);  

}