import datetime as dt
from unittest.mock import patch
from integrations import news
from store import cache,db
from settings import load
from app import app
from scheduling import daily_slot

def test_news_editions_and_categories():
    day=daily_slot().date();today=day.isoformat();yesterday=(day-dt.timedelta(days=1)).isoformat()
    def fetch(url,*args):
        if url.endswith('index.json'):return {'dates':[today,yesterday]},{}
        day=today if url.endswith(today+'.json') else yesterday
        return {'date':day,'categories':[{'name':'AI 新闻','items':[{'title':'A real news headline','url':'https://example.com/'+day,'source':'Example','time':day}]},{'name':'开源项目','items':[{'title':'Open source update','url':'https://example.org/'+day}]}]},{}
    with patch('integrations.get_json',side_effect=fetch):news(load())
    result=cache('news')['data'];assert result['date']==today and yesterday in result['dates']
    assert set(x['category'] for x in result['items'])=={'AI 新闻','开源项目'}
    with app.test_client() as client:
        with client.session_transaction() as session:session['user']=load()['username']
        response=client.get('/api/news?date='+yesterday)
        assert response.status_code==200 and response.json['data']['date']==yesterday
        assert client.get('/api/news?date=1900-01-01').status_code==404
