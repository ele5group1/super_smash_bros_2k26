"""Never run backend tests against the classroom gameplay database."""
import os
import tempfile
from pathlib import Path

_database_dir = tempfile.TemporaryDirectory(prefix='battle-tests-')
_previous = os.environ.get('BATTLE_SIM_DB')
os.environ['BATTLE_SIM_DB'] = str(Path(_database_dir.name) / 'test.sqlite')


def pytest_sessionfinish(session, exitstatus):
    _database_dir.cleanup()
    if _previous is None:
        os.environ.pop('BATTLE_SIM_DB', None)
    else:
        os.environ['BATTLE_SIM_DB'] = _previous
