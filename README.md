# Evm Solana Bridge

The project includes smart contracts on both chains, an off-chain relayer to listen for burning/minting events, and integration tests that simulate a full cross-chain scenario.

## Prerequisites & Tools

### General Tools
- **Node.js**: Version **>= 22**  
  *(Recommended: use [nvm](https://github.com/nvm-sh/nvm) for managing Node versions)*
- **Yarn**: Package manager
- **Rust**: Install **rustc >= 1.75.0**

- **nvm**: For Node version management
- **avm**: For installing and managing the required version of Anchor

### EVM Specific Tools
- **Forge**: Part of Foundry, used for compiling and testing EVM smart contracts.
- **Anvil**: A local Ethereum test network provided by Foundry.

### Solana Specific Tools
- **Anchor**: Version **0.30.1** (install using [avm](https://www.anchor-lang.com/docs/installation#install-anchor-cli))
- **Solana CLI**: Version **1.18.26** (install according to [instructions](https://www.anchor-lang.com/docs/installation#install-the-solana-cli)).
    After installation of `avm` and `solana-cli` run :
    ```
    agave-install init 1.18.26
    avm install 0.30.1
    avm use 0.30.1
    ```


## Directory Structure

### EVM Smart Contracts  
Located in the `evm-bridge` directory. This folder contains Solidity contracts such as **EvmBridge** and **BridgeErc20**, along with deployment and testing scripts.  

**Contracts:**  
- **EvmBridge**: The core contract that manages bridging logic by emitting events, which are later registered by an off-chain relayer app.  
- **BridgeErc20**: A custom ERC20 token compatible with the bridging contract. It allows mint/burn operations to be delegated to the EvmBridge contract, which contains additional logic.  

#### Note:  
On the EVM side, all logic could be integrated into a custom ERC20 token. However, to mirror EVM bridge functionality on Solana, I used a separate **EvmBridging** contract.  
Additionally, this structure is better for adding new features and introduces a clean separation between bridging logic and ERC20 token functionality.  

### Solana Smart Contracts
Located in the `solana-bridge` directory. This folder contains the Anchor-based Solana program (**solana_bridge**) along with its related scripts for deployment and initialization.

**Contracts:** 
- **solana_bridge**

In the case of the Solana blockchain, we cannot extend the SPL token. This is a standard token owned by the Token Program, and all actions on it are performed using this program.  
To develop bridging functionality, we need a separate contract to which we will grant minting authority. This contract is used for interactions with the user.  

If a user wants to bridge tokens, they call the `burnAndBridge` function, which burns tokens on their behalf and emits an event that is later picked up by the off-chain relayer.  
The off-chain relayer app has the rights to call the `mintAndBridge` function using its own EOA key, which is registered in the `solana-bridge` program config.  

## Building & Testing

### EVM

1. **Navigate to the EVM Directory**
   ```sh
   cd evm-bridge
   ```

2. **Install Dependencies**
   ```sh
   yarn install
   ```

3. **Install Forge Dependencies**
   ```sh
   forge install
   forge install foundry-rs/forge-std
   ```

4. **Build Contracts**
   ```sh
   forge build
   ```

5. **Run Unit Tests**
   ```sh
   forge test
   ```

6. **Compile Using Hardhat (Mandatory to generate type-chain files)**
   ```sh
   npx hardhat compile
   ```

### Solana

1. **Navigate to the Solana Directory**
   ```sh
   cd solana-bridge
   ```

2. **Install Dependencies**
   ```sh
   yarn install
   ```

3. **Build Contracts**
   ```sh
   anchor build --arch sb
   ```

4. **Run Unit Tests**
   ```sh
   anchor test --arch sb
   ```

## Integration Tests

**NOTE**:
Make sure to run through all build steps for EVM and Solana before running integration tests.

The integration tests simulate a full cross-chain scenario:
- **Local Test Networks**:  
  The tests spawn both an Anvil (EVM test network) and a Solana Test Validator.
- **Deployment & Initialization**:  
  After the networks are up, the tests deploy and initialize smart contracts on both EVM and Solana.
- **Token Bridging Flow**:  
  The scenario includes burning tokens on one chain and minting tokens on the other. An off-chain relayer listens for these events and triggers the corresponding bridging actions.
- **Balance Checks**:  
  After bridging operations, the tests wait (using a sleep function) and then check if token balances have increased accordingly on the target chain.

### Running Integration Tests

Notice that this test provides extensive logging to help visualize what is happening under the hood.

1. **Install Project Dependencies (from the project root)**
```sh
yarn install
```

2. **Run Integration Tests**
```sh
yarn run integration-test
```

