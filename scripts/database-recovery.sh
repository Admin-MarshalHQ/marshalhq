#!/usr/bin/env bash
# Encrypted backup and isolated restore of Setru's PostgreSQL public schema.
set -euo pipefail
umask 077
export LC_ALL=C

fail() { printf '%s\n' "$1" >&2; exit 1; }

backup() {
  [[ $# = 3 ]] || fail 'Usage: database-recovery.sh backup SERVICE RECIPIENT_FILE ARCHIVE.age'
  local service=$1 recipient_file=$2 archive=$3 directory repo recipient partial digest
  [[ $service =~ ^[A-Za-z0-9_-]+$ ]] || fail 'Use a named libpq service.'
  [[ -r $recipient_file && $archive = /*.age && ! -e $archive && ! -L $archive ]] ||
    fail 'Supply a public recipient file and a new absolute archive path ending in .age.'
  IFS= read -r recipient < "$recipient_file" || [[ -n $recipient ]] || fail 'Empty recipient.'
  [[ $recipient =~ ^age1[0-9a-z]{58}$ ]] || fail 'Supply a native age X25519 public recipient.'
  directory=$(cd -- "$(dirname -- "$archive")" && pwd -P)
  repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
  [[ $directory != "$repo" && $directory != "$repo/"* ]] || fail 'Choose a destination outside the repository.'
  [[ -f "$directory/.setru-backup-destination" ]] ||
    fail 'Approved destination marker missing. Check that the intended volume is mounted.'
  partial=$(mktemp "$directory/.setru-encrypted.XXXXXXXX")
  # Expand the local path before the function returns, including when a command fails.
  trap 'rm -f -- "$partial"' EXIT
  if ! pg_dump --no-password --dbname="service=$service" --schema=public --format=custom 2>/dev/null |
       age --encrypt --recipient "$recipient" >"$partial" 2>/dev/null; then
    fail 'Backup failed. No final archive was published. Check the service, recipient and destination.'
  fi
  digest=$(sha256sum <"$partial")
  # Same-directory hard link both publishes atomically and refuses an existing destination.
  ln -- "$partial" "$archive" || fail 'Could not publish without overwriting. Check the destination filesystem.'
  rm -f -- "$partial"
  trap - EXIT
  printf 'Encrypted archive saved. Record this SHA-256 separately: %s\n' "${digest%% *}"
}

restore() {
  [[ $# = 5 ]] || fail 'Usage: database-recovery.sh restore ARCHIVE.age EXPECTED_SHA256 IDENTITY_FILE LOCAL_PORT LOCAL_ROLE'
  local archive=$1 expected=$2 identity=$3 port=$4 role=$5 digest database result snapshot
  [[ -f $archive && -r $identity && $expected =~ ^[a-f0-9]{64}$ ]] ||
    fail 'A readable archive, recovery identity and independently recorded SHA-256 are required.'
  [[ $port =~ ^[1-9][0-9]{0,4}$ && $port -le 65535 && -n $role ]] ||
    fail 'Supply the port and role of the isolated local PostgreSQL server.'
  # Verify and restore the same private ciphertext, even if a synced input path changes mid-run.
  snapshot=$(mktemp "${TMPDIR:-/tmp}/setru-restore.XXXXXXXX")
  trap 'rm -f -- "$snapshot"' EXIT
  cat -- "$archive" > "$snapshot"
  digest=$(sha256sum <"$snapshot")
  [[ ${digest%% *} = "$expected" ]] || fail 'Archive checksum mismatch.'
  age --decrypt --identity "$identity" "$snapshot" >/dev/null 2>&1 ||
    fail 'Archive authentication failed. No database was created.'
  unset PGSERVICE PGHOSTADDR PGDATABASE PGOPTIONS PGTARGETSESSIONATTRS
  export PGHOST=127.0.0.1 PGPORT="$port" PGUSER="$role"

  # No input names a database to overwrite. Creation from template0 must succeed first.
  database="setru_rehearsal_$(date -u +%Y%m%d%H%M%S)_$$_$RANDOM"
  createdb --no-password --maintenance-db=postgres --template=template0 "$database" 2>/dev/null ||
    fail 'Could not create a fresh rehearsal database. Existing databases are untouched.'
  printf 'Isolated rehearsal database: %s\n' "$database"
  if ! age --decrypt --identity "$identity" "$snapshot" 2>/dev/null |
       pg_restore --no-password --dbname="$database" --clean --if-exists --single-transaction \
         --exit-on-error --no-owner 2>/dev/null; then
    fail 'Restore failed. Quarantine or discard the printed rehearsal database. No cutover is performed.'
  fi
  # pg_dump includes the custom revocation trigger and RLS from tracked SQL, beyond the Prisma schema.
  result=$(psql -X -qAt --no-password --set=ON_ERROR_STOP=1 --dbname="$database" 2>/dev/null <<'SQL'
SELECT
  (SELECT count(*) = 5 FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relrowsecurity AND c.relname IN
   ('AttendanceChange','FounderLoginPasscode','FounderSession','MailDelivery','RequestBudget'))
  AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public' AND c.relname IN ('PilotJoinCode','PilotAgreement','VacancyRelease') AND NOT c.relrowsecurity)
  AND EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
              WHERE tgrelid='public."User"'::regclass AND tgname='setru_disable_sessions'
              AND tgenabled IN ('O','A') AND NOT tgisinternal)
  AND to_regclass('public."Application"') IS NOT NULL
  AND to_regclass('public."Shift"') IS NOT NULL
  AND to_regclass('public."SupportRequest"') IS NOT NULL;
SQL
  ) || fail 'Could not inspect recovery controls. Keep the database isolated.'
  [[ $result = t ]] || fail 'Expected recovery controls are missing. Keep the database isolated.'
  rm -f -- "$snapshot"
  trap - EXIT
  printf '%s\n' 'Restore and structural checks passed. Keep mail and application traffic disconnected.'
}

case "${1:-}" in
  backup) shift; backup "$@" ;;
  restore) shift; restore "$@" ;;
  *) fail 'Choose backup or restore. See docs/database-recovery.md.' ;;
esac
