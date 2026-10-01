import os
import re
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
        
        # Replace postgres JSONB with standard JSON
        content = re.sub(r'postgresql\.JSONB(?:\(astext_type=sa\.Text\(\)\))?', 'sa.JSON', content)
        
        # Remove ::jsonb casts
        content = content.replace("::jsonb", "")
        
        # Replace now() in text()
        content = re.sub(r"text\('(\(now\(\)\)|now\(\))'\)", "text('CURRENT_TIMESTAMP')", content)
        
        file.write_text(content, encoding="utf-8")
        
    # Patch models to remove ::jsonb and fix now()
    models_dir = backend_dir / "app" / "models"
    for file in models_dir.glob("*.py"):
        content = file.read_text(encoding="utf-8")
        content = content.replace("::jsonb", "")
        content = re.sub(r"text\('(\(now\(\)\)|now\(\))'\)", "text('CURRENT_TIMESTAMP')", content)
        file.write_text(content, encoding="utf-8")

if __name__ == "__main__":
    reset_db_and_patch()
    print("Codebase patched for SQLite compatibility.")
