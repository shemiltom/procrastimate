# Procrastimate

Procrastimate is the equipment booking and dispatch workspace for a small audiovisual
store. Requesters look up shared equipment, estimate hire costs, make bookings
and download collection guides. Coordinators see every booking and publish
shared settlement exports.

## Run it only on your own machine

Procrastimate contains real security weaknesses, and you will be testing it for them.
They are real rather than simulated. While it runs, Procrastimate can run real
commands on your computer, as you, with the same permissions as your own
account. So:

- Run it only on your own computer. Never run it on a shared, lab or work
  machine.
- Run it from a disposable folder, with no personal files, keys or saved
  passwords in that folder.
- Procrastimate accepts connections only from this computer (`127.0.0.1`). Other
  machines cannot reach it. Do not change that.
- Stop it when you are not working on it: press Ctrl and C in its terminal.

Every starting record is fictional. Use only fictional data. Installation
downloads npm packages, and links opened in your browser may lead outside the
local application.

## Before you start

You need **Node.js 22** (22.12 or later) or **Node.js 24**. Check what you have:

```
node --version
```

If the command is not found, or the number does not start with 22 or 24, install
Node 24 from <https://nodejs.org> and open a new terminal window afterwards. On
Node 22 the version must be 22.12 or later; `npm run doctor` checks this for you.

On Windows, use **PowerShell** or **Command Prompt**. Both work.

## Setting it up

Run these commands, in this order, from inside the Procrastimate folder (the
one that contains `package.json`).

```
npm ci
npm start
```

`npm start` prints the address to open, for example
`Procrastimate is running at http://127.0.0.1:9091`. Open that address in your
browser.

The first start creates the database and the guide files for you. There is no
separate setup step. A prebuilt SQLite package is expected for supported
systems; a clean installation without a compiler still needs checking on your
platform.

Two more commands are available:

| Command | What it does |
|---|---|
| `npm run doctor` | Checks your setup: Node version, the SQLite library, the data folder and the port. |
| `npm run reset` | Rebuilds the starting data. Run it while the application is stopped, not while it is running. |
| `npm test` | Checks that the application still behaves the way it should. |

## Choosing the port

Procrastimate listens on port 9091. To use a different port, create a file
named `.env` in the Procrastimate folder containing one line, `PORT=` and the
number. Create it once, before you start Procrastimate, with the command for
your system (this example uses port 14321):

```
echo "PORT=14321" > .env               (macOS and Linux)
Set-Content .env "PORT=14321"          (Windows PowerShell)
echo PORT=14321> .env                  (Windows Command Prompt)
```

Then run `npm run doctor`. Its port line names the port it found, for example
`ok   Port 14321 (from .env)`. Every `npm start` after that uses the same port.
To go back to 9091, delete `.env`.

## Signing in

Three accounts exist. They are not real people.

| Username | Password | Role |
|---|---|---|
| `maya` | `Harbour27!Maya` | requester |
| `noah` | `Harbour27!Noah` | requester |
| `ruth` | `Harbour27!Ruth` | coordinator |

Ten failed sign-in attempts for an account within fifteen minutes temporarily
hold further sign-ins for that account. The page shows the remaining wait and
sends a `Retry-After` header. You can wait for the window to expire. On a local
copy, you can also stop and restart Procrastimate to clear this process-only limit;
this signs everybody out. A data reset is not needed for a sign-in limit.

## The ordinary workflow

1. Sign in.
2. Open **Stock**, look up an item code such as `AV-104`, and use the cost
   estimate form to price a hire.
3. Open **Reservations**, create a booking with dates and a delivery note, then
   open the booking to see its packing links, download the collection packing
   sheet, or cancel it.
4. Read the shared **Guides** before collecting equipment.
5. A coordinator can publish a settlement export on the **Settlements** page.
   Each export has a reference and an access code; anyone signed in who has both
   can download that export. Requesters see only references and titles.

## Starting again

Testing can change bookings. Use the reset command when you need the original
data again. Stop the application before resetting it.

To put the data back to its starting state:

```
npm run reset
```

This rebuilds **the data only**. It never touches files you have edited, and
your own changes to the code are safe.

## If something goes wrong

**`npm ci` fails.** Check your Node version is 22.12 or later, or 24. If you are on a university or
office network it may be blocking the download; try a different network.

**The port is already in use.** Something else on your machine is using it.
Close it, or choose a different port as described in *Choosing the port*.

**Procrastimate starts on 9091 when you set another port.** Check that `.env`
is in the same folder as `package.json` and that its name has no hidden `.txt`
ending. `npm run doctor` says which port it found and where it came from.

**The page will not load.** Make sure `npm start` is still running in your
terminal. It has to stay open while you use Procrastimate.

**The data looks damaged.** `npm run reset` rebuilds the database file.

**Something looks broken and you do not know why.** Run `npm run doctor`. It
checks your setup and says what is wrong.

## Noticing the detail

Procrastimate is teaching software. It is written to be read: the routes are in
`src/routes/`, the templates in `views/`, the tests in `tests/`, and the
database schema in `src/db/schema.sql`. Please do not deploy it as real
software.

See `NOTICE.md` for the libraries it uses.
