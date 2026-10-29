import datetime as dt
import re
from zoneinfo import ZoneInfo
import icalendar
import recurring_ical_events

def parse_calendar(body,source,tzname,start=None,end=None):
    tz=ZoneInfo(tzname)
    now=dt.datetime.now(tz)
    start=start or now-dt.timedelta(days=190)
    end=end or now+dt.timedelta(days=400)
    cal=icalendar.Calendar.from_ical(body)
    events=[]; seen=set()
    for event in recurring_ical_events.of(cal).between(start,end):
        if str(event.get('STATUS','')).upper()=='CANCELLED':continue
        raw=event.decoded('DTSTART'); finish=event.decoded('DTEND',None)
        all_day=not isinstance(raw,dt.datetime)
        if finish is None:finish=raw+(event.decoded('DURATION',None) or dt.timedelta(days=1 if all_day else 0))
        def aware(value):
            if isinstance(value,dt.datetime):return (value if value.tzinfo else value.replace(tzinfo=tz)).astimezone(tz)
            return dt.datetime.combine(value,dt.time(),tz)
        a,b=aware(raw),aware(finish)
        key=(str(event.get('UID','')),a.isoformat())
        if key in seen:continue
        seen.add(key)
        desc=str(event.get('DESCRIPTION','')); name=str(event.get('SUMMARY','未命名课程'))
        teacher=re.search(r'教师[：:]\s*([^\n]+)',desc)
        periods=re.search(r'第\s*([\d一二三四五六七八九十—–－\-]+)\s*节',desc)
        weeks=re.search(r'第\s*(\d+)\s*周',desc)
        uncertain=all_day or any(x in desc+name for x in ['时间待定','未指定星期','未指定时间','周期提示'])
        events.append({'id':source['id']+':'+key[0]+':'+a.isoformat(),'uid':key[0], 'calendar_id':source['id'],
            'calendar':source['name'],'color':source['color'],'title':name,'start':a.isoformat(),'end':b.isoformat(),
            'date':a.date().isoformat(),'all_day':all_day,'untimed':uncertain,'location':str(event.get('LOCATION','')),
            'description':desc,'teacher':teacher.group(1).strip() if teacher else '',
            'periods':periods.group(1) if periods else '', 'week':int(weeks.group(1)) if weeks else None,
            'warning': '假期待确认' if '假期待确认' in desc else '安排待确认' if '待确认' in desc+name else ''})
        if len(events)>15000:raise ValueError('日历事件过多')
    return {'name':str(cal.get('X-WR-CALNAME',source['name'])),'events':sorted(events,key=lambda x:x['start']),
            'window_start':start.isoformat(),'window_end':end.isoformat()}

if __name__=='__main__':
    import sys,json
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS,(256*1024*1024,256*1024*1024))
    except ImportError:pass
    p=json.load(sys.stdin)
    print(json.dumps(parse_calendar(p['body'].encode(),p['source'],p['timezone']),ensure_ascii=False))
