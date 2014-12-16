/*
Canopy Javascript Client API

CANOPY CLIENT OBJECT
--------------------

Initialize the library by creating a Canopy Client Object with:

    canopy = new CanopyClient({
        "cloud-host" : "ccs.canopy.link"
    });

TRACKING ACCOUNTS AND DEVICES
-----------------------

Before you can access a device or account's data, you must first "track" it.

Each Canopy Client Object can "track" multiple Account and Device objects.  By
"tracking" an object you can access and manipulate it within javascript.
The tracking mechanism allows an efficient implementation to update (or
"synchronize") all tracked objects with a single AJAX request.

To track an account:

    var acct = canopy.Account(username);

To track the currently logged-in user (based on session cookies):

    var acct = canopy.Account("me");

To track a device:

    var dev = canopy.Device(UUID);

Once you have started tracking one or more objects, you can synchronize with
the server using:

    canopy.Sync({ onSuccess: function() {
        // your code here
    }});

By default, Sync will synchronize all tracked Accounts and Devices.  You can
synchronize specific objects with:

    canopy.Sync({
        accounts : [username],
        devices: [uuid0, uuid1, ...],
        onSuccess: function() {
        }
    });

This form of the command will synchronize the specified devices even if they
are not being tracked.

Callbacks:
--------------------
OnReady

CanopyClient Callbacks:
    "device-loaded"
        Called when a new Device object is loaded for the first
        time.

Account Callbacks:
    "device-loaded" - Called when a new Device object is loaded.

ACCOUNTS
--------------------

If the user has authenticated with the Canopy Cloud Service (by logging in, for
example), you can access their Account Object:

    canopy.me

    // Get username
    canopy.me.Username();

    // Push changes
    canopy.me.Save({
        onSuccess: function() {
            alert("Account updated");
        }
    });

    // Get a user's devices:
    canopy.me.Devices();

    canopy.users();

    // Get device
    canopy.Device("UUID");

    canopy.Device("UUID");

CLOUD VARIABLES
--------------------

    device = canopy.device("UUID");

    device.gps.longitude.Value = 4.0f;
*/

function SDDLParser() {
    // Parses json Object into anonymous cloudvar struct
    this.Parse = function(jsonObj) {
        return this.ParseVar("inout struct __root__", propsJsonObj);
    }

    // Returns {value: SDDLVarDef, error: errorStringOrNull}
    this.ParseVar = function(declString, propsJsonObj) {
        var out = new SDDLVar();

        // Parse declString
        // For example: "out float32 temperature";
        out.priv.direction = "out";
        out.priv.datatype = "string";
        out.priv.name = "temperature";

        // Parse properties
        for (var x in propsJsonObj) {
            var val = propsJsonObj[x];

            if (x == "description") {
                out.priv.description = val;
            }
            else if (x == "min-value") {
                out.priv.minValue = val;
            }
            else if (x == "max-value") {
                out.priv.maxValue = val;
            }
            else if (x == "regex") {
                out.priv.regex = val;
            }
            else if (x == "units") {
                out.priv.units = val;
            }
            else if (x == "units") {
                out.priv.units = val;
            }
            else {
                // only do this if it parses to a var declaration
                var child = self.ParseVar(x, val);
                if (child.error != null) {
                    return {value: null, error: child.error};
                }
                out.priv.children[child.value.Name()] = child.value;
            }
        }
        return {value: out, error: null};
    }

    function SDDLVar() {
        this.priv = {};
        this.priv.children = {};

        this.Directio = function() {
            return this.priv.direction;
        }

        this.ConcreteDirection = function() {
            if (this.Direction == "inherit") {
                return this.priv.parent.ConcreteDirection();
            }
            return this.Direction();
        }

        this.Description = function() {
            return this.priv.description;
        }
        this.Datatype = function() {
            return this.priv.datatype;
        }

        this.Name = function() {
            return this.priv.name;
        }

        this.MinValue = function() {
            return this.priv.minValue;
        }

        this.MaxValue = function() {
            return this.priv.maxValue;
        }

        this.NumericDisplayHint = function() {
            return this.priv.numericDisplayHint;
        }

        this.Regex = function() {
            return this.priv.regex;
        }

        this.Units = function() {
            return this.priv.units;
        }
    }
}

