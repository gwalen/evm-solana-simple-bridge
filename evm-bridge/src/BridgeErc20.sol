// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract BridgeErc20 is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    
    address public bridge;

    modifier onlyBridgeOrOwner() {
        require(msg.sender == bridge || msg.sender == owner(), "Caller is not the bridge or owner contract");
        _;
    }

    function initialize(string memory name, string memory symbol, address owner, address _bridge) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        bridge = _bridge;
    }

    /// Mints amount tokens to the receiver address.
    function mint(address receiver, uint256 amount) external onlyBridgeOrOwner() {
        _mint(receiver, amount);
    }

    /// Burns amount tokens from the account address.
    function burn(address account, uint256 amount) external onlyBridgeOrOwner() {
        _burn(account, amount);
    }

    /// Only owner can upgrade.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}