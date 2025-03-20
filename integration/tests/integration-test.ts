import * as anchor from "@coral-xyz/anchor";
import { ChildProcess } from "child_process";
import { evmBurnAndBridgeAliceTokens } from "../../evm-bridge/scripts/alice-burn-and-bridge";
import { registerSolanaTokenOnEvm } from "../../evm-bridge/scripts/register-solana-token";
import { solanaBurnAndBridgeAliceTokens } from "../../solana-bridge/scripts/alice-burn-and-bridge";
import { registerEvmTokenOnSolana } from "../../solana-bridge/scripts/register-evm-token";
import { createAnchorProvider, sleep } from "../../solana-bridge/tests/utils";
import { MINT_DECIMALS as SOLANA_TOKEN_DECIMALS } from "../../solana-bridge/tests/consts";
import { BridgeErc20, BridgeErc20__factory } from "../../evm-bridge/typechain-types";
import { Keypair, PublicKey } from "@solana/web3.js";
import { OffChainRelayer } from "../src/off-chain-relayer";
import { exit } from "process";
import { describe, it } from "mocha";
import { expect } from "chai";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { assert } from "chai";
import { ethers, JsonRpcProvider } from "ethers";
import { initializeEvm, initializeSolana, spawnAnvil, spawnSolanaValidator } from "./utils";


describe("integration-test", () => {
  let anvilProcess: ChildProcess;
  let validatorProcess: ChildProcess;
  let evmRelayerPrivateKey: string;
  let evmAlicePrivateKey: string;
  let solanaAlicePrivateKey: string;
  let solanaRpcUrl: string;
  let evmRpcUrl: string;
  let evmWsRpcUrl: string;
  let evmBridgeAddress: string;
  let evmTokenAddress: string;
  let solanaBridgeAddress: string;
  let solanaTokenAddress: string;
  let offChainRelayer: OffChainRelayer;

  let solanaProvider: anchor.AnchorProvider;
  let aliceTokenAta: PublicKey;
  let aliceSolanaKeypair: Keypair;

  let evmProvider: JsonRpcProvider;
  let evmToken: BridgeErc20;
  let aliceEvmWallet: ethers.Wallet;

  it("spawn local test blockchains", async () => {
    anvilProcess = await spawnAnvil();
    validatorProcess = await spawnSolanaValidator();
  });

  it("setup addresses", async () => {
    evmRelayerPrivateKey = process.env.RELAYER_PRIVATE_KEY_EVM || "";
    evmAlicePrivateKey = process.env.ALICE_PRIVATE_KEY_EVM || "";
    solanaAlicePrivateKey = process.env.ALICE_PRIVATE_KEY_SOLANA || "";
    solanaRpcUrl = process.env.SOLANA_RPC_URL || "";
    evmRpcUrl = process.env.EVM_RPC_URL || "";
    evmWsRpcUrl = process.env.EVM_WS_RPC_URL || "";
    expect(evmRelayerPrivateKey).to.not.equal("");
    expect(evmAlicePrivateKey).to.not.equal("");
    expect(solanaAlicePrivateKey).to.not.equal("");
    expect(solanaRpcUrl).to.not.equal("");
    expect(evmRpcUrl).to.not.equal("");
    expect(evmWsRpcUrl).to.not.equal("");
  });

  it("initialize contract on Evm and Solana", async () => {
    [evmBridgeAddress, evmTokenAddress] = await initializeEvm();
    console.log("Evm contracts deployed");
    [solanaBridgeAddress, solanaTokenAddress] = await initializeSolana();
    console.log("Solana contracts deployed");

    try {
      solanaProvider = createAnchorProvider(solanaRpcUrl);
      const solanaProviderWallet = solanaProvider.wallet as anchor.Wallet;
      aliceSolanaKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(solanaAlicePrivateKey) as number[]));

      aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
        solanaProvider.connection,
        solanaProviderWallet.payer,  // payer
        new PublicKey(solanaTokenAddress),
        aliceSolanaKeypair.publicKey, // ata owner
      )).address;

      evmProvider = new ethers.JsonRpcProvider(evmRpcUrl);
      aliceEvmWallet = new ethers.Wallet(evmAlicePrivateKey, evmProvider);
      evmToken = BridgeErc20__factory.connect(evmTokenAddress, aliceEvmWallet);

    } catch (e) {
      console.log("ERROR");
      console.log(e);
    }

    await registerSolanaTokenOnEvm(
      evmBridgeAddress,
      evmTokenAddress,
      (new PublicKey(solanaTokenAddress)).toBytes()
    );

    await registerEvmTokenOnSolana(evmTokenAddress, solanaTokenAddress);
  });

  it("start off chain relayer and listen to events", async () => {
    offChainRelayer = new OffChainRelayer(
      evmWsRpcUrl,
      solanaRpcUrl,
      evmBridgeAddress,
      solanaTokenAddress,
      evmRpcUrl,
      evmTokenAddress,
      evmAlicePrivateKey,
      evmRelayerPrivateKey
    );
    offChainRelayer.startListening();
  });

  it("EVM : burn and bridge tokens to Solana", async () => {
    const burnAmount = 1000n;

    const aliceTokenAmountBefore = Number(
      (await solanaProvider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount
    );

    await evmBurnAndBridgeAliceTokens(evmBridgeAddress, evmTokenAddress, burnAmount);
    // Wait 10 seconds for events to be processed
    await sleep(10000);

    const aliceTokenAmountAfter = Number(
      (await solanaProvider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount
    );
    const aliceSolanaTokenBalanceChange = aliceTokenAmountAfter - aliceTokenAmountBefore;

    assert.equal(Number(burnAmount), aliceSolanaTokenBalanceChange)

    console.log("EVM burn and bridge tokens to Solana completed. Token amount bridged: ", burnAmount);
  });

  it("Solana: burn and bridge tokens to EVM", async () => {
    const burnAmount = new anchor.BN(1 * 10 ** SOLANA_TOKEN_DECIMALS)

    const aliceTokenAmountBefore = await evmToken.balanceOf(aliceEvmWallet.address);

    await solanaBurnAndBridgeAliceTokens(burnAmount);
    // Wait 10 seconds for events to be processed
    await sleep(10000);

    const aliceTokenAmountAfter = await evmToken.balanceOf(aliceEvmWallet.address);
    const aliceEvmTokenBalanceChange = aliceTokenAmountAfter - aliceTokenAmountBefore;

    assert.equal(burnAmount.toNumber(), Number(aliceEvmTokenBalanceChange));

    console.log("Solana burn and bridge tokens to EVM completed. Token amount bridged: ", burnAmount.toNumber());
  });

  it("Shut down test blockchains", async () => {
    console.log("Wait 10s to shut down")
    await sleep(10000);
    console.log("Shutting down test networks...");
    anvilProcess.kill();
    validatorProcess.kill();
    exit(0);
  });
});