use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum BridgeError {
    #[msg("Invalid owner")]
    InvalidOwner,
    #[msg("Invalid relayer")]
    InvalidRelayer,
    #[msg("Wrong mint for registered foreign token")]
    WrongMintForForeignToken,
}