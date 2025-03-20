use anchor_lang::prelude::*;

#[event]
pub struct BurnEvent {
    pub token_mint: Pubkey,
    pub token_owner: Pubkey,
    pub amount: u64
}

#[event]
pub struct MintEvent {
    pub token_mint: Pubkey,
    pub token_owner: Pubkey,
    pub amount: u64
}