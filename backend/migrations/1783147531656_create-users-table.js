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
        CREATE TABLE users (
            id UUID DEFAULT gen_random_uuid(),
            name varchar(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_email_verified BOOLEAN DEFAULT false,
            is_blacklisted BOOLEAN DEFAULT false,
            is_deleted BOOLEAN DEFAULT false,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);

        CREATE UNIQUE INDEX uq_users_email ON users (email);
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
        DROP INDEX uq_users_email;

        ALTER TABLE users DROP CONSTRAINT pk_users;
        
        DROP TABLE users;
        `
    );
};
