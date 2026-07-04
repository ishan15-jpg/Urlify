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
        CREATE TABLE refresh_tokens (
            id BIGSERIAL,
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            is_revoked boolean DEFAULT false,
            expires_at TIMESTAMP NOT NULL,
            is_expired boolean DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE refresh_tokens ADD CONSTRAINT pk_refresh_tokens PRIMARY KEY (id);

        ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user_id FOREIGN KEY (user_id) REFERENCES users (id);

        CREATE UNIQUE INDEX uq_refresh_tokens_user_id_token_hash ON refresh_tokens (user_id, token_hash);
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
        DROP INDEX uq_refresh_tokens_user_id_token_hash;

        ALTER TABLE refresh_tokens DROP CONSTRAINT fk_refresh_tokens_user_id;

        ALTER TABLE refresh_tokens DROP CONSTRAINT pk_refresh_tokens;

        DROP TABLE refresh_tokens;
        `
    );
};
