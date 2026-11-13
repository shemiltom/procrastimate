CREATE TABLE users (
  id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('requester', 'coordinator'))
);

CREATE TABLE stock (
  sku TEXT PRIMARY KEY, title TEXT NOT NULL,
  available INTEGER NOT NULL CHECK(available >= 0),
  daily_cents INTEGER NOT NULL CHECK(daily_cents >= 0)
);

CREATE TABLE reservations (
  id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id),
  sku TEXT NOT NULL REFERENCES stock(sku), start_date TEXT NOT NULL,
  end_date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('booked','cancelled')),
  delivery_note TEXT NOT NULL
);

CREATE TABLE settlements (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, access_code TEXT NOT NULL,
  payload TEXT NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id)
);
