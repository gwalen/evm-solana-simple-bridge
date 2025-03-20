use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ForeignToken {
    pub foreign_address: [u8; 32],
    pub local_address: Pubkey
}

impl ForeignToken {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub const SEED_PREFIX: &'static [u8] = b"foreign_token";
}