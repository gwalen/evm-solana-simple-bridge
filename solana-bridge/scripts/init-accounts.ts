import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import * as solanaBridgeIdl from "../target/idl/solana_bridge.json";
import { ALICE, MINT_DECIMALS, RELAYER, SOLANA_RPC_URL } from "../tests/consts";
import { airdrop, createAnchorProvider, deriveConfigPda } from "../tests/utils";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";

export async function initAccounts() {

  const provider = createAnchorProvider(SOLANA_RPC_URL);
  const program = new Program(solanaBridgeIdl as SolanaBridge, provider);
  anchor.setProvider(provider)
  const baseWalletSolana = provider.wallet as anchor.Wallet;

  const mintAmountForAlice = 25 * 10 ** MINT_DECIMALS;

  await airdrop(provider.connection, ALICE.publicKey);
  await airdrop(provider.connection, RELAYER.publicKey);

  const mintAddress = await createMint(
    provider.connection,
    baseWalletSolana.payer, // payer
    baseWalletSolana.publicKey, // mint authority
    baseWalletSolana.publicKey, // Freeze authority
    MINT_DECIMALS
  );

  const aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
    provider.connection,
    ALICE,  // payer
    mintAddress,
    ALICE.publicKey, // ata owner
  )).address;

  await mintTo(
    provider.connection,
    baseWalletSolana.payer,  //payer
    mintAddress,
    aliceTokenAta,           // destination
    baseWalletSolana.payer,  // authority
    mintAmountForAlice
  );

  await program.methods.
    initialize()
    .accounts({
      owner: baseWalletSolana.publicKey,
      relayer: RELAYER.publicKey,
    })
    .signers([baseWalletSolana.payer])
    .rpc() 
    .catch(e => console.error(e));

  // give mint rights to the program
  await program.methods
    .takeTokenMintAuthority()
    .accounts({
      owner: baseWalletSolana.publicKey,
      mintOwner: baseWalletSolana.publicKey,
      tokenMint: mintAddress
    })
    .signers([baseWalletSolana.payer])
    .rpc({ skipPreflight: true });

  const deployments = {
    solanaBridge: program.programId.toBase58(),
    solanaTokenAddress: mintAddress.toBase58(),
  };
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
  console.log("Deployed Solana addresses saved to deployments.json");
}

initAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
