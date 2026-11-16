
L.MeasureControlConnector = function(map, storage, measure) {

	if (map && storage && measure) {
		this.init(map, storage, measure);
	}
};

L.MeasureControlConnector.formatHash = function(path, precision) {
	console.log("format",path);

	var latLngStringArray = new Array(path.points.length);
	for (var j=0; j<path.points.length; j++) {
		latLngStringArray[j] = path.points[j].lat.toFixed(precision)+ ","+ path.points[j].lng.toFixed(precision);
	}
	var dataString = latLngStringArray.join(";");
	return dataString;
};

L.MeasureControlConnector.parseHash = function(data) {
	if (typeof data !== 'string' || !data) {
		return [];
	}

	var rawPaths = data.split("|");
	var paths = [];
	for (var i=0; i<rawPaths.length; i++){
		// parse path latlng;latlng;...
		var rawCoordinates = rawPaths[i].split(";");
		var lonLatArray = [];
		for (var j=0; j<rawCoordinates.length; j++) {
			// Coordinates are serialized as latitude,longitude.
			var point = String(rawCoordinates[j]).split(",");
			if (point.length !== 2 || point[0].trim() === '' || point[1].trim() === '') {
				return [];
			}
			var lat = Number(point[0]);
			var lng = Number(point[1]);
			if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
				return [];
			}
			lonLatArray.push(new L.LatLng(lat, lng));
		}
		paths.push({points: lonLatArray});
	};
	return paths;
};

L.MeasureControlConnector.prototype = {
	map: null,
	storage: null,
	measure: null,
	idx:null,
	lastHash: null,
	partStrings: new Array(),

	applingHash: false,
	formatHash: L.MeasureControlConnector.formatHash,
	parseHash: L.MeasureControlConnector.parseHash,

	_setHashPart: function(data) {
		if (!this.storage) {
			return;
		}
		this.storage.updateHashPart({idx:this.idx,data:data});
		// HashComponent updates location.hash but not its cached parts.
		if (this.storage.lastHashParts) {
			this.storage.lastHashParts[this.idx] = data;
		}
	},

	init: function(map, storage, measure) {
		this.map = map;
		this.storage = storage;
		this.measure = measure;

		// reset the hash
		this.lastHash = null;
		// register to be called after hash changed
		this.idx = this.storage.registerHashPartConnector(this);

		if (!this.isListening) {
			this.startListening();
		}
	},

	onFinishedPath: function(e) {
		if (this.applingHash) {
			return false;
		}
		var zoom = this.map.getZoom();
		var precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
		var part = this.formatHash(e, precision);
		this.partStrings.push(part);
		var dataString = this.partStrings.join("|");

		this._setHashPart(dataString);
	},

	onMeasureStart: function(e) {
	},
	onMeasureStop: function(e) {
		this.partStrings= new Array();
		this._setHashPart("");
	},

	applyHash: function(hash) {
		if (hash == "") return;
		var paths = this.parseHash(hash);
		if (!paths.length) return;
		this.partStrings = hash.split('|');
		this.applingHash = true;
		try {
			//apply points
			this.measure.clearLines();
			for (var i=0; i<paths.length;i++) {
				this.measure.displayLine(paths[i].points);
			}
		} finally {
			this.applingHash = false;
		}
	},

	isListening: false,
	startListening: function() {
		this.map.on('measure:finishedpath', this.onFinishedPath, this);
		this.map.on('measure:measurestart', this.onMeasureStart, this);
		this.map.on('measure:measurestop', this.onMeasureStop, this);
		this.isListening = true;
	},
	stopListening: function() {
		this.map.off('measure:finishedpath', this.onFinishedPath, this);
		this.map.off('measure:measurestart', this.onMeasureStart, this);
		this.map.off('measure:measurestop', this.onMeasureStop, this);
		this.isListening = false;
	}
};
L.measureControlConnector = function(map) {
	return new L.MeasureControlConnector(map);
};