function CanopyClient(origSettings) {
    var self=this;
    var selfClient = this;
    this.priv = {};
    this.me = null;

    // map: username -> Account object
    this.priv.trackedAccounts = {};
    // map: uuid -> Account object
    this.priv.trackedDevices = {};

    function device(id) {
        return this.priv.device
    }

    this.OnReady = function(fn) {
        this.priv.onReady = fn;
    }

    this.IsLoggedIn = function() {
        return self.priv.me !== undefined;
    }

    this.ApiBaseUrl = function() {
        return "http://dev02.canopy.link/api";
    }

    this.CreateAccount = function(params) {
        $.ajax({
            type: "POST",
            dataType : "json",
            contentType: 'text/plain; charset=utf-8', /* Needed for safari */
            url: self.ApiBaseUrl() + "/create_account",
            data: JSON.stringify({
                username : params.username, 
                email: params.email, 
                password : params.password, 
                password_confirm: params.passwordConfirm
            }),
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function(data) {
            /* Initialize canopyClient object */
            /*self.devices = new CanopyDeviceList([]);
            self.account = new CanopyAccount({
                username: params.username,
                email: params.email
            });*/
            if (data['result'] == "ok") {
                if (params.onSuccess != null)
                    params.onSuccess();
            } 
            else {
                if (params.onError != null)
                    params.onError(data['error']);
            }
        })
        .fail(function(XMLHttpRequest, textStatus, errorThrown) {
            console.log(XMLHttpRequest);
            console.log(textStatus);
            console.log(errorThrown);
            if (params.onError != null)
                params.onError();
        });
    }

    this.CreateDevice = function(params) {
        $.ajax({
            type: "POST",
            dataType : "json",
            contentType: 'text/plain; charset=utf-8', /* Needed for safari */
            url: self.ApiBaseUrl() + "/create_device",
            data: JSON.stringify({
                device_name: params.deviceName,
                quanitity: params.quantity,
            }),
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function(data) {
            /* Initialize canopyClient object */
            /*self.devices = new CanopyDeviceList([]);
            self.account = new CanopyAccount({
                username: params.username,
                email: params.email
            });*/
            if (data['result'] == "ok") {
                if (params.onSuccess != null)
                    params.onSuccess();
            } 
            else {
                if (params.onError != null)
                    params.onError(data['error']);
            }
        })
        .fail(function(XMLHttpRequest, textStatus, errorThrown) {
            console.log(XMLHttpRequest);
            console.log(textStatus);
            console.log(errorThrown);
            if (params.onError != null)
                params.onError();
        });
    }

    this.Login = function(params) {
        /* TODO: proper error handlilng */
        /* TODO: response needs to include username & email */
        $.ajax({
            type: "POST",
            contentType: 'text/plain; charset=utf-8', /* Needed for safari */
            dataType : "json",
            url: self.ApiBaseUrl() + "/login",
            data: JSON.stringify({username : params.username, password : params.password}),
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function(data, textStatus, jqXHR) {
            if (data['result'] == "ok") {
                var acct = new CanopyAccount({
                    username: data['username'],
                    email: data['email']
                });
                self.account = acct;
                if (params.onSuccess)
                    params.onSuccess(acct);
            }
            else {
                if (params.onError)
                    params.onError("unknown");
            }
        })
        .fail(function(XMLHttpRequest, textStatus, errorThrown) {
            if (!XMLHttpRequest.responseText) {
                if (params.onError)
                    params.onError("unknown");
                return;
            }
            console.log(XMLHttpRequest.responseText);
            var data = JSON.parse(XMLHttpRequest.responseText);
            console.log(data);
            console.log(data['result']);
            console.log(data['error_type']);
            if (data['result'] == "error") {
                if (params.onError)
                    params.onError(data['error_type']);
            }
            else {
                if (params.onError)
                    params.onError("unknown");
            }
        });
    }

    this.Logout = function(params) {
        $.ajax({
            type: "POST",
            dataType : "json",
            url: self.ApiBaseUrl() + "/logout",
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function() {
            if (params.onSuccess)
                params.onSuccess();
        })
        .fail(function() {
            if (params.onError)
                params.onError();
        });
    }

    // Activate an Account
    this.ActivateAccount = function(params) {
        $.ajax({
            type: "POST",
            data: JSON.stringify({ "username" : params["username"], "code" : params["code"]}),
            dataType : "json",
            url: self.ApiBaseUrl() + "/activate",
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function(data, textStatus, jqXHR) {
            // Update each synchronized account object
            if (data['result'] == "ok") {
                if (params.onSuccess)
                    params.onSuccess();
            } else {
                if (params.onError)
                    params.onError("unknown");
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            /* TODO: determine error */
            if (params.onError)
                params.onError("unknown");
        });
    }

    // Synchronize with the server
    this.Sync = function(params) {
        var trackAccts = this.priv.trackedAccounts;
        var trackDevices = this.priv.trackedDevices;

        if (priv.trackedAccounts['me'] !== undefined) {
            var acct = priv.trackedAccounts['me'];
            acct.priv.email = "greg@greg.com";
            acct.priv.username = "gregulator";
            acct.priv.ready = true;
            acct.priv.onChange();

            acct.priv.devices = [
                new CanopyDevice()
            ];
            acct.priv.onDeviceLoaded(acct.priv.devices[0]);
        }

        var ajax = CCSSimulatorAjax;

        ajax({
            type: "POST",
            data: JSON.stringify({ "sync-accounts" : trackAccts, "sync-devices" : trackDevices}),
            dataType : "json",
            url: self.ApiBaseUrl() + "/sync",
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function(data, textStatus, jqXHR) {
            // Update each synchronized account object
            alert("sync done");
            if (data['result'] == "ok") {
                var acct = new CanopyAccount({
                    username: data['username'],
                    email: data['email']
                });
                if (params.onSuccess)
                    params.onSuccess(acct);
            } else {
                if (data['error_type']) {
                    if (params.onError)
                        params.onError(data['error_type']);
                }
                else {
                    if (params.onError)
                        params.onError("unknown");
                }
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            /* TODO: determine error */
            if (params.onError)
                params.onError("unknown");
        });
    }

    this.Account = function(account) {
        if (priv.trackedAccounts[account] === undefined) {
            var acct = new CanopyAccount(account);
            priv.trackedAccounts[account] = acct;
            return acct;
        } else {
            return priv.trackedAccounts[account];
        }
    }

    this.Device = function(device) {
    }
    
    // fetchAccount (private)
    // AJAX request for account details.
    function fetchAccount(params) {
        $.ajax({
            type: "GET",
            dataType : "json",
            url: self.ApiBaseUrl() + "/me",
            xhrFields: {
                 withCredentials: true
            },
            crossDomain: true
        })
        .done(function(data, textStatus, jqXHR) {
            if (data['result'] == "ok") {
                var acct = new CanopyAccount({
                    username: data['username'],
                    email: data['email']
                });
                self.me = acct;
                acct.fetchDevices({
                    onSuccess: function(deviceList) {
                        self.devices = deviceList;
                        self.me.devices = deviceList;
                        if (params.onSuccess)
                            params.onSuccess(acct);
                    },
                    onError: function() {
                        if (params.onError)
                            params.onError("unknown");
                    }
                });
            } else {
                if (data['error_type']) {
                    if (params.onError)
                        params.onError(data['error_type']);
                }
                else {
                    if (params.onError)
                        params.onError("unknown");
                }
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            /* TODO: determine error */
            if (params.onError)
                params.onError("unknown");
        });
    }

    // CanopyAccount
    // This is a private "class" of CanopyClient to prevent the caller from
    // calling the constructor.
    function CanopyAccount(initObj) {
        var priv = {};
        this.priv = priv;
        priv.ready = true;
        priv.username = initObj.username;

        this.Email = function() {
            if (!priv.ready) {
                return {"value" : "", "error" : "Account Not Ready"};
            }
            return {"value" : priv.email, "error" : null};
        }

        this.On = function(eventNames, callback) {
            if (eventNames == "change") {
                priv.onChange = callback;
            } else if (eventNames == "device-loaded") {
                priv.onDeviceLoaded = callback;
            }
        }

        this.Username = function() {
            if (!priv.ready) {
                return {"value" : "", "error" : "Not Ready"};
            }
            return {"value" : priv.username, "error" : null};
        }

        this.fetchDevices = function(params) {
            /* TODO: Filter to only show devices for this account */
            $.ajax({
                type: "GET",
                dataType : "json",
                url: self.ApiBaseUrl() + "/me/devices",
                xhrFields: {
                     withCredentials: true
                },
                crossDomain: true
            })
            .done(function(data, textStatus, jqXHR) {
                /* construct CanopyDevice objects */
                var devices = [];
                for (var i = 0; i < data.devices.length; i++) {
                    var dev = new CanopyDevice(data.devices[i]);
                    devices.push(dev);
                }
                if (params.onSuccess)
                    params.onSuccess(new CanopyDeviceList(devices));
            })
            .fail(function() {
                if (params.onError)
                    params.onError("unknown");
            });
        }
    }

    function CloudVar(params) {
        var priv = {};
        priv.value = undefined;
        this.Value = function(newValue) {
            if (newValue !== undefined) {
                priv.value = newValue;
                // mark dirty
            }
            return priv.value;
        }
    }

    /*
     * CanopyDevice
     *
     * This is a private "class" of CanopyClient to prevent the caller from
     * calling the constructor.
     */
    function CanopyDevice(initObj) {
        var self=this;
        /*var result = ParseResponse(self, initObj.sddl_class, initObj.property_values);
        if (result.error != null) {
            console.log(result.error);
        }
        var classInstance = result.instance;

        this.properties = classInstance.properties;*/

        this.vars = {
            Length: function() {
                return 0;
            }
        }

        this.id = function() {
            return initObj.device_id;
        }
        this.UUID = this.id;

        this.FriendlyName = function() {
            return initObj.friendly_name;
        }

        this.notifications = function() {
            // TODO: Wrap in object?
            return initObj.notifications;
        }

        this.LocationNote = function() {
            return initObj.location_note ? initObj.location_note : "";
        }

        this.sddlClass = function() {
            return new SDDLClass(initObj.sddl_class);
        }

        /*
         *  params:
         *      friendlyName
         *      locationNote
         *      onSuccess
         *      onError
         */
        this.setSettings = function(params) {
            obj = {
                __friendly_name: params.friendlyName,
                __location_note: params.locationNote
            };
            initObj.friendly_name = params.friendlyName;
            initObj.location_note = params.locationNote;
            $.ajax({
                type: "POST",
                dataType : "json",
                url: selfClient.ApiBaseUrl() + "/device/" + self.id(),
                data: JSON.stringify(obj),
                xhrFields: {
                     withCredentials: true
                },
                crossDomain: true
            })
            .done(function() {
                if (params.onSuccess)
                    params.onSuccess();
            })
            .fail(function() {
                if (params.onError)
                    params.onError();
            });
        }

        /*
         * params:
         *  sddlObj -- The property to add/update.
         *  onSuccess
         *  onError
         */
        this.updateSDDL = function(params) {
            obj = {
                "__sddl_update" : params.sddlObj
            };
            $.ajax({
                type: "POST",
                dataType : "json",
                url: selfClient.ApiBaseUrl() + "/device/" + self.id(),
                data: JSON.stringify(obj),
                xhrFields: {
                     withCredentials: true
                },
                crossDomain: true
            })
            .done(function() {
                if (params.onSuccess)
                    params.onSuccess();
            })
            .fail(function() {
                if (params.onError)
                    params.onError();
            });
        }

        this.beginControlTransaction = function() {
        }

        /* Lists accounts who have permission to access this */
        this.permissions = function() {
        }

        this.share = function(params) {
        }

        this.setPermissions = function(params) {
        }

        this.IsConnected = function() {
            return this.ConnectionStatus() == "connected";
        }

        this.IsDisconnected = function() {
            return this.ConnectionStatus() == "disconnected";
        }

        this.IsNeverConnected = function() {
            return this.ConnectionStatus() == "never_connected";
        }

        this.ConnectionStatus = function() {
            if (initObj.connected || this.UUID().substring(0, 1) == "5") {
                return "connected";
            }
            else if (initObj.sddl_class == null && this.UUID().substring(0, 1) != "a") {
                return "never_connected";
            }
            return "disconnected";
        }
    }

    /*
     * <devices> is list of CanopyDevice objects.
     */
    function CanopyDeviceList(devices) {

        this.Filter = function(options) {
            if ($.isEmptyObject(options)) {
                return devices;
            }
            filteredDevices = [];
            for (i = 0; i < devices.length; i++) {
                var device = devices[i];
                if (options['connected'] == device.IsConnected()) {
                    filteredDevices.push(devices[i]);
                    continue;
                }

                if (options['disconnected'] == device.IsDisconnected()) {
                    filteredDevices.push(devices[i]);
                    continue;
                }

                if (options['never_connected'] == device.IsNeverConnected()) {
                    filteredDevices.push(devices[i]);
                    continue;
                }
            }
            return filteredDevices;
        }

        this.Connected = function() {
            return this.Filter({connected: true});
        }

        this.Disconnected = function() {
            return this.Filter({disconnected: true});
        }

        this.NeverConnected = function() {
            return this.Filter({never_connected: true});
        }

        this.Count = function(options) {
            return this.Filter(options).length;
        }

        /* simulate array */
        this.length = devices.length;
        for (var i = 0; i < devices.length; i++) {
            this[i] = devices[i];
        }

        /* simulate map */
        for (var i = 0; i < devices.length; i++) {
            this[devices[i].id()] = devices[i];
        }
    }

    // Initialization
    $(function() {
        fetchAccount({
            onSuccess : function(acct) {
                self.priv.me = acct;
                self.priv.onReady();
            },
            onError : function(acct) {
                self.priv.onReady();
            }
        })
    });
}

// Example program:
/*
var canopy = new CanopyClient();

acct = canopy.Account("me");
device = acct.Devices();

canopy.TrackDevice(CANOPY_DEVICE_UUID);
canopy.AutoSync(true);

canopy.onChange(canopy.Device("uuid").);

canopy.Sync({
    onSuccess: function() {
        canopy.Device("UUID")
    }
});
*/
