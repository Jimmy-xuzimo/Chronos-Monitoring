import datetime as dt
from zoneinfo import ZoneInfo
from scheduling import daily_slot,weekly_slot
from settings import update
from store import cleanup,db
import pytest

def test_daily_boundary():
    tz=ZoneInfo('Asia/Shanghai')
    assert daily_slot(dt.datetime(2026,10,28,7,29,tzinfo=tz)).day==27
    assert daily_slot(dt.datetime(2026,10,28,7,30,tzinfo=tz)).day==28

def test_weekly_boundary():
    tz=ZoneInfo('Asia/Shanghai')
    assert weekly_slot(dt.datetime(2026,10,26,3,59,tzinfo=tz)).day==19
    assert weekly_slot(dt.datetime(2026,10,26,4,0,tzinfo=tz)).day==26

def test_retention_validation():
    with pytest.raises(ValueError):update({'retention':{'raw_days':0}})
    result=update({'retention':{'raw_days':7,'history_days':30,'event_days':60,'news_days':14}})
    assert result['retention']['raw_days']==7

def test_news_archive_pruning():
    with db() as c:c.execute('INSERT OR REPLACE INTO news_editions VALUES(?,?,?)',('2020-01-01','{}',1))
    cleanup({'news_days':7})
    with db() as c:assert c.execute('SELECT day FROM news_editions WHERE day=?',('2020-01-01',)).fetchone() is None
