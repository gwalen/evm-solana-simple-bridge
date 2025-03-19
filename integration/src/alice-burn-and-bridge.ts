import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../../solana-node/target/types/solana_node";
import * as solanaNodeIdl from "../../solana-node/target/idl/solana_node.json";
import { ALICE, MINT_DECIMALS } from "../../solana-node/tests/consts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SolanaDeployments } from "../../solana-node/tests/utils"
import * as fs from "fs";
import path from "path";
// import { createAnchorProvider } from "./init-accounts";


export async function solanaBurnAndBridgeAliceTokens(amount: anchor.BN) {
  
  // NOTE: this script will be run from integration tests and not in solana-node context
  //       there fore we must start it with SolanaNode not related to local workspace

  const provider = createAnchorProvider("http://127.0.0.1:8899");
  const program = new Program(solanaNodeIdl as SolanaNode, provider);

  const deploymentsJsonPath = path.resolve(__dirname, "../../solana-node/deployments.json");
  const deploymentsJson = fs.readFileSync(deploymentsJsonPath, "utf-8");
  const deployments: SolanaDeployments = JSON.parse(deploymentsJson);

  const mintAddress = new PublicKey(deployments.solanaTokenAddress);

  // const aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
  //   provider.connection,
  //   ALICE,  // payer
  //   mintAddress,
  //   ALICE.publicKey, // ata owner
  // )).address;

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

// TODO: move to utils, and try to import from solana-node first
function createAnchorProvider(rpcUrl: string) {
  const testKeyPath = path.join(__dirname, "../../solana-node/tests/keys/pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ.json"); // use script dir as base dir
  const privateKeySolanaStr = fs.readFileSync(testKeyPath, "utf-8");
  console.log("XXX ", privateKeySolanaStr);
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


// solanaBurnAndBridgeAliceTokens(new anchor.BN(1 * 10 ** MINT_DECIMALS))
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error("Deployment failed:", error);
//     process.exit(1);
//   });