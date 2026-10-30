import datetime as dt
import pytest
from zoneinfo import ZoneInfo
from weather import normalize
from net import SourceError
from settings import update,load

NOW=dt.datetime(2026,10,29,22,30,tzinfo=ZoneInfo('Asia/Shanghai'))
def payload():
    return {'code':0,'data':{'location':{'id':'58238'},'lastUpdate':'2026/10/29 22:15','now':{'temperature':14.2,'humidity':96,'windSpeed':.5,'windDirection':'西南风'},'daily':[{'date':'2026/10/29','high':20,'low':12,'dayText':'小雨','nightText':'多云','nightCode':1}]}}

def test_nanjing_observation_and_forecast_are_distinct():
    result=normalize(payload(),NOW)
    assert result['city']=='南京' and result['temperature']==14.2
    assert result['condition_kind']=='forecast' and result['condition_period']=='今晚'
    assert result['condition']=='多云' and result['feels_like'] is None

def test_old_observation_is_rejected():
    with pytest.raises(SourceError):normalize(payload(),NOW+dt.timedelta(hours=3))

def test_station_and_invalid_temperature_are_rejected():
    data=payload();data['data']['location']['id']='00000'
    with pytest.raises(SourceError):normalize(data,NOW)
    data=payload();data['data']['now']['temperature']=999999
    with pytest.raises(SourceError):normalize(data,NOW)

def test_optional_missing_weather_numbers_do_not_become_zero():
    result=normalize(payload(),NOW)
    assert result['feels_like'] is None and result['forecast'][0]['high']==20

def test_android_appearance_persists_and_rejects_unknown_styles():
    previous=load()['android_appearance']
    update({'android_appearance':{'style':'aurora','theme':'dark'}})
    assert load()['android_appearance']=={'style':'aurora','theme':'dark'}
    with pytest.raises(ValueError):update({'android_appearance':{'style':'unknown','theme':'dark'}})
    update({'android_appearance':previous})

def test_weather_requires_session():
    from app import app
    client=app.test_client()
    assert client.get('/api/weather').status_code==401

def test_weather_location_validation_and_industrial_style():
    previous=load()
    update({'weather_location':{'station_id':'54511','name':'北京'},'android_appearance':{'style':'industrial','theme':'dark'}})
    assert load()['weather_location']['station_id']=='54511'
    with pytest.raises(ValueError):update({'weather_location':{'station_id':'https://example.com','name':'bad'}})
    update({'weather_location':previous['weather_location'],'android_appearance':previous['android_appearance']})

def test_weather_search_filters_foreign_and_unrelated(monkeypatch):
    import weather
    monkeypatch.setattr(weather,'read_json',lambda path:{'code':0,'data':['58238|南京|Nanjing|中国','54511|北京|Beijing|中国','068816|开普敦|CapeTown|南非']})
    assert weather.search_locations('南京')==[{'station_id':'58238','name':'南京'}]
    with pytest.raises(ValueError):weather.search_locations('')

def test_weather_uses_separate_city_cache_keys():
    from weather import key
    assert key({'weather_location':{'station_id':'54511','name':'北京'}})=='weather:54511'
    assert key({'weather_location':{'station_id':'58238','name':'南京'}})=='weather:58238'
