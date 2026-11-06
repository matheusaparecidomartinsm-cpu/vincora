#!/usr/bin/env bash
# Roda migrations + testes de RLS num Postgres LOCAL descartável (não no Supabase).
# Uso: PGHOST=/tmp PGPORT=5499 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists facas_test" -c "create database facas_test" >/dev/null
P="$P -d facas_test"
$P -f tests/00_supabase_shim.sql >/dev/null
for f in migrations/*.sql; do $P -f "$f" >/dev/null; done
$P -f tests/01_rls.sql 2>&1 | grep -E "NOTICE|ERROR|RLS OK" | sed 's/^.*NOTICE:  //'
