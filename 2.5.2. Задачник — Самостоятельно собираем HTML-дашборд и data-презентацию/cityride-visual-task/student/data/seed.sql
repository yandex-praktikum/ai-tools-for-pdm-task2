CREATE TABLE subscription_funnel (stage TEXT PRIMARY KEY, riders INTEGER NOT NULL, stage_order INTEGER NOT NULL);
INSERT INTO subscription_funnel VALUES ('Eligible riders', 3120, 1), ('RidePass trials', 780, 2), ('Paid RidePass', 500, 3);

CREATE TABLE weekly_rides (week_start TEXT PRIMARY KEY, ridepass_rides INTEGER NOT NULL, standard_rides INTEGER NOT NULL);
INSERT INTO weekly_rides VALUES
  ('2026-04-06', 8420, 16840),
  ('2026-04-13', 8860, 16620),
  ('2026-04-20', 9310, 16490),
  ('2026-04-27', 9780, 16310);

CREATE TABLE district_performance (district TEXT PRIMARY KEY, active_ridepass_members INTEGER NOT NULL, paid_conversion_pct REAL NOT NULL, weekly_rides_per_member REAL NOT NULL, district_order INTEGER NOT NULL);
INSERT INTO district_performance VALUES
  ('Central', 214, 67.8, 4.8, 1),
  ('Riverside', 168, 64.3, 4.5, 2),
  ('Northside', 118, 55.6, 3.9, 3);

CREATE TABLE district_operations (district TEXT PRIMARY KEY, cancellation_rate_pct REAL NOT NULL, incidents_per_1000 REAL NOT NULL, completed_trips INTEGER NOT NULL, district_order INTEGER NOT NULL);
INSERT INTO district_operations VALUES
  ('Central', 4.9, 1.6, 8940, 1),
  ('Riverside', 4.7, 1.8, 7120, 2),
  ('Northside', 7.8, 2.4, 4930, 3);
