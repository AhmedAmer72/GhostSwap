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
        order_id: field,
        nonce: field
    }

    record ClaimTicket {
        owner: address,
        order_id: field,
        maker_address: address,
        maker_token_id: field,
        maker_amount: u128,
        taker_token_id: field,
        taker_amount: u128
    }

    mapping order_nullifiers: field => bool;

    @noupgrade
    async constructor() {}

    transition mint_tokens(token_id: field, amount: u128) -> GhostToken {
        return GhostToken {
            owner: self.signer,
            token_id: token_id,
            amount: amount
        };
    }

    transition create_order(
        token: GhostToken,
        taker_token_id: field,
        taker_amount: u128,
        nonce: field
    ) -> TradeOrder {
        let order_id: field = BHP256::hash_to_field(self.signer as field + nonce);
        return TradeOrder {
            owner: self.signer,
            maker_token_id: token.token_id,
            maker_amount: token.amount,
            taker_token_id: taker_token_id,
            taker_amount: taker_amount,
            order_id: order_id,
            nonce: nonce
        };
    }

    transition generate_ticket(
        order: TradeOrder,
        taker: address
    ) -> (TradeOrder, ClaimTicket) {
        let kept: TradeOrder = TradeOrder {
            owner: order.owner,
            maker_token_id: order.maker_token_id,
            maker_amount: order.maker_amount,
            taker_token_id: order.taker_token_id,
            taker_amount: order.taker_amount,
            order_id: order.order_id,
            nonce: order.nonce
        };
        let ticket: ClaimTicket = ClaimTicket {
            owner: taker,
            order_id: order.order_id,
            maker_address: order.owner,
            maker_token_id: order.maker_token_id,
            maker_amount: order.maker_amount,
            taker_token_id: order.taker_token_id,
            taker_amount: order.taker_amount
        };
        return (kept, ticket);
    }

    async transition execute_swap(
        ticket: ClaimTicket,
        taker_token: GhostToken,
        order: TradeOrder
    ) -> (GhostToken, GhostToken, Future) {
        assert_eq(ticket.order_id, order.order_id);
        assert_eq(ticket.maker_address, order.owner);
        assert_eq(taker_token.token_id, order.taker_token_id);
        assert(taker_token.amount >= order.taker_amount);

        let nullifier: field = BHP256::hash_to_field(order.order_id + order.nonce);

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

        return (taker_gets, maker_gets, finalize_swap(nullifier));
    }

    async function finalize_swap(nullifier: field) {
        let spent: bool = order_nullifiers.get_or_use(nullifier, false);
        assert(!spent);
        order_nullifiers.set(nullifier, true);
    }

    transition cancel_order(order: TradeOrder) -> GhostToken {
        assert_eq(order.owner, self.signer);
        return GhostToken {
            owner: self.signer,
            token_id: order.maker_token_id,
            amount: order.maker_amount
        };
    }

    transition split_tokens(token: GhostToken, amount: u128) -> (GhostToken, GhostToken) {
        assert(token.amount >= amount);
        let a: GhostToken = GhostToken {
            owner: self.signer,
            token_id: token.token_id,
            amount: amount
        };
        let b: GhostToken = GhostToken {
            owner: self.signer,
            token_id: token.token_id,
            amount: token.amount - amount
        };
        return (a, b);
    }

    transition merge_tokens(a: GhostToken, b: GhostToken) -> GhostToken {
        assert_eq(a.token_id, b.token_id);
        return GhostToken {
            owner: self.signer,
            token_id: a.token_id,
            amount: a.amount + b.amount
        };
    }

    transition transfer(token: GhostToken, to: address, amount: u128) -> (GhostToken, GhostToken) {
        assert(token.amount >= amount);
        let sent: GhostToken = GhostToken {
            owner: to,
            token_id: token.token_id,
            amount: amount
        };
        let remaining: GhostToken = GhostToken {
            owner: self.signer,
            token_id: token.token_id,
            amount: token.amount - amount
        };
        return (sent, remaining);
    }
}
