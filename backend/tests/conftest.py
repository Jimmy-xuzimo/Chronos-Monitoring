import os,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]))
os.environ['PANEL_DATA']=tempfile.mkdtemp(prefix='zimo-test-')
os.environ['PANEL_INITIAL_PASSWORD']='test-password-12345'
os.environ['PANEL_COOKIE_SECURE']='0'

from settings import load,save
_test_cfg=load();_test_cfg.update(calendars=[{'id':'example','name':'测试课表','color':'#6e8bff','url':'https://calendar.example.com/course.ics'}],news_url='https://news.example.com/',github_user='octocat');save(_test_cfg)
