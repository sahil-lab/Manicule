DO $initialization$
BEGIN
    EXECUTE format(
        'CREATE ROLE manicule LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
        pg_read_file('/run/secrets/db_app_password')
    );
END
$initialization$;

CREATE DATABASE manicule OWNER manicule;
