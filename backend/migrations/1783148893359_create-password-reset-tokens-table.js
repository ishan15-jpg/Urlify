/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.sql(
        `
        CREATE TABLE password_reset_tokens (
            id BIGSERIAL,
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            is_revoked boolean DEFAULT false,
            expires_at TIMESTAMP NOT NULL,
            is_expired boolean DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE password_reset_tokens ADD CONSTRAINT pk_password_reset_tokens PRIMARY KEY (id);

        ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_password_reset_tokens_user_id FOREIGN KEY (user_id) REFERENCES users (id);

        CREATE UNIQUE INDEX uq_password_reset_tokens_user_id_token_hash ON password_reset_tokens (user_id, token_hash);
        `
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(
        `
        DROP INDEX uq_password_reset_tokens_user_id_token_hash;

        ALTER TABLE password_reset_tokens DROP CONSTRAINT fk_password_reset_tokens_user_id;

        ALTER TABLE password_reset_tokens DROP CONSTRAINT pk_password_reset_tokens;

        DROP TABLE password_reset_tokens;
        `
    );
};
