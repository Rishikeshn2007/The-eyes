"""
normalize.py - Pre-computes and stores L2-normalized embedding vectors in SQLite database.

Adds a single 'normalized' BLOB column to tables:
  - photos
  - faces
  - semantic

For each record, normalizes the embedding vector (||v|| = 1.0) so that cosine
similarity can be computed as a direct dot product (np.dot), drastically speeding
up search queries.
"""

import os
import sys
import argparse
import sqlite3
import numpy as np
from pathlib import Path


def get_default_db_path() -> Path:
    project_root = Path(__file__).resolve().parent
    return project_root / "processed" / "faces.db"


def add_column_if_not_exists(cur: sqlite3.Cursor, table_name: str, column_name: str, column_type: str = "BLOB"):
    """Adds a column to an existing SQLite table if it does not already exist."""
    cur.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cur.fetchall()]
    if column_name not in columns:
        print(f"  [*] Adding column '{column_name}' ({column_type}) to table '{table_name}'...")
        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        return True
    return False


def normalize_table(conn: sqlite3.Connection, table_name: str) -> dict:
    """
    Normalizes all embeddings in the specified table and stores them in
    the 'normalized' column.
    """
    cur = conn.cursor()
    
    # Check if table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    if not cur.fetchone():
        print(f"[-] Table '{table_name}' does not exist in database, skipping.")
        return {"table": table_name, "total": 0, "updated": 0, "skipped": 0}

    # Ensure single normalized column exists
    add_column_if_not_exists(cur, table_name, "normalized", "BLOB")
    conn.commit()

    # Fetch all records with embeddings
    cur.execute(f"SELECT id, embedding FROM {table_name}")
    rows = cur.fetchall()

    updated = 0
    skipped = 0

    update_batch = []
    for row_id, blob in rows:
        if not blob:
            skipped += 1
            continue

        try:
            vec = np.frombuffer(blob, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                normed_vec = (vec / norm).astype(np.float32)
            else:
                normed_vec = vec.astype(np.float32)

            normed_blob = normed_vec.tobytes()
            update_batch.append((normed_blob, row_id))
            updated += 1
        except Exception as e:
            print(f"  [!] Error processing record id={row_id} in '{table_name}': {e}")
            skipped += 1

    if update_batch:
        cur.executemany(
            f"UPDATE {table_name} SET normalized = ? WHERE id = ?",
            update_batch
        )
        conn.commit()

    return {
        "table": table_name,
        "total": len(rows),
        "updated": updated,
        "skipped": skipped,
    }


def verify_database(db_path: Path):
    """Verifies that all tables contain valid normalized vectors with unit norm (~1.0)."""
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    print("\n--- Verifying Normalized Embeddings ---")

    for tbl in ["photos", "faces", "semantic"]:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (tbl,))
        if not cur.fetchone():
            continue

        cur.execute(f"SELECT id, normalized FROM {tbl} LIMIT 5")
        rows = cur.fetchall()
        if not rows:
            print(f"  [i] Table '{tbl}': empty")
            continue

        norms = []
        for r_id, blob in rows:
            if blob:
                v = np.frombuffer(blob, dtype=np.float32)
                norms.append(float(np.linalg.norm(v)))

        avg_norm = sum(norms) / len(norms) if norms else 0.0
        print(f"  [+] Table '{tbl}': sample norm = {avg_norm:.6f} (expected: ~1.000000)")

    conn.close()


def run_normalization(db_path_str: str = None):
    """Executes the normalization migration on all database tables."""
    if db_path_str:
        db_path = Path(db_path_str).resolve()
    else:
        db_path = get_default_db_path()

    print(f"==================================================")
    print(f"  The-Eyes Embedding Normalization Migration")
    print(f"  Database target: {db_path}")
    print(f"==================================================")

    if not db_path.exists():
        print(f"[!] Error: Database file not found at: {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))

    tables = ["photos", "faces", "semantic"]
    stats = []

    for tbl in tables:
        print(f"\n[*] Processing table '{tbl}'...")
        res = normalize_table(conn, tbl)
        stats.append(res)
        print(f"  [✓] Table '{tbl}': {res['updated']}/{res['total']} records normalized.")

    conn.close()

    verify_database(db_path)

    print("\n==================================================")
    print("  Migration Summary:")
    for s in stats:
        print(f"   • {s['table']}: {s['updated']} normalized, {s['skipped']} skipped (total: {s['total']})")
    print("==================================================")
    print("Normalization completed successfully!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize existing database embeddings for high-speed dot-product search.")
    parser.add_argument("--db", type=str, default=None, help="Path to faces.db (defaults to processed/faces.db)")
    args = parser.parse_args()

    run_normalization(args.db)
