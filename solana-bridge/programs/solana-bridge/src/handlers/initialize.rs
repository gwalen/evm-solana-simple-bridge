use std::borrow::BorrowMut;
use anchor_lang::prelude::*;
use crate::{instructions::initialize::*, state::config::Config};


/// For documentation, refer to `lib.rs`.  
pub fn handle(ctx: Context<Initialize>) -> Result<()> {
    let config = ctx.accounts.config.borrow_mut();

    config.set_inner(Config {
        owner: ctx.accounts.owner.key(),
        relayer: ctx.accounts.relayer.key() 
    });

    Ok(())
}