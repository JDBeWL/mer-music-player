CREATE TABLE music_tb (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    cover VARCHAR(255),
    artist VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL
);