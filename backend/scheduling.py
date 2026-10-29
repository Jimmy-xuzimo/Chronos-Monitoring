import datetime as dt
from zoneinfo import ZoneInfo
TZ=ZoneInfo('Asia/Shanghai')
def daily_slot(now=None):
    now=now or dt.datetime.now(TZ)
    today=now.replace(hour=7,minute=30,second=0,microsecond=0)
    return today if now>=today else today-dt.timedelta(days=1)
def weekly_slot(now=None):
    now=now or dt.datetime.now(TZ)
    monday=(now-dt.timedelta(days=now.weekday())).replace(hour=4,minute=0,second=0,microsecond=0)
    return monday if now>=monday else monday-dt.timedelta(days=7)
