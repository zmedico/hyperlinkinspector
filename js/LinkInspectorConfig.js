
define([
	"extend",
	"LinkInspectorReadonlyConfig"
], function(extend, LinkInspectorReadonlyConfig) {

	var constructor = function(prefix)
	{
		constructor.base.constructor.call(this, null);
		this.prefix = prefix;
		this._disable_commit = 0;
	}

	extend(LinkInspectorReadonlyConfig, constructor);

	constructor.prototype._commit = function() {
		if (this._disable_commit > 0)
			return;
	}

	constructor.prototype.getString = function(key, defValue)
	{
		value = localStorage.getItem(this.prefix + key);
		if (value === null)
			value = defValue;

		return value;
	}

	constructor.prototype.setString = function(key, value)
	{
		localStorage.setItem(this.prefix + key, value);
	}

	constructor.prototype.remove = function(key)
	{
		localStorage.removeItem(this.prefix + key);
	}

	constructor.prototype.clear = function(key)
	{
		this._disable_commit += 1;
		try {
			for (var i = 0; i < this._known_keys.length; i++)
				this.remove(this._known_keys[i]);
		}
		finally {
			this._disable_commit -= 1;
		}
		this._commit();
	}

	constructor.prototype.importConfig = function(config)
	{

		var importString = function(key) {
			if (config.hasOwnProperty(key)) {
				this.setString(key, config[key]);
			}
		}.bind(this);

		var importBoolean = function(key) {
			if (config.hasOwnProperty(key)) {
				var value = String(config[key]);
				if (value == "true" || value == "false") {
					this.setBoolean(key, value == "true");
				}
			}
		}.bind(this);

		var importFloat = function(key, min, max) {
			if (config.hasOwnProperty(key)) {
				var value = parseFloat(config[key]);
				if (!isNaN(value) && value >= min && value <= max) {
					this.setFloat(key, value);
				}
			}
		}.bind(this);

		this._disable_commit += 1;
		try {
			this.clear();
			importBoolean("IntentHelperAutoClose");
		}
		finally {
			this._disable_commit -= 1;
		}
		this._commit();
	}

	constructor.prototype.setBoolean = function(key, value)
	{
		if (value)
			value = "true";
		else
			value  = "false";

		this.setString(key, value);
	}

	constructor.prototype.setFloat = function(key, value)
	{
		value = new Number(value).toString();
		this.setString(key, value);
	}

	return constructor;
});
