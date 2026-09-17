SET client_encoding = 'UTF8';
SET TIME ZONE 'Europe/Moscow';

BEGIN;

CREATE TABLE airports (
    airport_id integer PRIMARY KEY,
    airport_code text NOT NULL UNIQUE CHECK (airport_code ~ '^[A-Z]{3}$'),
    airport_name text NOT NULL,
    city text NOT NULL
);

CREATE TABLE aircraft (
    aircraft_id integer PRIMARY KEY,
    aircraft_code text NOT NULL UNIQUE,
    model text NOT NULL,
    capacity integer NOT NULL CHECK (capacity > 0)
);

CREATE TABLE passengers (
    passenger_id integer PRIMARY KEY,
    full_name text NOT NULL
);

CREATE TABLE flights (
    flight_id integer PRIMARY KEY,
    flight_no text NOT NULL UNIQUE,
    departure_airport_id integer NOT NULL REFERENCES airports (airport_id),
    arrival_airport_id integer NOT NULL REFERENCES airports (airport_id),
    aircraft_id integer NOT NULL REFERENCES aircraft (aircraft_id),
    scheduled_departure timestamptz NOT NULL,
    scheduled_arrival timestamptz NOT NULL,
    actual_departure timestamptz,
    actual_arrival timestamptz,
    status text NOT NULL CHECK (status IN ('Scheduled', 'Completed', 'Delayed', 'Cancelled')),
    CHECK (departure_airport_id <> arrival_airport_id),
    CHECK (scheduled_arrival > scheduled_departure),
    CHECK (
        (actual_departure IS NULL AND actual_arrival IS NULL)
        OR
        (actual_departure IS NOT NULL AND actual_arrival IS NOT NULL AND actual_arrival > actual_departure)
    )
);

CREATE TABLE bookings (
    booking_id integer PRIMARY KEY,
    passenger_id integer NOT NULL REFERENCES passengers (passenger_id),
    flight_id integer NOT NULL REFERENCES flights (flight_id),
    booking_status text NOT NULL CHECK (booking_status IN ('Confirmed', 'Cancelled')),
    booked_at timestamptz NOT NULL,
    UNIQUE (flight_id, passenger_id)
);

CREATE TABLE boarding_passes (
    boarding_pass_id integer PRIMARY KEY,
    booking_id integer NOT NULL UNIQUE REFERENCES bookings (booking_id),
    checked_in_at timestamptz NOT NULL,
    boarded_at timestamptz,
    seat_no text,
    CHECK (boarded_at IS NULL OR boarded_at >= checked_in_at)
);

CREATE INDEX flights_route_idx
    ON flights (departure_airport_id, arrival_airport_id);
CREATE INDEX flights_scheduled_departure_idx
    ON flights (scheduled_departure);
CREATE INDEX bookings_flight_idx
    ON bookings (flight_id);

COMMIT;
