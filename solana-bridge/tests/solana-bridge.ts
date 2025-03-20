import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import { MINT_DECIMALS, OWNER, RELAYER } from "./consts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { airdrop, deriveConfigPda, deriveForeignTokenPda, evmAddressTo32Bytes, sleep } from "./utils";
import * as assert from "assert";
import { createMint, getMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";


const USDC_ETHEREUM_MAINNET = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

describe("solana-bridge", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaBridge as Program<SolanaBridge>;
  const firstMintOwner = Keypair.generate();
  const alice = Keypair.generate();

  let configPda: PublicKey;
  let mintAddress: PublicKey;
  let aliceTokenAta: PublicKey;

  it("Airdrop actors", async () => {
    await airdrop(provider.connection, OWNER.publicKey);
    await airdrop(provider.connection, RELAYER.publicKey);
    await airdrop(provider.connection, firstMintOwner.publicKey);
    await airdrop(provider.connection, alice.publicKey);
  });

  it("Initialize program", async () => {
    configPda = deriveConfigPda(program.programId);

    const tx = await program.methods.
      initialize()
      .accounts({
        owner: OWNER.publicKey,
        relayer: RELAYER.publicKey,
      })
      .signers([OWNER])
      .rpc({ skipPreflight: true }); // go directly to validator so we see the error logs

    const config = await program.account.config.fetch(configPda);

    assert.deepEqual(OWNER.publicKey, config.owner);
    assert.deepEqual(RELAYER.publicKey, config.relayer);
  });

  it("Mint tokens to alice", async () => {
    const mintAmountForAlice = 25 * 10 ** MINT_DECIMALS;

    // Create the mint
    mintAddress = await createMint(
      provider.connection,
      OWNER,
      firstMintOwner.publicKey, // mint authority
      firstMintOwner.publicKey, // Freeze authority
      MINT_DECIMALS
    );

    aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      firstMintOwner,  // payer
      mintAddress,
      alice.publicKey, // ata owner
    )).address;
    // Wait a bit for the transaction to be processed
    await sleep(500);

    await mintTo(
      provider.connection,
      firstMintOwner,  //payer
      mintAddress,
      aliceTokenAta, // destination
      firstMintOwner,  // authority
      mintAmountForAlice
    );

    const aliceTokenAmount = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    assert.equal(aliceTokenAmount, mintAmountForAlice);
  });

  it("Take token authority", async () => {
    await program.methods
      .takeTokenMintAuthority()
      .accounts({
        owner: OWNER.publicKey,
        mintOwner: firstMintOwner.publicKey,
        tokenMint: mintAddress
      })
      .signers([OWNER, firstMintOwner])
      .rpc({ skipPreflight: true });

    const mintInfo = await getMint(provider.connection, mintAddress);

    assert.deepEqual(mintInfo.mintAuthority, configPda);
  });

  it("Burn and bridge tokens", async () => {
    const amountToBridge = new anchor.BN(5 * 10 ** MINT_DECIMALS);

    const aliceTokenAmountBefore = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    const mintSupplyBefore = (await getMint(provider.connection, mintAddress)).supply;
    let burnEventAmount = new anchor.BN(0);

    const listenerMyEvent = program.addEventListener('burnEvent', (event, slot) => {
      burnEventAmount = event.amount;
    });

    await program.methods
      .burnAndBridge(amountToBridge)
      .accounts({
        tokenSender: alice.publicKey,
        tokenMint: mintAddress
      })
      .signers([alice])
      .rpc({ skipPreflight: true });

    const aliceTokenAmountAfter = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    const mintSupplyAfter = (await getMint(provider.connection, mintAddress)).supply;

    assert.equal(aliceTokenAmountBefore - aliceTokenAmountAfter, amountToBridge.toNumber());
    assert.equal(mintSupplyBefore - mintSupplyAfter, BigInt(amountToBridge.toNumber()));
    assert.equal(burnEventAmount.toNumber(), amountToBridge.toNumber());
  });

  it("Only owner can register foreign token", async () => {
    const evmAddressAs32Bytes = evmAddressTo32Bytes(USDC_ETHEREUM_MAINNET);

    const registerForeignTokenPromise = program.methods
      .registerForeignToken(evmAddressAs32Bytes)
      .accounts({
        owner: alice.publicKey,
        localMint: mintAddress
      })
      .signers([alice])
      .rpc({ skipPreflight: true });

    assert.rejects(
      registerForeignTokenPromise,
      /Invalid Owner/
    );
  });

  it("Register foreign token", async () => {
    const evmAddressAs32Bytes = evmAddressTo32Bytes(USDC_ETHEREUM_MAINNET);
    const foreignTokenPda = deriveForeignTokenPda(program.programId, evmAddressAs32Bytes);

    await program.methods
      .registerForeignToken(evmAddressAs32Bytes)
      .accounts({
        owner: OWNER.publicKey,
        localMint: mintAddress
      })
      .signers([OWNER])
      .rpc({ skipPreflight: true });

    const foreignTokenAccount = await program.account.foreignToken.fetch(foreignTokenPda);

    assert.equal(mintAddress.toBase58(), foreignTokenAccount.localAddress.toBase58());
    assert.deepEqual(evmAddressAs32Bytes, foreignTokenAccount.foreignAddress);
  });

  it("Only relayer can mint tokens", async () => {
    const evmAddressAs32Bytes = evmAddressTo32Bytes(USDC_ETHEREUM_MAINNET);

    const mintAndBridgePromise = program.methods
      .mintAndBridge(evmAddressAs32Bytes, new anchor.BN(5 * 10 ** MINT_DECIMALS))
      .accounts({
        relayer: RELAYER.publicKey,
        tokenReceiver: alice.publicKey,
        tokenMint: mintAddress
      })
      .signers([alice])
      .rpc({ skipPreflight: true });

    assert.rejects(
      mintAndBridgePromise,
      /Invalid Relayer/
    );
  });

  it("Can mint only registered tokens", async () => {
    const evmAddressAs32Bytes = evmAddressTo32Bytes("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

    const mintAndBridgePromise = program.methods
      .mintAndBridge(evmAddressAs32Bytes, new anchor.BN(5 * 10 ** MINT_DECIMALS))
      .accounts({
        relayer: RELAYER.publicKey,
        tokenReceiver: alice.publicKey,
        tokenMint: mintAddress
      })
      .signers([RELAYER])
      .rpc({ skipPreflight: true });

    assert.rejects(mintAndBridgePromise);
  });

  it("Token mint must be owned by configPda", async () => {
    const evmAddressAs32Bytes = evmAddressTo32Bytes(USDC_ETHEREUM_MAINNET);

    const fakeMintAddress = await createMint(
      provider.connection,
      OWNER,
      firstMintOwner.publicKey, // mint authority
      firstMintOwner.publicKey, // Freeze authority
      MINT_DECIMALS
    );

    const mintAndBridgePromise = program.methods
      .mintAndBridge(evmAddressAs32Bytes, new anchor.BN(5 * 10 ** MINT_DECIMALS))
      .accounts({
        relayer: RELAYER.publicKey,
        tokenReceiver: alice.publicKey,
        tokenMint: fakeMintAddress
      })
      .signers([RELAYER])
      .rpc({ skipPreflight: true });

    assert.rejects(mintAndBridgePromise);
  });

  it("Mint and bridge tokens", async () => {
    const amountToBridge = new anchor.BN(5 * 10 ** MINT_DECIMALS);
    const aliceTokenAmountBefore = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    const mintSupplyBefore = (await getMint(provider.connection, mintAddress)).supply;

    let eventMintAmount = new anchor.BN(0);
    let eventTokenOwner = PublicKey.default;
    let eventTokenMint = PublicKey.default;

    const evmAddressAs32Bytes = evmAddressTo32Bytes(USDC_ETHEREUM_MAINNET);

    program.addEventListener('mintEvent', (event, slot) => {
      eventMintAmount = event.amount;
      eventTokenOwner = event.tokenOwner;
      eventTokenMint = event.tokenMint;
    });

    await program.methods
      .mintAndBridge(evmAddressAs32Bytes, amountToBridge)
      .accounts({
        relayer: RELAYER.publicKey,
        tokenReceiver: alice.publicKey,
        tokenMint: mintAddress
      })
      .signers([RELAYER])
      .rpc({ skipPreflight: true });

    const aliceTokenAmountAfter = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    const mintSupplyAfter = (await getMint(provider.connection, mintAddress)).supply;

    assert.equal(aliceTokenAmountAfter - aliceTokenAmountBefore, amountToBridge.toNumber());
    assert.equal(mintSupplyAfter - mintSupplyBefore, BigInt(amountToBridge.toNumber()));
    assert.equal(eventMintAmount.toNumber(), amountToBridge.toNumber());
    assert.equal(eventTokenOwner.toBase58(), alice.publicKey.toBase58());
    assert.equal(eventTokenMint.toBase58(), mintAddress.toBase58());
  });


});
