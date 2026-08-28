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


UTIF.encode = function(ifds, rasterData, depth)
{
	if(depth==null) depth=8;
	
	var data = [73,73,42,0,  8,0,0,0];
	_writeIFD(data, 8, ifds, rasterData, depth);
	return (new Uint8Array(data)).buffer;
}
function _writeIFD(data, offset, ifds, rasterData, depth)
{
	var ifd = ifds[0];
	var img = rasterData[0];
	var width  = ifd.t256[0];
	var height = ifd.t257[0];
	var spp    = ifd.t277 ? ifd.t277[0] : 1;
	
	var ctype = 2;	// RGB
	if(spp==1) ctype=1;
	if(spp==4) ctype=6;
	
	var bps = [];
	for(var i=0; i<spp; i++) bps.push(depth);
	
	var rps = 16;	// rows per strip
	var scount = Math.ceil(height/rps);
	var bpr = Math.ceil(width*spp*depth/8);	// bytes per row
	var bps_off  = offset; 					offset += spp*2;
	var sc_off   = offset;					offset += scount*4;
	var sb_off   = offset;					offset += scount*4;
	var data_off = offset;
	
	var soffs=[], sbs=[];
	for(var y=0; y<scount; y++)
	{
		soffs.push(data_off);
		var rows = Math.min(rps, height-y*rps);
		var clen = rows * bpr;
		for(var i=0; i<clen; i++) data.push(0);
		sbs.push(clen);
		data_off += clen;
	}
	
	var ifd_off = data_off;
	
	var tags = [
		[256, 3, [width]],
		[257, 3, [height]],
		[258, 3, bps, bps_off],
		[259, 3, [1]],		// no compression
		[262, 3, [ctype]],
		[273, 4, soffs, sc_off],
		[277, 3, [spp]],
		[278, 3, [rps]],
		[279, 4, sbs, sb_off],
		[284, 3, [1]]		// chunky
	];
	
	pushUint16(data, tags.length);
	for(var i=0; i<tags.length; i++)
	{
		var tag=tags[i], tid=tag[0], ttype=tag[1], tdata=tag[2], toff=tag[3];
		pushUint16(data, tid);
		pushUint16(data, ttype);
		pushUint32(data, tdata.length);
		if(toff!=null) pushUint32(data, toff);
		else {
			if(ttype==3) { pushUint16(data, tdata[0]); pushUint16(data, 0); }
			if(ttype==4) pushUint32(data, tdata[0]);
		}
	}
	pushUint32(data, 0);	// no more IFDs
	
	// write BPS
	for(var i=0; i<spp; i++) _writeUint16(data, bps_off+i*2, depth);
	// write strip offsets
	for(var i=0; i<scount; i++) _writeUint32(data, sc_off+i*4, soffs[i]);
	// write strip byte counts
	for(var i=0; i<scount; i++) _writeUint32(data, sb_off+i*4, sbs[i]);
	
	// write image data
	var si=0, di=soffs[0], rowi=0;
	for(var y=0; y<height; y++)
	{
		if(y!=0 && (y%rps)==0) { si++; di=soffs[si]; }
		for(var x=0; x<width; x++)
		{
			for(var s=0; s<spp; s++)
			{
				if(depth==8) data[di++] = img[rowi++];
				else if(depth==16) { _writeUint16(data, di, img[rowi]); di+=2; rowi++; }
			}
		}
	}
}
function pushUint16(data, v) { data.push(v&255, (v>>8)&255); }
function pushUint32(data, v) { data.push(v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255); }
function _writeUint16(data, off, v) { data[off]=v&255; data[off+1]=(v>>8)&255; }
function _writeUint32(data, off, v) { data[off]=v&255; data[off+1]=(v>>8)&255; data[off+2]=(v>>16)&255; data[off+3]=(v>>24)&255; }


UTIF.decode = function(buffer)
{
	var data = new Uint8Array(buffer);
	var id = UTIF._binBE.nextShort(data, 0);
	var bin = (id == 0x4949) ? UTIF._binLE : UTIF._binBE;
	
	var ifdo = bin.nextLong(data, 4), ifds = [];
	while(ifdo != 0)
	{
		var cnt = bin.nextShort(data, ifdo);
		var ifd = {}, tags=[];
		for(var i=0; i<cnt; i++)
		{
			var to = ifdo+2+i*12;
			var tag  = bin.nextShort(data, to);
			var type = bin.nextShort(data, to+2);
			var num  = bin.nextLong (data, to+4);
			var voff = bin.nextLong (data, to+8);
			tags.push([tag, type, num, voff, to+8]);
		}
		var next = bin.nextLong(data, ifdo+2+cnt*12);
		_readTagData(data, bin, tags, ifd, buffer);
		ifd["ifdOffset"] = ifdo;
		ifds.push(ifd);
		ifdo = next;
	}
	return ifds;
}

