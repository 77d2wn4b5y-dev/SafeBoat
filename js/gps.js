(function () {
  'use strict';

  let watchId = null;

  function start(onPosition, onError) {
    if (!('geolocation' in navigator)) {
      onError(new Error('Geolokacija nije podržana na ovom uređaju.'));
      return false;
    }
    if (watchId !== null) return true;
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    });
    return true;
  }

  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  window.SafeBoatGPS = { start, stop };
}());
