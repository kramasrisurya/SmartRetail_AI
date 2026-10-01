import os
from pathlib import Path

def patch_for_sqlite():
    backend_dir = Path("c:/Projects/AI_CC/apps/backend")
    
    # 1. Patch enums.py
    enums_path = backend_dir / "app" / "models" / "enums.py"
    content = enums_path.read_text(encoding="utf-8")
    content = content.replace("native_enum=True", "native_enum=False")
    enums_path.write_text(content, encoding="utf-8")
    
    # 2. Patch JSONB in all models
    models_dir = backend_dir / "app" / "models"
    for file in models_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        if "sqlalchemy.dialects.postgresql" in content and "JSONB" in content:
            content = content.replace(
                "from sqlalchemy.dialects.postgresql import JSONB", 
                "from sqlalchemy.types import JSON as JSONB"
            )
            file.write_text(content, encoding="utf-8")
            
    # 3. Patch Alembic migrations
    migrations_dir = backend_dir / ".." / "database" / "migrations" / "versions"
    for file in migrations_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        # Replace postgres JSONB with standard JSON in migrations
        content = content.replace("postgresql.JSONB", "sa.JSON")
        file.write_text(content, encoding="utf-8")

if __name__ == "__main__":
    patch_for_sqlite()
    print("Codebase patched for SQLite compatibility.")
