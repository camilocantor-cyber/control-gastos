ALTER TABLE journal_entries ADD CONSTRAINT fk_je_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
