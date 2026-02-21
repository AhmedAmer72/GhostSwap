program ghostswap_otc_v2.aleo {

    record Token {
        owner: address,
        amount: u64
    }

    @noupgrade
    async constructor() {}

    transition mint(amt: u64) -> Token {
        return Token {
            owner: self.signer,
            amount: amt
        };
    }
}
