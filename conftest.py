import sys
from pathlib import Path

# Add backend/ to sys.path so that `from users.models import User` etc. resolve
# when pytest runs from the project root.
_backend_dir = str(Path(__file__).resolve().parent / 'backend')
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