function _readTagData(data, bin, tags, ifd, buffer)
{
	var tbytes = [1,1,1,2,4,8,1,1,2,4,8,4,8];
	for(var i=0; i<tags.length; i++)
	{
		var tag=tags[i], tval=tag[0], type=tag[1], num=tag[2], voff=tag[3], vpos=tag[4];
		var tsize = num * tbytes[type];
		if(tsize > 4) {
		} else voff = vpos;
		var arr;
		if(type== 1||type==7) { arr=data.slice(voff,voff+num); }
		else if(type== 2) { arr = UTIF._readASCII(data, voff, num); }
		else if(type== 3) { arr=new Uint16Array (buffer, voff, num ); }
		else if(type== 4) { arr=new Uint32Array (buffer, voff, num ); }
		else if(type== 5) { arr=new Uint32Array (buffer, voff, num*2); }
		else if(type==16) { arr=new BigUint64Array(buffer, voff, num ); }
		else if(type==17) { arr=new BigInt64Array (buffer, voff, num ); }
		else if(type== 9) { arr=new Int32Array  (buffer, voff, num ); }
		else if(type==10) { arr=new Int32Array  (buffer, voff, num*2); }
		else if(type==11) { arr=new Float32Array(buffer, voff, num ); }
		else if(type==12) { arr=new Float64Array(buffer, voff, num ); }
		else arr = [];
		ifd["t"+tval] = arr;
	}
}

UTIF._readASCII = function(data, off, num)
{
	var s=[];
	for(var i=off; i<off+num; i++) s.push(String.fromCharCode(data[i]));
	return s.join("");
}

UTIF.decodeImage = function(buffer, ifd)
{
	var data = new Uint8Array(buffer);
	var id = UTIF._binBE.nextShort(data, 0);
	var bin = (id == 0x4949) ? UTIF._binLE : UTIF._binBE;
	_decodeIFD(data, bin, buffer, ifd);
}

function _decodeIFD(data, bin, buffer, ifd)
{
	var w = ifd["t256"] ? ifd["t256"][0] : 0;
	var h = ifd["t257"] ? ifd["t257"][0] : 0;
	if(w==0||h==0) return;
	
	var spp = ifd["t277"] ? ifd["t277"][0] : 1;
	var bps = ifd["t258"] ? ifd["t258"][0] : 1;
	var comp = ifd["t259"] ? ifd["t259"][0] : 1;
	var pmi  = ifd["t262"] ? ifd["t262"][0] : 2;
	var fo   = ifd["t266"] ? ifd["t266"][0] : 1;
	var pred = ifd["t317"] ? ifd["t317"][0] : 1;
	var tx   = ifd["t322"] ? ifd["t322"][0] : w;
	var ty   = ifd["t323"] ? ifd["t323"][0] : h;
	var rps  = ifd["t278"] ? ifd["t278"][0] : h;
	var smpf = ifd["t339"] ? ifd["t339"][0] : 1;
	
	var tboff = ifd["t324"]||ifd["t273"];
	var tbs   = ifd["t325"]||ifd["t279"];
	
	var bpr = Math.ceil(w*spp*bps/8);
	var rout = new Uint8Array(w*h*4);
	
	var xs=Math.ceil(w/tx), ys=Math.ceil(h/ty);
	for(var yi=0; yi<ys; yi++) for(var xi=0; xi<xs; xi++)
	{
		var i = yi*xs+xi;
		var boff = tboff[i], blen = tbs[i];
		
		var tbuf;
		if(comp== 1) tbuf = new Uint8Array(buffer, boff, blen);
		else if(comp==5) { tbuf = pako.inflate(new Uint8Array(buffer,boff,blen)); }
		else if(comp==6||comp==7) { tbuf = _decodeJpeg(new Uint8Array(buffer,boff,blen),spp,w,h); }
		else if(comp==8||comp==32946) { tbuf = pako.inflate(new Uint8Array(buffer,boff,blen)); }
		else if(comp==32773) { tbuf = _decodePackBits(new Uint8Array(buffer,boff,blen)); }
		else if(comp==2) { tbuf = _decodeCCITT1D(new Uint8Array(buffer,boff,blen),w,ty); }
		else if(comp==3) { tbuf = _decodeCCITT3(new Uint8Array(buffer,boff,blen),w,ty); }
		else if(comp==4) { tbuf = _decodeCCITT4(new Uint8Array(buffer,boff,blen),w,ty); }
		else tbuf = new Uint8Array(0);
		
		_writeIntoRGBA(tbuf, bpr, w, h, xi*tx, yi*ty, tx, ty, spp, bps, pmi, pred, fo, smpf, rout);
	}
	ifd["data"] = rout;
	ifd["width"] = w;
	ifd["height"] = h;
}

