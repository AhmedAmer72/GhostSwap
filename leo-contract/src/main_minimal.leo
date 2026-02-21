program ghostswap_otc_v2.aleo {

    record GhostToken {
        owner: address,
        token_id: field,
        amount: u128
    }

    record TradeOrder {
        owner: address,
        maker_token_id: field,
        maker_amount: u128,
        taker_token_id: field,
        taker_amount: u128,
        order_id: field
    }

    mapping nullifiers: field => bool;

    @noupgrade
    async constructor() {}

    transition mint(id: field, amt: u128) -> GhostToken {
        return GhostToken {
            owner: self.signer,
            token_id: id,
            amount: amt
        };
    }

    transition create(token: GhostToken, want_id: field, want_amt: u128) -> TradeOrder {
        let oid: field = BHP256::hash_to_field(self.signer as field + token.token_id);
        return TradeOrder {
            owner: self.signer,
            maker_token_id: token.token_id,
            maker_amount: token.amount,
            taker_token_id: want_id,
            taker_amount: want_amt,
            order_id: oid
        };
    }

    async transition swap(order: TradeOrder, payment: GhostToken) -> (GhostToken, GhostToken, Future) {
        assert_eq(payment.token_id, order.taker_token_id);
        assert(payment.amount >= order.taker_amount);

        let taker_gets: GhostToken = GhostToken {
            owner: self.signer,
            token_id: order.maker_token_id,
            amount: order.maker_amount
        };
        let maker_gets: GhostToken = GhostToken {
            owner: order.owner,
            token_id: order.taker_token_id,
            amount: order.taker_amount
        };

        return (taker_gets, maker_gets, finalize_swap(order.order_id));
    }

    async function finalize_swap(oid: field) {
        let used: bool = nullifiers.get_or_use(oid, false);
        assert(!used);
        nullifiers.set(oid, true);
    }

    transition cancel(order: TradeOrder) -> GhostToken {
        assert_eq(order.owner, self.signer);
        return GhostToken {
            owner: self.signer,
            token_id: order.maker_token_id,
            amount: order.maker_amount
        };
    }
}
