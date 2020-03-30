function PropertyChangeSupport(object) {
    Object.defineProperty(object, "$events", {
      enumerable : false,
      configurable : false,
      writable : true,
      value : {}
    });
    object.$notify = function(property, newValue, oldValue) {
      const events = this.$events[property];
      for (var e in events) {
        events[e](property, newValue, oldValue);
      }
    };
    object.addListener = function(listener, ...keys) {
      for (var key of keys) {
        if (this.$events[key] == null) {
            this.$events[key] = [];
        }
        this.$events[key].push(listener);
      }
    };
    for (var entry of Object.entries(object)) {
      if (entry[0].startsWith("_") && typeof entry[1] != "function") {
        const key = entry[0];
        const property = key.slice(1);
  
        Object.defineProperty(object, property, {
          get:function() { return object[key]; },
          set:function(value) {
            const old = object[key];
            if (value != old) {
              object[key] = value;
              object.$notify(property, value, old);
            }
          },
          enumerable : true,
          configurable : false
        });
      } 
    }
  }