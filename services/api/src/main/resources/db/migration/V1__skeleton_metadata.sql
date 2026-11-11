CREATE TABLE skeleton_metadata (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    service_name VARCHAR(32) NOT NULL CHECK (service_name = 'manicule')
);

INSERT INTO skeleton_metadata (id, schema_version, service_name)
VALUES (1, 1, 'manicule');
