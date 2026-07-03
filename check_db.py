import sqlite3, os
db = sqlite3.connect("integrity.db")
db.row_factory = sqlite3.Row
rows = db.execute("SELECT file_path, current_hash, tier FROM baselines WHERE file_path LIKE '%IG_Monitor%' LIMIT 10").fetchall()
print("IG_Monitor in baselines:", len(rows))
for r in rows:
    print(" ", dict(r))
rows2 = db.execute("SELECT file_path, current_hash, tier FROM baselines LIMIT 5").fetchall()
print("First 5 baselines rows:")
for r in rows2:
    print(" ", dict(r))
