SET client_encoding = 'UTF8';
SET TIME ZONE 'Europe/Moscow';

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM airports)
       OR EXISTS (SELECT 1 FROM aircraft)
       OR EXISTS (SELECT 1 FROM flights)
       OR EXISTS (SELECT 1 FROM passengers)
       OR EXISTS (SELECT 1 FROM bookings)
       OR EXISTS (SELECT 1 FROM boarding_passes) THEN
        RAISE EXCEPTION 'flight_ops_lab is not empty; run reset.sql before seed.sql';
    END IF;
END
$$;

INSERT INTO airports (airport_id, airport_code, airport_name, city) VALUES
    (1, 'SVO', 'Sheremetyevo', 'Moscow'),
    (2, 'DME', 'Domodedovo', 'Moscow'),
    (3, 'VKO', 'Vnukovo', 'Moscow'),
    (4, 'ZIA', 'Zhukovsky', 'Moscow'),
    (5, 'LED', 'Pulkovo', 'Saint Petersburg'),
    (6, 'IST', 'Istanbul Airport', 'Istanbul'),
    (7, 'ALA', 'Almaty International Airport', 'Almaty'),
    (8, 'DXB', 'Dubai International Airport', 'Dubai');

INSERT INTO aircraft (aircraft_id, aircraft_code, model, capacity) VALUES
    (1, 'E78', 'Embraer 170', 78),
    (2, 'S10', 'Sukhoi Superjet 100', 100),
    (3, 'A15', 'Airbus A319', 150),
    (4, 'B18', 'Boeing 737-800', 180),
    (5, 'A22', 'Airbus A321', 220);

WITH flight_seed (
    flight_id,
    flight_no,
    departure_airport_id,
    arrival_airport_id,
    aircraft_id,
    scheduled_departure,
    status,
    planned_duration_minutes,
    departure_delay_minutes,
    arrival_delay_minutes
) AS (
    VALUES
        (101, 'FO101', 1, 5, 3, TIMESTAMPTZ '2026-03-01 08:00:00+03', 'Completed', 90, 0, 5),
        (102, 'FO102', 1, 5, 4, TIMESTAMPTZ '2026-03-02 08:00:00+03', 'Delayed', 90, 30, 40),
        (103, 'FO103', 1, 5, 3, TIMESTAMPTZ '2026-03-03 08:00:00+03', 'Completed', 90, 10, 5),
        (104, 'FO104', 1, 5, 4, TIMESTAMPTZ '2026-03-04 08:00:00+03', 'Cancelled', 90, 0, 0),
        (105, 'FO105', 1, 5, 3, TIMESTAMPTZ '2026-03-05 08:00:00+03', 'Delayed', 90, 45, 55),
        (106, 'FO106', 1, 5, 4, TIMESTAMPTZ '2026-03-06 08:00:00+03', 'Scheduled', 90, 0, 0),
        (107, 'FO107', 2, 6, 2, TIMESTAMPTZ '2026-03-01 10:00:00+03', 'Completed', 255, 5, 0),
        (108, 'FO108', 2, 6, 3, TIMESTAMPTZ '2026-03-02 10:00:00+03', 'Completed', 255, 0, 0),
        (109, 'FO109', 2, 6, 2, TIMESTAMPTZ '2026-03-04 10:00:00+03', 'Delayed', 255, 20, 30),
        (110, 'FO110', 2, 6, 3, TIMESTAMPTZ '2026-03-06 10:00:00+03', 'Cancelled', 255, 0, 0),
        (111, 'FO111', 2, 6, 3, TIMESTAMPTZ '2026-03-08 10:00:00+03', 'Completed', 255, 10, 15),
        (112, 'FO112', 3, 7, 1, TIMESTAMPTZ '2026-03-02 12:00:00+03', 'Delayed', 260, 60, 70),
        (113, 'FO113', 3, 7, 2, TIMESTAMPTZ '2026-03-04 12:00:00+03', 'Delayed', 260, 90, 105),
        (114, 'FO114', 3, 7, 1, TIMESTAMPTZ '2026-03-05 12:00:00+03', 'Cancelled', 260, 0, 0),
        (115, 'FO115', 3, 7, 2, TIMESTAMPTZ '2026-03-07 12:00:00+03', 'Delayed', 260, 30, 40),
        (116, 'FO116', 4, 8, 5, TIMESTAMPTZ '2026-03-03 14:00:00+03', 'Completed', 330, 0, -5),
        (117, 'FO117', 4, 8, 5, TIMESTAMPTZ '2026-03-06 14:00:00+03', 'Scheduled', 330, 0, 0),
        (118, 'FO118', 4, 8, 5, TIMESTAMPTZ '2026-03-09 14:00:00+03', 'Cancelled', 330, 0, 0),
        (119, 'FO119', 5, 1, 3, TIMESTAMPTZ '2026-03-03 16:00:00+03', 'Completed', 90, 5, 0),
        (120, 'FO120', 5, 1, 3, TIMESTAMPTZ '2026-03-05 16:00:00+03', 'Delayed', 90, 25, 35),
        (121, 'FO121', 5, 1, 4, TIMESTAMPTZ '2026-03-08 16:00:00+03', 'Completed', 90, 0, 5),
        (122, 'FO122', 6, 2, 2, TIMESTAMPTZ '2026-03-02 09:00:00+03', 'Completed', 255, 0, -5),
        (123, 'FO123', 6, 2, 2, TIMESTAMPTZ '2026-03-06 09:00:00+03', 'Completed', 255, 10, 10),
        (124, 'FO124', 6, 2, 3, TIMESTAMPTZ '2026-03-10 09:00:00+03', 'Delayed', 255, 20, 25),
        (125, 'FO125', 7, 3, 4, TIMESTAMPTZ '2026-03-04 11:00:00+03', 'Completed', 260, 0, 0),
        (126, 'FO126', 7, 3, 4, TIMESTAMPTZ '2026-03-09 11:00:00+03', 'Cancelled', 260, 0, 0),
        (127, 'FO127', 8, 4, 5, TIMESTAMPTZ '2026-03-05 13:00:00+03', 'Delayed', 330, 50, 60),
        (128, 'FO128', 8, 4, 5, TIMESTAMPTZ '2026-03-10 13:00:00+03', 'Completed', 330, 5, 10),
        (129, 'FO129', 1, 6, 3, TIMESTAMPTZ '2026-03-07 15:00:00+03', 'Completed', 255, 0, 0),
        (130, 'FO130', 2, 7, 4, TIMESTAMPTZ '2026-03-07 17:00:00+03', 'Delayed', 260, 40, 55)
)
INSERT INTO flights (
    flight_id,
    flight_no,
    departure_airport_id,
    arrival_airport_id,
    aircraft_id,
    scheduled_departure,
    scheduled_arrival,
    actual_departure,
    actual_arrival,
    status
)
SELECT
    flight_id,
    flight_no,
    departure_airport_id,
    arrival_airport_id,
    aircraft_id,
    scheduled_departure,
    scheduled_departure + make_interval(mins => planned_duration_minutes),
    CASE
        WHEN status IN ('Completed', 'Delayed')
            THEN scheduled_departure + make_interval(mins => departure_delay_minutes)
    END,
    CASE
        WHEN status IN ('Completed', 'Delayed')
            THEN scheduled_departure + make_interval(mins => planned_duration_minutes + arrival_delay_minutes)
    END,
    status
