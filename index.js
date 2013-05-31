var Resource = require('deployd/lib/resource');
var util = require('util');
var Forecast = require('forecast.io');
var STORE_NAME = 'forecastioCache';


function ForecastIO() {
  Resource.apply(this, arguments);
}

ForecastIO.basicDashboard = {
  settings: [{
    name: 'apiKey',
    type: 'text',
    description: 'forecast.io API key'
  },{
    name: 'cacheResults',
    type: 'checkbox',
    description: 'cache api call results in db'
  },{
    name: 'cacheTTL',
    type: 'number',
    description: 'how long (ms) to cache api call results in db'
  }, {
    name: 'debugLogging',
    type: 'checkbox',
    description: 'show debug info in console log'
  }, {
    name: 'purgeCache',
    type: 'checkbox',
    description: 'purge all cached results on every request'
  }]
};


util.inherits(ForecastIO, Resource);

ForecastIO.prototype.clientGeneration = true;

ForecastIO.prototype.log = function() {
  if(this.config.debugLogging) {
    console.log.apply(console, arguments);
  }
};

ForecastIO.prototype.cacheResults = function(lat, lon, data, cb) {
  var key = ''+lat+lon;
  var store = getStore();
  store.insert({
    latlon: key,
    data: data,
    ts: new Date().getTime()}, cb);
};
ForecastIO.prototype.handle = function(ctx, next) {
  var lat;
  var lon;

  if(!this.config.apiKey) {
    this.log('missing forecast.io apiKey');
    return next();
  }

  if ( ctx.req && ctx.req.method !== 'GET' ) {
    return next();
  }

  lat = parseFloat(ctx.query['lat']);
  lon = parseFloat(ctx.query['lon']);

  if(!lat || !lon) {
    this.log('lat: %s and lon: %s are not valid', lat, lon);
    return next();
  }

  this.log('valid request for lat: %s lon: %s', lat, lon)

  function cb(err, done) {
    ctx.done(err, done);
  }

  if(this.config.cacheResults) {
    this.getCachedWeather(lat, lon, cb);
  } else {
    this.getWeather(lat, lon, cb);
  }

};

ForecastIO.prototype.getWeather = function(lat, lon, cb) {
  var client = new Forecast({
    APIKey: this.config.apiKey
  });

  client.get(lat, lon, function(err, res, data) {
      cb(err, data);
  });

};

ForecastIO.prototype.checkCachedResults = function(store, result, cb) {
  var data;
  var ttl = parseInt(this.config.cacheTTL, 10) || 0;
  var expiration = new Date().getTime() - ttl;

  function clearCache() {
    store.remove({
      latlon: result[0].latlon
    }, function() {
      cb(null, data);
    });
  }

  if(this.config.purgeCache) {
    this.log('purging all cached results');
    store.remove({}, function() {
      cb(null, data);
    });
  } else if(result.length > 0) {
    if(result.length > 1) {
      this.log('Cached Results insane');
      clearCache();
    } else {
      this.log('Checking TTL Should expire: %s ttl: %s', expiration, result[0].ts);
      if(result[0].ts < expiration){
        this.log('cached results expired');
        clearCache();
      } else {
        data = result[0].data;
        this.log('valid cached results');
        cb(null, data);
      }
    }
  } else {
    cb(null, data);
  }

};

ForecastIO.prototype.getCachedWeather = function(lat, lon, cb) {
  var key = ''+lat+lon;
  var store = this.getStore();
  var now = new Date().getTime();
  var me = this;

  store.find({latlon:key}, function(err, result) {
    if(err) {
      me.log('error getting cache from db');
      me.log(err);
      cb(err);
      return;
    }

    me.checkCachedResults(store, result, function(err, data) {
      if(err) {
        cb(err);
        return;
      }
      if(data) {
        me.log('from cache');
        cb(null, data);
      } else {
        me.log('cache empty');
        me.getWeather(lat, lon, function(err, data) {
          if(err) {
            me.log('error getting weather information');
            me.log(err);
            cb(err);
            return;
          }
          store.insert({
            latlon: key,
            data: data,
            ts: new Date().getTime()
          }, function(e, result) {
            cb(err, data)
          });
        });

      }
    });

  });
};

ForecastIO.prototype.getStore = function() {
  return process.server.createStore(STORE_NAME);
}

module.exports = ForecastIO;
