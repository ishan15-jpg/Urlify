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
        CREATE TABLE urls (
            id BIGSERIAL,
            user_id UUID DEFAULT NULL,
            original_url TEXT NOT NULL,
            short_url VARCHAR(100) NOT NULL,
            is_deleted BOOLEAN DEFAULT false,
            is_expired BOOLEAN DEFAULT false,
            click_count BIGINT DEFAULT 0,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE urls ADD CONSTRAINT pk_urls PRIMARY KEY (id);

        ALTER TABLE urls ADD CONSTRAINT fk_urls_users FOREIGN KEY (user_id) REFERENCES users(id);

        CREATE UNIQUE INDEX idx_short_url ON urls(short_url);

        CREATE INDEX idx_user_id ON urls(user_id);
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
        DROP INDEX IF EXISTS idx_short_url;
        DROP INDEX IF EXISTS idx_user_id;
        ALTER TABLE urls DROP CONSTRAINT fk_urls_users;
        ALTER TABLE urls DROP CONSTRAINT pk_urls;
        DROP TABLE IF EXISTS urls;
        `
    );
};