UTIF.toRGBA8 = function(ifd) { return ifd.data || new Uint8Array(0); }

function _writeIntoRGBA(data, bpr, w, h, ox, oy, tw, th, spp, bps, pmi, pred, fo, smpf, out)
{
	var rows = Math.min(th, h-oy), cols = Math.min(tw, w-ox);
	if(pred==2)
	{
		for(var y=0; y<rows; y++)
		{
			var off = y*bpr;
			for(var x=spp; x<cols*spp; x++) data[off+x] = (data[off+x]+data[off+x-spp])&255;
		}
	}
	var mul = bps<=8 ? 255/((1<<bps)-1) : 1;
	for(var y=0; y<rows; y++) for(var x=0; x<cols; x++)
	{
		var si, di=(oy+y)*w*4+(ox+x)*4;
		if(bps==8) si = y*bpr+x*spp;
		else if(bps==16) si = (y*bpr+x*spp*2);
		else si = Math.floor((y*cols*spp*bps+x*spp*bps)/8);
		
		var r,g,b,a=255;
		if(spp==1) {
			if(bps==16) r=g=b=(data[si]*256+data[si+1])/256;
			else r=g=b=data[si]*mul;
			if(pmi==0) { r=255-r; g=255-g; b=255-b; }
		}
		else if(spp==3) {
			if(bps==16) { r=data[si]*256+data[si+1]; g=data[si+2]*256+data[si+3]; b=data[si+4]*256+data[si+5]; r/=256;g/=256;b/=256; }
			else { r=data[si]*mul; g=data[si+1]*mul; b=data[si+2]*mul; }
		}
		else if(spp==4) {
			if(bps==16) { r=data[si]*256+data[si+1]; g=data[si+2]*256+data[si+3]; b=data[si+4]*256+data[si+5]; a=(data[si+6]*256+data[si+7])/256; r/=256;g/=256;b/=256; }
			else { r=data[si]*mul; g=data[si+1]*mul; b=data[si+2]*mul; a=data[si+3]*mul; }
		} else { r=g=b=0; }
		out[di]=Math.round(r); out[di+1]=Math.round(g); out[di+2]=Math.round(b); out[di+3]=Math.round(a);
	}
}

function _decodePackBits(data)
{
	var out=[], i=0;
	while(i<data.length)
	{
		var n=data[i++];
		if(n<128) for(var j=0;j<=n;j++) out.push(data[i++]);
		else if(n>128) { var v=data[i++]; for(var j=0;j<257-n;j++) out.push(v); }
	}
	return new Uint8Array(out);
}

function _decodeJpeg(data,spp,w,h) {
	var canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
	var url=URL.createObjectURL(new Blob([data],{type:"image/jpeg"}));
	var img=new Image(); img.src=url;
	var ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0);
	URL.revokeObjectURL(url);
	return ctx.getImageData(0,0,w,h).data;
}

var _ccittData=null;
function _initCCITT() {
	if(_ccittData) return;
	_ccittData = {};
}

function _decodeCCITT1D(data,w,h){_initCCITT();return new Uint8Array(Math.ceil(w/8)*h);}
function _decodeCCITT3(data,w,h){_initCCITT();return new Uint8Array(Math.ceil(w/8)*h);}
function _decodeCCITT4(data,w,h){_initCCITT();return new Uint8Array(Math.ceil(w/8)*h);}


UTIF._binLE = {
	nextShort : function(data, o) { return data[o]|(data[o+1]<<8); },
	nextLong  : function(data, o) { return (data[o]|(data[o+1]<<8)|(data[o+2]<<16)|(data[o+3]<<24))>>>0; }
};
UTIF._binBE = {
	nextShort : function(data, o) { return (data[o]<<8)|data[o+1]; },
	nextLong  : function(data, o) { return ((data[o]<<24)|(data[o+1]<<16)|(data[o+2]<<8)|data[o+3])>>>0; }
};


})(UTIF, pako);
})();
