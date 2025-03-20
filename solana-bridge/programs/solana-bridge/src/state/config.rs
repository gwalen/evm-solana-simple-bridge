use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub owner: Pubkey,
    pub relayer: Pubkey
}

impl Config {
    // add 8 bytes for anchor discriminator
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub const SEED_PREFIX: &'static [u8] = b"config";
}