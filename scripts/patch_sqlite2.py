import os
from pathlib import Path

def patch_for_sqlite():
    backend_dir = Path("c:/Projects/AI_CC/apps/backend")
    
    # Patch migrations
    migrations_dir = backend_dir / ".." / "database" / "migrations" / "versions"
    for file in migrations_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        
        # Replace postgres JSONB with standard JSON
        content = content.replace("postgresql.JSONB", "sa.JSON")
        
        # Replace ::jsonb with nothing
        content = content.replace("::jsonb", "")
        
        # Replace (now()) with CURRENT_TIMESTAMP
        content = content.replace("server_default=sa.text('(now())')", "server_default=sa.text('CURRENT_TIMESTAMP')")
        content = content.replace("server_default=sa.text('now()')", "server_default=sa.text('CURRENT_TIMESTAMP')")
        
        file.write_text(content, encoding="utf-8")
        
    # Patch models to remove ::jsonb
    models_dir = backend_dir / "app" / "models"
    for file in models_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        content = content.replace("::jsonb", "")
        file.write_text(content, encoding="utf-8")

if __name__ == "__main__":
    patch_for_sqlite()
    print("Codebase patched for SQLite compatibility.")
