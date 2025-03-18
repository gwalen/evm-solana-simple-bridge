// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/BridgeErc20.sol";
import "../src/EvmBridge.sol";

contract EvmBridgeTest is Test {
    uint256 constant TOKEN_DECIMALS = 1e6;

    BridgeErc20 token;
    EvmBridge bridge;
    address owner = makeAddr("owner");
    address relayer = makeAddr("relayer");
    address alice = makeAddr("alice");

    // it's a 32 bytes representation of Solana mainnet USDC address    
    bytes32 foreignTokenAddress = bytes32(0xc6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d61);

    event BurnEvent(address tokenMint, address tokenOwner, uint256 amount);
    event MintEvent(address tokenMint, address tokenOwner, uint256 amount);

    function setUp() public {
        bridge = new EvmBridge();
        bridge.initialize(owner, relayer);

        token = new BridgeErc20();
        token.initialize("Test Token", "TT", owner, address(bridge));

        vm.startPrank(owner);
        uint256 mintAmount = 1 * TOKEN_DECIMALS;
        token.mint(alice, mintAmount);
        assertEq(token.balanceOf(alice), mintAmount);
        token.burn(alice, mintAmount);
        assertEq(token.balanceOf(alice), 0);

        // As owner, register the token in the bridge using the foreign token identifier.
        // vm.prank(owner);
        bridge.registerForeignToken(token, foreignTokenAddress);
        vm.stopPrank();
    }

    function testRegisterForeignToken() public view {
        BridgeErc20 registeredToken = bridge.foreignTokens(foreignTokenAddress);
        assertEq(address(registeredToken), address(token));
    }

    function testOnlyBridgeCanMintAndBurn() public {
        uint256 amount = 1000 * TOKEN_DECIMALS;
        
        // Attempt to mint from a non-bridge or owner address should revert.
        vm.prank(alice);
        vm.expectRevert("Caller is not the bridge or owner contract");
        token.mint(alice, amount);

        // Minting from the designated bridge should succeed.
        vm.prank(address(bridge));
        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);

        // Attempt to burn from a non-bridge or owner address should revert.
        vm.prank(alice);
        vm.expectRevert("Caller is not the bridge or owner contract");
        token.burn(alice, amount);

        // Burning by the bridge should succeed.
        vm.prank(address(bridge));
        token.burn(alice, amount);
        assertEq(token.balanceOf(alice), 0);
    }

    function testBurnAndBridge() public {
        uint256 amount = 500 * TOKEN_DECIMALS;
        
        // Mint tokens to alice by impersonating the bridge.
        vm.prank(address(bridge));
        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);

        // Alice calls EvmBridge contract to bridge and burn tokens
        vm.startPrank(alice);
        vm.expectEmit(true, false, false, true);
        emit BurnEvent(address(token), alice, amount);
        bridge.burnAndBridge(token, amount);
        vm.stopPrank();

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.totalSupply(), 0);
    }

    function testMintAndBridge() public {
        uint256 amount = 300 * TOKEN_DECIMALS;
        
        vm.startPrank(relayer);
        vm.expectEmit(true, false, false, true);
        emit MintEvent(address(token), alice, amount);
        bridge.mintAndBridge(token, foreignTokenAddress, alice, amount);
        vm.stopPrank();
        
        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);
    }

    function testMintAndBridgeUnregisteredToken() public {
        bytes32 unregisteredForeignToken = keccak256("UNREGISTERED");
        vm.prank(relayer);
        vm.expectRevert("Token not registered");
        bridge.mintAndBridge(token, unregisteredForeignToken, alice, 1000);
    }

    function testMintAndBridgeOnlyRelayer() public {
        uint256 amount = 100 * TOKEN_DECIMALS;
        vm.prank(alice); // alice is not the relayer.
        vm.expectRevert("Caller is not the trusted relayer");
        bridge.mintAndBridge(token, foreignTokenAddress, alice, amount);
    }

    function testRegisterForeignTokenOnlyOwner() public {
        vm.prank(alice); // alice is not the owner.
        vm.expectRevert();
        bridge.registerForeignToken(token, keccak256("NEW_TOKEN"));
    }
}