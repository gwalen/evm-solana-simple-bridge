import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../target/types/solana_node";
import { MINT_DECIMALS, OWNER, RELAYER } from "../tests/consts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { airdrop, deriveConfigPda, deriveForeignTokenPda, evmAddressTo32Bytes, sleep } from "../tests/utils";
import { assert } from "chai";
import { createMint, getMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";
import path from "path";


// const privateKeySolanaStr = process.env.SOLANA_PRIVATE_KEY!;
// const privateKeySolanaParsed = JSON.parse(privateKeySolanaStr) as number[];
// const solanaPrivateKey = new Uint8Array(privateKeySolanaParsed)
// let solanaConnection = new anchor.web3.Connection(RPC_URL_SOLANA, "confirmed");
// const solanaKeypair = Keypair.fromSecretKey(solanaPrivateKey);
// const solanaAnchorWallet = new anchor.Wallet(solanaKeypair);
// const providerSolana = new anchor.AnchorProvider(
//   solanaConnection,
//   solanaAnchorWallet,
//   {
//     commitment: "confirmed"
//   }
// );
// const signerWalletSolana = providerSolana.wallet as anchor.Wallet;

export async function burnAndBridgeAliceTokens() {

  /// Move to utils

  console.log("Current working directory:", process.cwd());
  console.log("script directory:", __dirname);

  const testKeyPath = path.join(__dirname, "../tests/keys/pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ.json"); // use script dir as base dir
  const privateKeySolanaStr = fs.readFileSync(testKeyPath, "utf-8");
  const privateKeySolanaParsed = JSON.parse(privateKeySolanaStr) as number[];
  const solanaPrivateKey = new Uint8Array(privateKeySolanaParsed)
  let solanaConnection = new anchor.web3.Connection("http://127.0.0.1:8899", "confirmed");

  const solanaKeypair = Keypair.fromSecretKey(solanaPrivateKey);
  const solanaAnchorWallet = new anchor.Wallet(solanaKeypair);

  const provider = new anchor.AnchorProvider(
    solanaConnection,
    solanaAnchorWallet,
    {
      commitment: "confirmed"
    }
  );

  anchor.setProvider(provider)
  const signerWalletSolana = provider.wallet as anchor.Wallet;

  ////

  const program = anchor.workspace.SolanaNode as Program<SolanaNode>;

  console.log("Program id: ", program.programId.toBase58());
  console.log("provider: ", provider.connection.rpcEndpoint);

  const baseWalletSolBalance = await provider.connection.getBalance(signerWalletSolana.publicKey);
  console.log("Base wallet (signer) SOL address: ", signerWalletSolana.publicKey.toBase58());
  console.log("Base wallet (signer) SOL balance: ", baseWalletSolBalance);

  ///

  // TODO: move alice and OWNER key to constants (evn vars like in EVM case)
  const alice = Keypair.generate();
  const mintAmountForAlice = 25 * 10 ** MINT_DECIMALS;
  console.log("alice address: ", alice.publicKey);

  console.log("RELAYER pk: ", RELAYER.secretKey);

  // TODO: maybe move this to seprate script like : init-data.ts
  await airdrop(provider.connection, alice.publicKey);
  // await airdrop(provider.connection, OWNER.publicKey);

  const aliceSolBalance = await provider.connection.getBalance(alice.publicKey);
  console.log("Alice SOL balance: ", aliceSolBalance);

  // TODO: this must be written to deployments.json (or env vars) 
  const mintAddress = await createMint(
    provider.connection,
    signerWalletSolana.payer, // payer
    signerWalletSolana.publicKey, // mint authority
    signerWalletSolana.publicKey, // Freeze authority
    MINT_DECIMALS
  );

  // TODO: maybe move this to seprate script like : init-data.ts -> and later save in deployments.json
  const aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
    provider.connection,
    alice,  // payer
    mintAddress,
    alice.publicKey, // ata owner
  )).address;

  await mintTo(
    provider.connection,
    signerWalletSolana.payer,  //payer
    mintAddress,
    aliceTokenAta, // destination
    signerWalletSolana.payer,  // authority
    mintAmountForAlice
  );

  const aliceTokenAmount = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
  console.log("Alice token amount: ", aliceTokenAmount);

  ///

  const configPda = deriveConfigPda(program.programId);

  // if it would work here it means that ledger was not cleared (config account is created in initialize instruction)
  // let config = await program.account.config.fetch(configPda);
  // console.log(config)

  const tx = await program.methods.
    initialize()
    .accounts({
      owner: signerWalletSolana.publicKey,
      relayer: RELAYER.publicKey,
    })
    .signers([signerWalletSolana.payer])
    .rpc() 
    .catch(e => console.error(e)); // this will log simulation error to terminal but not into anchor logs

  const config = await program.account.config.fetch(configPda);

  console.log(config)


  // await program.methods
  //     .takeTokenMintAuthority()
  //     .accounts({
  //       owner: OWNER.publicKey,
  //       mintOwner: firstMintOwner.publicKey,
  //       tokenMint: mintAddress
  //     })
  //     .signers([OWNER, firstMintOwner])
  //     .rpc({ skipPreflight: true });




}


burnAndBridgeAliceTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });