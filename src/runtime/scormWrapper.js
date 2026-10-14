
var pipwerks = window.pipwerks || (window.pipwerks = {
  SCORM: {
    version: "1.2",
    handleCompletionStatus: true,
    handleExitMode: true,
    API: { handle: null, isFound: false },
    connection: { isActive: false },
    data: { completionStatus: null, exitStatus: null },
    debug: { isActive: true },

    init: function(){
      var scorm = pipwerks.SCORM;
      var success = false;
      var trace = pipwerks.UTILS.trace;

      if(!scorm.connection.isActive){
        var API = scorm.API.getHandle();
        if(API){
          try {
            var initRes = String(API.LMSInitialize(""));
            if(initRes === "true" || initRes === "1"){
              scorm.connection.isActive = true;
              success = true;
              scorm.data.completionStatus = scorm.get("cmi.core.lesson_status");
            } else {
              trace("LMSInitialize failed. Return value: " + initRes);
            }
          } catch(e) {
            trace("LMSInitialize exception: " + e.message);
          }
        } else {
          trace("SCORM API handle not found (Standalone mode).");
        }
      } else {
        success = true;
      }
      return success;
    },

    get: function(parameter){
      var scorm = pipwerks.SCORM;
      var value = null;
      if(scorm.connection.isActive){
        var API = scorm.API.getHandle();
        if(API){
          try {
            value = API.LMSGetValue(parameter);
          } catch(e) {
            pipwerks.UTILS.trace("LMSGetValue exception: " + e.message);
          }
        }
      }
      return value !== null && typeof value !== 'undefined' ? String(value) : "";
    },

    set: function(parameter, value){
      var scorm = pipwerks.SCORM;
      var success = false;
      if(scorm.connection.isActive){
        var API = scorm.API.getHandle();
        if(API){
          try {
            var res = String(API.LMSSetValue(parameter, String(value)));
            success = (res === "true" || res === "1");
          } catch(e) {
            pipwerks.UTILS.trace("LMSSetValue exception: " + e.message);
          }
        }
      }
      return success;
    },

    save: function(){
      var scorm = pipwerks.SCORM;
      var success = false;
      if(scorm.connection.isActive){
        var API = scorm.API.getHandle();
        if(API){
          try {
            var res = String(API.LMSCommit(""));
            success = (res === "true" || res === "1");
          } catch(e) {
            pipwerks.UTILS.trace("LMSCommit exception: " + e.message);
          }
        }
      }
      return success;
    },

    quit: function(){
      var scorm = pipwerks.SCORM;
      var success = false;
      if(scorm.connection.isActive){
        var API = scorm.API.getHandle();
        if(API){
          scorm.save();
          try {
            var res = String(API.LMSFinish(""));
            success = (res === "true" || res === "1");
          } catch(e) {
            pipwerks.UTILS.trace("LMSFinish exception: " + e.message);
          }
          scorm.connection.isActive = false;
        }
      }
      return success;
    },

    API: {
      getHandle: function(){
        if (pipwerks.SCORM.API.handle) {
          return pipwerks.SCORM.API.handle;
        }

        var API = null;
        function findAPI(win) {
          var findAPITries = 0;
          while (win) {
            try {
              if (win.API) {
                return win.API;
              }
            } catch (e) {
              // Cross-origin iframe security restriction
              break;
            }

            try {
              if (!win.parent || win.parent === win) {
                break;
              }
              win = win.parent;
            } catch (e) {
              break;
            }

            findAPITries++;
            if (findAPITries > 50) {
              break;
            }
          }
          return null;
        }

        // 1. Current window & parent hierarchy
        try {
          API = findAPI(window);
        } catch(e) {}

        // 2. Opener hierarchy if launched in popup
        if (!API) {
          try {
            if (window.opener && typeof window.opener !== 'undefined') {
              API = findAPI(window.opener);
            }
          } catch (e) {}
        }

        // 3. Top window fallback
        if (!API) {
          try {
            if (window.top && window.top !== window && typeof window.top !== 'undefined') {
              API = findAPI(window.top);
            }
          } catch (e) {}
        }

        if (API) {
          pipwerks.SCORM.API.handle = API;
          pipwerks.SCORM.API.isFound = true;
        }

        return API;
      }
    }
  },

  UTILS: {
    trace: function(msg){
      if(window.console && window.console.log){
        console.log("[SCORM 1.2 Wrapper]: " + msg);
      }
    }
  }
});
