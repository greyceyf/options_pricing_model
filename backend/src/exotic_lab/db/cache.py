import duckdb
import json
import hashlib

class SimulationCache:
    def __init__(self, db_path = "simulations.duckdb"):
        self.conn = duckdb.connect(db_path)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                hash TEXT PRIMARY KEY,
                params TEXT,
                result JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP                        
            )           
        """)
    
    def _hash_params(self, params: dict) -> str:
        #sorts keys to ensure consistent hasing
        s = json.dumps(params, sort_keys = True)
        return hashlib.sha256(s.encode()).hexdigest()
    
    def get(self, params: dict):
        h = self._hash_params(params)
        res = self.conn.execute(
            "SELECT result FROM cache WHERE hash = ?", [h]
        ).fetchone()
        return json.loads(res[0]) if res else None
    
    def set(self, params: dict, result: dict):
        h = self._hash_params(params)

        #duckdb upsert
        self.conn.execute(
            "INSERT OR REPLACE INTO cache (hash, params, result) VALUES (?, ?, ?)",
            [h, json.dumps(params), json.dumps(result)]
        )