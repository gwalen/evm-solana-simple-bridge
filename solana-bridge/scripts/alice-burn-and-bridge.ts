import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import * as solanaBridgeIdl from "../target/idl/solana_bridge.json";
import { ALICE, SOLANA_RPC_URL } from "../tests/consts";
import { PublicKey } from "@solana/web3.js";
import { createAnchorProvider, SolanaDeployments } from "../tests/utils";
import * as fs from "fs";
import path from "path";


export async function solanaBurnAndBridgeAliceTokens(amount: anchor.BN) { 
  /**
   * NOTE: this script will be run from integration tests and not in solana-bridge context
   *       therefore we must start it with SolanaBridge not related to local workspace.
   *       We can not use: const program = anchor.workspace.SolanaBridge as Program<SolanaBridge>;
   *       as it refers to anchor workspace.
   */
  const provider = createAnchorProvider(SOLANA_RPC_URL);
  const program = new Program(solanaBridgeIdl as SolanaBridge, provider);

  const deploymentsJsonPath = path.resolve(__dirname, "../deployments.json");
  const deploymentsJson = fs.readFileSync(deploymentsJsonPath, "utf-8");
  const deployments: SolanaDeployments = JSON.parse(deploymentsJson);

  const mintAddress = new PublicKey(deployments.solanaTokenAddress);

  await program.methods
    .burnAndBridge(amount)
    .accounts({
      tokenSender: ALICE.publicKey,
      tokenMint: mintAddress
    })
    .signers([ALICE])
    .rpc() 
    .catch(e => console.error(e));

}

// solanaBurnAndBridgeAliceTokens(new anchor.BN(1 * 10 ** MINT_DECIMALS))
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error("Deployment failed:", error);
//     process.exit(1);
//   });