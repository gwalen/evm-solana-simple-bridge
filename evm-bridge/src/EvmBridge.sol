// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./BridgeErc20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract EvmBridge is OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {

    address public relayer;

    // Mapping from a foreign token identifier (bytes32) to a local BridgeErc20 token contract.
    mapping(bytes32 => BridgeErc20) public foreignTokens;

    event BurnEvent(address tokenMint, address tokenOwner, uint256 amount);
    event MintEvent(address tokenMint, address tokenOwner, uint256 amount);

    /// Initializes the EvmBridge contract.
    function initialize(address initialOwner, address _relayer) public initializer {
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        relayer = _relayer;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Caller is not the trusted relayer");
        _;
    }

    /// Foreign token by mapping its identifier to a local BridgeErc20 token.
    /// @param localToken The BridgeErc20 token contract.
    /// @param foreignAddress The identifier for the foreign token.
    function registerForeignToken(BridgeErc20 localToken, bytes32 foreignAddress) external onlyOwner {
        foreignTokens[foreignAddress] = localToken;
    }

    /// @notice Burns tokens from the caller’s balance on the specified BridgeErc20 token.
    /// @param token The BridgeErc20 token to burn.
    /// @param amount The amount of tokens to burn.
    function burnAndBridge(BridgeErc20 token, uint256 amount) external nonReentrant {
        token.burn(msg.sender, amount);
        emit BurnEvent(address(token), msg.sender, amount);
    }

    /// Mints tokens on the specified BridgeErc20 token to a receiver address, provided that the foreign token is registered.
    /// @param token The BridgeErc20 token to mint.
    /// @param foreignAddress The identifier for the foreign token.
    /// @param receiver The address that will receive the minted tokens.
    /// @param amount The amount of tokens to mint.
    function mintAndBridge(
        BridgeErc20 token, 
        bytes32 foreignAddress, 
        address receiver, 
        uint256 amount
    ) external onlyRelayer nonReentrant {
        require(address(foreignTokens[foreignAddress]) == address(token), "Token not registered");
        token.mint(receiver, amount);
        emit MintEvent(address(token), receiver, amount);
    }

    /// Only owner can upgrade.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}