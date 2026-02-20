    // GhostSwap - Zero-Knowledge P2P OTC Trading Protocol
    // Built for Aleo Testnet

    program ghostswap_v1.aleo {

        // ═══════════════════════════════════════════════════════════════
        // RECORDS — ALL PRIVATE, ENCRYPTED ON-CHAIN
        // ═══════════════════════════════════════════════════════════════

        // Trade order created by maker
        record TradeOrder {
            owner: address,
            maker_token_id: field,
            maker_amount: u128,
            taker_token_id: field,
            taker_amount: u128,
            order_id: field,
            nonce: field,
            expires_at: u64
        }

        // Claim ticket given to taker to execute swap
        record ClaimTicket {
            owner: address,
            order_id: field,
            maker_address: address,
            maker_token_id: field,
            maker_amount: u128,
            taker_token_id: field,
            taker_amount: u128
        }

        // Settlement receipt after swap completes
        record SettlementReceipt {
            owner: address,
            order_id: field,
            counterparty: address,
            token_received_id: field,
            amount_received: u128,
            token_sent_id: field,
            amount_sent: u128,
            settled_at: u64
        }

        // Ghost token for private transfers
        record GhostToken {
            owner: address,
            token_id: field,
            amount: u128
        }

        // ═══════════════════════════════════════════════════════════════
        // MAPPINGS — MINIMAL PUBLIC STATE
        // ═══════════════════════════════════════════════════════════════

        // Tracks active order commitments
        mapping order_commitments: field => bool;

        // Tracks spent/cancelled order nullifiers
        mapping order_nullifiers: field => bool;

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: create_order — maker creates a new trade order
        // ═══════════════════════════════════════════════════════════════

        async transition create_order(
            maker_token: GhostToken,
            taker_token_id: field,
            taker_amount: u128,
            nonce: field,
            expires_at: u64
        ) -> (TradeOrder, GhostToken, Future) {

            // Generate unique order ID
            let order_id: field = BHP256::hash_to_field(
                self.signer as field + maker_token.token_id + maker_token.amount as field + taker_token_id + nonce
            );

            // Create the trade order record
            let order: TradeOrder = TradeOrder {
                owner: self.signer,
                maker_token_id: maker_token.token_id,
                maker_amount: maker_token.amount,
                taker_token_id: taker_token_id,
                taker_amount: taker_amount,
                order_id: order_id,
                nonce: nonce,
                expires_at: expires_at
            };

            // Consume the maker's token (return zero balance)
            let remaining: GhostToken = GhostToken {
                owner: self.signer,
                token_id: maker_token.token_id,
                amount: 0u128
            };

            // Compute commitment for on-chain tracking
            let commitment: field = BHP256::hash_to_field(order_id + self.signer as field);

            let f: Future = finalize_create_order(commitment);
            return (order, remaining, f);
        }

        async function finalize_create_order(commitment: field) {
            Mapping::set(order_commitments, commitment, true);
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: generate_claim_ticket — maker issues ticket to taker
        // ═══════════════════════════════════════════════════════════════

        transition generate_claim_ticket(
            order: TradeOrder,
            taker_address: address
        ) -> (TradeOrder, ClaimTicket) {

            // Recreate order for maker to keep
            let kept_order: TradeOrder = TradeOrder {
                owner: order.owner,
                maker_token_id: order.maker_token_id,
                maker_amount: order.maker_amount,
                taker_token_id: order.taker_token_id,
                taker_amount: order.taker_amount,
                order_id: order.order_id,
                nonce: order.nonce,
                expires_at: order.expires_at
            };

            // Create claim ticket for taker
            let ticket: ClaimTicket = ClaimTicket {
                owner: taker_address,
                order_id: order.order_id,
                maker_address: order.owner,
                maker_token_id: order.maker_token_id,
                maker_amount: order.maker_amount,
                taker_token_id: order.taker_token_id,
                taker_amount: order.taker_amount
            };

            return (kept_order, ticket);
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: execute_swap — taker executes the swap
        // ═══════════════════════════════════════════════════════════════

        async transition execute_swap(
            ticket: ClaimTicket,
            taker_token: GhostToken,
            maker_order: TradeOrder
        ) -> (GhostToken, GhostToken, SettlementReceipt, SettlementReceipt, Future) {

            // Validate ticket matches order
            assert_eq(ticket.order_id, maker_order.order_id);
            assert_eq(ticket.maker_address, maker_order.owner);
            assert_eq(taker_token.token_id, maker_order.taker_token_id);
            assert(taker_token.amount >= maker_order.taker_amount);

            // Compute nullifier to prevent double-spend
            let nullifier: field = BHP256::hash_to_field(
                maker_order.order_id + maker_order.nonce + maker_order.owner as field
            );

            // Taker receives maker's tokens
            let taker_receives: GhostToken = GhostToken {
                owner: self.signer,
                token_id: maker_order.maker_token_id,
                amount: maker_order.maker_amount
            };

            // Maker receives taker's tokens
            let maker_receives: GhostToken = GhostToken {
                owner: maker_order.owner,
                token_id: maker_order.taker_token_id,
                amount: maker_order.taker_amount
            };

            // Settlement receipt for taker
            let taker_receipt: SettlementReceipt = SettlementReceipt {
                owner: self.signer,
                order_id: maker_order.order_id,
                counterparty: maker_order.owner,
                token_received_id: maker_order.maker_token_id,
                amount_received: maker_order.maker_amount,
                token_sent_id: maker_order.taker_token_id,
                amount_sent: maker_order.taker_amount,
                settled_at: 0u64
            };

            // Settlement receipt for maker
            let maker_receipt: SettlementReceipt = SettlementReceipt {
                owner: maker_order.owner,
                order_id: maker_order.order_id,
                counterparty: self.signer,
                token_received_id: maker_order.taker_token_id,
                amount_received: maker_order.taker_amount,
                token_sent_id: maker_order.maker_token_id,
                amount_sent: maker_order.maker_amount,
                settled_at: 0u64
            };

            let commitment: field = BHP256::hash_to_field(maker_order.order_id + maker_order.owner as field);

            let f: Future = finalize_execute_swap(nullifier, commitment);
            return (taker_receives, maker_receives, taker_receipt, maker_receipt, f);
        }

        async function finalize_execute_swap(nullifier: field, commitment: field) {
            // Verify order exists
            let exists: bool = Mapping::get_or_use(order_commitments, commitment, false);
            assert(exists);

            // Verify order not already spent
            let is_spent: bool = Mapping::get_or_use(order_nullifiers, nullifier, false);
            assert(!is_spent);

            // Mark as spent
            Mapping::set(order_nullifiers, nullifier, true);
            Mapping::set(order_commitments, commitment, false);
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: cancel_order — maker cancels their order
        // ═══════════════════════════════════════════════════════════════

        async transition cancel_order(
            order: TradeOrder
        ) -> (GhostToken, Future) {

            // Only owner can cancel
            assert_eq(order.owner, self.signer);

            // Refund maker's tokens
            let refund: GhostToken = GhostToken {
                owner: self.signer,
                token_id: order.maker_token_id,
                amount: order.maker_amount
            };

            let nullifier: field = BHP256::hash_to_field(
                order.order_id + order.nonce + order.owner as field
            );
            let commitment: field = BHP256::hash_to_field(order.order_id + order.owner as field);

            let f: Future = finalize_cancel_order(nullifier, commitment);
            return (refund, f);
        }

        async function finalize_cancel_order(nullifier: field, commitment: field) {
            Mapping::set(order_nullifiers, nullifier, true);
            Mapping::set(order_commitments, commitment, false);
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: wrap_credits — wrap native credits as GhostToken
        // ═══════════════════════════════════════════════════════════════

        transition wrap_credits(amount: u128) -> GhostToken {
            return GhostToken {
                owner: self.signer,
                token_id: 1field,
                amount: amount
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: mint_test_tokens — mint test tokens (testnet only)
        // ═══════════════════════════════════════════════════════════════

        transition mint_test_tokens(token_id: field, amount: u128) -> GhostToken {
            return GhostToken {
                owner: self.signer,
                token_id: token_id,
                amount: amount
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: split_tokens — split token into two records
        // ═══════════════════════════════════════════════════════════════

        transition split_tokens(token: GhostToken, amount_a: u128) -> (GhostToken, GhostToken) {
            assert(token.amount >= amount_a);

            let token_a: GhostToken = GhostToken {
                owner: self.signer,
                token_id: token.token_id,
                amount: amount_a
            };

            let token_b: GhostToken = GhostToken {
                owner: self.signer,
                token_id: token.token_id,
                amount: token.amount - amount_a
            };

            return (token_a, token_b);
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: merge_tokens — merge two token records
        // ═══════════════════════════════════════════════════════════════

        transition merge_tokens(token_a: GhostToken, token_b: GhostToken) -> GhostToken {
            assert_eq(token_a.token_id, token_b.token_id);

            return GhostToken {
                owner: self.signer,
                token_id: token_a.token_id,
                amount: token_a.amount + token_b.amount
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // TRANSITION: transfer_private — private token transfer
        // ═══════════════════════════════════════════════════════════════

        transition transfer_private(
            token: GhostToken,
            recipient: address,
            amount: u128
        ) -> (GhostToken, GhostToken) {
            assert(token.amount >= amount);

            let sent: GhostToken = GhostToken {
                owner: recipient,
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
