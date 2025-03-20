use std::borrow::BorrowMut;
use anchor_lang::prelude::*;
use crate::{instructions::register_foreign_token::RegisterForeignToken, state::foreign_token::ForeignToken};


/// For documentation, refer to `lib.rs`.  
pub fn handle(ctx: Context<RegisterForeignToken>, foreign_address: [u8; 32]) -> Result<()> {
    let foreign_token = ctx.accounts.foreign_token.borrow_mut();
    
    foreign_token.set_inner(ForeignToken {
        foreign_address,
        local_address: ctx.accounts.local_mint.key()
    });

    Ok(())
}