FROM flight_seed;

CREATE TEMP TABLE seed_booking_plan (
    flight_id integer PRIMARY KEY,
    confirmed_count integer NOT NULL,
    cancelled_count integer NOT NULL,
    checked_in_count integer NOT NULL,
    boarded_count integer NOT NULL
) ON COMMIT DROP;

WITH boarded_plan (flight_id, boarded_count) AS (
    VALUES
        (101, 120), (102, 126), (103, 75), (104, 0), (105, 60),
        (106, 0), (107, 85), (108, 120), (109, 70), (110, 0),
        (111, 105), (112, 30), (113, 35), (114, 0), (115, 40),
        (116, 100), (117, 0), (118, 0), (119, 120), (120, 105),
        (121, 135), (122, 80), (123, 70), (124, 90), (125, 126),
        (126, 0), (127, 110), (128, 154), (129, 105), (130, 72)
), confirmed_plan AS (
    SELECT
        f.flight_id,
        f.status,
        p.boarded_count,
        CASE
            WHEN f.status = 'Cancelled' THEN 20
            WHEN f.status = 'Scheduled' THEN 25
            ELSE LEAST(a.capacity, p.boarded_count + 15)
        END AS confirmed_count
    FROM boarded_plan p
    JOIN flights f USING (flight_id)
    JOIN aircraft a USING (aircraft_id)
)
INSERT INTO seed_booking_plan (
    flight_id,
    confirmed_count,
    cancelled_count,
    checked_in_count,
    boarded_count
)
SELECT
    flight_id,
    confirmed_count,
    2,
    CASE
        WHEN status IN ('Completed', 'Delayed')
            THEN LEAST(confirmed_count, boarded_count + 5)
        ELSE 0
    END,
    boarded_count
FROM confirmed_plan;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM seed_booking_plan
        WHERE boarded_count > checked_in_count
           OR checked_in_count > confirmed_count
    ) THEN
        RAISE EXCEPTION 'invalid synthetic booking plan';
    END IF;
END
$$;

INSERT INTO passengers (passenger_id, full_name)
SELECT
    p.flight_id * 1000 + s.sequence_no,
    format('Synthetic passenger %s-%s', p.flight_id, lpad(s.sequence_no::text, 3, '0'))
FROM seed_booking_plan p
CROSS JOIN LATERAL generate_series(1, p.confirmed_count + p.cancelled_count) AS s(sequence_no)
UNION ALL
SELECT 999999, 'Synthetic passenger without booking';

INSERT INTO bookings (booking_id, passenger_id, flight_id, booking_status, booked_at)
SELECT
    p.flight_id * 1000 + s.sequence_no,
    p.flight_id * 1000 + s.sequence_no,
    p.flight_id,
    CASE WHEN s.sequence_no <= p.confirmed_count THEN 'Confirmed' ELSE 'Cancelled' END,
    f.scheduled_departure - INTERVAL '14 days' + make_interval(mins => s.sequence_no)
FROM seed_booking_plan p
JOIN flights f USING (flight_id)
CROSS JOIN LATERAL generate_series(1, p.confirmed_count + p.cancelled_count) AS s(sequence_no);

INSERT INTO boarding_passes (boarding_pass_id, booking_id, checked_in_at, boarded_at, seat_no)
SELECT
    p.flight_id * 1000 + s.sequence_no,
    p.flight_id * 1000 + s.sequence_no,
    f.actual_departure - INTERVAL '90 minutes',
    CASE
        WHEN s.sequence_no <= p.boarded_count THEN f.actual_departure - INTERVAL '20 minutes'
    END,
    format('%s%s', ((s.sequence_no - 1) / 6) + 1, chr(65 + ((s.sequence_no - 1) % 6)))
FROM seed_booking_plan p
JOIN flights f USING (flight_id)
CROSS JOIN LATERAL generate_series(1, p.checked_in_count) AS s(sequence_no);

ANALYZE airports;
ANALYZE aircraft;
ANALYZE flights;
ANALYZE passengers;
ANALYZE bookings;
ANALYZE boarding_passes;

COMMIT;
