# Back up and rehearse recovery

Setru stores the application in PostgreSQL’s `public` schema. Run the backup from a trusted operator machine with access to the database and a separately recoverable storage location. The script uses Bash, PostgreSQL 17 client tools, age, and GNU coreutils. It never needs the private decryption key to create a backup.

## Provision once

1. Choose restricted offsite storage under the operator’s control. Document its owner, the person who can retrieve a copy if the database account is unavailable, its retention and deletion settings, and how the operator sees a missed backup. A mounted POSIX filesystem must support hard links. A synchronised directory needs independent confirmation that the upload finished. Once the operator has verified the intended remote volume, create an empty file called `.setru-backup-destination` in the archive directory. The script checks for it on every run so a missing mount fails closed. Keep the underlying unmounted directory unmarked.
2. On the recovery machine, run `age-keygen -o setru-recovery.identity` in a private directory. Protect the identity and keep a recoverable copy separately from both the archives and the backup runner. Export its public recipient with `age-keygen -y setru-recovery.identity > setru-recovery.recipient`. Give the backup runner just that public file, verifying the recipient directly with the operator.
3. Configure a named PostgreSQL service and protected password file on the runner. Use the approved production project, verified TLS for remote traffic and a read-only role that can dump all application rows, including tables with row-level security. An incomplete export must fail. Keep secrets out of arguments, logs, source and the archive destination.
4. Set the runner to back up at least daily while a real vacancy is active and immediately before each schema change. Require a verified, recent offsite copy before the first vacancy or schema change with participant data. Check the restricted retention schedule on rotation and preserve active legal holds. Shut new admissions if an active booking cannot be recovered to an acceptable point.

## Create and retrieve a copy

Run with the actual service, verified recipient file and an absolute path to a **new** file on the chosen destination.

```sh
scripts/database-recovery.sh backup setru_backup /secure/config/setru-recovery.recipient \
  "/mounted/offsite/setru-$(date -u +%Y%m%dT%H%M%SZ).age"
```

The archive is encrypted before it reaches disk. An unsuccessful dump or encryption leaves no final archive. Record the printed SHA-256 and backup time in a separately controlled recovery record. Retrieve the remote copy independently and compare its checksum. A locally saved file or a green scheduled job alone gives no evidence of offsite retrieval.

## Restore to isolation

Use a disposable PostgreSQL server of the matching major version with a loopback listener. Provision the approved role names that appear in schema grants on that isolated server before restoring. Keep the application, outbound email, scheduled jobs and real users disconnected. Supply the retrieved archive, the digest from the separate record, the recovery identity, the local port and the local PostgreSQL role.

```sh
scripts/database-recovery.sh restore /restricted/retrieved/setru-backup.age \
  "$EXPECTED_SHA256" /restricted/keys/setru-recovery.identity 55432 rehearsal_admin
```

The command takes a temporary private copy of the ciphertext, checks its digest and verifies authenticated decryption before creating a database. It then creates its own fresh database from `template0`; it accepts no target database name. It restores schema privileges and data, checks five baseline row-security settings plus the protected admission and vacancy tables present in that backup, the session-disable trigger, and core booking and support relations. An error leaves the printed rehearsal database isolated for investigation or disposal. Output contains no participant records. Record the source revision, archive and retrieval times, database version, completion time, checksum and test result. Verify the expected individual bookings and call outcomes with authorised limited evidence. Record the actual recovery point and recovery time.

Before any real recovery, reconcile changes since the backup. Reapply erasures, access restrictions, opt-outs, holds, contact expiry and session revocations. Review outstanding notices against current bookings to prevent stale or duplicate mail. Reconcile role ownership, grants, extensions, storage outside `public` and application secrets separately. The script ends at rehearsal. Production cutover is a separate operator action.

Rehearse before real hiring, after material changes to the database or backup process, and on loss or rotation of the recovery key. Keep the old key for retained archives until they expire or have been re-encrypted and verified. Supabase documents free-plan backup options in its [database backup guide](https://supabase.com/docs/guides/platform/backups).
