SET client_encoding = 'UTF8';
SET TIME ZONE 'Europe/Moscow';

BEGIN;

TRUNCATE TABLE
    boarding_passes,
    bookings,
    passengers,
    flights,
    aircraft,
    airports
RESTART IDENTITY CASCADE;

COMMIT;
