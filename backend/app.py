from pathlib import Path
import os
import sys


PROJECT_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = PROJECT_ROOT / ".venv" / "bin" / "python"


def use_project_environment() -> None:
    if sys.prefix != sys.base_prefix:
        return

    if not VENV_PYTHON.exists():
        raise SystemExit(
            "Project dependencies are not installed. "
            "Create .venv and install backend/requirements.txt from the project root."
        )

    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), str(Path(__file__).resolve())])


use_project_environment()

import uvicorn  # noqa: E402

from main import app  # noqa: E402


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
