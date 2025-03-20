import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../target/types/solana_node";
import * as solanaNodeIdl from "../target/idl/solana_node.json";
import { ALICE, MINT_DECIMALS, RELAYER, SOLANA_RPC_URL } from "../tests/consts";
import { airdrop, createAnchorProvider, deriveConfigPda } from "../tests/utils";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";

export async function initAccounts() {

  const provider = createAnchorProvider(SOLANA_RPC_URL);
  const program = new Program(solanaNodeIdl as SolanaNode, provider);
  anchor.setProvider(provider)
  const baseWalletSolana = provider.wallet as anchor.Wallet;

  console.log("Program id: ", program.programId.toBase58());
  console.log("provider: ", provider.connection.rpcEndpoint);

  const baseWalletSolBalance = await provider.connection.getBalance(baseWalletSolana.publicKey);
  console.log("Base wallet (signer) SOL address: ", baseWalletSolana.publicKey.toBase58());
  console.log("Base wallet (signer) SOL balance: ", baseWalletSolBalance);

  const mintAmountForAlice = 25 * 10 ** MINT_DECIMALS;
  console.log("ALICE   address: ", ALICE.publicKey.toBase58());
  console.log("RELAYER address: ", RELAYER.publicKey.toBase58());

  await airdrop(provider.connection, ALICE.publicKey);
  await airdrop(provider.connection, RELAYER.publicKey);

  const aliceSolBalance = await provider.connection.getBalance(ALICE.publicKey);
  const relayerSolBalance = await provider.connection.getBalance(ALICE.publicKey);
  console.log("Alice   SOL balance: ", aliceSolBalance);
  console.log("Relayer SOL balance: ", relayerSolBalance);

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
    aliceTokenAta, // destination
    baseWalletSolana.payer,  // authority
    mintAmountForAlice
  );

  const aliceTokenAmount = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
  console.log("Alice token amount: ", aliceTokenAmount);

  await program.methods.
    initialize()
    .accounts({
      owner: baseWalletSolana.publicKey,
      relayer: RELAYER.publicKey,
    })
    .signers([baseWalletSolana.payer])
    .rpc() 
    .catch(e => console.error(e));

  const config = await program.account.config.fetch(deriveConfigPda(program.programId));
  console.log(config)

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
  console.log("Deployed addresses saved to deployments.json");
}

initAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
