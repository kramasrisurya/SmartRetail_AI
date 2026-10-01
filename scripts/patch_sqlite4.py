import os
from pathlib import Path

def reset_db_and_patch():
    db_path = Path("c:/Projects/AI_CC/smartretail.db")
    if db_path.exists():
        try:
            db_path.unlink()
            print("Deleted old smartretail.db")
        except Exception as e:
            print(f"Failed to delete db: {e}")

    backend_dir = Path("c:/Projects/AI_CC/apps/backend")
    
    # Patch migrations
    migrations_dir = backend_dir / ".." / "database" / "migrations" / "versions"
    for file in migrations_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        
        content = content.replace("postgresql.JSONB", "sa.JSON")
        content = content.replace("postgresql.JSONB(astext_type=sa.Text())", "sa.JSON")
        content = content.replace("::jsonb", "")
        
        content = content.replace("sa.text('now()')", "sa.text('CURRENT_TIMESTAMP')")
        content = content.replace('sa.text("now()")', "sa.text('CURRENT_TIMESTAMP')")
        content = content.replace("sa.text('(now())')", "sa.text('CURRENT_TIMESTAMP')")
        content = content.replace('sa.text("(now())")', "sa.text('CURRENT_TIMESTAMP')")
        
        file.write_text(content, encoding="utf-8")
        
    # Patch models
    models_dir = backend_dir / "app" / "models"
    for file in models_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        content = content.replace("::jsonb", "")
        content = content.replace("text('now()')", "text('CURRENT_TIMESTAMP')")
        content = content.replace('text("now()")', "text('CURRENT_TIMESTAMP')")
        content = content.replace("text('(now())')", "text('CURRENT_TIMESTAMP')")
        content = content.replace('text("(now())")', "text('CURRENT_TIMESTAMP')")
        file.write_text(content, encoding="utf-8")

if __name__ == "__main__":
    reset_db_and_patch()
    print("Codebase patched for SQLite compatibility.")
