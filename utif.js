/* ===== Bundled UTIF.js 3.1.0 — TIFF decoder (offline, no CDN needed) ===== */




;(function(){
var UTIF = {};

// Make available for import by `require()`
if (typeof module == "object") {module.exports = UTIF;}
else {self.UTIF = UTIF;}

var pako;
if (typeof require == "function") {pako = require("pako");}
else {pako = self.pako;}

function log() { if (typeof process=="undefined" || process.env.NODE_ENV=="development") console.log.apply(console, arguments);  }
