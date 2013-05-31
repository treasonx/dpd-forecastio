#Forecast.io Resource

This resource wraps access to the [forecast.io](https://developer.forecast.io/) weather api. The resource
also contains logic for caching forecast.io results to save api calls to the
forecast.io service. 

##Installation

`$ npm install dpd-forecastio`

Need help installing [deployd
modules](http://docs.deployd.com/docs/using-modules/installing-modules.md)?

##Configuration Option

In the dashboard you can add the forecastio resource. You will need to configure
the resource and provide at minimum an API key. 

###Options:

* `apiKey`: required to access forecast.io
* `cacheResult`: should API calls be cached locally in mongo
* `cacheTTL`: how long should the cached results be considered valid
* `debugLoggin`: log debugging messages to the console. 
* `purgeCache`: will purge all cached results on any request to the resource.

##Weather Data

You can make `GET` requests to the resource specifying latitude and longitude
and you will get back forecast.io [weather
data](https://developer.forecast.io/docs/v2).

###Example Request Using client library

```javascript
dpd.weather.get({
  lat:42.3975734, 
  lon:-71.1332062
}, function(data) {
  console.log(data)
});
```




