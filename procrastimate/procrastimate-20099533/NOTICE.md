# About this application

Procrastimate was written for this module. The code is original and is not derived
from any other project. It is a teaching application: please do not deploy it as
real software.

All names, bookings, guides and supplier details in the application are
fictional.

## Libraries

Procrastimate installs these packages from the public npm registry, through the
lockfile in this folder.

| Package | Licence | Used for |
|---|---|---|
| `express` | MIT | HTTP routing and views |
| `ejs` | Apache-2.0 | Page templates |
| `express-session` | MIT | Signed-in session handling |
| `better-sqlite3` | MIT | SQLite database access |
| `supertest` | MIT | Functional tests only (development dependency) |

`better-sqlite3` loads its prebuilt library from the package itself. No compiler
is needed to install Procrastimate.

The licence text for each package is included in its folder under
`node_modules/` after installation. None of these libraries is modified.
