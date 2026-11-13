var vs={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Ss={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},pp=0,yu=1,mp=2;var na=1,Kl=2,Hr=3,Yn=0,sn=1,En=2,fn=0,Vr=1,ia=2,vu=3,Su=4,jl=5;var ii=100,gp=101,_p=102,xp=103,yp=104,Ks=200,vp=201,Sp=202,Mp=203,Mu=204,bu=205,sa=206,bp=207,ra=208,Tp=209,wp=210,Ep=211,Ap=212,Rp=213,Cp=214,wl=0,El=1,Al=2,br=3,Rl=4,Cl=5,Pl=6,Il=7,Jl=0,Pp=1,Ip=2,Ti=0,oa=1,aa=2,la=3,ca=4,ha=5,js=6,ua=7,ru="attached",Lp="detached",Tu=300,Js=301,Gr=302,Wr=303,$l=304,kn=1e3,$n=1001,Tr=1002,Ut=1003,Ql=1004;var $s=1005;var Zt=1006,Xr=1007;var si=1008;var An=1009,wu=1010,Eu=1011,qr=1012,ec=1013,ri=1014,Ln=1015,Qt=1016,tc=1017,nc=1018,rs=1020,Au=35902,Ru=35899,Cu=1021,Pu=1022,Tn=1023,Xi=1026,mi=1027,ic=1028,fa=1029,Ms=1030,sc=1031;var rc=1033,da=33776,pa=33777,ma=33778,ga=33779,oc=35840,ac=35841,lc=35842,cc=35843,hc=36196,uc=37492,fc=37496,dc=37488,pc=37489,_a=37490,mc=37491,gc=37808,_c=37809,xc=37810,yc=37811,vc=37812,Sc=37813,Mc=37814,bc=37815,Tc=37816,wc=37817,Ec=37818,Ac=37819,Rc=37820,Cc=37821,Pc=36492,Ic=36494,Lc=36495,Dc=36283,Nc=36284,xa=36285,Uc=36286;var zs=2300,ks=2301,bl=2302,ou=2303,au=2400,lu=2401,cu=2402,Dp=2500;var Iu=0,ya=1,Yr=2,Np=3200;var Zr=0,Up=1,os="",kt="srgb",Dn="srgb-linear",Io="linear",ft="srgb";var Tl=7680;var Op=519,Fp=512,Bp=513,zp=514,Lu=515,kp=516,Hp=517,Du=518,Nu=519,Uu=35044;var Ou="300 es",Qn=2e3,wr=2001;function Vg(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function Gg(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function Er(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function Vp(){let s=Er("canvas");return s.style.display="block",s}var bd={},Ar=null;function Lo(...s){let e="THREE."+s.shift();Ar?Ar("log",e,...s):console.log(e,...s)}function Gp(s){let e=s[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=s[1];t&&t.isStackTrace?s[0]+=" "+t.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function Ue(...s){s=Gp(s);let e="THREE."+s.shift();if(Ar)Ar("warn",e,...s);else{let t=s[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...s)}}function Ve(...s){s=Gp(s);let e="THREE."+s.shift();if(Ar)Ar("error",e,...s);else{let t=s[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...s)}}function Bs(...s){let e=s.join(" ");e in bd||(bd[e]=!0,Ue(...s))}function Wp(s,e,t){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Xp={[wl]:wl,[Al]:Pl,[Rl]:Rl,[br]:Cl,[El]:El,[Pl]:Al,[Il]:Il,[Cl]:br},di=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let i=n[e];if(i!==void 0){let r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,e);e.target=null}}},vn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Td=1234567,Co=Math.PI/180,Hs=180/Math.PI;function wi(){let s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(vn[s&255]+vn[s>>8&255]+vn[s>>16&255]+vn[s>>24&255]+"-"+vn[e&255]+vn[e>>8&255]+"-"+vn[e>>16&15|64]+vn[e>>24&255]+"-"+vn[t&63|128]+vn[t>>8&255]+"-"+vn[t>>16&255]+vn[t>>24&255]+vn[n&255]+vn[n>>8&255]+vn[n>>16&255]+vn[n>>24&255]).toLowerCase()}function We(s,e,t){return Math.max(e,Math.min(t,s))}function Fu(s,e){return(s%e+e)%e}function Wg(s,e,t,n,i){return n+(s-e)*(i-n)/(t-e)}function Xg(s,e,t){return s!==e?(t-s)/(e-s):0}function Po(s,e,t){return(1-t)*s+t*e}function qg(s,e,t,n){return Po(s,e,1-Math.exp(-t*n))}function Yg(s,e=1){return e-Math.abs(Fu(s,e*2)-e)}function Zg(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function Kg(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function jg(s,e){return s+Math.floor(Math.random()*(e-s+1))}function Jg(s,e){return s+Math.random()*(e-s)}function $g(s){return s*(.5-Math.random())}function Qg(s){s!==void 0&&(Td=s);let e=Td+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function e0(s){return s*Co}function t0(s){return s*Hs}function n0(s){return s>0&&Number.isInteger(s)&&2**Math.round(Math.log2(s))===s}function i0(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Bu(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function s0(s,e,t,n,i){let r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),h=o((e+n)/2),f=r((e-n)/2),u=o((e-n)/2),d=r((n-e)/2),g=o((n-e)/2);switch(i){case"XYX":s.set(a*h,l*f,l*u,a*c);break;case"YZY":s.set(l*u,a*h,l*f,a*c);break;case"ZXZ":s.set(l*f,l*u,a*h,a*c);break;case"XZX":s.set(a*h,l*g,l*d,a*c);break;case"YXY":s.set(l*d,a*h,l*g,a*c);break;case"ZYZ":s.set(l*g,l*d,a*h,a*c);break;default:Ue("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Oc(s){switch(s.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function zu(s,e){if(e.constructor===Float32Array)return s;let t=Oc(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(s/t,-1)}function ku(s,e){if(e.constructor===Float32Array)return s;let t=Oc(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(s*t)}var as={DEG2RAD:Co,RAD2DEG:Hs,generateUUID:wi,clamp:We,euclideanModulo:Fu,mapLinear:Wg,inverseLerp:Xg,lerp:Po,damp:qg,pingpong:Yg,smoothstep:Zg,smootherstep:Kg,randInt:jg,randFloat:Jg,randFloatSpread:$g,seededRandom:Qg,degToRad:e0,radToDeg:t0,isPowerOfTwo:n0,ceilPowerOfTwo:i0,floorPowerOfTwo:Bu,setQuaternionFromProperEuler:s0,normalize:ku,denormalize:zu},Xu=class Xu{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=We(this.x,e.x,t.x),this.y=We(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=We(this.x,e,t),this.y=We(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(We(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(We(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*i+e.x,this.y=r*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Xu.prototype.isVector2=!0;var pe=Xu,Rt=class{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,o,a){let l=n[i+0],c=n[i+1],h=n[i+2],f=n[i+3],u=r[o+0],d=r[o+1],g=r[o+2],v=r[o+3];if(f!==v||l!==u||c!==d||h!==g){let p=l*u+c*d+h*g+f*v;p<0&&(u=-u,d=-d,g=-g,v=-v,p=-p);let m=1-a;if(p<.9995){let x=Math.acos(p),S=Math.sin(x);m=Math.sin(m*x)/S,a=Math.sin(a*x)/S,l=l*m+u*a,c=c*m+d*a,h=h*m+g*a,f=f*m+v*a}else{l=l*m+u*a,c=c*m+d*a,h=h*m+g*a,f=f*m+v*a;let x=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=x,c*=x,h*=x,f*=x}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,i,r,o){let a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],f=r[o],u=r[o+1],d=r[o+2],g=r[o+3];return e[t]=a*g+h*f+l*d-c*u,e[t+1]=l*g+h*u+c*f-a*d,e[t+2]=c*g+h*d+a*u-l*f,e[t+3]=h*g-a*f-l*u-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,i=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),f=a(r/2),u=l(n/2),d=l(i/2),g=l(r/2);switch(o){case"XYZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"YZX":this._x=u*h*f+c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f-u*d*g;break;case"XZY":this._x=u*h*f-c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f+u*d*g;break;default:Ue("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],i=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],f=t[10],u=n+a+f;if(u>0){let d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(r-c)*d,this._z=(o-i)*d}else if(n>a&&n>f){let d=2*Math.sqrt(1+n-a-f);this._w=(h-l)/d,this._x=.25*d,this._y=(i+o)/d,this._z=(r+c)/d}else if(a>f){let d=2*Math.sqrt(1+a-n-f);this._w=(r-c)/d,this._x=(i+o)/d,this._y=.25*d,this._z=(l+h)/d}else{let d=2*Math.sqrt(1+f-n-a);this._w=(o-i)/d,this._x=(r+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(We(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,i=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+i*c-r*l,this._y=i*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-i*a,this._w=o*h-n*a-i*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,i=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},qu=class qu{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(wd.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(wd.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,i=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*i-a*n),h=2*(a*t-r*i),f=2*(r*n-o*t);return this.x=t+l*c+o*f-a*h,this.y=n+l*h+a*c-r*f,this.z=i+l*f+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=We(this.x,e.x,t.x),this.y=We(this.y,e.y,t.y),this.z=We(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=We(this.x,e,t),this.y=We(this.y,e,t),this.z=We(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(We(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,i=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=i*l-r*a,this.y=r*o-n*l,this.z=n*a-i*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ih.copy(this).projectOnVector(e),this.sub(Ih)}reflect(e){return this.sub(Ih.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(We(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};qu.prototype.isVector3=!0;var P=qu,Ih=new P,wd=new Rt,Yu=class Yu{constructor(e,t,n,i,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,l,c)}set(e,t,n,i,r,o,a,l,c){let h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],f=n[7],u=n[2],d=n[5],g=n[8],v=i[0],p=i[3],m=i[6],x=i[1],S=i[4],y=i[7],M=i[2],T=i[5],_=i[8];return r[0]=o*v+a*x+l*M,r[3]=o*p+a*S+l*T,r[6]=o*m+a*y+l*_,r[1]=c*v+h*x+f*M,r[4]=c*p+h*S+f*T,r[7]=c*m+h*y+f*_,r[2]=u*v+d*x+g*M,r[5]=u*p+d*S+g*T,r[8]=u*m+d*y+g*_,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+i*r*c-i*o*l}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],f=h*o-a*c,u=a*l-h*r,d=c*r-o*l,g=t*f+n*u+i*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let v=1/g;return e[0]=f*v,e[1]=(i*c-h*n)*v,e[2]=(a*n-i*o)*v,e[3]=u*v,e[4]=(h*t-i*l)*v,e[5]=(i*r-a*t)*v,e[6]=d*v,e[7]=(n*l-c*t)*v,e[8]=(o*t-n*r)*v,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-i*c,i*l,-i*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return Bs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Lh.makeScale(e,t)),this}rotate(e){return Bs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Lh.makeRotation(-e)),this}translate(e,t){return Bs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Lh.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Yu.prototype.isMatrix3=!0;var Ge=Yu,Lh=new Ge,Ed=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ad=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function r0(){let s={enabled:!0,workingColorSpace:Dn,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ft&&(i.r=Wi(i.r),i.g=Wi(i.g),i.b=Wi(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ft&&(i.r=Mr(i.r),i.g=Mr(i.g),i.b=Mr(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===os?Io:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[o].fromXYZ).multiply(this.spaces[r].toXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[Dn]:{primaries:e,whitePoint:n,transfer:Io,toXYZ:Ed,fromXYZ:Ad,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:kt},outputColorSpaceConfig:{drawingBufferColorSpace:kt}},[kt]:{primaries:e,whitePoint:n,transfer:ft,toXYZ:Ed,fromXYZ:Ad,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:kt}}}),s}var Ke=r0();function Wi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Mr(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}var or,Ll=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{or===void 0&&(or=Er("canvas")),or.width=e.width,or.height=e.height;let i=or.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=or}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Er("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=Wi(r[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Wi(t[n]/255)*255):t[n]=Wi(t[n]);return{data:t,width:e.width,height:e.height}}else return Ue("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},o0=0,Rr=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:o0++}),this.uuid=wi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width||0,t.height||0,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(Dh(i[o].image)):r.push(Dh(i[o]))}else r=Dh(i);n.url=r}return t||(e.images[this.uuid]=n),n}};function Dh(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Ll.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(Ue("Texture: Unable to serialize Texture."),{})}var a0=0,Nh=new P,tn=class s extends di{constructor(e=s.DEFAULT_IMAGE,t=s.DEFAULT_MAPPING,n=$n,i=$n,r=Zt,o=si,a=Tn,l=An,c=s.DEFAULT_ANISOTROPY,h=os){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:a0++}),this.uuid=wi(),this.name="",this.source=new Rr(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new pe(0,0),this.repeat=new pe(1,1),this.center=new pe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Nh).x}get height(){return this.source.getSize(Nh).y}get depth(){return this.source.getSize(Nh).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Ue(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){Ue(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Tu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case kn:e.x=e.x-Math.floor(e.x);break;case $n:e.x=e.x<0?0:1;break;case Tr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case kn:e.y=e.y-Math.floor(e.y);break;case $n:e.y=e.y<0?0:1;break;case Tr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};tn.DEFAULT_IMAGE=null;tn.DEFAULT_MAPPING=Tu;tn.DEFAULT_ANISOTROPY=1;var Zu=class Zu{constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r,l=e.elements,c=l[0],h=l[4],f=l[8],u=l[1],d=l[5],g=l[9],v=l[2],p=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(f-v)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+v)<.1&&Math.abs(g+p)<.1&&Math.abs(c+d+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let S=(c+1)/2,y=(d+1)/2,M=(m+1)/2,T=(h+u)/4,_=(f+v)/4,b=(g+p)/4;return S>y&&S>M?S<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(S),i=T/n,r=_/n):y>M?y<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(y),n=T/i,r=b/i):M<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(M),n=_/r,i=b/r),this.set(n,i,r,t),this}let x=Math.sqrt((p-g)*(p-g)+(f-v)*(f-v)+(u-h)*(u-h));return Math.abs(x)<.001&&(x=1),this.x=(p-g)/x,this.y=(f-v)/x,this.z=(u-h)/x,this.w=Math.acos((c+d+m-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=We(this.x,e.x,t.x),this.y=We(this.y,e.y,t.y),this.z=We(this.z,e.z,t.z),this.w=We(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=We(this.x,e,t),this.y=We(this.y,e,t),this.z=We(this.z,e,t),this.w=We(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(We(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Zu.prototype.isVector4=!0;var Mt=Zu,Dl=class extends di{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Zt,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Mt(0,0,e,t),this.scissorTest=!1,this.viewport=new Mt(0,0,e,t),this.textures=[];let i=n.count;for(let r=0;r<i;r++)this.textures[r]=new tn({width:e,height:t,depth:n.depth}),this.textures[r].isRenderTargetTexture=!0,this.textures[r].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Zt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let i=Object.assign({},e.textures[t].image);this.textures[t].source=new Rr(i)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Wt=class extends Dl{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Do=class extends tn{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Ut,this.minFilter=Ut,this.wrapR=$n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Nl=class extends tn{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Ut,this.minFilter=Ut,this.wrapR=$n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}};var Zl=class Zl{constructor(e,t,n,i,r,o,a,l,c,h,f,u,d,g,v,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,l,c,h,f,u,d,g,v,p)}set(e,t,n,i,r,o,a,l,c,h,f,u,d,g,v,p){let m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=i,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=f,m[14]=u,m[3]=d,m[7]=g,m[11]=v,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Zl().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,i=1/ar.setFromMatrixColumn(e,0).length(),r=1/ar.setFromMatrixColumn(e,1).length(),o=1/ar.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,i=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){let u=o*h,d=o*f,g=a*h,v=a*f;t[0]=l*h,t[4]=-l*f,t[8]=c,t[1]=d+g*c,t[5]=u-v*c,t[9]=-a*l,t[2]=v-u*c,t[6]=g+d*c,t[10]=o*l}else if(e.order==="YXZ"){let u=l*h,d=l*f,g=c*h,v=c*f;t[0]=u+v*a,t[4]=g*a-d,t[8]=o*c,t[1]=o*f,t[5]=o*h,t[9]=-a,t[2]=d*a-g,t[6]=v+u*a,t[10]=o*l}else if(e.order==="ZXY"){let u=l*h,d=l*f,g=c*h,v=c*f;t[0]=u-v*a,t[4]=-o*f,t[8]=g+d*a,t[1]=d+g*a,t[5]=o*h,t[9]=v-u*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){let u=o*h,d=o*f,g=a*h,v=a*f;t[0]=l*h,t[4]=g*c-d,t[8]=u*c+v,t[1]=l*f,t[5]=v*c+u,t[9]=d*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){let u=o*l,d=o*c,g=a*l,v=a*c;t[0]=l*h,t[4]=v-u*f,t[8]=g*f+d,t[1]=f,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=d*f+g,t[10]=u-v*f}else if(e.order==="XZY"){let u=o*l,d=o*c,g=a*l,v=a*c;t[0]=l*h,t[4]=-f,t[8]=c*h,t[1]=u*f+v,t[5]=o*h,t[9]=d*f-g,t[2]=g*f-d,t[6]=a*h,t[10]=v*f+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(l0,e,c0)}lookAt(e,t,n){let i=this.elements;return Wn.subVectors(e,t),Wn.lengthSq()===0&&(Wn.z=1),Wn.normalize(),hs.crossVectors(n,Wn),hs.lengthSq()===0&&(Math.abs(n.z)===1?Wn.x+=1e-4:Wn.z+=1e-4,Wn.normalize(),hs.crossVectors(n,Wn)),hs.normalize(),Za.crossVectors(Wn,hs),i[0]=hs.x,i[4]=Za.x,i[8]=Wn.x,i[1]=hs.y,i[5]=Za.y,i[9]=Wn.y,i[2]=hs.z,i[6]=Za.z,i[10]=Wn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],f=n[5],u=n[9],d=n[13],g=n[2],v=n[6],p=n[10],m=n[14],x=n[3],S=n[7],y=n[11],M=n[15],T=i[0],_=i[4],b=i[8],R=i[12],w=i[1],C=i[5],I=i[9],U=i[13],D=i[2],B=i[6],H=i[10],G=i[14],ee=i[3],V=i[7],Q=i[11],ne=i[15];return r[0]=o*T+a*w+l*D+c*ee,r[4]=o*_+a*C+l*B+c*V,r[8]=o*b+a*I+l*H+c*Q,r[12]=o*R+a*U+l*G+c*ne,r[1]=h*T+f*w+u*D+d*ee,r[5]=h*_+f*C+u*B+d*V,r[9]=h*b+f*I+u*H+d*Q,r[13]=h*R+f*U+u*G+d*ne,r[2]=g*T+v*w+p*D+m*ee,r[6]=g*_+v*C+p*B+m*V,r[10]=g*b+v*I+p*H+m*Q,r[14]=g*R+v*U+p*G+m*ne,r[3]=x*T+S*w+y*D+M*ee,r[7]=x*_+S*C+y*B+M*V,r[11]=x*b+S*I+y*H+M*Q,r[15]=x*R+S*U+y*G+M*ne,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],i=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],f=e[6],u=e[10],d=e[14],g=e[3],v=e[7],p=e[11],m=e[15],x=l*d-c*u,S=a*d-c*f,y=a*u-l*f,M=o*d-c*h,T=o*u-l*h,_=o*f-a*h;return t*(v*x-p*S+m*y)-n*(g*x-p*M+m*T)+i*(g*S-v*M+m*_)-r*(g*y-v*T+p*_)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],i=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],h=e[10];return t*(o*h-a*c)-n*(r*h-a*l)+i*(r*c-o*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],f=e[9],u=e[10],d=e[11],g=e[12],v=e[13],p=e[14],m=e[15],x=t*a-n*o,S=t*l-i*o,y=t*c-r*o,M=n*l-i*a,T=n*c-r*a,_=i*c-r*l,b=h*v-f*g,R=h*p-u*g,w=h*m-d*g,C=f*p-u*v,I=f*m-d*v,U=u*m-d*p,D=x*U-S*I+y*C+M*w-T*R+_*b;if(D===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let B=1/D;return e[0]=(a*U-l*I+c*C)*B,e[1]=(i*I-n*U-r*C)*B,e[2]=(v*_-p*T+m*M)*B,e[3]=(u*T-f*_-d*M)*B,e[4]=(l*w-o*U-c*R)*B,e[5]=(t*U-i*w+r*R)*B,e[6]=(p*y-g*_-m*S)*B,e[7]=(h*_-u*y+d*S)*B,e[8]=(o*I-a*w+c*b)*B,e[9]=(n*w-t*I-r*b)*B,e[10]=(g*T-v*y+m*x)*B,e[11]=(f*y-h*T-d*x)*B,e[12]=(a*R-o*C-l*b)*B,e[13]=(t*C-n*R+i*b)*B,e[14]=(v*S-g*M-p*x)*B,e[15]=(h*M-f*S+u*x)*B,this}scale(e){let t=this.elements,n=e.x,i=e.y,r=e.z;return t[0]*=n,t[4]*=i,t[8]*=r,t[1]*=n,t[5]*=i,t[9]*=r,t[2]*=n,t[6]*=i,t[10]*=r,t[3]*=n,t[7]*=i,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),i=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*o,0,c*l-i*a,h*l+i*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,r,o){return this.set(1,n,r,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){let i=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,f=a+a,u=r*c,d=r*h,g=r*f,v=o*h,p=o*f,m=a*f,x=l*c,S=l*h,y=l*f,M=n.x,T=n.y,_=n.z;return i[0]=(1-(v+m))*M,i[1]=(d+y)*M,i[2]=(g-S)*M,i[3]=0,i[4]=(d-y)*T,i[5]=(1-(u+m))*T,i[6]=(p+x)*T,i[7]=0,i[8]=(g+S)*_,i[9]=(p-x)*_,i[10]=(1-(u+v))*_,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){let i=this.elements;e.x=i[12],e.y=i[13],e.z=i[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=ar.set(i[0],i[1],i[2]).length(),a=ar.set(i[4],i[5],i[6]).length(),l=ar.set(i[8],i[9],i[10]).length();r<0&&(o=-o),ci.copy(this);let c=1/o,h=1/a,f=1/l;return ci.elements[0]*=c,ci.elements[1]*=c,ci.elements[2]*=c,ci.elements[4]*=h,ci.elements[5]*=h,ci.elements[6]*=h,ci.elements[8]*=f,ci.elements[9]*=f,ci.elements[10]*=f,t.setFromRotationMatrix(ci),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,i,r,o,a=Qn,l=!1){let c=this.elements,h=2*r/(t-e),f=2*r/(n-i),u=(t+e)/(t-e),d=(n+i)/(n-i),g,v;if(l)g=r/(o-r),v=o*r/(o-r);else if(a===Qn)g=-(o+r)/(o-r),v=-2*o*r/(o-r);else if(a===wr)g=-o/(o-r),v=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=f,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,r,o,a=Qn,l=!1){let c=this.elements,h=2/(t-e),f=2/(n-i),u=-(t+e)/(t-e),d=-(n+i)/(n-i),g,v;if(l)g=1/(o-r),v=o/(o-r);else if(a===Qn)g=-2/(o-r),v=-(o+r)/(o-r);else if(a===wr)g=-1/(o-r),v=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=f,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};Zl.prototype.isMatrix4=!0;var Te=Zl,ar=new P,ci=new Te,l0=new P(0,0,0),c0=new P(1,1,1),hs=new P,Za=new P,Wn=new P,Rd=new Te,Cd=new Rt,ei=class s{constructor(e=0,t=0,n=0,i=s.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let i=e.elements,r=i[0],o=i[4],a=i[8],l=i[1],c=i[5],h=i[9],f=i[2],u=i[6],d=i[10];switch(t){case"XYZ":this._y=Math.asin(We(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-We(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(We(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-We(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(We(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-We(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:Ue("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Rd.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Rd,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Cd.setFromEuler(this),this.setFromQuaternion(Cd,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};ei.DEFAULT_ORDER="XYZ";var Cr=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},h0=0,Pd=new P,lr=new Rt,Bi=new Te,Ka=new P,vo=new P,u0=new P,f0=new Rt,Id=new P(1,0,0),Ld=new P(0,1,0),Dd=new P(0,0,1),Nd={type:"added"},d0={type:"removed"},cr={type:"childadded",child:null},Uh={type:"childremoved",child:null},dt=class s extends di{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:h0++}),this.uuid=wi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=s.DEFAULT_UP.clone();let e=new P,t=new ei,n=new Rt,i=new P(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Te},normalMatrix:{value:new Ge}}),this.matrix=new Te,this.matrixWorld=new Te,this.matrixAutoUpdate=s.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=s.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Cr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return lr.setFromAxisAngle(e,t),this.quaternion.multiply(lr),this}rotateOnWorldAxis(e,t){return lr.setFromAxisAngle(e,t),this.quaternion.premultiply(lr),this}rotateX(e){return this.rotateOnAxis(Id,e)}rotateY(e){return this.rotateOnAxis(Ld,e)}rotateZ(e){return this.rotateOnAxis(Dd,e)}translateOnAxis(e,t){return Pd.copy(e).applyQuaternion(this.quaternion),this.position.add(Pd.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Id,e)}translateY(e){return this.translateOnAxis(Ld,e)}translateZ(e){return this.translateOnAxis(Dd,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Bi.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Ka.copy(e):Ka.set(e,t,n);let i=this.parent;this.updateWorldMatrix(!0,!1),vo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Bi.lookAt(vo,Ka,this.up):Bi.lookAt(Ka,vo,this.up),this.quaternion.setFromRotationMatrix(Bi),i&&(Bi.extractRotation(i.matrixWorld),lr.setFromRotationMatrix(Bi),this.quaternion.premultiply(lr.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ve("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Nd),cr.child=e,this.dispatchEvent(cr),cr.child=null):Ve("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(d0),Uh.child=e,this.dispatchEvent(Uh),Uh.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Bi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Bi.multiply(e.parent.matrixWorld)),e.applyMatrix4(Bi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Nd),cr.child=e,this.dispatchEvent(cr),cr.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(vo,e,u0),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(vo,f0,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,i=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*i,r[13]+=n-r[1]*t-r[5]*n-r[9]*i,r[14]+=i-r[2]*t-r[6]*n-r[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));i.material=a}else i.material=r(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];i.animations.push(r(e.animations,l))}}if(t){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),f=o(e.shapes),u=o(e.skeletons),d=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=i,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let i=e.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};dt.DEFAULT_UP=new P(0,1,0);dt.DEFAULT_MATRIX_AUTO_UPDATE=!0;dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var fi=class extends dt{constructor(){super(),this.isGroup=!0,this.type="Group"}},p0={type:"move"},Pr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new fi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new fi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new fi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let v of e.hand.values()){let p=t.getJointPose(v,n),m=this._getHandJoint(c,v);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.quaternion,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&u>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.quaternion,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.quaternion,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(p0)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new fi;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},qp={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},us={h:0,s:0,l:0},ja={h:0,s:0,l:0};function Oh(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}var Pe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=kt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ke.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=Ke.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ke.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=Ke.workingColorSpace){if(e=Fu(e,1),t=We(t,0,1),n=We(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Oh(o,r,e+1/3),this.g=Oh(o,r,e),this.b=Oh(o,r,e-1/3)}return Ke.colorSpaceToWorking(this,i),this}setStyle(e,t=kt){function n(r){r!==void 0&&parseFloat(r)<1&&Ue("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseFloat(r[1]))/100,Math.min(100,parseFloat(r[2]))/100,Math.min(100,parseFloat(r[3]))/100,t);break;case"hsl":case"hsla":if(r=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ue("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Ue("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=kt){let n=qp[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ue("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Wi(e.r),this.g=Wi(e.g),this.b=Wi(e.b),this}copyLinearToSRGB(e){return this.r=Mr(e.r),this.g=Mr(e.g),this.b=Mr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=kt){return Ke.workingToColorSpace(Sn.copy(this),e),Math.round(We(Sn.r*255,0,255))*65536+Math.round(We(Sn.g*255,0,255))*256+Math.round(We(Sn.b*255,0,255))}getHexString(e=kt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ke.workingColorSpace){Ke.workingToColorSpace(Sn.copy(this),t);let n=Sn.r,i=Sn.g,r=Sn.b,o=Math.max(n,i,r),a=Math.min(n,i,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let f=o-a;switch(c=h<=.5?f/(o+a):f/(2-o-a),o){case n:l=(i-r)/f+(i<r?6:0);break;case i:l=(r-n)/f+2;break;case r:l=(n-i)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=Ke.workingColorSpace){return Ke.workingToColorSpace(Sn.copy(this),t),e.r=Sn.r,e.g=Sn.g,e.b=Sn.b,e}getStyle(e=kt){Ke.workingToColorSpace(Sn.copy(this),e);let t=Sn.r,n=Sn.g,i=Sn.b;return e!==kt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(us),this.setHSL(us.h+e,us.s+t,us.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(us),e.getHSL(ja);let n=Po(us.h,ja.h,t),i=Po(us.s,ja.s,t),r=Po(us.l,ja.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Sn=new Pe;Pe.NAMES=qp;var No=class s{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new Pe(e),this.near=t,this.far=n}clone(){return new s(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Vs=class extends dt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ei,this.environmentIntensity=1,this.environmentRotation=new ei,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background!==null?e.background.clone():null,this.environment=e.environment!==null?e.environment.clone():null,this.fog=e.fog!==null?e.fog.clone():null,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial!==null?e.overrideMaterial.clone():null,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},hi=new P,zi=new P,Fh=new P,ki=new P,hr=new P,ur=new P,Ud=new P,Bh=new P,zh=new P,kh=new P,Hh=new Mt,Vh=new Mt,Gh=new Mt,bn=class s{constructor(e=new P,t=new P,n=new P){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),hi.subVectors(e,t),i.cross(hi);let r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(e,t,n,i,r){hi.subVectors(i,t),zi.subVectors(n,t),Fh.subVectors(e,t);let o=hi.dot(hi),a=hi.dot(zi),l=hi.dot(Fh),c=zi.dot(zi),h=zi.dot(Fh),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;let u=1/f,d=(c*l-a*h)*u,g=(o*h-a*l)*u;return r.set(1-d-g,g,d)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,ki)===null?!1:ki.x>=0&&ki.y>=0&&ki.x+ki.y<=1}static getInterpolation(e,t,n,i,r,o,a,l){return this.getBarycoord(e,t,n,i,ki)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ki.x),l.addScaledVector(o,ki.y),l.addScaledVector(a,ki.z),l)}static getInterpolatedAttribute(e,t,n,i,r,o){return Hh.setScalar(0),Vh.setScalar(0),Gh.setScalar(0),Hh.fromBufferAttribute(e,t),Vh.fromBufferAttribute(e,n),Gh.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(Hh,r.x),o.addScaledVector(Vh,r.y),o.addScaledVector(Gh,r.z),o}static isFrontFacing(e,t,n,i){return hi.subVectors(n,t),zi.subVectors(e,t),hi.cross(zi).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return hi.subVectors(this.c,this.b),zi.subVectors(this.a,this.b),hi.cross(zi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return s.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return s.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,r){return s.getInterpolation(e,this.a,this.b,this.c,t,n,i,r)}containsPoint(e){return s.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return s.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,i=this.b,r=this.c,o,a;hr.subVectors(i,n),ur.subVectors(r,n),Bh.subVectors(e,n);let l=hr.dot(Bh),c=ur.dot(Bh);if(l<=0&&c<=0)return t.copy(n);zh.subVectors(e,i);let h=hr.dot(zh),f=ur.dot(zh);if(h>=0&&f<=h)return t.copy(i);let u=l*f-h*c;if(u<=0&&l>=0&&h<=0&&l-h>0)return o=l/(l-h),t.copy(n).addScaledVector(hr,o);kh.subVectors(e,r);let d=hr.dot(kh),g=ur.dot(kh);if(g>=0&&d<=g)return t.copy(r);let v=d*c-l*g;if(v<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(ur,a);let p=h*g-d*f;if(p<=0&&f-h>=0&&d-g>=0)return Ud.subVectors(r,i),a=(f-h)/(f-h+(d-g)),t.copy(i).addScaledVector(Ud,a);let m=1/(p+v+u);return o=v*m,a=u*m,t.copy(n).addScaledVector(hr,o).addScaledVector(ur,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},it=class{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ui.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ui.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=ui.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,ui):ui.fromBufferAttribute(r,o),ui.applyMatrix4(e.matrixWorld),this.expandByPoint(ui);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ja.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ja.copy(n.boundingBox)),Ja.applyMatrix4(e.matrixWorld),this.union(Ja)}let i=e.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ui),ui.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(So),$a.subVectors(this.max,So),fr.subVectors(e.a,So),dr.subVectors(e.b,So),pr.subVectors(e.c,So),fs.subVectors(dr,fr),ds.subVectors(pr,dr),Ds.subVectors(fr,pr);let t=[0,-fs.z,fs.y,0,-ds.z,ds.y,0,-Ds.z,Ds.y,fs.z,0,-fs.x,ds.z,0,-ds.x,Ds.z,0,-Ds.x,-fs.y,fs.x,0,-ds.y,ds.x,0,-Ds.y,Ds.x,0];return!Wh(t,fr,dr,pr,$a)||(t=[1,0,0,0,1,0,0,0,1],!Wh(t,fr,dr,pr,$a))?!1:(Qa.crossVectors(fs,ds),t=[Qa.x,Qa.y,Qa.z],Wh(t,fr,dr,pr,$a))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ui).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ui).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Hi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Hi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Hi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Hi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Hi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Hi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Hi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Hi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Hi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Hi=[new P,new P,new P,new P,new P,new P,new P,new P],ui=new P,Ja=new it,fr=new P,dr=new P,pr=new P,fs=new P,ds=new P,Ds=new P,So=new P,$a=new P,Qa=new P,Ns=new P;function Wh(s,e,t,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){Ns.fromArray(s,r);let a=i.x*Math.abs(Ns.x)+i.y*Math.abs(Ns.y)+i.z*Math.abs(Ns.z),l=e.dot(Ns),c=t.dot(Ns),h=n.dot(Ns);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Jt=new P,el=new pe,m0=0,Nt=class extends di{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:m0++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Uu,this.updateRanges=[],this.gpuType=Ln,this.version=0,this._normalizationScale=e!==void 0?Oc(e):void 0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)el.fromBufferAttribute(this,t),el.applyMatrix3(e),this.setXY(t,el.x,el.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Jt.fromBufferAttribute(this,t),Jt.applyMatrix3(e),this.setXYZ(t,Jt.x,Jt.y,Jt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Jt.fromBufferAttribute(this,t),Jt.applyMatrix4(e),this.setXYZ(t,Jt.x,Jt.y,Jt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Jt.fromBufferAttribute(this,t),Jt.applyNormalMatrix(e),this.setXYZ(t,Jt.x,Jt.y,Jt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Jt.fromBufferAttribute(this,t),Jt.transformDirection(e),this.setXYZ(t,Jt.x,Jt.y,Jt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i),r=this._normalize(r)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(e){let t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):zu(e,this.array)}_normalize(e){let t=this._normalizationScale;return t!==void 0?Math.round(e*t):ku(e,this.array)}};var Uo=class extends Nt{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Oo=class extends Nt{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var ut=class extends Nt{constructor(e,t,n){super(new Float32Array(e),t,n)}},g0=new it,Mo=new P,Xh=new P,$t=class{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):g0.setFromPoints(e).getCenter(n);let i=0;for(let r=0,o=e.length;r<o;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Mo.subVectors(e,this.center);let t=Mo.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Mo,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Xh.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Mo.copy(e.center).add(Xh)),this.expandByPoint(Mo.copy(e.center).sub(Xh))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},_0=0,Jn=new Te,qh=new dt,mr=new P,Xn=new it,bo=new it,cn=new P,bt=class s extends di{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:_0++}),this.uuid=wi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Vg(e)?Oo:Uo)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ge().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Jn.makeRotationFromQuaternion(e),this.applyMatrix4(Jn),this}rotateX(e){return Jn.makeRotationX(e),this.applyMatrix4(Jn),this}rotateY(e){return Jn.makeRotationY(e),this.applyMatrix4(Jn),this}rotateZ(e){return Jn.makeRotationZ(e),this.applyMatrix4(Jn),this}translate(e,t,n){return Jn.makeTranslation(e,t,n),this.applyMatrix4(Jn),this}scale(e,t,n){return Jn.makeScale(e,t,n),this.applyMatrix4(Jn),this}lookAt(e){return qh.lookAt(e),qh.updateMatrix(),this.applyMatrix4(qh.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(mr).negate(),this.translate(mr.x,mr.y,mr.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let i=0,r=e.length;i<r;i++){let o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ut(n,3))}else{let n=Math.min(e.length,t.count);for(let i=0;i<n;i++){let r=e[i];t.setXYZ(i,r.x,r.y,r.z||0)}e.length>t.count&&Ue("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new it);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ve("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){let r=t[n];Xn.setFromBufferAttribute(r),this.morphTargetsRelative?(cn.addVectors(this.boundingBox.min,Xn.min),this.boundingBox.expandByPoint(cn),cn.addVectors(this.boundingBox.max,Xn.max),this.boundingBox.expandByPoint(cn)):(this.boundingBox.expandByPoint(Xn.min),this.boundingBox.expandByPoint(Xn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ve('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new $t);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ve("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(e){let n=this.boundingSphere.center;if(Xn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];bo.setFromBufferAttribute(a),this.morphTargetsRelative?(cn.addVectors(Xn.min,bo.min),Xn.expandByPoint(cn),cn.addVectors(Xn.max,bo.max),Xn.expandByPoint(cn)):(Xn.expandByPoint(bo.min),Xn.expandByPoint(bo.max))}Xn.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)cn.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(cn));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)cn.fromBufferAttribute(a,c),l&&(mr.fromBufferAttribute(e,c),cn.add(mr)),i=Math.max(i,n.distanceToSquared(cn))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&Ve('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ve("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,i=t.normal,r=t.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Nt(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[],c=new Uint8Array(n.count);for(let R=0;R<n.count;R++)a[R]=new P,l[R]=new P;let h=new P,f=new P,u=new P,d=new pe,g=new pe,v=new pe,p=new P,m=new P;function x(R,w,C){c[R]=c[w]=c[C]=1,h.fromBufferAttribute(n,R),f.fromBufferAttribute(n,w),u.fromBufferAttribute(n,C),d.fromBufferAttribute(r,R),g.fromBufferAttribute(r,w),v.fromBufferAttribute(r,C),f.sub(h),u.sub(h),g.sub(d),v.sub(d);let I=1/(g.x*v.y-v.x*g.y);isFinite(I)&&(p.copy(f).multiplyScalar(v.y).addScaledVector(u,-g.y).multiplyScalar(I),m.copy(u).multiplyScalar(g.x).addScaledVector(f,-v.x).multiplyScalar(I),a[R].add(p),a[w].add(p),a[C].add(p),l[R].add(m),l[w].add(m),l[C].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let R=0,w=S.length;R<w;++R){let C=S[R],I=C.start,U=C.count;for(let D=I,B=I+U;D<B;D+=3)x(e.getX(D+0),e.getX(D+1),e.getX(D+2))}let y=new P,M=new P,T=new P,_=new P;function b(R){T.fromBufferAttribute(i,R),_.copy(T);let w=a[R];y.copy(w),y.sub(T.multiplyScalar(T.dot(w))).normalize(),M.crossVectors(_,w);let I=M.dot(l[R])<0?-1:1;o.setXYZW(R,y.x,y.y,y.z,I)}for(let R=0,w=n.count;R<w;++R)c[R]&&b(R);this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new Nt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);let i=new P,r=new P,o=new P,a=new P,l=new P,c=new P,h=new P,f=new P;if(e)for(let u=0,d=e.count;u<d;u+=3){let g=e.getX(u+0),v=e.getX(u+1),p=e.getX(u+2);i.fromBufferAttribute(t,g),r.fromBufferAttribute(t,v),o.fromBufferAttribute(t,p),h.subVectors(o,r),f.subVectors(i,r),h.cross(f),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let u=0,d=t.count;u<d;u+=3)i.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),o.fromBufferAttribute(t,u+2),h.subVectors(o,r),f.subVectors(i,r),h.cross(f),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)cn.fromBufferAttribute(e,t),cn.normalize(),e.setXYZ(t,cn.x,cn.y,cn.z)}toNonIndexed(){function e(a,l){let c=a.array,h=a.itemSize,f=a.normalized,u=new c.constructor(l.length*h),d=0,g=0;for(let v=0,p=l.length;v<p;v++){a.isInterleavedBufferAttribute?d=l[v]*a.data.stride+a.offset:d=l[v]*h;for(let m=0;m<h;m++)u[g++]=c[d++]}return new Nt(u,h,f)}if(this.index===null)return Ue("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new s,n=this.index.array,i=this.attributes;for(let a in i){let l=i[a],c=e(l,n);t.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,f=c.length;h<f;h++){let u=c[h],d=e(u,n);l.push(d)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let i={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let f=0,u=c.length;f<u;f++){let d=c[f];h.push(d.toJSON(e.data))}h.length>0&&(i[l]=h,r=!0)}r&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let i=e.attributes;for(let c in i){let h=i[c];this.setAttribute(c,h.clone(t))}let r=e.morphAttributes;for(let c in r){let h=[],f=r[c];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,h=o.length;c<h;c++){let f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ir=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Uu,this.updateRanges=[],this.version=0,this.uuid=wi()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,r=this.stride;i<r;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});let t=Od(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=this.array.slice(0).buffer);let n=new this.array.constructor(e.arrayBuffers[t]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});let t=Od(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=Array.from(new Uint32Array(this.array.slice(0).buffer)));let n={uuid:this.uuid,buffer:t,type:this.array.constructor.name,stride:this.stride};return n.usage=this.usage,n}};function Od(s){return s.buffer._uuid===void 0&&(s.buffer._uuid=wi()),s.byteOffset===0&&s.byteLength===s.buffer.byteLength?s.buffer._uuid:s.buffer._uuid+":"+s.byteOffset+":"+s.byteLength}var In=new P,Lr=class s{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i,this._normalizationScale=e!==void 0?Oc(e.array):void 0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)In.fromBufferAttribute(this,t),In.applyMatrix4(e),this.setXYZ(t,In.x,In.y,In.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)In.fromBufferAttribute(this,t),In.applyNormalMatrix(e),this.setXYZ(t,In.x,In.y,In.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)In.fromBufferAttribute(this,t),In.transformDirection(e),this.setXYZ(t,In.x,In.y,In.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=this._denormalize(t)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=this._denormalize(t)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=this._denormalize(t)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=this._denormalize(t)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i),r=this._normalize(r)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=r,this}clone(e){if(e===void 0){Lo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return new Nt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new s(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){Lo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(e){let t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):zu(e,this.data.array)}_normalize(e){let t=this._normalizationScale;return t!==void 0?Math.round(e*t):ku(e,this.data.array)}},Yh=new P,x0=new P,y0=new Ge,mn=class{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let i=Yh.subVectors(n,t).cross(x0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let i=e.delta(Yh),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(i,o)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||y0.getNormalMatrix(e),i=this.coplanarPoint(Yh).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},v0=0,wn=class extends di{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:v0++}),this.uuid=wi(),this.name="",this.type="Material",this.blending=Vr,this.side=Yn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Mu,this.blendDst=bu,this.blendEquation=ii,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Pe(0,0,0),this.blendAlpha=0,this.depthFunc=br,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Op,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Tl,this.stencilZFail=Tl,this.stencilZPass=Tl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Ue(`Material: parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){Ue(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector2&&n&&n.isVector2||i&&i.isEuler&&n&&n.isEuler||i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(t){let r=i(e.textures),o=i(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Pe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(n=>new mn().fromJSON(n))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new pe().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new pe().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var Vi=new P,Zh=new P,tl=new P,nl=new P,ti=class{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Vi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Vi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Vi.copy(this.origin).addScaledVector(this.direction,t),Vi.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Zh.copy(e).add(t).multiplyScalar(.5),tl.copy(t).sub(e).normalize(),nl.copy(this.origin).sub(Zh);let r=e.distanceTo(t)*.5,o=-this.direction.dot(tl),a=nl.dot(this.direction),l=-nl.dot(tl),c=nl.lengthSq(),h=Math.abs(1-o*o),f,u,d,g;if(h>0)if(f=o*l-a,u=o*a-l,g=r*h,f>=0)if(u>=-g)if(u<=g){let v=1/h;f*=v,u*=v,d=f*(f+o*u+2*a)+u*(o*f+u+2*l)+c}else u=r,f=Math.max(0,-(o*u+a)),d=-f*f+u*(u+2*l)+c;else u=-r,f=Math.max(0,-(o*u+a)),d=-f*f+u*(u+2*l)+c;else u<=-g?(f=Math.max(0,-(-o*r+a)),u=f>0?-r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c):u<=g?(f=0,u=Math.min(Math.max(-r,-l),r),d=u*(u+2*l)+c):(f=Math.max(0,-(o*r+a)),u=f>0?r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c);else u=o>0?-r:r,f=Math.max(0,-(o*u+a)),d=-f*f+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),i&&i.copy(Zh).addScaledVector(tl,u),d}intersectSphere(e,t){if(e.radius<0)return null;Vi.subVectors(e.center,this.origin);let n=Vi.dot(this.direction),i=Vi.dot(Vi)-n*n,r=e.radius*e.radius;if(i>r)return null;let o=Math.sqrt(r-i),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return c>=0?(n=(e.min.x-u.x)*c,i=(e.max.x-u.x)*c):(n=(e.max.x-u.x)*c,i=(e.min.x-u.x)*c),h>=0?(r=(e.min.y-u.y)*h,o=(e.max.y-u.y)*h):(r=(e.max.y-u.y)*h,o=(e.min.y-u.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),f>=0?(a=(e.min.z-u.z)*f,l=(e.max.z-u.z)*f):(a=(e.max.z-u.z)*f,l=(e.min.z-u.z)*f),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,Vi)!==null}intersectTriangle(e,t,n,i,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,f=e.x-o.x,u=e.y-o.y,d=e.z-o.z,g=t.x-o.x,v=t.y-o.y,p=t.z-o.z,m=n.x-o.x,x=n.y-o.y,S=n.z-o.z,y=Math.abs(l),M=Math.abs(c),T=Math.abs(h),_,b,R,w,C,I,U,D,B,H,G,ee;if(y>=M&&y>=T?(R=l,I=f,B=g,ee=m,l>=0?(_=c,b=h,w=u,C=d,U=v,D=p,H=x,G=S):(_=h,b=c,w=d,C=u,U=p,D=v,H=S,G=x)):M>=T?(R=c,I=u,B=v,ee=x,c>=0?(_=h,b=l,w=d,C=f,U=p,D=g,H=S,G=m):(_=l,b=h,w=f,C=d,U=g,D=p,H=m,G=S)):(R=h,I=d,B=p,ee=S,h>=0?(_=l,b=c,w=f,C=u,U=g,D=v,H=m,G=x):(_=c,b=l,w=u,C=f,U=v,D=g,H=x,G=m)),R===0)return null;let V=_/R,Q=b/R,ne=1/R,de=w-V*I,we=C-Q*I,$=U-V*B,ue=D-Q*B,Se=H-V*ee,Ee=G-Q*ee,me=Se*ue-Ee*$,Le=de*Ee-we*Se,rt=$*we-ue*de;if(i){if(me<0||Le<0||rt<0)return null}else if((me<0||Le<0||rt<0)&&(me>0||Le>0||rt>0))return null;let Be=me+Le+rt;if(Be===0)return null;let He=ne*(me*I+Le*B+rt*ee);return(Be>0?He<0:He>0)?null:this.at(He/Be,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},hn=class extends wn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Pe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ei,this.combine=Jl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Fd=new Te,Us=new ti,il=new $t,Bd=new P,sl=new P,rl=new P,ol=new P,Kh=new P,al=new P,zd=new P,ll=new P,le=class extends dt{constructor(e=new bt,t=new hn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){let a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);let a=this.morphTargetInfluences;if(r&&a){al.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],f=r[l];h!==0&&(Kh.fromBufferAttribute(f,e),o?al.addScaledVector(Kh,h):al.addScaledVector(Kh.sub(t),h))}t.add(al)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),il.copy(n.boundingSphere),il.applyMatrix4(r),Us.copy(e.ray).recast(e.near),!(il.containsPoint(Us.origin)===!1&&(Us.intersectSphere(il,Bd)===null||Us.origin.distanceToSquared(Bd)>(e.far-e.near)**2))&&(Fd.copy(r).invert(),Us.copy(e.ray).applyMatrix4(Fd),!(n.boundingBox!==null&&Us.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Us)))}_computeIntersections(e,t,n){let i,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,u=r.groups,d=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,v=u.length;g<v;g++){let p=u[g],m=o[p.materialIndex],x=Math.max(p.start,d.start),S=Math.min(a.count,Math.min(p.start+p.count,d.start+d.count));for(let y=x,M=S;y<M;y+=3){let T=a.getX(y),_=a.getX(y+1),b=a.getX(y+2);i=cl(this,m,e,n,c,h,f,T,_,b),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=p.materialIndex,t.push(i))}}else{let g=Math.max(0,d.start),v=Math.min(a.count,d.start+d.count);for(let p=g,m=v;p<m;p+=3){let x=a.getX(p),S=a.getX(p+1),y=a.getX(p+2);i=cl(this,o,e,n,c,h,f,x,S,y),i&&(i.faceIndex=Math.floor(p/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,v=u.length;g<v;g++){let p=u[g],m=o[p.materialIndex],x=Math.max(p.start,d.start),S=Math.min(l.count,Math.min(p.start+p.count,d.start+d.count));for(let y=x,M=S;y<M;y+=3){let T=y,_=y+1,b=y+2;i=cl(this,m,e,n,c,h,f,T,_,b),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=p.materialIndex,t.push(i))}}else{let g=Math.max(0,d.start),v=Math.min(l.count,d.start+d.count);for(let p=g,m=v;p<m;p+=3){let x=p,S=p+1,y=p+2;i=cl(this,o,e,n,c,h,f,x,S,y),i&&(i.faceIndex=Math.floor(p/3),t.push(i))}}}};function S0(s,e,t,n,i,r,o,a){let l;if(e.side===sn?l=n.intersectTriangle(o,r,i,!0,a):l=n.intersectTriangle(i,r,o,e.side===Yn,a),l===null)return null;ll.copy(a),ll.applyMatrix4(s.matrixWorld);let c=t.ray.origin.distanceTo(ll);return c<t.near||c>t.far?null:{distance:c,point:ll.clone(),object:s}}function cl(s,e,t,n,i,r,o,a,l,c){s.getVertexPosition(a,sl),s.getVertexPosition(l,rl),s.getVertexPosition(c,ol);let h=S0(s,e,t,n,sl,rl,ol,zd);if(h){let f=new P;bn.getBarycoord(zd,sl,rl,ol,f),i&&(h.uv=bn.getInterpolatedAttribute(i,a,l,c,f,new pe)),r&&(h.uv1=bn.getInterpolatedAttribute(r,a,l,c,f,new pe)),o&&(h.normal=bn.getInterpolatedAttribute(o,a,l,c,f,new P),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new P,materialIndex:0};bn.getNormal(sl,rl,ol,u.normal),h.face=u,h.barycoord=f}return h}var To=new Mt,kd=new Mt,Hd=new Mt,M0=new Mt,Vd=new Te,hl=new P,jh=new $t,Gd=new Te,Jh=new ti,Fo=class extends le{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=ru,this.bindMatrix=new Te,this.bindMatrixInverse=new Te,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new it),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,hl),this.boundingBox.expandByPoint(hl)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new $t),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,hl),this.boundingSphere.expandByPoint(hl)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}raycast(e,t){let n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),jh.copy(this.boundingSphere),jh.applyMatrix4(i),e.ray.intersectsSphere(jh)!==!1&&(Gd.copy(i).invert(),Jh.copy(e.ray).applyMatrix4(Gd),!(this.boundingBox!==null&&Jh.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Jh)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new Mt,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===ru?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Lp?this.bindMatrixInverse.copy(this.bindMatrix).invert():Ue("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,i=this.geometry;kd.fromBufferAttribute(i.attributes.skinIndex,e),Hd.fromBufferAttribute(i.attributes.skinWeight,e),t.isVector4?(To.copy(t),t.set(0,0,0,0)):(To.set(t.x,t.y,t.z,1),t.set(0,0,0)),To.applyMatrix4(this.bindMatrix);for(let r=0;r<4;r++){let o=Hd.getComponent(r);if(o!==0){let a=kd.getComponent(r);Vd.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(M0.copy(To).applyMatrix4(Vd),o)}}return t.isVector4&&(t.w=To.w),t.applyMatrix4(this.bindMatrixInverse)}},Dr=class extends dt{constructor(){super(),this.isBone=!0,this.type="Bone"}},qn=class extends tn{constructor(e=null,t=1,n=1,i,r,o,a,l,c=Ut,h=Ut,f,u){super(null,o,a,l,c,h,i,r,f,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Wd=new Te,b0=new Te,Bo=class s{constructor(e=[],t=[]){this.uuid=wi(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.previousBoneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Ue("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new Te)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let n=new Te;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let r=0,o=e.length;r<o;r++){let a=e[r]?e[r].matrixWorld:b0;Wd.multiplyMatrices(a,t[r]),Wd.toArray(n,r*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new s(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new qn(t,e,e,Tn,Ln);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let i=this.bones[t];if(i.name===e)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null),this.previousBoneTexture!==null&&(this.previousBoneTexture.dispose(),this.previousBoneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,i=e.bones.length;n<i;n++){let r=e.bones[n],o=t[r];o===void 0&&(Ue("Skeleton: No bone found with UUID:",r),o=new Dr),this.bones.push(o),this.boneInverses.push(new Te().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let i=0,r=t.length;i<r;i++){let o=t[i];e.bones.push(o.uuid);let a=n[i];e.boneInverses.push(a.toArray())}return e}},qi=class extends Nt{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},gr=new Te,Xd=new Te,ul=[],qd=new it,T0=new Te,wo=new le,Eo=new $t,Gs=class extends le{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new qi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,T0)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new it),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,gr),qd.copy(e.boundingBox).applyMatrix4(gr),this.boundingBox.union(qd)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new $t),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,gr),Eo.copy(e.boundingSphere).applyMatrix4(gr),this.boundingSphere.union(Eo)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),this.morphTexture=e.morphTexture!==null?e.morphTexture.clone():null,this.instanceColor=e.instanceColor!==null?e.instanceColor.clone():null,this.count=e.count,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=i[o+a]}raycast(e,t){let n=this.matrixWorld,i=this.count;if(wo.geometry=this.geometry,wo.material=this.material,wo.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Eo.copy(this.boundingSphere),Eo.applyMatrix4(n),e.ray.intersectsSphere(Eo)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,gr),Xd.multiplyMatrices(n,gr),wo.matrixWorld=Xd,wo.raycast(e,ul);for(let o=0,a=ul.length;o<a;o++){let l=ul[o];l.instanceId=r,l.object=this,t.push(l)}ul.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new qi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new qn(new Float32Array(i*this.count),i,this.count,ic,Ln));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<n.length;c++)o+=n[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=i*e;return r[l]=a,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Os=new $t,w0=new pe(.5,.5),fl=new P,Yi=class{constructor(e=new mn,t=new mn,n=new mn,i=new mn,r=new mn,o=new mn){this.planes=[e,t,n,i,r,o]}set(e,t,n,i,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Qn,n=!1){let i=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],f=r[5],u=r[6],d=r[7],g=r[8],v=r[9],p=r[10],m=r[11],x=r[12],S=r[13],y=r[14],M=r[15];if(i[0].setComponents(c-o,d-h,m-g,M-x).normalize(),i[1].setComponents(c+o,d+h,m+g,M+x).normalize(),i[2].setComponents(c+a,d+f,m+v,M+S).normalize(),i[3].setComponents(c-a,d-f,m-v,M-S).normalize(),n)i[4].setComponents(l,u,p,y).normalize(),i[5].setComponents(c-l,d-u,m-p,M-y).normalize();else if(i[4].setComponents(c-l,d-u,m-p,M-y).normalize(),t===Qn)i[5].setComponents(c+l,d+u,m+p,M+y).normalize();else if(t===wr)i[5].setComponents(l,u,p,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Os.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Os.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Os)}intersectsSprite(e){Os.center.set(0,0,0);let t=w0.distanceTo(e.center);return Os.radius=.7071067811865476+t,Os.applyMatrix4(e.matrixWorld),this.intersectsSphere(Os)}intersectsSphere(e){let t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let i=t[n];if(fl.x=i.normal.x>0?e.max.x:e.min.x,fl.y=i.normal.y>0?e.max.y:e.min.y,fl.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(fl)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Yd=new Te,zo=class s{constructor(){this.coordinateSystem=Qn,this._frustums=[],this._count=0}setFromArrayCamera(e){let t=e.cameras,n=this._frustums;for(let i=0;i<t.length;i++){let r=t[i];Yd.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[i]===void 0&&(n[i]=new Yi),n[i].setFromProjectionMatrix(Yd,r.coordinateSystem,r.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;let t=this._frustums,n=e._frustums;for(let i=0;i<e._count;i++)t[i]===void 0&&(t[i]=new Yi),t[i].copy(n[i]);return this._count=e._count,this}clone(){return new s().copy(this)}};function $h(s,e){return s-e}function E0(s,e){return s.z-e.z}function A0(s,e){return e.z-s.z}var hu=class{constructor(){this.index=0,this.pool=[],this.list=[]}push(e,t,n,i){let r=this.pool,o=this.list;this.index>=r.length&&r.push({start:-1,count:-1,z:-1,index:-1});let a=r[this.index];o.push(a),this.index++,a.start=e,a.count=t,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}},zn=new Te,R0=new Pe(1,1,1),C0=new Yi,P0=new zo,dl=new it,Fs=new $t,Qh=new P,Zd=new P,Kd=new P,I0=new P,eu=new hu,Mn=new le,pl=[];function L0(s,e,t=0){let n=e.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==e.array.constructor){let i=s.count;for(let r=0;r<i;r++)for(let o=0;o<n;o++)e.setComponent(r+t,o,s.getComponent(r,o))}else e.array.set(s.array,t*n);e.needsUpdate=!0}function yi(s,e){if(s.constructor!==e.constructor){let t=Math.min(s.length,e.length);for(let n=0;n<t;n++)e[n]=s[n]}else{let t=Math.min(s.length,e.length);e.set(new s.constructor(s.buffer,0,t))}}var ko=class extends le{constructor(e,t,n=t*2,i){super(new bt,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=e,this._maxVertexCount=t,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(e),this._multiDrawStarts=new Int32Array(e),this._multiDrawCount=0,this._multiDrawBytesPerElement=1,this._mergedDrawCounts=new Int32Array(e),this._mergedDrawStarts=new Int32Array(e),this._mergedDrawInstanceCounts=new Int32Array(e),this._mergedDrawCount=0,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._previousMatricesTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}_initMatricesTexture(){let e=Math.sqrt(this._maxInstanceCount*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4),n=new qn(t,e,e,Tn,Ln);this._matricesTexture=n}_initIndirectTexture(){let e=Math.sqrt(this._maxInstanceCount);e=Math.ceil(e);let t=new Uint32Array(e*e),n=new qn(t,e,e,fa,ri);this._indirectTexture=n}_initColorsTexture(){let e=Math.sqrt(this._maxInstanceCount);e=Math.ceil(e);let t=new Float32Array(e*e*4).fill(1),n=new qn(t,e,e,Tn,Ln);n.colorSpace=Ke.workingColorSpace,this._colorsTexture=n}_initializeGeometry(e){let t=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(let r in e.attributes){let o=e.getAttribute(r),{array:a,itemSize:l,normalized:c}=o,h=new a.constructor(n*l),f=new Nt(h,l,c);t.setAttribute(r,f)}if(e.getIndex()!==null){let r=n>65535?new Uint32Array(i):new Uint16Array(i);t.setIndex(new Nt(r,1))}this._geometryInitialized=!0}}_validateGeometry(e){let t=this.geometry;if(!!e.getIndex()!=!!t.getIndex())throw new Error('THREE.BatchedMesh: All geometries must consistently have "index".');for(let n in t.attributes){if(!e.hasAttribute(n))throw new Error(`THREE.BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);let i=e.getAttribute(n),r=t.getAttribute(n);if(i.itemSize!==r.itemSize||i.normalized!==r.normalized)throw new Error(`THREE.BatchedMesh: Added geometry attribute "${n}" has an inconsistent itemSize or normalized value.`)}}validateInstanceId(e){let t=this._instanceInfo;if(e<0||e>=t.length||t[e].active===!1)throw new Error(`THREE.BatchedMesh: Invalid instanceId ${e}. Instance is either out of range or has been deleted.`)}validateGeometryId(e){let t=this._geometryInfo;if(e<0||e>=t.length||t[e].active===!1)throw new Error(`THREE.BatchedMesh: Invalid geometryId ${e}. Geometry is either out of range or has been deleted.`)}setCustomSort(e){return this.customSort=e,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new it);let e=this.boundingBox,t=this._instanceInfo;e.makeEmpty();for(let n=0,i=t.length;n<i;n++){if(t[n].active===!1)continue;let r=t[n].geometryIndex;this.getMatrixAt(n,zn),this.getBoundingBoxAt(r,dl).applyMatrix4(zn),e.union(dl)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new $t);let e=this.boundingSphere,t=this._instanceInfo;e.makeEmpty();for(let n=0,i=t.length;n<i;n++){if(t[n].active===!1)continue;let r=t[n].geometryIndex;this.getMatrixAt(n,zn),this.getBoundingSphereAt(r,Fs).applyMatrix4(zn),e.union(Fs)}}addInstance(e){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("THREE.BatchedMesh: Maximum item count reached.");let n={visible:!0,active:!0,geometryIndex:e},i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort($h),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));let r=this._matricesTexture;zn.identity().toArray(r.image.data,i*16),r.needsUpdate=!0;let o=this._colorsTexture;return o&&(R0.toArray(o.image.data,i*4),o.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(e,t=-1,n=-1){this._initializeGeometry(e),this._validateGeometry(e);let i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},r=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=t===-1?e.getAttribute("position").count:t;let o=e.getIndex();if(o!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?o.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");let l;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort($h),l=this._availableGeometryIds.shift(),r[l]=i):(l=this._geometryCount,this._geometryCount++,r.push(i)),this.setGeometryAt(l,e),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,l}setGeometryAt(e,t){if(e>=this._geometryCount)throw new Error("THREE.BatchedMesh: Maximum geometry count reached.");this._validateGeometry(t);let n=this.geometry,i=n.getIndex()!==null,r=n.getIndex(),o=t.getIndex(),a=this._geometryInfo[e];if(i&&o.count>a.reservedIndexCount||t.attributes.position.count>a.reservedVertexCount)throw new Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");let l=a.vertexStart,c=a.reservedVertexCount;a.vertexCount=t.getAttribute("position").count;for(let h in n.attributes){let f=t.getAttribute(h),u=n.getAttribute(h);L0(f,u,l);let d=f.itemSize;for(let g=f.count,v=c;g<v;g++){let p=l+g;for(let m=0;m<d;m++)u.setComponent(p,m,0)}u.needsUpdate=!0,u.addUpdateRange(l*d,c*d)}if(i){let h=a.indexStart,f=a.reservedIndexCount;a.indexCount=t.getIndex().count;for(let u=0;u<o.count;u++)r.setX(h+u,l+o.getX(u));for(let u=o.count,d=f;u<d;u++)r.setX(h+u,l);r.needsUpdate=!0,r.addUpdateRange(h,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,t.boundingBox!==null&&(a.boundingBox=t.boundingBox.clone()),a.boundingSphere=null,t.boundingSphere!==null&&(a.boundingSphere=t.boundingSphere.clone()),this._visibilityChanged=!0,e}deleteGeometry(e){let t=this._geometryInfo;if(e>=t.length||t[e].active===!1)return this;let n=this._instanceInfo;for(let i=0,r=n.length;i<r;i++)n[i].active&&n[i].geometryIndex===e&&this.deleteInstance(i);return t[e].active=!1,this._availableGeometryIds.push(e),this._visibilityChanged=!0,this}deleteInstance(e){return this.validateInstanceId(e),this._instanceInfo[e].active=!1,this._availableInstanceIds.push(e),this._visibilityChanged=!0,this}optimize(){let e=0,t=0,n=this._geometryInfo,i=n.map((o,a)=>a).sort((o,a)=>n[o].vertexStart-n[a].vertexStart),r=this.geometry;for(let o=0,a=n.length;o<a;o++){let l=i[o],c=n[l];if(c.active!==!1){if(r.index!==null){if(c.indexStart!==t){let{indexStart:h,vertexStart:f,reservedIndexCount:u}=c,d=r.index,g=d.array,v=e-f;for(let p=h;p<h+u;p++)g[p]=g[p]+v;d.array.copyWithin(t,h,h+u),d.addUpdateRange(t,u),d.needsUpdate=!0,c.indexStart=t}t+=c.reservedIndexCount}if(c.vertexStart!==e){let{vertexStart:h,reservedVertexCount:f}=c,u=r.attributes;for(let d in u){let g=u[d],{array:v,itemSize:p}=g;v.copyWithin(e*p,h*p,(h+f)*p),g.addUpdateRange(e*p,f*p),g.needsUpdate=!0}c.vertexStart=e}e+=c.reservedVertexCount,c.start=r.index?c.indexStart:c.vertexStart}}return this._nextIndexStart=t,this._nextVertexStart=e,this._visibilityChanged=!0,this}getBoundingBoxAt(e,t){if(e>=this._geometryCount)return null;let n=this.geometry,i=this._geometryInfo[e];if(i.boundingBox===null){let r=new it,o=n.index,a=n.attributes.position;for(let l=i.start,c=i.start+i.count;l<c;l++){let h=l;o&&(h=o.getX(h)),r.expandByPoint(Qh.fromBufferAttribute(a,h))}i.boundingBox=r}return t.copy(i.boundingBox),t}getBoundingSphereAt(e,t){if(e>=this._geometryCount)return null;let n=this.geometry,i=this._geometryInfo[e];if(i.boundingSphere===null){let r=new $t;this.getBoundingBoxAt(e,dl),dl.getCenter(r.center);let o=n.index,a=n.attributes.position,l=0;for(let c=i.start,h=i.start+i.count;c<h;c++){let f=c;o&&(f=o.getX(f)),Qh.fromBufferAttribute(a,f),l=Math.max(l,r.center.distanceToSquared(Qh))}r.radius=Math.sqrt(l),i.boundingSphere=r}return t.copy(i.boundingSphere),t}setMatrixAt(e,t){this.validateInstanceId(e);let n=this._matricesTexture,i=this._matricesTexture.image.data;return t.toArray(i,e*16),n.needsUpdate=!0,this}getMatrixAt(e,t){return this.validateInstanceId(e),t.fromArray(this._matricesTexture.image.data,e*16)}setColorAt(e,t){return this.validateInstanceId(e),this._colorsTexture===null&&this._initColorsTexture(),t.toArray(this._colorsTexture.image.data,e*4),this._colorsTexture.needsUpdate=!0,this}getColorAt(e,t){return this.validateInstanceId(e),this._colorsTexture===null?t.isVector4?t.set(1,1,1,1):t.setRGB(1,1,1):t.fromArray(this._colorsTexture.image.data,e*4)}setVisibleAt(e,t){return this.validateInstanceId(e),this._instanceInfo[e].visible===t?this:(this._instanceInfo[e].visible=t,this._visibilityChanged=!0,this)}getVisibleAt(e){return this.validateInstanceId(e),this._instanceInfo[e].visible}setGeometryIdAt(e,t){return this.validateInstanceId(e),this.validateGeometryId(t),this._instanceInfo[e].geometryIndex=t,this._visibilityChanged=!0,this}getGeometryIdAt(e){return this.validateInstanceId(e),this._instanceInfo[e].geometryIndex}getGeometryRangeAt(e,t={}){this.validateGeometryId(e);let n=this._geometryInfo[e];return t.vertexStart=n.vertexStart,t.vertexCount=n.vertexCount,t.reservedVertexCount=n.reservedVertexCount,t.indexStart=n.indexStart,t.indexCount=n.indexCount,t.reservedIndexCount=n.reservedIndexCount,t.start=n.start,t.count=n.count,t}setInstanceCount(e){let t=this._availableInstanceIds,n=this._instanceInfo;for(t.sort($h);t[t.length-1]===n.length-1;)n.pop(),t.pop();if(e<n.length)throw new Error(`THREE.BatchedMesh: Instance ids outside the range ${e} are being used. Cannot shrink instance count.`);let i=new Int32Array(e),r=new Int32Array(e);yi(this._multiDrawCounts,i),yi(this._multiDrawStarts,r),this._multiDrawCounts=i,this._multiDrawStarts=r;let o=new Int32Array(e),a=new Int32Array(e),l=new Int32Array(e);yi(this._mergedDrawCounts,o),yi(this._mergedDrawStarts,a),yi(this._mergedDrawInstanceCounts,l),this._mergedDrawCounts=o,this._mergedDrawStarts=a,this._mergedDrawInstanceCounts=l,this._maxInstanceCount=e;let c=this._indirectTexture,h=this._matricesTexture,f=this._colorsTexture;c.dispose(),this._initIndirectTexture(),yi(c.image.data,this._indirectTexture.image.data),h.dispose(),this._initMatricesTexture(),yi(h.image.data,this._matricesTexture.image.data),f&&(f.dispose(),this._initColorsTexture(),yi(f.image.data,this._colorsTexture.image.data)),this._previousMatricesTexture!==null&&(this._previousMatricesTexture.dispose(),this._previousMatricesTexture=null)}setGeometrySize(e,t){let n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>e)throw new Error(`THREE.BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(l=>l.indexStart+l.reservedIndexCount))>t)throw new Error(`THREE.BatchedMesh: Geometry index values are being used outside the range ${t}. Cannot shrink further.`);let r=this.geometry;r.dispose(),this._maxVertexCount=e,this._maxIndexCount=t,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new bt,this._initializeGeometry(r));let o=this.geometry;r.index&&yi(r.index.array,o.index.array);for(let a in r.attributes)yi(r.attributes[a].array,o.attributes[a].array);this._visibilityChanged=!0}raycast(e,t){let n=this._instanceInfo,i=this._geometryInfo,r=this.matrixWorld,o=this.geometry;Mn.material=this.material,Mn.geometry.index=o.index,Mn.geometry.attributes=o.attributes,Mn.geometry.boundingBox===null&&(Mn.geometry.boundingBox=new it),Mn.geometry.boundingSphere===null&&(Mn.geometry.boundingSphere=new $t);for(let a=0,l=n.length;a<l;a++){if(!n[a].visible||!n[a].active)continue;let c=n[a].geometryIndex,h=i[c];Mn.geometry.setDrawRange(h.start,h.count),this.getMatrixAt(a,Mn.matrixWorld).premultiply(r),this.getBoundingBoxAt(c,Mn.geometry.boundingBox),this.getBoundingSphereAt(c,Mn.geometry.boundingSphere),Mn.raycast(e,pl);for(let f=0,u=pl.length;f<u;f++){let d=pl[f];d.object=this,d.batchId=a,t.push(d)}pl.length=0}Mn.material=null,Mn.geometry.index=null,Mn.geometry.attributes={},Mn.geometry.setDrawRange(0,1/0)}copy(e){return super.copy(e),this.geometry=e.geometry.clone(),this.perObjectFrustumCulled=e.perObjectFrustumCulled,this.sortObjects=e.sortObjects,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this._geometryInfo=e._geometryInfo.map(t=>({...t,boundingBox:t.boundingBox!==null?t.boundingBox.clone():null,boundingSphere:t.boundingSphere!==null?t.boundingSphere.clone():null})),this._instanceInfo=e._instanceInfo.map(t=>({...t})),this._availableInstanceIds=e._availableInstanceIds.slice(),this._availableGeometryIds=e._availableGeometryIds.slice(),this._nextIndexStart=e._nextIndexStart,this._nextVertexStart=e._nextVertexStart,this._geometryCount=e._geometryCount,this._maxInstanceCount=e._maxInstanceCount,this._maxVertexCount=e._maxVertexCount,this._maxIndexCount=e._maxIndexCount,this._geometryInitialized=e._geometryInitialized,this._multiDrawCounts=e._multiDrawCounts.slice(),this._multiDrawStarts=e._multiDrawStarts.slice(),this._multiDrawBytesPerElement=e._multiDrawBytesPerElement,this._mergedDrawCounts=e._mergedDrawCounts.slice(),this._mergedDrawStarts=e._mergedDrawStarts.slice(),this._mergedDrawInstanceCounts=e._mergedDrawInstanceCounts.slice(),this._indirectTexture=e._indirectTexture.clone(),this._indirectTexture.image.data=this._indirectTexture.image.data.slice(),this._matricesTexture=e._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),e._colorsTexture!==null?(this._colorsTexture=e._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()):this._colorsTexture=null,this}dispose(){super.dispose(),this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null),this._previousMatricesTexture!==null&&(this._previousMatricesTexture.dispose(),this._previousMatricesTexture=null)}_updateDrawParameters(e,t,n,i="multiDraw"){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;let r=t.getIndex(),o=r===null?1:r.array.BYTES_PER_ELEMENT,a=1;n.wireframe&&(a=2,o=t.attributes.position.count>65535?4:2);let l=this._instanceInfo,c=this._multiDrawStarts,h=this._multiDrawCounts,f=this._mergedDrawStarts,u=this._mergedDrawCounts,d=this._mergedDrawInstanceCounts,g=this._geometryInfo,v=this.perObjectFrustumCulled,p=this._indirectTexture,m=p.image.data,x=e.isArrayCamera?P0:C0;v&&(e.isArrayCamera?x.setFromArrayCamera(e):(zn.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse).multiply(this.matrixWorld),x.setFromProjectionMatrix(zn,e.coordinateSystem,e.reversedDepth)));let S=0,y=0;if(this.sortObjects){zn.copy(this.matrixWorld).invert(),Zd.setFromMatrixPosition(e.matrixWorld).applyMatrix4(zn),Kd.set(0,0,-1).transformDirection(e.matrixWorld).transformDirection(zn);for(let _=0,b=l.length;_<b;_++)if(l[_].visible&&l[_].active){let R=l[_].geometryIndex;this.getMatrixAt(_,zn),this.getBoundingSphereAt(R,Fs).applyMatrix4(zn);let w=!1;if(v&&(w=!x.intersectsSphere(Fs)),!w){let C=g[R],I=I0.subVectors(Fs.center,Zd).dot(Kd);eu.push(C.start,C.count,I,_)}}let M=eu.list,T=this.customSort;T===null?M.sort(n.transparent?A0:E0):T.call(this,M,e);for(let _=0,b=M.length;_<b;_++){let R=M[_],w=R.start*o*a,C=R.count*a;i==="merged"?y>0&&f[y-1]===w&&u[y-1]===C?d[y-1]++:(f[y]=w,u[y]=C,d[y]=1,y++):(c[S]=w,h[S]=C),m[S]=R.index,S++}eu.reset()}else for(let M=0,T=l.length;M<T;M++)if(l[M].visible&&l[M].active){let _=l[M].geometryIndex,b=!1;if(v&&(this.getMatrixAt(M,zn),this.getBoundingSphereAt(_,Fs).applyMatrix4(zn),b=!x.intersectsSphere(Fs)),!b){let R=g[_],w=R.start*o*a,C=R.count*a;i==="merged"?y>0&&f[y-1]===w&&u[y-1]===C?d[y-1]++:(f[y]=w,u[y]=C,d[y]=1,y++):(c[S]=w,h[S]=C),m[S]=M,S++}}p.needsUpdate=!0,this._multiDrawCount=S,this._mergedDrawCount=y,this._multiDrawBytesPerElement=o,this._visibilityChanged=!1}onBeforeRender(e,t,n,i,r){e.isWebGPURenderer===!0?(this._visibilityChanged||this.perObjectFrustumCulled||this.sortObjects)&&(this._indirectTexture.needsUpdate=!0):this._updateDrawParameters(n,i,r)}onBeforeShadow(e,t,n,i,r,o){e.isWebGPURenderer!==!0&&this._updateDrawParameters(i,r,o)}},Zi=class extends wn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Pe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ul=new P,Ol=new P,jd=new Te,Ao=new ti,ml=new $t,tu=new P,Jd=new P,nn=class extends dt{constructor(e=new bt,t=new Zi){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let i=1,r=t.count;i<r;i++)Ul.fromBufferAttribute(t,i-1),Ol.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Ul.distanceTo(Ol);e.setAttribute("lineDistance",new ut(n,1))}else Ue("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,i=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ml.copy(n.boundingSphere),ml.applyMatrix4(i),ml.radius+=r,e.ray.intersectsSphere(ml)===!1)return;jd.copy(i).invert(),Ao.copy(e.ray).applyMatrix4(jd);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let d=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let v=d,p=g-1;v<p;v+=c){let m=h.getX(v),x=h.getX(v+1),S=gl(this,e,Ao,l,m,x,v);S&&t.push(S)}if(this.isLineLoop){let v=h.getX(g-1),p=h.getX(d),m=gl(this,e,Ao,l,v,p,g-1);m&&t.push(m)}}else{let d=Math.max(0,o.start),g=Math.min(u.count,o.start+o.count);for(let v=d,p=g-1;v<p;v+=c){let m=gl(this,e,Ao,l,v,v+1,v);m&&t.push(m)}if(this.isLineLoop){let v=gl(this,e,Ao,l,g-1,d,g-1);v&&t.push(v)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){let a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function gl(s,e,t,n,i,r,o){let a=s.geometry.attributes.position;if(Ul.fromBufferAttribute(a,i),Ol.fromBufferAttribute(a,r),t.distanceSqToSegment(Ul,Ol,tu,Jd)>n)return;tu.applyMatrix4(s.matrixWorld);let c=e.ray.origin.distanceTo(tu);if(!(c<e.near||c>e.far))return{distance:c,point:Jd.clone().applyMatrix4(s.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:s}}var $d=new P,Qd=new P,Ki=class extends nn{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let i=0,r=t.count;i<r;i+=2)$d.fromBufferAttribute(t,i),Qd.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+$d.distanceTo(Qd);e.setAttribute("lineDistance",new ut(n,1))}else Ue("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},gs=class extends nn{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}},Nr=class extends wn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Pe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},ep=new Te,uu=new ti,_l=new $t,xl=new P,_s=class extends dt{constructor(e=new bt,t=new Nr){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,i=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),_l.copy(n.boundingSphere),_l.applyMatrix4(i),_l.radius+=r,e.ray.intersectsSphere(_l)===!1)return;ep.copy(i).invert(),uu.copy(e.ray).applyMatrix4(ep);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,f=n.attributes.position;if(c!==null){let u=Math.max(0,o.start),d=Math.min(c.count,o.start+o.count);for(let g=u,v=d;g<v;g++){let p=c.getX(g);xl.fromBufferAttribute(f,p),tp(xl,p,l,i,e,t,this)}}else{let u=Math.max(0,o.start),d=Math.min(f.count,o.start+o.count);for(let g=u,v=d;g<v;g++)xl.fromBufferAttribute(f,g),tp(xl,g,l,i,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){let a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function tp(s,e,t,n,i,r,o){let a=uu.distanceSqToPoint(s);if(a<t){let l=new P;uu.closestPointToPoint(s,l),l.applyMatrix4(n);let c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}var Ho=class extends tn{constructor(e=[],t=Js,n,i,r,o,a,l,c,h){super(e,t,n,i,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ur=class extends tn{constructor(e,t,n,i,r,o,a,l,c){super(e,t,n,i,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var pi=class extends tn{constructor(e,t,n=ri,i,r,o,a=Ut,l=Ut,c,h=Xi,f=1){if(h!==Xi&&h!==mi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:e,height:t,depth:f};super(u,i,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Rr(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},Vo=class extends pi{constructor(e,t=ri,n=Js,i,r,o=Ut,a=Ut,l,c=Xi){let h={width:e,height:e,depth:1},f=[h,h,h,h,h,h];super(e,e,t,n,i,r,o,a,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Go=class extends tn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Ot=class s extends bt{constructor(e=1,t=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};let a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],f=[],u=0,d=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,i,o,2),g("x","z","y",1,-1,e,n,-t,i,o,3),g("x","y","z",1,-1,e,t,n,i,r,4),g("x","y","z",-1,-1,e,t,-n,i,r,5),this.setIndex(l),this.setAttribute("position",new ut(c,3)),this.setAttribute("normal",new ut(h,3)),this.setAttribute("uv",new ut(f,2));function g(v,p,m,x,S,y,M,T,_,b,R){let w=y/_,C=M/b,I=y/2,U=M/2,D=T/2,B=_+1,H=b+1,G=0,ee=0,V=new P;for(let Q=0;Q<H;Q++){let ne=Q*C-U;for(let de=0;de<B;de++){let we=de*w-I;V[v]=we*x,V[p]=ne*S,V[m]=D,c.push(V.x,V.y,V.z),V[v]=0,V[p]=0,V[m]=T>0?1:-1,h.push(V.x,V.y,V.z),f.push(de/_),f.push(1-Q/b),G+=1}}for(let Q=0;Q<b;Q++)for(let ne=0;ne<_;ne++){let de=u+ne+B*Q,we=u+ne+B*(Q+1),$=u+(ne+1)+B*(Q+1),ue=u+(ne+1)+B*Q;l.push(de,we,ue),l.push(we,$,ue),ee+=6}a.addGroup(d,ee,R),d+=ee,u+=G}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new s(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var un=class s extends bt{constructor(e=1,t=1,n=1,i=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;i=Math.floor(i),r=Math.floor(r);let h=[],f=[],u=[],d=[],g=0,v=[],p=n/2,m=0;x(),o===!1&&(e>0&&S(!0),t>0&&S(!1)),this.setIndex(h),this.setAttribute("position",new ut(f,3)),this.setAttribute("normal",new ut(u,3)),this.setAttribute("uv",new ut(d,2));function x(){let y=new P,M=new P,T=0,_=(t-e)/n;for(let b=0;b<=r;b++){let R=[],w=b/r,C=w*(t-e)+e;for(let I=0;I<=i;I++){let U=I/i,D=U*l+a,B=Math.sin(D),H=Math.cos(D);M.x=C*B,M.y=-w*n+p,M.z=C*H,f.push(M.x,M.y,M.z),y.set(B,_,H).normalize(),u.push(y.x,y.y,y.z),d.push(U,1-w),R.push(g++)}v.push(R)}for(let b=0;b<i;b++)for(let R=0;R<r;R++){let w=v[R][b],C=v[R+1][b],I=v[R+1][b+1],U=v[R][b+1];(e>0||R!==0)&&(h.push(w,C,U),T+=3),(t>0||R!==r-1)&&(h.push(C,I,U),T+=3)}c.addGroup(m,T,0),m+=T}function S(y){let M=g,T=new pe,_=new P,b=0,R=y===!0?e:t,w=y===!0?1:-1;for(let I=1;I<=i;I++)f.push(0,p*w,0),u.push(0,w,0),d.push(.5,.5),g++;let C=g;for(let I=0;I<=i;I++){let D=I/i*l+a,B=Math.cos(D),H=Math.sin(D);_.x=R*H,_.y=p*w,_.z=R*B,f.push(_.x,_.y,_.z),u.push(0,w,0),T.x=B*.5+.5,T.y=H*.5*w+.5,d.push(T.x,T.y),g++}for(let I=0;I<i;I++){let U=M+I,D=C+I;y===!0?h.push(D,D+1,U):h.push(D+1,D,U),b+=3}c.addGroup(m,b,y===!0?1:2),m+=b}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new s(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Fl=class s extends bt{constructor(e=[],t=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:i};let r=[],o=[];a(i),c(n),h(),this.setAttribute("position",new ut(r,3)),this.setAttribute("normal",new ut(r.slice(),3)),this.setAttribute("uv",new ut(o,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(x){let S=new P,y=new P,M=new P;for(let T=0;T<t.length;T+=3)d(t[T+0],S),d(t[T+1],y),d(t[T+2],M),l(S,y,M,x)}function l(x,S,y,M){let T=M+1,_=[];for(let b=0;b<=T;b++){_[b]=[];let R=x.clone().lerp(y,b/T),w=S.clone().lerp(y,b/T),C=T-b;for(let I=0;I<=C;I++)I===0&&b===T?_[b][I]=R:_[b][I]=R.clone().lerp(w,I/C)}for(let b=0;b<T;b++)for(let R=0;R<2*(T-b)-1;R++){let w=Math.floor(R/2);R%2===0?(u(_[b][w+1]),u(_[b+1][w]),u(_[b][w])):(u(_[b][w+1]),u(_[b+1][w+1]),u(_[b+1][w]))}}function c(x){let S=new P;for(let y=0;y<r.length;y+=3)S.x=r[y+0],S.y=r[y+1],S.z=r[y+2],S.normalize().multiplyScalar(x),r[y+0]=S.x,r[y+1]=S.y,r[y+2]=S.z}function h(){let x=new P;for(let S=0;S<r.length;S+=3){x.x=r[S+0],x.y=r[S+1],x.z=r[S+2];let y=p(x)/2/Math.PI+.5,M=m(x)/Math.PI+.5;o.push(y,1-M)}g(),f()}function f(){for(let x=0;x<o.length;x+=6){let S=o[x+0],y=o[x+2],M=o[x+4],T=Math.max(S,y,M),_=Math.min(S,y,M);T>.9&&_<.1&&(S<.2&&(o[x+0]+=1),y<.2&&(o[x+2]+=1),M<.2&&(o[x+4]+=1))}}function u(x){r.push(x.x,x.y,x.z)}function d(x,S){let y=x*3;S.x=e[y+0],S.y=e[y+1],S.z=e[y+2]}function g(){let x=new P,S=new P,y=new P,M=new P,T=new pe,_=new pe,b=new pe;for(let R=0,w=0;R<r.length;R+=9,w+=6){x.set(r[R+0],r[R+1],r[R+2]),S.set(r[R+3],r[R+4],r[R+5]),y.set(r[R+6],r[R+7],r[R+8]),T.set(o[w+0],o[w+1]),_.set(o[w+2],o[w+3]),b.set(o[w+4],o[w+5]),M.copy(x).add(S).add(y).divideScalar(3);let C=p(M);v(T,w+0,x,C),v(_,w+2,S,C),v(b,w+4,y,C)}}function v(x,S,y,M){M<0&&x.x===1&&(o[S]=x.x-1),y.x===0&&y.z===0&&(o[S]=M/2/Math.PI+.5)}function p(x){return Math.atan2(x.z,-x.x)}function m(x){return Math.atan2(-x.y,Math.sqrt(x.x*x.x+x.z*x.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new s(e.vertices,e.indices,e.radius,e.detail)}};var xs=class s extends Fl{constructor(e=1,t=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],i=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,i,e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new s(e.radius,e.detail)}},ji=class s extends bt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};let r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,f=e/a,u=t/l,d=[],g=[],v=[],p=[];for(let m=0;m<h;m++){let x=m*u-o;for(let S=0;S<c;S++){let y=S*f-r;g.push(y,-x,0),v.push(0,0,1),p.push(S/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let x=0;x<a;x++){let S=x+c*m,y=x+c*(m+1),M=x+1+c*(m+1),T=x+1+c*m;d.push(S,y,T),d.push(y,M,T)}this.setIndex(d),this.setAttribute("position",new ut(g,3)),this.setAttribute("normal",new ut(v,3)),this.setAttribute("uv",new ut(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new s(e.width,e.height,e.widthSegments,e.heightSegments)}};var Wo=class s extends bt{constructor(e=1,t=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],f=new P,u=new P,d=[],g=[],v=[],p=[];for(let m=0;m<=n;m++){let x=[],S=m/n,y=o+S*a,M=e*Math.cos(y),T=Math.sqrt(e*e-M*M),_=0;m===0&&o===0?_=.5/t:m===n&&l===Math.PI&&(_=-.5/t);for(let b=0;b<=t;b++){let R=b/t,w=i+R*r;f.x=-T*Math.cos(w),f.y=M,f.z=T*Math.sin(w),g.push(f.x,f.y,f.z),u.copy(f).normalize(),v.push(u.x,u.y,u.z),p.push(R+_,1-S),x.push(c++)}h.push(x)}for(let m=0;m<n;m++)for(let x=0;x<t;x++){let S=h[m][x+1],y=h[m][x],M=h[m+1][x],T=h[m+1][x+1];(m!==0||o>0)&&d.push(S,y,T),(m!==n-1||l<Math.PI)&&d.push(y,M,T)}this.setIndex(d),this.setAttribute("position",new ut(g,3)),this.setAttribute("normal",new ut(v,3)),this.setAttribute("uv",new ut(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new s(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Ji=class s extends bt{constructor(e=1,t=.4,n=12,i=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:i,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),i=Math.floor(i);let l=[],c=[],h=[],f=[],u=new P,d=new P,g=new P;for(let v=0;v<=n;v++){let p=o+v/n*a;for(let m=0;m<=i;m++){let x=m/i*r;d.x=(e+t*Math.cos(p))*Math.cos(x),d.y=(e+t*Math.cos(p))*Math.sin(x),d.z=t*Math.sin(p),c.push(d.x,d.y,d.z),u.x=e*Math.cos(x),u.y=e*Math.sin(x),g.subVectors(d,u).normalize(),h.push(g.x,g.y,g.z),f.push(m/i),f.push(v/n)}}for(let v=1;v<=n;v++)for(let p=1;p<=i;p++){let m=(i+1)*v+p-1,x=(i+1)*(v-1)+p-1,S=(i+1)*(v-1)+p,y=(i+1)*v+p;l.push(m,x,y),l.push(x,S,y)}this.setIndex(l),this.setAttribute("position",new ut(c,3)),this.setAttribute("normal",new ut(h,3)),this.setAttribute("uv",new ut(f,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new s(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc,e.thetaStart,e.thetaLength)}};function Qs(s){let e={};for(let t in s){e[t]={};for(let n in s[t]){let i=s[t][n];if(np(i))i.isRenderTargetTexture?(Ue("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone();else if(Array.isArray(i))if(np(i[0])){let r=[];for(let o=0,a=i.length;o<a;o++)r[o]=i[o].clone();e[t][n]=r}else e[t][n]=i.slice();else e[t][n]=i}}return e}function Rn(s){let e={};for(let t=0;t<s.length;t++){let n=Qs(s[t]);for(let i in n)e[i]=n[i]}return e}function np(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function D0(s){let e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function Hu(s){let e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ke.workingColorSpace}var On={clone:Qs,merge:Rn},N0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,U0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ft=class extends wn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=N0,this.fragmentShader=U0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Qs(e.uniforms),this.uniformsGroups=D0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let i in this.uniforms){let o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let i=e.uniforms[n];switch(this.uniforms[n]={},i.type){case"t":this.uniforms[n].value=t[i.value]||null;break;case"c":this.uniforms[n].value=new Pe().setHex(i.value);break;case"v2":this.uniforms[n].value=new pe().fromArray(i.value);break;case"v3":this.uniforms[n].value=new P().fromArray(i.value);break;case"v4":this.uniforms[n].value=new Mt().fromArray(i.value);break;case"m3":this.uniforms[n].value=new Ge().fromArray(i.value);break;case"m4":this.uniforms[n].value=new Te().fromArray(i.value);break;default:this.uniforms[n].value=i.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Or=class extends Ft{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},ni=class extends wn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Pe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Pe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zr,this.normalScale=new pe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ei,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Nn=class extends ni{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new pe(1,1),this.clearcoatNormalMap=null,this.diffuseRoughnessMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return We(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessMinimum=100,this.iridescenceThicknessMaximum=400,this.iridescenceThicknessMap=null,this.sheenColor=new Pe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Pe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Pe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._diffuseRoughness=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get diffuseRoughness(){return this._diffuseRoughness}set diffuseRoughness(e){this._diffuseRoughness>0!=e>0&&this.version++,this._diffuseRoughness=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}get iridescenceThicknessRange(){return Bs('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),[this.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum]}set iridescenceThicknessRange(e){Bs('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),this.iridescenceThicknessMinimum=e[0],this.iridescenceThicknessMaximum=e[1]}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.diffuseRoughness=e.diffuseRoughness,this.diffuseRoughnessMap=e.diffuseRoughnessMap,this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum,this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Xo=class extends wn{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zr,this.normalScale=new pe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}},qo=class extends wn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Pe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Pe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zr,this.normalScale=new pe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ei,this.combine=Jl,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Bl=class extends wn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Np,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},zl=class extends wn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function ms(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function Ro(s){return s!==void 0&&s.inTangents!==void 0&&s.outTangents!==void 0}function O0(s){function e(i,r){return s[i]-s[r]}let t=s.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n}function ip(s,e,t){let n=s.length,i=new s.constructor(n);for(let r=0,o=0;o!==n;++r){let a=t[r]*e;for(let l=0;l!==e;++l)i[o++]=s[a+l]}return i}function F0(s,e,t,n){let i=1,r=s[0];for(;r!==void 0&&r[n]===void 0;)r=s[i++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(e.push(r.time),t.push(...o)),r=s[i++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=s[i++];while(r!==void 0);else do o=r[n],o!==void 0&&(e.push(r.time),t.push(o)),r=s[i++];while(r!==void 0)}var Mi=class{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,i=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<i)){for(let a=n+2;;){if(i===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=t[++n],e<i)break e}o=t.length;break t}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(i=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(i=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i;for(let o=0;o!==i;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},kl=class extends Mi{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:au,endingEnd:au}}intervalChanged_(e,t,n){let i=this.parameterPositions,r=e-2,o=e+1,a=i[r],l=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case lu:r=e,a=2*t-n;break;case cu:r=i.length-2,a=t+i[r]-i[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case lu:o=e,l=2*n-t;break;case cu:o=1,l=n+i[1]-i[0];break;default:o=e-1,l=t}let c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this._offsetPrev,f=this._offsetNext,u=this._weightPrev,d=this._weightNext,g=(n-t)/(i-t),v=g*g,p=v*g,m=-u*p+2*u*v-u*g,x=(1+u)*p+(-1.5-2*u)*v+(-.5+u)*g+1,S=(-1-d)*p+(1.5+d)*v+.5*g,y=d*p-d*v;for(let M=0;M!==a;++M)r[M]=m*o[h+M]+x*o[c+M]+S*o[l+M]+y*o[f+M];return r}},Hl=class extends Mi{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=(n-t)/(i-t),f=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*f+o[l+u]*h;return r}},Vl=class extends Mi{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}},Gl=class extends Mi{interpolate_(e,t,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this.inTangents,f=this.outTangents;if(!h||!f){let g=(n-t)/(i-t),v=1-g;for(let p=0;p!==a;++p)r[p]=o[c+p]*v+o[l+p]*g;return r}let u=a*2,d=e-1;for(let g=0;g!==a;++g){let v=o[c+g],p=o[l+g],m=d*u+g*2,x=f[m],S=f[m+1],y=e*u+g*2,M=h[y],T=h[y+1],_=z0(n,t,x,M,i);r[g]=Yp(_,v,S,T,p)}return r}};function Yp(s,e,t,n,i){let r=1-s;return r*r*r*e+3*r*r*s*t+3*r*s*s*n+s*s*s*i}function B0(s,e,t,n,i){let r=1-s;return 3*r*r*(t-e)+6*r*s*(n-t)+3*s*s*(i-n)}function z0(s,e,t,n,i){let r=(s-e)/(i-e);for(let o=0;o<8;o++){let a=Yp(r,e,t,n,i)-s;if(Math.abs(a)<1e-10)break;let l=B0(r,e,t,n,i);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}var Hn=class{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ms(t,this.TimeBufferType),this.values=ms(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ms(e.times,Array),values:ms(e.values,Array)};let i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i),Ro(e.settings)&&(n.settings={inTangents:ms(e.settings.inTangents,Array),outTangents:ms(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Vl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Hl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new kl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Gl(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case zs:t=this.InterpolantFactoryMethodDiscrete;break;case ks:t=this.InterpolantFactoryMethodLinear;break;case bl:t=this.InterpolantFactoryMethodSmooth;break;case ou:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ue("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return zs;case this.InterpolantFactoryMethodLinear:return ks;case this.InterpolantFactoryMethodSmooth:return bl;case this.InterpolantFactoryMethodBezier:return ou}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e;Ro(this.settings)&&(sp(this.settings.inTangents,e),sp(this.settings.outTangents,e))}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e;Ro(this.settings)&&(rp(this.settings.inTangents,e),rp(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,i=n.length,r=0,o=i-1;for(;r!==i&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==i){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Ve("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,i=this.values,r=n.length;r===0&&(Ve("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Ve("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Ve("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(i!==void 0&&Gg(i))for(let a=0,l=i.length;a!==l;++a){let c=i[a];if(isNaN(c)){Ve("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===bl,r=e.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=e[a],h=e[a+1];if(c!==h&&(a!==1||c!==e[0]))if(i)l=!0;else{let f=a*n,u=f-n,d=f+n;for(let g=0;g!==n;++g){let v=t[f+g];if(v!==t[u+g]||v!==t[d+g]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let f=a*n,u=o*n;for(let d=0;d!==n;++d)t[u+d]=t[f+d]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,Ro(this.settings)&&(i.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),i}};function sp(s,e){for(let t=0,n=s.length;t!==n;t+=2)s[t]+=e}function rp(s,e){for(let t=0,n=s.length;t!==n;t+=2)s[t]*=e}Hn.prototype.ValueTypeName="";Hn.prototype.TimeBufferType=Float32Array;Hn.prototype.ValueBufferType=Float32Array;Hn.prototype.DefaultInterpolation=ks;var $i=class extends Hn{constructor(e,t,n){super(e,t,n)}};$i.prototype.ValueTypeName="bool";$i.prototype.ValueBufferType=Array;$i.prototype.DefaultInterpolation=zs;$i.prototype.InterpolantFactoryMethodLinear=void 0;$i.prototype.InterpolantFactoryMethodSmooth=void 0;var Yo=class extends Hn{constructor(e,t,n,i){super(e,t,n,i)}};Yo.prototype.ValueTypeName="color";var Qi=class extends Hn{constructor(e,t,n,i){super(e,t,n,i)}};Qi.prototype.ValueTypeName="number";var Wl=class extends Mi{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(i-t),c=e*a;for(let h=c+a;c!==h;c+=4)Rt.slerpFlat(r,0,o,c-a,o,c,l);return r}},es=class extends Hn{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new Wl(this.times,this.values,this.getValueSize(),e)}};es.prototype.ValueTypeName="quaternion";es.prototype.InterpolantFactoryMethodSmooth=void 0;var ts=class extends Hn{constructor(e,t,n){super(e,t,n)}};ts.prototype.ValueTypeName="string";ts.prototype.ValueBufferType=Array;ts.prototype.DefaultInterpolation=zs;ts.prototype.InterpolantFactoryMethodLinear=void 0;ts.prototype.InterpolantFactoryMethodSmooth=void 0;var ys=class extends Hn{constructor(e,t,n,i){super(e,t,n,i)}};ys.prototype.ValueTypeName="vector";var Zo=class{constructor(e="",t=-1,n=[],i=Dp){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=wi(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,i=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(H0(n[o]).scale(i));let r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){let t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,o=n.length;r!==o;++r)t.push(Hn.toJSON(n[r]));return i}static CreateFromMorphTargetSequence(e,t,n,i){let r=t.length,o=[];for(let a=0;a<r;a++){let l=[],c=[];l.push((a+r-1)%r,a,(a+1)%r),c.push(0,1,0);let h=O0(l);l=ip(l,1,h),c=ip(c,1,h),!i&&l[0]===0&&(l.push(r),c.push(c[0])),o.push(new Qi(".morphTargetInfluences["+t[a].name+"]",l,c).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let i={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,l=e.length;a<l;a++){let c=e[a],h=c.name.match(r);if(h&&h.length>1){let f=h[1],u=i[f];u||(i[f]=u=[]),u.push(c)}}let o=[];for(let a in i)o.push(this.CreateFromMorphTargetSequence(a,i[a],t,n));return o}resetDuration(){let e=this.tracks,t=0;for(let n=0,i=e.length;n!==i;++n){let r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function k0(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Qi;case"vector":case"vector2":case"vector3":case"vector4":return ys;case"color":return Yo;case"quaternion":return es;case"bool":case"boolean":return $i;case"string":return ts}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function H0(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=k0(s.type);if(s.times===void 0){let n=[],i=[];F0(s.keys,n,i,"value"),s.times=n,s.values=i}let t;return e.parse!==void 0?t=e.parse(s):t=new e(s.name,s.times,s.values,s.interpolation),Ro(s.settings)&&(t.settings={inTangents:ms(s.settings.inTangents,Float32Array),outTangents:ms(s.settings.outTangents,Float32Array)}),t}var Si={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(op(s)||(this.files[s]=e))},get:function(s){if(this.enabled!==!1&&!op(s))return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};function op(s){try{let e=s.slice(s.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}var Xl=class{constructor(e,t,n){let i=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,f){return c.push(h,f),this},this.removeHandler=function(h){let f=c.indexOf(h);return f!==-1&&c.splice(f,2),this},this.getHandler=function(h){for(let f=0,u=c.length;f<u;f+=2){let d=c[f],g=c[f+1];if(d.global&&(d.lastIndex=0),d.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Zp=new Xl,bi=class{constructor(e){this.manager=e!==void 0?e:Zp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}setPriority(e){return this.priority=e,this}setCache(e){return this.cache=e,this}abort(){return this}};bi.DEFAULT_MATERIAL_NAME="__DEFAULT";var Gi={},fu=class extends Error{constructor(e,t){super(e),this.response=t}},Fr=class extends bi{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=Si.get(`file:${e}`);if(r!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0);return}if(Gi[e]!==void 0){Gi[e].push({onLoad:t,onProgress:n,onError:i});return}Gi[e]=[],Gi[e].push({onLoad:t,onProgress:n,onError:i});let o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",priority:this.priority,cache:this.cache,signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Ue("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;let h=Gi[e],f=c.body.getReader(),u=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),d=u?parseInt(u):0,g=d!==0,v=0,p=new ReadableStream({start(m){x();function x(){f.read().then(({done:S,value:y})=>{if(S)m.close();else{v+=y.byteLength;let M=new ProgressEvent("progress",{lengthComputable:g,loaded:v,total:d});for(let T=0,_=h.length;T<_;T++){let b=h[T];b.onProgress&&b.onProgress(M)}m.enqueue(y),x()}},S=>{m.error(S)})}}});return new Response(p)}else throw new fu(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return c.json();default:if(a==="")return c.text();{let f=/charset="?([^;"\s]*)"?/i.exec(a),u=f&&f[1]?f[1].toLowerCase():void 0,d=new TextDecoder(u);return c.arrayBuffer().then(g=>d.decode(g))}}}).then(c=>{Si.add(`file:${e}`,c);let h=Gi[e];delete Gi[e];for(let f=0,u=h.length;f<u;f++){let d=h[f];d.onLoad&&d.onLoad(c)}}).catch(c=>{let h=Gi[e];if(h===void 0)throw this.manager.itemError(e),c;delete Gi[e];for(let f=0,u=h.length;f<u;f++){let d=h[f];d.onError&&d.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var _r=new WeakMap,ql=class extends bi{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,o=Si.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let f=_r.get(o);f===void 0&&(f=[],_r.set(o,f)),f.push({onLoad:t,onError:i})}return o}let a=Er("img");function l(){h(),t&&t(this);let f=_r.get(this)||[];for(let u=0;u<f.length;u++){let d=f[u];d.onLoad&&d.onLoad(this)}_r.delete(this),r.manager.itemEnd(e)}function c(f){h(),i&&i(f),Si.remove(`image:${e}`);let u=_r.get(this)||[];for(let d=0;d<u.length;d++){let g=u[d];g.onError&&g.onError(f)}_r.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Si.add(`image:${e}`,a),r.manager.itemStart(e),a.fetchPriority=this.priority,a.src=e,a}};var Ws=class extends bi{constructor(e){super(e)}load(e,t,n,i){let r=new tn,o=new ql(this.manager);return o.setPriority(this.priority),o.setCache(this.cache),o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}},Xs=class extends dt{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Pe(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Ko=class extends Xs{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(dt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Pe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},nu=new Te,ap=new P,lp=new P,Br=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new pe(512,512),this.mapType=An,this.map=null,this.mapPass=null,this.matrix=new Te,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Yi,this._frameExtents=new pe(1,1),this._viewportCount=1,this._viewports=[new Mt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;ap.setFromMatrixPosition(e.matrixWorld),t.position.copy(ap),lp.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(lp),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,i){nu.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(nu,e.coordinateSystem,e.reversedDepth);let r=this._frameExtents,o=i?i.z/r.x:1,a=i?i.w/r.y:1,l=i?i.x/r.x:0,c=i?i.y/r.y:0;e.coordinateSystem===wr||e.reversedDepth?t.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):t.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),t.multiply(nu)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},yl=new P,vl=new Rt,vi=new P,jo=class extends dt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Te,this.projectionMatrix=new Te,this.projectionMatrixInverse=new Te,this.coordinateSystem=Qn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(yl,vl,vi),vi.x===1&&vi.y===1&&vi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yl,vl,vi.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(yl,vl,vi),vi.x===1&&vi.y===1&&vi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yl,vl,vi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ps=new P,cp=new pe,hp=new pe,en=class extends jo{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Hs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Co*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Hs*2*Math.atan(Math.tan(Co*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ps.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ps.x,ps.y).multiplyScalar(-e/ps.z),ps.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ps.x,ps.y).multiplyScalar(-e/ps.z)}getViewSize(e,t){return this.getViewBounds(e,cp,hp),t.subVectors(hp,cp)}setViewOffset(e,t,n,i,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Co*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*i/l,t-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},du=class extends Br{constructor(){super(new en(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=Hs*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||i!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=i,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){let e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}},Jo=class extends Xs{constructor(e,t,n=0,i=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(dt.DEFAULT_UP),this.updateMatrix(),this.target=new dt,this.distance=n,this.angle=i,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new du}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},pu=class extends Br{constructor(){super(new en(90,1,.5,500)),this.isPointLightShadow=!0}},ns=class extends Xs{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new pu}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},is=class extends jo{constructor(e=-1,t=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,r=n-e,o=n+e,a=i+t,l=i-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},mu=class extends Br{constructor(){super(new is(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},qs=class extends Xs{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(dt.DEFAULT_UP),this.updateMatrix(),this.target=new dt,this.shadow=new mu}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var ss=class{static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}};var iu=new WeakMap,$o=class extends bi{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Ue("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Ue("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,o=Si.get(`image-bitmap:${e}`);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(c=>{iu.has(o)===!0?(i&&i(iu.get(o)),r.manager.itemError(e),r.manager.itemEnd(e)):(t&&t(c),r.manager.itemEnd(e))});return}setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);return}let a={};a.credentials=this.withCredentials||this.crossOrigin!=="anonymous"?"include":"same-origin",a.headers=this.requestHeader,a.priority=this.priority,a.cache=this.cache,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let l=fetch(e,a).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign({},r.options,{colorSpaceConversion:"none"}))}).then(function(c){return Si.add(`image-bitmap:${e}`,c),t&&t(c),r.manager.itemEnd(e),c}).catch(function(c){i&&i(c),iu.set(l,c),Si.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});Si.add(`image-bitmap:${e}`,l),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var xr=-90,yr=1,zr=class extends dt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let i=new en(xr,yr,e,t);i.layers=this.layers,this.add(i);let r=new en(xr,yr,e,t);r.layers=this.layers,this.add(r);let o=new en(xr,yr,e,t);o.layers=this.layers,this.add(o);let a=new en(xr,yr,e,t);a.layers=this.layers,this.add(a);let l=new en(xr,yr,e,t);l.layers=this.layers,this.add(l);let c=new en(xr,yr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,i,r,o,a,l]=t;for(let c of t)this.remove(c);if(e===Qn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===wr)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,f=e.getRenderTarget(),u=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let v=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.mipmapsAutoUpdate=v,e.setRenderTarget(n,5,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(f,u,d),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Yl=class extends en{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}},Qo=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=V0.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function V0(){this._document.hidden===!1&&this.reset()}var Vu="\\[\\]\\.:\\/",G0=new RegExp("["+Vu+"]","g"),Gu="[^"+Vu+"]",W0="[^"+Vu.replace("\\.","")+"]",X0=/((?:WC+[\/:])*)/.source.replace("WC",Gu),q0=/(WCOD+)?/.source.replace("WCOD",W0),Y0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Gu),Z0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Gu),K0=new RegExp("^"+X0+q0+Y0+Z0+"$"),j0=["material","materials","bones","map"],gu=class{constructor(e,t,n){let i=n||At.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},At=class s{constructor(e,t,n){this.path=t,this.parsedPath=n||s.parseTrackName(t),this.node=s.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new s.Composite(e,t,n):new s(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(G0,"")}static parseTrackName(e){let t=K0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let r=n.nodeName.substring(i+1);j0.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let l=n(a.children);if(l)return l}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,i=t.propertyName,r=t.propertyIndex;if(e||(e=s.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ue("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Ve("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Ve("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Ve("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Ve("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Ve("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Ve("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Ve("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[i];if(o===void 0){let c=t.nodeName;Ve("PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){Ve("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Ve("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};At.Composite=gu;At.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};At.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};At.prototype.GetterByBindingType=[At.prototype._getValue_direct,At.prototype._getValue_array,At.prototype._getValue_arrayElement,At.prototype._getValue_toArray];At.prototype.SetterByBindingTypeAndVersioning=[[At.prototype._setValue_direct,At.prototype._setValue_direct_setNeedsUpdate,At.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[At.prototype._setValue_array,At.prototype._setValue_array_setNeedsUpdate,At.prototype._setValue_array_setMatrixWorldNeedsUpdate],[At.prototype._setValue_arrayElement,At.prototype._setValue_arrayElement_setNeedsUpdate,At.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[At.prototype._setValue_fromArray,At.prototype._setValue_fromArray_setNeedsUpdate,At.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var KM=new Float32Array(1);var up=new Te,Ys=class{constructor(e,t,n=0,i=1/0){this.ray=new ti(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Cr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Ve("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return up.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(up),this}intersectObject(e,t=!0,n=[]){return _u(e,this,n,t),n.sort(fp),n}intersectObjects(e,t=!0,n=[]){for(let i=0,r=e.length;i<r;i++)_u(e[i],this,n,t);return n.sort(fp),n}};function fp(s,e){return s.distance-e.distance}function _u(s,e,t,n){let i=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){let r=s.children;for(let o=0,a=r.length;o<a;o++)_u(r[o],e,t,!0)}}var ea=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Ue("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}},kr=class{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=We(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(We(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Ku=class Ku{constructor(e,t,n,i){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,i){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=i,this}};Ku.prototype.isMatrix2=!0;var xu=Ku;var dp=new P,Sl=new P,vr=new P,Sr=new P,su=new P,J0=new P,$0=new P,Un=class{constructor(e=new P,t=new P){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){dp.subVectors(e,this.start),Sl.subVectors(this.end,this.start);let n=Sl.dot(Sl);if(n===0)return 0;let r=Sl.dot(dp)/n;return t&&(r=We(r,0,1)),r}closestPointToPoint(e,t,n){let i=this.closestPointToPointParameter(e,t);return this.delta(n).multiplyScalar(i).add(this.start)}distanceSqToLine3(e,t=J0,n=$0){let i=10000000000000001e-32,r,o,a=this.start,l=e.start,c=this.end,h=e.end;vr.subVectors(c,a),Sr.subVectors(h,l),su.subVectors(a,l);let f=vr.dot(vr),u=Sr.dot(Sr),d=Sr.dot(su);if(f<=i&&u<=i)return t.copy(a),n.copy(l),t.distanceToSquared(n);if(f<=i)r=0,o=d/u,o=We(o,0,1);else{let g=vr.dot(su);if(u<=i)o=0,r=We(-g/f,0,1);else{let v=vr.dot(Sr),p=f*u-v*v;p!==0?r=We((v*d-g*u)/p,0,1):r=0,o=(v*r+d)/u,o<0?(o=0,r=We(-g/f,0,1)):o>1&&(o=1,r=We((v-g)/f,0,1))}}return t.copy(a).addScaledVector(vr,r),n.copy(l).addScaledVector(Sr,o),t.distanceToSquared(n)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};var Ml=new it,ta=class extends Ki{constructor(e,t=16776960){let n=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),i=new Float32Array(24),r=new bt;r.setIndex(new Nt(n,1)),r.setAttribute("position",new Nt(i,3)),super(r,new Zi({color:t,toneMapped:!1})),this.object=e,this.type="BoxHelper",this.matrixAutoUpdate=!1,this.update()}update(){if(this.object!==void 0&&Ml.setFromObject(this.object),Ml.isEmpty())return;let e=Ml.min,t=Ml.max,n=this.geometry.attributes.position,i=n.array;i[0]=t.x,i[1]=t.y,i[2]=t.z,i[3]=e.x,i[4]=t.y,i[5]=t.z,i[6]=e.x,i[7]=e.y,i[8]=t.z,i[9]=t.x,i[10]=e.y,i[11]=t.z,i[12]=t.x,i[13]=t.y,i[14]=e.z,i[15]=e.x,i[16]=t.y,i[17]=e.z,i[18]=e.x,i[19]=e.y,i[20]=e.z,i[21]=t.x,i[22]=e.y,i[23]=e.z,n.needsUpdate=!0,this.geometry.computeBoundingSphere()}setFromObject(e){return this.object=e,this.update(),this}copy(e,t){return super.copy(e,t),this.object=e.object,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}};var Zs=class extends di{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function Wu(s,e,t,n){let i=Q0(n);switch(t){case Cu:return s*e;case ic:return s*e/i.components*i.byteLength;case fa:return s*e/i.components*i.byteLength;case Ms:return s*e*2/i.components*i.byteLength;case sc:return s*e*2/i.components*i.byteLength;case Pu:return s*e*3/i.components*i.byteLength;case Tn:return s*e*4/i.components*i.byteLength;case rc:return s*e*4/i.components*i.byteLength;case da:case pa:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case ma:case ga:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case ac:case cc:return Math.max(s,16)*Math.max(e,8)/4;case oc:case lc:return Math.max(s,8)*Math.max(e,8)/2;case hc:case uc:case dc:case pc:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case fc:case _a:case mc:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case gc:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case _c:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case xc:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case yc:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case vc:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case Sc:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Mc:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case bc:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Tc:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case wc:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Ec:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case Ac:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Rc:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Cc:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case Pc:case Ic:case Lc:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Dc:case Nc:return Math.ceil(s/4)*Math.ceil(e/4)*8;case xa:case Uc:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Q0(s){switch(s){case An:case wu:return{byteLength:1,components:1};case qr:case Eu:case Qt:return{byteLength:2,components:1};case tc:case nc:return{byteLength:2,components:4};case ri:case ec:case Ln:return{byteLength:4,components:1};case Au:case Ru:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"187"}}));typeof window<"u"&&(window.__THREE__?Ue("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="187");function gm(){let s=null,e=!1,t=null,n=null;function i(r,o){n=s.requestAnimationFrame(i),t(r,o)}return{start:function(){e!==!0&&t!==null&&s!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function e_(s){let e=new WeakMap;function t(a,l){let c=a.array,h=a.usage,f=c.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,c,h),a.onUploadCallback();let d;if(c instanceof Float32Array)d=s.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=s.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?d=s.HALF_FLOAT:d=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=s.SHORT;else if(c instanceof Uint32Array)d=s.UNSIGNED_INT;else if(c instanceof Int32Array)d=s.INT;else if(c instanceof Int8Array)d=s.BYTE;else if(c instanceof Uint8Array)d=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function n(a,l,c){let h=l.array,f=l.updateRanges;if(s.bindBuffer(c,a),f.length===0)s.bufferSubData(c,0,h);else{f.sort((d,g)=>d.start-g.start);let u=0;for(let d=1;d<f.length;d++){let g=f[u],v=f[d];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++u,f[u]=v)}f.length=u+1;for(let d=0,g=f.length;d<g;d++){let v=f[d];s.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(s.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:r,update:o}}var t_=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,n_=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,i_=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,s_=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,r_=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,o_=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,a_=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,l_=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,c_=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,h_=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,u_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,f_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,d_=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,p_=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,m_=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,g_=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,__=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,x_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,y_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,v_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,S_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,M_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,b_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,T_=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,w_=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,E_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,A_=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,R_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,C_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,P_="gl_FragColor = linearToOutputTexel( gl_FragColor );",I_=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,L_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,D_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,N_=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,U_=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,O_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,F_=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,B_=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,z_=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,k_=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,H_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,V_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,G_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,W_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,X_=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,q_=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,Y_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Z_=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,K_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,j_=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,J_=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,$_=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Q_=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ex=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,tx=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,nx=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,ix=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,sx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,rx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ox=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ax=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,lx=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,cx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,hx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ux=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,fx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,dx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,px=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,mx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,gx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,_x=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,xx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,yx=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,vx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Sx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Mx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,bx=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Tx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,wx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ex=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ax=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Rx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Cx=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Px=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ix=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Lx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Dx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Nx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ux=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Ox=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Fx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Bx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,zx=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,kx=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Hx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Vx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Gx=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Wx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Xx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,qx=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Yx=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Zx=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Kx=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,jx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Jx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$x=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Qx=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,ey=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,ty=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ny=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,iy=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ry=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,oy=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,ay=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,ly=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,cy=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,hy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,uy=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fy=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,dy=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,py=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,my=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gy=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_y=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,xy=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,yy=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vy=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Sy=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,My=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,by=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ty=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,wy=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ey=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ay=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ry=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Cy=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Py=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Iy=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ly=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Dy=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,je={alphahash_fragment:t_,alphahash_pars_fragment:n_,alphamap_fragment:i_,alphamap_pars_fragment:s_,alphatest_fragment:r_,alphatest_pars_fragment:o_,aomap_fragment:a_,aomap_pars_fragment:l_,batching_pars_vertex:c_,batching_vertex:h_,begin_vertex:u_,beginnormal_vertex:f_,bsdfs:d_,iridescence_fragment:p_,bumpmap_pars_fragment:m_,clipping_planes_fragment:g_,clipping_planes_pars_fragment:__,clipping_planes_pars_vertex:x_,clipping_planes_vertex:y_,color_fragment:v_,color_pars_fragment:S_,color_pars_vertex:M_,color_vertex:b_,common:T_,defaultnormal_vertex:w_,displacementmap_pars_vertex:E_,displacementmap_vertex:A_,emissivemap_fragment:R_,emissivemap_pars_fragment:C_,colorspace_fragment:P_,colorspace_pars_fragment:I_,envmap_fragment:L_,envmap_common_pars_fragment:D_,envmap_pars_fragment:N_,envmap_pars_vertex:U_,envmap_physical_pars_fragment:q_,envmap_vertex:O_,fog_vertex:F_,fog_pars_vertex:B_,fog_fragment:z_,fog_pars_fragment:k_,gradientmap_pars_fragment:H_,lightmap_pars_fragment:V_,lights_lambert_fragment:G_,lights_lambert_pars_fragment:W_,lights_pars_begin:X_,lights_toon_fragment:Y_,lights_toon_pars_fragment:Z_,lights_phong_fragment:K_,lights_phong_pars_fragment:j_,lights_physical_fragment:J_,lights_physical_pars_fragment:$_,lights_fragment_begin:Q_,lights_fragment_maps:ex,lights_fragment_end:tx,lightprobes_pars_fragment:nx,logdepthbuf_fragment:ix,logdepthbuf_pars_fragment:sx,logdepthbuf_pars_vertex:rx,logdepthbuf_vertex:ox,map_fragment:ax,map_pars_fragment:lx,map_particle_fragment:cx,map_particle_pars_fragment:hx,metalnessmap_fragment:ux,metalnessmap_pars_fragment:fx,morphinstance_vertex:dx,morphcolor_vertex:px,morphnormal_vertex:mx,morphtarget_pars_vertex:gx,morphtarget_vertex:_x,normal_fragment_begin:xx,normal_fragment_maps:yx,normal_pars_fragment:vx,normal_pars_vertex:Sx,normal_vertex:Mx,normalmap_pars_fragment:bx,clearcoat_normal_fragment_begin:Tx,clearcoat_normal_fragment_maps:wx,clearcoat_pars_fragment:Ex,iridescence_pars_fragment:Ax,opaque_fragment:Rx,packing:Cx,premultiplied_alpha_fragment:Px,project_vertex:Ix,dithering_fragment:Lx,dithering_pars_fragment:Dx,roughnessmap_fragment:Nx,roughnessmap_pars_fragment:Ux,shadowmap_pars_fragment:Ox,shadowmap_pars_vertex:Fx,shadowmap_vertex:Bx,shadowmask_pars_fragment:zx,skinbase_vertex:kx,skinning_pars_vertex:Hx,skinning_vertex:Vx,skinnormal_vertex:Gx,specularmap_fragment:Wx,specularmap_pars_fragment:Xx,tonemapping_fragment:qx,tonemapping_pars_fragment:Yx,transmission_fragment:Zx,transmission_pars_fragment:Kx,uv_pars_fragment:jx,uv_pars_vertex:Jx,uv_vertex:$x,worldpos_vertex:Qx,background_vert:ey,background_frag:ty,backgroundCube_vert:ny,backgroundCube_frag:iy,cube_vert:sy,cube_frag:ry,depth_vert:oy,depth_frag:ay,distance_vert:ly,distance_frag:cy,equirect_vert:hy,equirect_frag:uy,linedashed_vert:fy,linedashed_frag:dy,meshbasic_vert:py,meshbasic_frag:my,meshlambert_vert:gy,meshlambert_frag:_y,meshmatcap_vert:xy,meshmatcap_frag:yy,meshnormal_vert:vy,meshnormal_frag:Sy,meshphong_vert:My,meshphong_frag:by,meshphysical_vert:Ty,meshphysical_frag:wy,meshtoon_vert:Ey,meshtoon_frag:Ay,points_vert:Ry,points_frag:Cy,shadow_vert:Py,shadow_frag:Iy,sprite_vert:Ly,sprite_frag:Dy},ve={common:{diffuse:{value:new Pe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new pe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Pe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Pe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new Pe(16777215)},opacity:{value:1},center:{value:new pe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},Ai={basic:{uniforms:Rn([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.fog]),vertexShader:je.meshbasic_vert,fragmentShader:je.meshbasic_frag},lambert:{uniforms:Rn([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,ve.lights,{emissive:{value:new Pe(0)},envMapIntensity:{value:1}}]),vertexShader:je.meshlambert_vert,fragmentShader:je.meshlambert_frag},phong:{uniforms:Rn([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,ve.lights,{emissive:{value:new Pe(0)},specular:{value:new Pe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:je.meshphong_vert,fragmentShader:je.meshphong_frag},standard:{uniforms:Rn([ve.common,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.roughnessmap,ve.metalnessmap,ve.fog,ve.lights,{emissive:{value:new Pe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag},toon:{uniforms:Rn([ve.common,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.gradientmap,ve.fog,ve.lights,{emissive:{value:new Pe(0)}}]),vertexShader:je.meshtoon_vert,fragmentShader:je.meshtoon_frag},matcap:{uniforms:Rn([ve.common,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,{matcap:{value:null}}]),vertexShader:je.meshmatcap_vert,fragmentShader:je.meshmatcap_frag},points:{uniforms:Rn([ve.points,ve.fog]),vertexShader:je.points_vert,fragmentShader:je.points_frag},dashed:{uniforms:Rn([ve.common,ve.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:je.linedashed_vert,fragmentShader:je.linedashed_frag},depth:{uniforms:Rn([ve.common,ve.displacementmap]),vertexShader:je.depth_vert,fragmentShader:je.depth_frag},normal:{uniforms:Rn([ve.common,ve.bumpmap,ve.normalmap,ve.displacementmap,{opacity:{value:1}}]),vertexShader:je.meshnormal_vert,fragmentShader:je.meshnormal_frag},sprite:{uniforms:Rn([ve.sprite,ve.fog]),vertexShader:je.sprite_vert,fragmentShader:je.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:je.background_vert,fragmentShader:je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:je.backgroundCube_vert,fragmentShader:je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:je.cube_vert,fragmentShader:je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:je.equirect_vert,fragmentShader:je.equirect_frag},distance:{uniforms:Rn([ve.common,ve.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:je.distance_vert,fragmentShader:je.distance_frag},shadow:{uniforms:Rn([ve.lights,ve.fog,{color:{value:new Pe(0)},opacity:{value:1}}]),vertexShader:je.shadow_vert,fragmentShader:je.shadow_frag}};Ai.physical={uniforms:Rn([Ai.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new pe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Ge},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new Pe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new pe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new Pe(0)},specularColor:{value:new Pe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new pe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag};var Fc={r:0,b:0,g:0},Ny=new Te,_m=new Ge;_m.set(-1,0,0,0,1,0,0,0,1);function Uy(s,e,t,n,i,r){let o=new Pe(0),a=i===!0?0:1,l,c,h=null,f=0,u=null;function d(x){let S=x.isScene===!0?x.background:null;if(S&&S.isTexture){let y=x.backgroundBlurriness>0;S=e.get(S,y)}return S}function g(x){let S=!1,y=d(x);y===null?p(o,a):y&&y.isColor&&(p(y,1),S=!0);let M=s.xr.getEnvironmentBlendMode();M==="additive"?t.buffers.color.setClear(0,0,0,1,r):M==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(s.autoClear||S)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function v(x,S){let y=d(S);y&&y.isCubeTexture?(c===void 0&&(c=new le(new Ot(1,1,1),new Ft({name:"BackgroundCubeMaterial",uniforms:Qs(Ai.backgroundCube.uniforms),vertexShader:Ai.backgroundCube.vertexShader,fragmentShader:Ai.backgroundCube.fragmentShader,side:sn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(M,T,_){this.matrixWorld.copyPosition(_.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=y,c.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Ny.makeRotationFromEuler(S.backgroundRotation)).transpose(),y.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(_m),c.material.toneMapped=Ke.getTransfer(y.colorSpace)!==ft,(h!==y||f!==y.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,h=y,f=y.version,u=s.toneMapping),c.layers.enableAll(),x.unshift(c,c.geometry,c.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new le(new ji(2,2),new Ft({name:"BackgroundMaterial",uniforms:Qs(Ai.background.uniforms),vertexShader:Ai.background.vertexShader,fragmentShader:Ai.background.fragmentShader,side:Yn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.toneMapped=Ke.getTransfer(y.colorSpace)!==ft,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||f!==y.version||u!==s.toneMapping)&&(l.material.needsUpdate=!0,h=y,f=y.version,u=s.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null))}function p(x,S){x.getRGB(Fc,Hu(s)),t.buffers.color.setClear(Fc.r,Fc.g,Fc.b,S,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(x,S=1){o.set(x),a=S,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(x){a=x,p(o,a)},render:g,addToRenderList:v,dispose:m}}function Oy(s,e){let t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null),r=i,o=!1;function a(C,I,U,D,B){let H=!1,G=f(C,D,U,I);r!==G&&(r=G,c(r.object)),H=d(C,D,U,B),H&&g(C,D,U,B),B!==null&&e.update(B,s.ELEMENT_ARRAY_BUFFER),(H||o)&&(o=!1,y(C,I,U,D),B!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function l(){return s.createVertexArray()}function c(C){return s.bindVertexArray(C)}function h(C){return s.deleteVertexArray(C)}function f(C,I,U,D){let B=D.wireframe===!0,H=n[I.id];H===void 0&&(H={},n[I.id]=H);let G=C.isInstancedMesh===!0?C.id:0,ee=H[G];ee===void 0&&(ee={},H[G]=ee);let V=ee[U.id];V===void 0&&(V={},ee[U.id]=V);let Q=V[B];return Q===void 0&&(Q=u(l()),V[B]=Q),Q}function u(C){let I=[],U=[],D=[];for(let B=0;B<t;B++)I[B]=0,U[B]=0,D[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:U,attributeDivisors:D,object:C,attributes:{},index:null}}function d(C,I,U,D){let B=r.attributes,H=I.attributes,G=0,ee=U.getAttributes();for(let V in ee)if(ee[V].location>=0){let ne=B[V],de=H[V];if(de===void 0&&(V==="instanceMatrix"&&C.instanceMatrix&&(de=C.instanceMatrix),V==="instanceColor"&&C.instanceColor&&(de=C.instanceColor)),ne===void 0||ne.attribute!==de||de&&ne.data!==de.data)return!0;G++}return r.attributesNum!==G||r.index!==D}function g(C,I,U,D){let B={},H=I.attributes,G=0,ee=U.getAttributes();for(let V in ee)if(ee[V].location>=0){let ne=H[V];ne===void 0&&(V==="instanceMatrix"&&C.instanceMatrix&&(ne=C.instanceMatrix),V==="instanceColor"&&C.instanceColor&&(ne=C.instanceColor));let de={};de.attribute=ne,ne&&ne.data&&(de.data=ne.data),B[V]=de,G++}r.attributes=B,r.attributesNum=G,r.index=D}function v(){let C=r.newAttributes;for(let I=0,U=C.length;I<U;I++)C[I]=0}function p(C){m(C,0)}function m(C,I){let U=r.newAttributes,D=r.enabledAttributes,B=r.attributeDivisors;U[C]=1,D[C]===0&&(s.enableVertexAttribArray(C),D[C]=1),B[C]!==I&&(s.vertexAttribDivisor(C,I),B[C]=I)}function x(){let C=r.newAttributes,I=r.enabledAttributes;for(let U=0,D=I.length;U<D;U++)I[U]!==C[U]&&(s.disableVertexAttribArray(U),I[U]=0)}function S(C,I,U,D,B,H,G){G===!0?s.vertexAttribIPointer(C,I,U,B,H):s.vertexAttribPointer(C,I,U,D,B,H)}function y(C,I,U,D){v();let B=D.attributes,H=U.getAttributes(),G=I.defaultAttributeValues;for(let ee in H){let V=H[ee];if(V.location>=0){let Q=B[ee];if(Q===void 0&&(ee==="instanceMatrix"&&C.instanceMatrix&&(Q=C.instanceMatrix),ee==="instanceColor"&&C.instanceColor&&(Q=C.instanceColor)),Q!==void 0){let ne=Q.normalized,de=Q.itemSize,we=e.get(Q);if(we===void 0)continue;let $=we.buffer,ue=we.type,Se=we.bytesPerElement,Ee=ue===s.INT||ue===s.UNSIGNED_INT||Q.gpuType===ec;if(Q.isInterleavedBufferAttribute){let me=Q.data,Le=me.isInterleavedBuffer===!0?me.stride:me.itemSize,rt=Q.offset;if(me.isInstancedInterleavedBuffer||me.isInstancedBufferAttribute){for(let Be=0;Be<V.locationSize;Be++)m(V.location+Be,me.meshPerAttribute);C.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=me.meshPerAttribute*me.count)}else for(let Be=0;Be<V.locationSize;Be++)p(V.location+Be);s.bindBuffer(s.ARRAY_BUFFER,$);for(let Be=0;Be<V.locationSize;Be++)S(V.location+Be,de/V.locationSize,ue,ne,Le*Se,(rt+de/V.locationSize*Be)*Se,Ee)}else{if(Q.isInstancedBufferAttribute){for(let me=0;me<V.locationSize;me++)m(V.location+me,Q.meshPerAttribute);C.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let me=0;me<V.locationSize;me++)p(V.location+me);s.bindBuffer(s.ARRAY_BUFFER,$);for(let me=0;me<V.locationSize;me++)S(V.location+me,de/V.locationSize,ue,ne,de*Se,de/V.locationSize*me*Se,Ee)}}else if(G!==void 0){let ne=G[ee];if(ne!==void 0)switch(ne.length){case 2:s.vertexAttrib2fv(V.location,ne);break;case 3:s.vertexAttrib3fv(V.location,ne);break;case 4:s.vertexAttrib4fv(V.location,ne);break;default:s.vertexAttrib1fv(V.location,ne)}}}}x()}function M(){R();for(let C in n){let I=n[C];for(let U in I){let D=I[U];for(let B in D){let H=D[B];for(let G in H)h(H[G].object),delete H[G];delete D[B]}}delete n[C]}}function T(C){if(n[C.id]===void 0)return;let I=n[C.id];for(let U in I){let D=I[U];for(let B in D){let H=D[B];for(let G in H)h(H[G].object),delete H[G];delete D[B]}}delete n[C.id]}function _(C){for(let I in n){let U=n[I];for(let D in U){let B=U[D];if(B[C.id]===void 0)continue;let H=B[C.id];for(let G in H)h(H[G].object),delete H[G];delete B[C.id]}}}function b(C){for(let I in n){let U=n[I],D=C.isInstancedMesh===!0?C.id:0,B=U[D];if(B!==void 0){for(let H in B){let G=B[H];for(let ee in G)h(G[ee].object),delete G[ee];delete B[H]}delete U[D],Object.keys(U).length===0&&delete n[I]}}}function R(){w(),o=!0,r!==i&&(r=i,c(r.object))}function w(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:R,resetDefaultState:w,dispose:M,releaseStatesOfGeometry:T,releaseStatesOfObject:b,releaseStatesOfProgram:_,initAttributes:v,enableAttribute:p,disableUnusedAttributes:x}}function Fy(s,e,t){let n;function i(l){n=l}function r(l,c){s.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,h){h!==0&&(s.drawArraysInstanced(n,l,c,h),t.update(c,n,h))}function a(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let d=0;d<h;d++)u+=c[d];t.update(u,n,1)}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function By(s,e,t,n){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){let _=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(_.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(_){return!(_!==Tn&&n.convert(_)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(_){let b=_===Qt&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(_!==An&&_!==Ln&&!b&&n.convert(_)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE))}function l(_){if(_==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";_="mediump"}return _==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",h=l(c);h!==c&&(Ue("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),u=t.logarithmicDepthBuffer===!0&&f===!1;t.reversedDepthBuffer===!0&&f===!1&&Ue("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),t.logarithmicDepthBuffer===!0&&f===!0&&Ue("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");let d=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=s.getParameter(s.MAX_TEXTURE_SIZE),p=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),x=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),S=s.getParameter(s.MAX_VARYING_VECTORS),y=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),M=s.getParameter(s.MAX_SAMPLES),T=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:x,maxVaryings:S,maxFragmentUniforms:y,maxSamples:M,samples:T}}function zy(s){let e=this,t=null,n=0,i=!1,r=!1,o=new mn,a=new Ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){let d=f.length!==0||u||n!==0||i;return i=u,n=f.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,u){t=h(f,u,0)},this.setState=function(f,u,d){let g=f.clippingPlanes,v=f.clipIntersection,p=f.clipShadows,m=s.get(f);if(!i||g===null||g.length===0||r&&!p)r?h(null):c();else{let x=r?0:n,S=x*4,y=m.clippingState||null;l.value=y,y=h(g,u,S,d);for(let M=0;M!==S;++M)y[M]=t[M];m.clippingState=y,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=x}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(f,u,d,g){let v=f!==null?f.length:0,p=null;if(v!==0){if(p=l.value,g!==!0||p===null){let m=d+v*4,x=u.matrixWorldInverse;a.getNormalMatrix(x),(p===null||p.length<m)&&(p=new Float32Array(m));for(let S=0,y=d;S!==v;++S,y+=4)o.copy(f[S]).applyMatrix4(x,a),o.normal.toArray(p,y),p[y+3]=o.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,p}}var Ma=class extends Wt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Ho(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Ot(5,5,5),r=new Ft({name:"CubemapFromEquirect",uniforms:Qs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:sn,blending:fn});r.uniforms.tEquirect.value=t;let o=new le(i,r),a=t.minFilter;return t.minFilter===si&&(t.minFilter=Zt),new zr(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(r)}},Kp=256,ky=3,Hy=20,xm=256,ym=16,Vy=3,Gy=new P,Wy=new Pe,jr=class s{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new zr(1,10,null),this._boxMesh=new le(new Ot(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,i=100,r={}){let{size:o=256,position:a=Gy}=r,l=this._renderer;this._setSize(o);let c=this._allocateTarget(),h=this._getSourceTarget(!0);t>0&&(h.texture.mipmapsAutoUpdate=!1);let f=l.autoClear,u=l.autoClearColor,d=l.autoClearDepth,g=l.autoClearStencil,v=e.background;l.autoClear=!0,l.autoClearColor=!0,l.autoClearDepth=!0,l.autoClearStencil=!0,v===null&&(e.background=l.getClearColor(Wy));let p=new zr(n,i,h);return p.position.copy(a),p.update(l,e),l.autoClear=f,l.autoClearColor=u,l.autoClearDepth=d,l.autoClearStencil=g,e.background=v,t>0&&(h.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$p(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Jp(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Kp,Bu(e))}_fromTexture(e,t){e.mapping===Js||e.mapping===Gr?this._setSize(e.image.length===0?Kp:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=jp(e,!1,!1),n=Math.log2(e)-ky;for(let i=0;i<=n;i++)t.texture.mipmaps.push({width:e>>i,height:e>>i});return t.texture.name="PMREM",t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=jp(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let i=this._boxMesh,r=this._cubeCamera;i.material=n,r.renderTarget=e,r.activeMipmapLevel=t;let o=e.width>>t;e.viewport.set(0,0,o,o),r.update(this._renderer,i),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===Js||e.mapping===Gr?(this._cubemapMaterial===null&&(this._cubemapMaterial=$p()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Jp()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(e){this._ggxMaterial===null&&(this._ggxMaterial=Xy(),this._integrationMaterial=qy());let t=this._cubeSize,n=e.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let r=this._integrationMaterial.uniforms;r.envMap.value=this._sourceTarget.texture,r.sourceLod.value=Math.log2(t/ym);for(let o=0;o<=n;o++){let a=s.lodToRoughness(o,n);if(o>n-Vy)r.roughness.value=a,this._renderCube(e,o,this._integrationMaterial);else{let l=a>0?Math.log2(t)+.5*Math.log2(6/(xm*Math.pow(a,4)))+.5:0;i.roughness.value=a,i.lodBias.value=l,this._renderCube(e,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=Yy());let n=this._blurMaterial,i=n.uniforms,r=this._sourceTarget;i.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,i.envMap.value=r.texture,this._renderCube(e,0,n),i.envMap.value=e.texture,this._renderCube(r,0,n)}};function jp(s,e,t){return new Ma(s,{minFilter:si,generateMipmaps:e,type:Qt,colorSpace:Dn,depthBuffer:t})}function ba(s,e,t){return new Ft({name:s,uniforms:e,vertexShader:je.cube_vert,fragmentShader:t,side:sn,blending:fn,depthTest:!1,depthWrite:!1})}function Xy(){return ba("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${xm}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function qy(){return ba("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:ym}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Yy(){return ba("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Hy}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Jp(){return ba("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function $p(){return ba("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Zy(s){let e=new WeakMap,t=new WeakMap,n=null;function i(u,d=!1){return u==null?null:d?o(u):r(u)}function r(u){if(u&&u.isTexture){let d=u.mapping;if(d===Wr||d===$l)if(e.has(u)){let g=e.get(u).texture;return a(g,u.mapping)}else{let g=u.image;if(g&&g.height>0){let v=new Ma(g.height);return v.fromEquirectangularTexture(s,u),e.set(u,v),u.addEventListener("dispose",c),a(v.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture&&u.isPMREMTexture!==!0){let d=u.mapping,g=d===Wr||d===$l,v=d===Js||d===Gr;if(g||v){let p=t.get(u),m=p!==void 0?p.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new jr(s)),p=g?n.fromEquirectangular(u,p):n.fromCubemap(u,p),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),p.texture;if(p!==void 0)return p.texture;{let x=u.image;return g&&x&&x.height>0||v&&x&&l(x)?(n===null&&(n=new jr(s)),p=g?n.fromEquirectangular(u):n.fromCubemap(u),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),u.addEventListener("dispose",h),p.texture):null}}}return u}function a(u,d){return d===Wr?u.mapping=Js:d===$l&&(u.mapping=Gr),u}function l(u){let d=0,g=6;for(let v=0;v<g;v++)u[v]!==void 0&&d++;return d===g}function c(u){let d=u.target;d.removeEventListener("dispose",c);let g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function h(u){let d=u.target;d.removeEventListener("dispose",h);let g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function f(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:f}}function Ky(s){let e={};function t(n){if(e[n]!==void 0)return e[n];let i=s.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let i=t(n);return i===null&&Bs("WebGLRenderer: "+n+" extension not supported."),i}}}function jy(s,e,t,n){let i={},r=new WeakMap,o=new FinalizationRegistry(g=>delete i[g]);function a(g){l(g.target)}function l(g){g.index!==null&&e.remove(g.index);for(let p in g.attributes)e.remove(g.attributes[p]);g.removeEventListener("dispose",a),delete i[g.id],o.unregister(g);let v=r.get(g);v&&(e.remove(v),r.delete(g)),n.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,t.memory.geometries--}function c(g,v){return i[v.id]!==void 0||(v.addEventListener("dispose",a),i[v.id]=new WeakRef(v),o.register(v,v.id,v),t.memory.geometries++),v}function h(g){let v=g.attributes;for(let p in v)e.update(v[p],s.ARRAY_BUFFER)}function f(g){let v=g.index,p=g.attributes.position,m=0;if(p===void 0)return;let x=v!==null?v.array.length:p.array.length/3-1,S=p.count>=65535?Oo:Uo,y=new S(Math.ceil(x/3)*6,1),M=y.array;if(v!==null){let _=v.array;m=v.version;for(let b=0,R=0;b<x;b+=3){let w=_[b+0],C=_[b+1],I=_[b+2];M[R++]=w,M[R++]=C,M[R++]=C,M[R++]=I,M[R++]=I,M[R++]=w}}else{m=p.version;for(let _=0,b=0;_<x;_+=3){let R=_+0,w=_+1,C=_+2;M[b++]=R,M[b++]=w,M[b++]=w,M[b++]=C,M[b++]=C,M[b++]=R}}y.version=m;let T=r.get(g);T&&e.remove(T),r.set(g,y)}function u(g){let v=r.get(g);if(v){let p=g.index;p!==null&&v.version<p.version&&f(g)}else f(g);return r.get(g)}function d(){for(let g in i){let v=i[g].deref();v!==void 0&&l(v)}}return{get:c,update:h,getWireframeAttribute:u,dispose:d}}function Jy(s,e,t){let n;function i(f){n=f}let r,o;function a(f){r=f.type,o=f.bytesPerElement}function l(f,u){s.drawElements(n,u,r,f*o),t.update(u,n,1)}function c(f,u,d){d!==0&&(s.drawElementsInstanced(n,u,r,f*o,d),t.update(u,n,d))}function h(f,u,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,f,0,d);let v=0;for(let p=0;p<d;p++)v+=u[p];t.update(v,n,1)}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function $y(s){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case s.TRIANGLES:t.triangles+=a*(r/3);break;case s.LINES:t.lines+=a*(r/2);break;case s.LINE_STRIP:t.lines+=a*(r-1);break;case s.LINE_LOOP:t.lines+=a*r;break;case s.POINTS:t.points+=a*r;break;default:Ve("WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Qy(s,e,t){let n=new WeakMap,i=new Mt;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==f){let R=function(){_.dispose(),n.delete(a),a.removeEventListener("dispose",R)};u!==void 0&&u.texture.dispose();let d=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,v=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],x=a.morphAttributes.color||[],S=0;d===!0&&(S=1),g===!0&&(S=2),v===!0&&(S=3);let y=a.attributes.position.count*S,M=1;y>e.maxTextureSize&&(M=Math.ceil(y/e.maxTextureSize),y=e.maxTextureSize);let T=new Float32Array(y*M*4*f),_=new Do(T,y,M,f);_.type=Ln,_.needsUpdate=!0;let b=S*4;for(let w=0;w<f;w++){let C=p[w],I=m[w],U=x[w],D=y*M*4*w;for(let B=0;B<C.count;B++){let H=B*b;d===!0&&(i.fromBufferAttribute(C,B),T[D+H+0]=i.x,T[D+H+1]=i.y,T[D+H+2]=i.z,T[D+H+3]=0),g===!0&&(i.fromBufferAttribute(I,B),T[D+H+4]=i.x,T[D+H+5]=i.y,T[D+H+6]=i.z,T[D+H+7]=0),v===!0&&(i.fromBufferAttribute(U,B),T[D+H+8]=i.x,T[D+H+9]=i.y,T[D+H+10]=i.z,T[D+H+11]=U.itemSize===4?i.w:1)}}u={count:f,texture:_,size:new pe(y,M)},n.set(a,u),a.addEventListener("dispose",R)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",o.morphTexture,t);else{let d=0;for(let v=0;v<c.length;v++)d+=c[v];let g=a.morphTargetsRelative?1:1-d;l.getUniforms().setValue(s,"morphTargetBaseInfluence",g),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:r}}function ev(s,e,t,n,i){let r=new WeakMap;function o(c){let h=i.render.frame,f=c.geometry,u=e.get(c,f);if(r.get(u)!==h&&(e.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(t.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,s.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let d=c.skeleton;r.get(d)!==h&&(d.update(),r.set(d,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:o,dispose:a}}var tv={[oa]:"LINEAR_TONE_MAPPING",[aa]:"REINHARD_TONE_MAPPING",[la]:"CINEON_TONE_MAPPING",[ca]:"ACES_FILMIC_TONE_MAPPING",[js]:"AGX_TONE_MAPPING",[ua]:"NEUTRAL_TONE_MAPPING",[ha]:"CUSTOM_TONE_MAPPING"};function nv(s,e,t,n,i,r){let o=new Wt(e,t,{type:s,depthBuffer:i,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=null,h=new bt;h.setAttribute("position",new ut([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new ut([0,2,0,0,2,0],2));let f=new Or({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new le(h,f),d=new is(-1,1,1,-1,0,1),g=null,v=null,p=!1,m,x=null,S=[],y=!1;this.setSize=function(M,T){o.setSize(M,T),a!==null&&a.setSize(M,T),l!==null&&l.setSize(M,T);for(let _=0;_<S.length;_++){let b=S[_];b.setSize&&b.setSize(M,T)}},this.setEffects=function(M){S=M,y=S.length>0&&S[0].isRenderPass===!0;let T=o.width,_=o.height;S.length>0&&a===null&&(a=new Wt(T,_,{type:Qt,depthBuffer:!1,stencilBuffer:!1}),l=new Wt(T,_,{type:Qt,depthBuffer:!1,stencilBuffer:!1}));let b=i===!0&&S.some(R=>R.needsDepthTexture===!0);b!==(o.depthTexture!==null)&&(b===!0&&c===null&&(c=new pi(T,_),r===!0&&(c.format=mi,c.type=rs)),o.dispose(),o.depthTexture=b?c:null,o.resolveDepthBuffer=b,o.storeMultisampledDepthBuffer=b);for(let R=0;R<S.length;R++){let w=S[R];w.setSize&&w.setSize(T,_),b&&w.needsDepthTexture===!0&&w.setDepthTexture&&w.setDepthTexture(c)}},this.begin=function(M,T){if(p||M.toneMapping===Ti&&S.length===0)return!1;if(x=T,T!==null){let _=T.width,b=T.height;(o.width!==_||o.height!==b)&&this.setSize(_,b)}return y===!1&&M.setRenderTarget(o),m=M.toneMapping,M.toneMapping=Ti,!0},this.hasRenderPass=function(){return y},this.end=function(M,T){M.toneMapping=m,p=!0;let _=o,b=a;for(let R=0;R<S.length;R++){let w=S[R];w.enabled!==!1&&(w.render(M,b,_,T),w.needsSwap!==!1&&(_=b,b=b===a?l:a))}if(g!==M.outputColorSpace||v!==M.toneMapping){g=M.outputColorSpace,v=M.toneMapping,f.defines={},Ke.getTransfer(g)===ft&&(f.defines.SRGB_TRANSFER="");let R=tv[v];R&&(f.defines[R]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=_.texture,M.setRenderTarget(x),M.render(u,d),x=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),h.dispose(),f.dispose()}}var vm=new tn,Sm=new pi(1,1),Mm=new Vo(1),bm=new Do,Tm=new Nl,wm=new Ho,Qp=[],em=[],tm=new Float32Array(16),nm=new Float32Array(9),im=new Float32Array(4);function $r(s,e,t){let n=s[0];if(n<=0||n>0)return s;let i=e*t,r=Qp[i];if(r===void 0&&(r=new Float32Array(i),Qp[i]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,s[o].toArray(r,a)}return r}function rn(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function on(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function kc(s,e){let t=em[e];t===void 0&&(t=new Int32Array(e),em[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function iv(s,e){let t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function sv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(rn(t,e))return;s.uniform2fv(this.addr,e),on(t,e)}}function rv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(rn(t,e))return;s.uniform3fv(this.addr,e),on(t,e)}}function ov(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(rn(t,e))return;s.uniform4fv(this.addr,e),on(t,e)}}function av(s,e){let t=this.cache,n=e.elements;if(n===void 0){if(rn(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),on(t,e)}else{if(rn(t,n))return;im.set(n),s.uniformMatrix2fv(this.addr,!1,im),on(t,n)}}function lv(s,e){let t=this.cache,n=e.elements;if(n===void 0){if(rn(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),on(t,e)}else{if(rn(t,n))return;nm.set(n),s.uniformMatrix3fv(this.addr,!1,nm),on(t,n)}}function cv(s,e){let t=this.cache,n=e.elements;if(n===void 0){if(rn(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),on(t,e)}else{if(rn(t,n))return;tm.set(n),s.uniformMatrix4fv(this.addr,!1,tm),on(t,n)}}function hv(s,e){let t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function uv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(rn(t,e))return;s.uniform2iv(this.addr,e),on(t,e)}}function fv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(rn(t,e))return;s.uniform3iv(this.addr,e),on(t,e)}}function dv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(rn(t,e))return;s.uniform4iv(this.addr,e),on(t,e)}}function pv(s,e){let t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function mv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(rn(t,e))return;s.uniform2uiv(this.addr,e),on(t,e)}}function gv(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(rn(t,e))return;s.uniform3uiv(this.addr,e),on(t,e)}}function _v(s,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(rn(t,e))return;s.uniform4uiv(this.addr,e),on(t,e)}}function Hc(s){return s.version===0&&(s.compareFunction=Nu,s.needsUpdate=!0),s}function xv(s,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?r=Hc(Sm):r=vm,t.setTexture2D(e||r,i)}function yv(s,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Tm,i)}function vv(s,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_CUBE_SHADOW?r=Hc(Mm):r=wm,t.setTextureCube(e||r,i)}function Sv(s,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||bm,i)}function Mv(s){switch(s){case 5126:return iv;case 35664:return sv;case 35665:return rv;case 35666:return ov;case 35674:return av;case 35675:return lv;case 35676:return cv;case 5124:case 35670:return hv;case 35667:case 35671:return uv;case 35668:case 35672:return fv;case 35669:case 35673:return dv;case 5125:return pv;case 36294:return mv;case 36295:return gv;case 36296:return _v;case 35678:case 36198:case 36298:case 36306:case 35682:return xv;case 35679:case 36299:case 36307:return yv;case 35680:case 36300:case 36308:case 36293:return vv;case 36289:case 36303:case 36311:case 36292:return Sv}}function bv(s,e){s.uniform1fv(this.addr,e)}function Tv(s,e){let t=$r(e,this.size,2);s.uniform2fv(this.addr,t)}function wv(s,e){let t=$r(e,this.size,3);s.uniform3fv(this.addr,t)}function Ev(s,e){let t=$r(e,this.size,4);s.uniform4fv(this.addr,t)}function Av(s,e){let t=$r(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function Rv(s,e){let t=$r(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function Cv(s,e){let t=$r(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function Pv(s,e){s.uniform1iv(this.addr,e)}function Iv(s,e){s.uniform2iv(this.addr,e)}function Lv(s,e){s.uniform3iv(this.addr,e)}function Dv(s,e){s.uniform4iv(this.addr,e)}function Nv(s,e){s.uniform1uiv(this.addr,e)}function Uv(s,e){s.uniform2uiv(this.addr,e)}function Ov(s,e){s.uniform3uiv(this.addr,e)}function Fv(s,e){s.uniform4uiv(this.addr,e)}function Bv(s,e,t){let n=this.cache,i=e.length,r=kc(t,i);rn(n,r)||(s.uniform1iv(this.addr,r),on(n,r));let o;this.type===s.SAMPLER_2D_SHADOW?o=Hc(Sm):o=vm;for(let a=0;a!==i;++a)t.setTexture2D(e[a]||o,r[a])}function zv(s,e,t){let n=this.cache,i=e.length,r=kc(t,i);rn(n,r)||(s.uniform1iv(this.addr,r),on(n,r));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||Tm,r[o])}function kv(s,e,t){let n=this.cache,i=e.length,r=kc(t,i);rn(n,r)||(s.uniform1iv(this.addr,r),on(n,r));let o;this.type===s.SAMPLER_CUBE_SHADOW?o=Hc(Mm):o=wm;for(let a=0;a!==i;++a)t.setTextureCube(e[a]||o,r[a])}function Hv(s,e,t){let n=this.cache,i=e.length,r=kc(t,i);rn(n,r)||(s.uniform1iv(this.addr,r),on(n,r));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||bm,r[o])}function Vv(s){switch(s){case 5126:return bv;case 35664:return Tv;case 35665:return wv;case 35666:return Ev;case 35674:return Av;case 35675:return Rv;case 35676:return Cv;case 5124:case 35670:return Pv;case 35667:case 35671:return Iv;case 35668:case 35672:return Lv;case 35669:case 35673:return Dv;case 5125:return Nv;case 36294:return Uv;case 36295:return Ov;case 36296:return Fv;case 35678:case 36198:case 36298:case 36306:case 35682:return Bv;case 35679:case 36299:case 36307:return zv;case 35680:case 36300:case 36308:case 36293:return kv;case 36289:case 36303:case 36311:case 36292:return Hv}}var $u=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Mv(t.type)}},Qu=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Vv(t.type)}},ef=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let i=this.seq;for(let r=0,o=i.length;r!==o;++r){let a=i[r];a.setValue(e,t[a.id],n)}}},ju=/(\w+)(\])?(\[|\.)?/g;function sm(s,e){s.seq.push(e),s.map[e.id]=e}function Gv(s,e,t){let n=s.name,i=n.length;for(ju.lastIndex=0;;){let r=ju.exec(n),o=ju.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){sm(t,c===void 0?new $u(a,s,e):new Qu(a,s,e));break}else{let f=t.map[a];f===void 0&&(f=new ef(a),sm(t,f)),t=f}}}var Kr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);Gv(a,l,this)}let i=[],r=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?i.push(o):r.push(o);i.length>0&&(this.seq=i.concat(r))}setValue(e,t,n,i){let r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){let i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,o=t.length;r!==o;++r){let a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,i)}}static seqWithValue(e,t){let n=[];for(let i=0,r=e.length;i!==r;++i){let o=e[i];o.id in t&&n.push(o)}return n}};function rm(s,e,t){let n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}var Wv=37297,Xv=0;function qv(s,e){let t=s.split(`
`),n=[],i=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=i;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}var om=new Ge;function Yv(s){Ke._getMatrix(om,Ke.workingColorSpace,s);let e=`mat3( ${om.elements.map(t=>t.toFixed(4))} )`;switch(Ke.getTransfer(s)){case Io:return[e,"LinearTransferOETF"];case ft:return[e,"sRGBTransferOETF"];default:return Ue("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function am(s,e,t){let n=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+qv(s.getShaderSource(e),a)}else return r}function Zv(s,e){let t=Yv(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( ${t[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}var Kv={[oa]:"Linear",[aa]:"Reinhard",[la]:"Cineon",[ca]:"ACESFilmic",[js]:"AgX",[ua]:"Neutral",[ha]:"Custom"};function jv(s,e){let t=Kv[e];return t===void 0?(Ue("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Bc=new P;function Jv(){Ke.getLuminanceCoefficients(Bc);let s=Bc.x.toFixed(4),e=Bc.y.toFixed(4),t=Bc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function $v(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Sa).join(`
`)}function Qv(s){let e=[];for(let t in s){let n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function eS(s,e){let t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){let r=s.getActiveAttrib(e,i),o=r.name,a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:s.getAttribLocation(e,o),locationSize:a}}return t}function Sa(s){return s!==""}function lm(s,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,e.numLightProbeGrids)}function cm(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var tS=/^[ \t]*#include +<([\w\d./]+)>/gm;function tf(s){return s.replace(tS,nS)}function nS(s,e){let t=je[e];if(t===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">");return tf(t)}var iS=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function hm(s){return s.replace(iS,sS)}function sS(s,e,t,n){let i="";for(let r=parseInt(e);r<parseInt(t);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function um(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var rS={[na]:"SHADOWMAP_TYPE_PCF",[Hr]:"SHADOWMAP_TYPE_VSM"};function oS(s){return rS[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var aS={[Gr]:"ENVMAP_MODE_REFRACTION"};function lS(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":aS[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}var cS={[Jl]:"ENVMAP_BLENDING_MULTIPLY",[Pp]:"ENVMAP_BLENDING_MIX",[Ip]:"ENVMAP_BLENDING_ADD"};function hS(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":cS[s.combine]||"ENVMAP_BLENDING_NONE"}function uS(s,e,t,n){let i=s.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,l=oS(t),c=t.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",h=lS(t),f=hS(t),u=$v(t),d=Qv(r),g=i.createProgram(),v,p,m=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(v=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,d].filter(Sa).join(`
`),v.length>0&&(v+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,d].filter(Sa).join(`
`),p.length>0&&(p+=`
`)):(v=[um(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,d,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+t.diffuseRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Sa).join(`
`),p=[um(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,d,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+f:"",t.envMapPMREM?"#define ENVMAP_MAX_LOD "+t.envMapMaxLod+".0":"",t.envMapPMREM?"#define ENVMAP_SIZE "+t.envMapSize+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Ti?"#define TONE_MAPPING":"",t.toneMapping!==Ti?je.tonemapping_pars_fragment:"",t.toneMapping!==Ti?jv("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",je.colorspace_pars_fragment,Zv("linearToOutputTexel",t.outputColorSpace),Jv(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Sa).join(`
`)),o=tf(o),o=lm(o,t),o=cm(o,t),a=tf(a),a=lm(a,t),a=cm(a,t),o=hm(o),a=hm(a),t.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,v=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+v,p=["#define varying in",t.glslVersion===Ou?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ou?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let x=m+v+o,S=m+p+a,y=rm(i,i.VERTEX_SHADER,x),M=rm(i,i.FRAGMENT_SHADER,S);i.attachShader(g,y),i.attachShader(g,M),t.index0AttributeName!==void 0?i.bindAttribLocation(g,0,t.index0AttributeName):t.hasPositionAttribute===!0&&i.bindAttribLocation(g,0,"position"),i.linkProgram(g);function T(w){if(s.debug.checkShaderErrors){let C=i.getProgramInfoLog(g)||"",I=i.getShaderInfoLog(y)||"",U=i.getShaderInfoLog(M)||"",D=C.trim(),B=I.trim(),H=U.trim(),G=!0,ee=!0;if(i.getProgramParameter(g,i.LINK_STATUS)===!1)if(G=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,g,y,M);else{let V=am(i,y,"vertex"),Q=am(i,M,"fragment");Ve("WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(g,i.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+D+`
`+V+`
`+Q)}else D!==""?Ue("WebGLProgram: Program Info Log:",D):(B===""||H==="")&&(ee=!1);ee&&(w.diagnostics={runnable:G,programLog:D,vertexShader:{log:B,prefix:v},fragmentShader:{log:H,prefix:p}})}i.deleteShader(y),i.deleteShader(M),_=new Kr(i,g),b=eS(i,g)}let _;this.getUniforms=function(){return _===void 0&&T(this),_};let b;this.getAttributes=function(){return b===void 0&&T(this),b};let R=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=i.getProgramParameter(g,Wv)),R},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Xv++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=y,this.fragmentShader=M,this}var fS=0,nf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let i=this._getShaderCacheForMaterial(e);return i.has(t)===!1&&(i.add(t),t.usedTimes++),i.has(n)===!1&&(i.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new sf(e),t.set(e,n)),n}},sf=class{constructor(e){this.id=fS++,this.code=e,this.usedTimes=0}};function dS(s){return s===Ms||s===_a||s===xa}function pS(s,e,t,n,i,r){let o=new Cr,a=new nf,l=new Set,c=[],h=new Map,f=n.logarithmicDepthBuffer,u={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function d(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,b,R,w,C,I){let U=w.fog,D=C.geometry,B=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?w.environment:null,H=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,G=e.get(_.envMap||B,H),ee=u[_.type],V=n.precision;_.precision!==null&&(V=n.getMaxPrecision(_.precision),V!==_.precision&&Ue("WebGLProgram.getParameters:",_.precision,"not supported, using",V,"instead."));let Q=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,ne=Q!==void 0?Q.length:0,de=0;D.morphAttributes.position!==void 0&&(de=1),D.morphAttributes.normal!==void 0&&(de=2),D.morphAttributes.color!==void 0&&(de=3);let we,$,ue,Se;if(ee){let F=Ai[ee];we=F.vertexShader,$=F.fragmentShader}else{we=_.vertexShader,$=_.fragmentShader;let F=a.getVertexShaderStage(_),ie=a.getFragmentShaderStage(_);a.update(_,F,ie),ue=F.id,Se=ie.id}let Ee=s.getRenderTarget(),me=s.state.buffers.depth.getReversed(),Le=C.isInstancedMesh===!0,rt=C.isBatchedMesh===!0,Be=!!_.map,He=!!_.matcap,Ye=!!G,Oe=Ye&&G.isPMREMTexture===!0,Lt=!!_.aoMap,vt=!!_.lightMap,Yt=!!_.bumpMap&&_.wireframe===!1,pt=!!_.normalMap,dn=!!_.displacementMap,Je=!!_.emissiveMap,St=!!_.metalnessMap,Vt=!!_.roughnessMap,Gt=_.anisotropy>0,z=_.clearcoat>0,wt=_.diffuseRoughness>0,et=_.dispersion>0,st=_.retroreflectivity>0,ge=_.iridescence>0,lt=_.sheen>0,De=_.transmission>0,ke=Gt&&!!_.anisotropyMap,N=z&&!!_.clearcoatMap,E=z&&!!_.clearcoatNormalMap,W=z&&!!_.clearcoatRoughnessMap,re=wt&&!!_.diffuseRoughnessMap,K=ge&&!!_.iridescenceMap,se=ge&&!!_.iridescenceThicknessMap,ce=lt&&!!_.sheenColorMap,Y=lt&&!!_.sheenRoughnessMap,j=!!_.specularMap,ae=!!_.specularColorMap,O=!!_.specularIntensityMap,te=De&&!!_.transmissionMap,J=De&&!!_.thicknessMap,_e=!!_.gradientMap,he=!!_.alphaMap,fe=_.alphaTest>0,Ne=!!_.alphaHash,Ze=!!_.extensions,oe=Ti;_.toneMapped&&(Ee===null||Ee.isXRRenderTarget===!0)&&(oe=s.toneMapping);let Fe=Oe?G.isCompressedCubeTexture?G.image[0].mipmaps:G.mipmaps:null,L={shaderID:ee,shaderType:_.type,shaderName:_.name,vertexShader:we,fragmentShader:$,defines:_.defines,customVertexShaderID:ue,customFragmentShaderID:Se,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:V,batching:rt,batchingColor:rt&&C._colorsTexture!==null,instancing:Le,instancingColor:Le&&C.instanceColor!==null,instancingMorph:Le&&C.morphTexture!==null,outputColorSpace:Ee===null?s.outputColorSpace:Ee.isXRRenderTarget===!0?Ee.texture.colorSpace:Ke.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Be,matcap:He,envMap:Ye,envMapMode:Ye&&G.mapping,envMapPMREM:Oe,envMapMaxLod:Oe?Fe.length-1:null,envMapSize:Oe?Fe[0].width:null,aoMap:Lt,lightMap:vt,bumpMap:Yt,normalMap:pt,displacementMap:dn,emissiveMap:Je,normalMapObjectSpace:pt&&_.normalMapType===Up,normalMapTangentSpace:pt&&_.normalMapType===Zr,packedNormalMap:pt&&_.normalMapType===Zr&&dS(_.normalMap.format),metalnessMap:St,roughnessMap:Vt,anisotropy:Gt,anisotropyMap:ke,clearcoat:z,clearcoatMap:N,clearcoatNormalMap:E,clearcoatRoughnessMap:W,diffuseRoughness:wt,diffuseRoughnessMap:re,dispersion:et,retroreflection:st,iridescence:ge,iridescenceMap:K,iridescenceThicknessMap:se,sheen:lt,sheenColorMap:ce,sheenRoughnessMap:Y,specularMap:j,specularColorMap:ae,specularIntensityMap:O,transmission:De,transmissionMap:te,thicknessMap:J,gradientMap:_e,opaque:_.transparent===!1&&_.blending===Vr&&_.alphaToCoverage===!1,alphaMap:he,alphaTest:fe,alphaHash:Ne,combine:_.combine,mapUv:Be&&d(_.map.channel),aoMapUv:Lt&&d(_.aoMap.channel),lightMapUv:vt&&d(_.lightMap.channel),bumpMapUv:Yt&&d(_.bumpMap.channel),normalMapUv:pt&&d(_.normalMap.channel),displacementMapUv:dn&&d(_.displacementMap.channel),emissiveMapUv:Je&&d(_.emissiveMap.channel),metalnessMapUv:St&&d(_.metalnessMap.channel),roughnessMapUv:Vt&&d(_.roughnessMap.channel),anisotropyMapUv:ke&&d(_.anisotropyMap.channel),clearcoatMapUv:N&&d(_.clearcoatMap.channel),clearcoatNormalMapUv:E&&d(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:W&&d(_.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:re&&d(_.diffuseRoughnessMap.channel),iridescenceMapUv:K&&d(_.iridescenceMap.channel),iridescenceThicknessMapUv:se&&d(_.iridescenceThicknessMap.channel),sheenColorMapUv:ce&&d(_.sheenColorMap.channel),sheenRoughnessMapUv:Y&&d(_.sheenRoughnessMap.channel),specularMapUv:j&&d(_.specularMap.channel),specularColorMapUv:ae&&d(_.specularColorMap.channel),specularIntensityMapUv:O&&d(_.specularIntensityMap.channel),transmissionMapUv:te&&d(_.transmissionMap.channel),thicknessMapUv:J&&d(_.thicknessMap.channel),alphaMapUv:he&&d(_.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(pt||Gt),vertexNormals:!!D.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:C.isPoints===!0&&!!D.attributes.uv&&(Be||he),fog:!!U,useFog:_.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||D.attributes.normal===void 0&&pt===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:me,skinning:C.isSkinnedMesh===!0,hasPositionAttribute:D.attributes.position!==void 0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:ne,morphTextureStride:de,numSunLights:b.sun.length,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numSunLightShadows:b.sunShadowMap.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numLightProbeGrids:I.filter(F=>F.texture!==null).length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&R.length>0,shadowMapType:s.shadowMap.type,toneMapping:oe,decodeVideoTexture:Be&&_.map.isVideoTexture===!0&&Ke.getTransfer(_.map.colorSpace)===ft,decodeVideoTextureEmissive:Je&&_.emissiveMap.isVideoTexture===!0&&Ke.getTransfer(_.emissiveMap.colorSpace)===ft,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===En,flipSided:_.side===sn,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Ze&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ze&&_.extensions.multiDraw===!0||rt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return L.vertexUv1s=l.has(1),L.vertexUv2s=l.has(2),L.vertexUv3s=l.has(3),l.clear(),L}function v(_){let b=[];if(_.shaderID?b.push(_.shaderID):(b.push(_.customVertexShaderID),b.push(_.customFragmentShaderID)),_.defines!==void 0)for(let R in _.defines)b.push(R),b.push(_.defines[R]);return _.isRawShaderMaterial===!1&&(p(b,_),m(b,_),b.push(s.outputColorSpace)),b.push(_.customProgramCacheKey),b.join()}function p(_,b){_.push(b.precision),_.push(b.outputColorSpace),_.push(b.envMapMode),_.push(b.envMapPMREM),_.push(b.envMapMaxLod),_.push(b.envMapSize),_.push(b.mapUv),_.push(b.alphaMapUv),_.push(b.lightMapUv),_.push(b.aoMapUv),_.push(b.bumpMapUv),_.push(b.normalMapUv),_.push(b.displacementMapUv),_.push(b.emissiveMapUv),_.push(b.metalnessMapUv),_.push(b.roughnessMapUv),_.push(b.anisotropyMapUv),_.push(b.clearcoatMapUv),_.push(b.clearcoatNormalMapUv),_.push(b.clearcoatRoughnessMapUv),_.push(b.diffuseRoughnessMapUv),_.push(b.iridescenceMapUv),_.push(b.iridescenceThicknessMapUv),_.push(b.sheenColorMapUv),_.push(b.sheenRoughnessMapUv),_.push(b.specularMapUv),_.push(b.specularColorMapUv),_.push(b.specularIntensityMapUv),_.push(b.transmissionMapUv),_.push(b.thicknessMapUv),_.push(b.combine),_.push(b.fogExp2),_.push(b.sizeAttenuation),_.push(b.morphTargetsCount),_.push(b.numSunLights),_.push(b.numDirLights),_.push(b.numPointLights),_.push(b.numSpotLights),_.push(b.numSpotLightMaps),_.push(b.numHemiLights),_.push(b.numRectAreaLights),_.push(b.numSunLightShadows),_.push(b.numDirLightShadows),_.push(b.numPointLightShadows),_.push(b.numSpotLightShadows),_.push(b.numSpotLightShadowsWithMaps),_.push(b.numLightProbes),_.push(b.numLightProbeGrids),_.push(b.shadowMapType),_.push(b.toneMapping),_.push(b.numClippingPlanes),_.push(b.numClipIntersection),_.push(b.depthPacking)}function m(_,b){o.disableAll(),b.instancing&&o.enable(0),b.instancingColor&&o.enable(1),b.instancingMorph&&o.enable(2),b.matcap&&o.enable(3),b.envMap&&o.enable(4),b.normalMapObjectSpace&&o.enable(5),b.normalMapTangentSpace&&o.enable(6),b.clearcoat&&o.enable(7),b.iridescence&&o.enable(8),b.alphaTest&&o.enable(9),b.vertexColors&&o.enable(10),b.vertexAlphas&&o.enable(11),b.vertexUv1s&&o.enable(12),b.vertexUv2s&&o.enable(13),b.vertexUv3s&&o.enable(14),b.vertexTangents&&o.enable(15),b.anisotropy&&o.enable(16),b.alphaHash&&o.enable(17),b.batching&&o.enable(18),b.dispersion&&o.enable(19),b.retroreflection&&o.enable(24),b.diffuseRoughness&&o.enable(25),b.batchingColor&&o.enable(20),b.gradientMap&&o.enable(21),b.packedNormalMap&&o.enable(22),b.vertexNormals&&o.enable(23),_.push(o.mask),o.disableAll(),b.fog&&o.enable(0),b.useFog&&o.enable(1),b.flatShading&&o.enable(2),b.logarithmicDepthBuffer&&o.enable(3),b.reversedDepthBuffer&&o.enable(4),b.skinning&&o.enable(5),b.morphTargets&&o.enable(6),b.morphNormals&&o.enable(7),b.morphColors&&o.enable(8),b.premultipliedAlpha&&o.enable(9),b.shadowMapEnabled&&o.enable(10),b.doubleSided&&o.enable(11),b.flipSided&&o.enable(12),b.useDepthPacking&&o.enable(13),b.dithering&&o.enable(14),b.transmission&&o.enable(15),b.sheen&&o.enable(16),b.opaque&&o.enable(17),b.pointsUvs&&o.enable(18),b.decodeVideoTexture&&o.enable(19),b.decodeVideoTextureEmissive&&o.enable(20),b.alphaToCoverage&&o.enable(21),b.numLightProbeGrids>0&&o.enable(22),b.hasPositionAttribute&&o.enable(23),_.push(o.mask)}function x(_){let b=u[_.type],R;if(b){let w=Ai[b];R=On.clone(w.uniforms)}else R=_.uniforms;return R}function S(_,b){let R=h.get(b);return R!==void 0?++R.usedTimes:(R=new uS(s,b,_,i),c.push(R),h.set(b,R)),R}function y(_){if(--_.usedTimes===0){let b=c.indexOf(_);c[b]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function M(_){a.remove(_)}function T(){a.dispose()}return{getParameters:g,getProgramCacheKey:v,getUniforms:x,acquireProgram:S,releaseProgram:y,releaseShaderCache:M,programs:c,dispose:T}}function mS(){let s=new WeakMap;function e(o){return s.has(o)}function t(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,l){s.get(o)[a]=l}function r(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:r}}function gS(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.materialVariant!==e.materialVariant?s.materialVariant-e.materialVariant:s.z!==e.z?s.z-e.z:s.id-e.id}function fm(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function dm(){let s=[],e=0,t=[],n=[],i=[];function r(){e=0,t.length=0,n.length=0,i.length=0}function o(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function a(u,d,g,v,p,m){let x=s[e];return x===void 0?(x={id:u.id,object:u,geometry:d,material:g,materialVariant:o(u),groupOrder:v,renderOrder:u.renderOrder,z:p,group:m},s[e]=x):(x.id=u.id,x.object=u,x.geometry=d,x.material=g,x.materialVariant=o(u),x.groupOrder=v,x.renderOrder=u.renderOrder,x.z=p,x.group=m),e++,x}function l(u,d,g,v,p,m,x){x.reversedDepth===!0&&(p=-p);let S=a(u,d,g,v,p,m);g.transmission>0?n.push(S):g.transparent===!0?i.push(S):t.push(S)}function c(u,d,g,v,p,m){let x=a(u,d,g,v,p,m);g.transmission>0?n.unshift(x):g.transparent===!0?i.unshift(x):t.unshift(x)}function h(u,d){t.length>1&&t.sort(u||gS),n.length>1&&n.sort(d||fm),i.length>1&&i.sort(d||fm)}function f(){for(let u=e,d=s.length;u<d;u++){let g=s[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:i,init:r,push:l,unshift:c,finish:f,sort:h}}function _S(){let s=new WeakMap;function e(n,i){let r=s.get(n),o;return r===void 0?(o=new dm,s.set(n,[o])):i>=r.length?(o=new dm,r.push(o)):o=r[i],o}function t(){s=new WeakMap}return{get:e,dispose:t}}function xS(){let s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new P,color:new Pe};break;case"SpotLight":t={position:new P,direction:new P,color:new Pe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new Pe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new Pe,groundColor:new Pe};break;case"RectAreaLight":t={color:new Pe,position:new P,halfWidth:new P,halfHeight:new P};break}return s[e.id]=t,t}}}function yS(){let s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new pe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new pe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new pe,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}var vS=0;function SS(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function MS(s){let e=new xS,t=yS(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new P);let i=new P,r=new Te,o=new Te;function a(c){let h=0,f=0,u=0;for(let I=0;I<9;I++)n.probe[I].set(0,0,0);let d=0,g=0,v=0,p=0,m=0,x=0,S=0,y=0,M=0,T=0,_=0,b=0,R=0,w=0;c.sort(SS);for(let I=0,U=c.length;I<U;I++){let D=c[I],B=D.color,H=D.intensity,G=D.distance,ee=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===Ms?ee=D.shadow.map.texture:ee=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)h+=B.r*H,f+=B.g*H,u+=B.b*H;else if(D.isLightProbe){for(let V=0;V<9;V++)n.probe[V].addScaledVector(D.sh.coefficients[V],H);w++}else if(D.isSunLight){let V=e.get(D);if(V.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let Q=D.shadow,ne=t.get(D);ne.shadowIntensity=Q.intensity,ne.shadowBias=Q.bias,ne.shadowNormalBias=Q.normalBias,ne.shadowRadius=Q.radius,ne.shadowMapSize.copy(Q.mapSize).multiply(Q.getFrameExtents()),n.sunShadow[g]=ne,n.sunShadowMap[g]=ee;let de=Q.getViewportCount();for(let we=0;we<de;we++)n.sunShadowMatrix[v+we]=Q.getMatrix(we),n.sunShadowCascade[v+we]=Q._cascadeData[we];v+=de,g++}n.sun[d]=V,d++}else if(D.isDirectionalLight){let V=e.get(D);if(V.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let Q=D.shadow,ne=t.get(D);ne.shadowIntensity=Q.intensity,ne.shadowBias=Q.bias,ne.shadowNormalBias=Q.normalBias,ne.shadowRadius=Q.radius,ne.shadowMapSize=Q.mapSize,n.directionalShadow[p]=ne,n.directionalShadowMap[p]=ee,n.directionalShadowMatrix[p]=D.shadow.matrix,M++}n.directional[p]=V,p++}else if(D.isSpotLight){let V=e.get(D);V.position.setFromMatrixPosition(D.matrixWorld),V.color.copy(B).multiplyScalar(H),V.distance=G,V.coneCos=Math.cos(D.angle),V.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),V.decay=D.decay,n.spot[x]=V;let Q=D.shadow;if(D.map&&(n.spotLightMap[b]=D.map,b++,Q.updateMatrices(D),D.castShadow&&R++),n.spotLightMatrix[x]=Q.matrix,D.castShadow){let ne=t.get(D);ne.shadowIntensity=Q.intensity,ne.shadowBias=Q.bias,ne.shadowNormalBias=Q.normalBias,ne.shadowRadius=Q.radius,ne.shadowMapSize=Q.mapSize,n.spotShadow[x]=ne,n.spotShadowMap[x]=ee,_++}x++}else if(D.isRectAreaLight){let V=e.get(D);V.color.copy(B).multiplyScalar(H),V.halfWidth.set(D.width*.5,0,0),V.halfHeight.set(0,D.height*.5,0),n.rectArea[S]=V,S++}else if(D.isPointLight){let V=e.get(D);if(V.color.copy(D.color).multiplyScalar(D.intensity),V.distance=D.distance,V.decay=D.decay,D.castShadow){let Q=D.shadow,ne=t.get(D);ne.shadowIntensity=Q.intensity,ne.shadowBias=Q.bias,ne.shadowNormalBias=Q.normalBias,ne.shadowRadius=Q.radius,ne.shadowMapSize=Q.mapSize,ne.shadowCameraNear=Q.camera.near,ne.shadowCameraFar=Q.camera.far,n.pointShadow[m]=ne,n.pointShadowMap[m]=ee,n.pointShadowMatrix[m]=D.shadow.matrix,T++}n.point[m]=V,m++}else if(D.isHemisphereLight){let V=e.get(D);V.skyColor.copy(D.color).multiplyScalar(H),V.groundColor.copy(D.groundColor).multiplyScalar(H),n.hemi[y]=V,y++}}S>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ve.LTC_FLOAT_1,n.rectAreaLTC2=ve.LTC_FLOAT_2):(n.rectAreaLTC1=ve.LTC_HALF_1,n.rectAreaLTC2=ve.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=u;let C=n.hash;(C.sunLength!==d||C.directionalLength!==p||C.pointLength!==m||C.spotLength!==x||C.rectAreaLength!==S||C.hemiLength!==y||C.numSunShadows!==g||C.numDirectionalShadows!==M||C.numPointShadows!==T||C.numSpotShadows!==_||C.numSpotMaps!==b||C.numLightProbes!==w)&&(n.sun.length=d,n.directional.length=p,n.spot.length=x,n.rectArea.length=S,n.point.length=m,n.hemi.length=y,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=v,n.sunShadowCascade.length=v,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.directionalShadowMatrix.length=M,n.pointShadow.length=T,n.pointShadowMap.length=T,n.pointShadowMatrix.length=T,n.spotShadow.length=_,n.spotShadowMap.length=_,n.spotLightMatrix.length=_+b-R,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=w,C.sunLength=d,C.directionalLength=p,C.pointLength=m,C.spotLength=x,C.rectAreaLength=S,C.hemiLength=y,C.numSunShadows=g,C.numDirectionalShadows=M,C.numPointShadows=T,C.numSpotShadows=_,C.numSpotMaps=b,C.numLightProbes=w,n.version=vS++)}function l(c,h){let f=0,u=0,d=0,g=0,v=0,p=0,m=h.matrixWorldInverse;for(let x=0,S=c.length;x<S;x++){let y=c[x];if(y.isSunLight){let M=n.sun[f];M.direction.setFromMatrixPosition(y.matrixWorld),M.direction.transformDirection(m),f++}else if(y.isDirectionalLight){let M=n.directional[u];M.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),M.direction.sub(i),M.direction.transformDirection(m),u++}else if(y.isSpotLight){let M=n.spot[g];M.position.setFromMatrixPosition(y.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),M.direction.sub(i),M.direction.transformDirection(m),g++}else if(y.isRectAreaLight){let M=n.rectArea[v];M.position.setFromMatrixPosition(y.matrixWorld),M.position.applyMatrix4(m),o.identity(),r.copy(y.matrixWorld),r.premultiply(m),o.extractRotation(r),M.halfWidth.set(y.width*.5,0,0),M.halfHeight.set(0,y.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),v++}else if(y.isPointLight){let M=n.point[d];M.position.setFromMatrixPosition(y.matrixWorld),M.position.applyMatrix4(m),d++}else if(y.isHemisphereLight){let M=n.hemi[p];M.direction.setFromMatrixPosition(y.matrixWorld),M.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:n}}function pm(s){let e=new MS(s),t=[],n=[],i=[];function r(f){h.camera=f,t.length=0,n.length=0,i.length=0}function o(f){f.isLightProbeGrid?i.push(f):t.push(f)}function a(f){n.push(f)}function l(){e.setup(t),i.sort((f,u)=>f.priority-u.priority||f.id-u.id)}function c(f){e.setupView(t,f)}let h={lightsArray:t,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:h,setupLights:l,setupLightsView:c,pushLight:o,pushShadow:a}}function bS(s){let e=new WeakMap;function t(i,r=0){let o=e.get(i),a;return o===void 0?(a=new pm(s),e.set(i,[a])):r>=o.length?(a=new pm(s),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}var TS=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wS=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,ES=[new P(1,0,0),new P(-1,0,0),new P(0,1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1)],AS=[new P(0,-1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1),new P(0,-1,0),new P(0,-1,0)],mm=new Te,va=new P,Ju=new P;function RS(s,e,t){let n=new Yi,i=new pe,r=new pe,o=new Mt,a=new Bl,l=new zl,c={},h=t.maxTextureSize,f={[Yn]:sn,[sn]:Yn,[En]:En},u=new Ft({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new pe},radius:{value:4}},vertexShader:TS,fragmentShader:wS}),d=u.clone();d.defines.HORIZONTAL_PASS=1;let g=new bt;g.setAttribute("position",new Nt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new le(g,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=na;let m=this.type;this.render=function(T,_,b){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||T.length===0)return;this.type===Kl&&(Ue("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=na);let R=s.getRenderTarget(),w=s.getActiveCubeFace(),C=s.getActiveMipmapLevel(),I=s.state;I.setBlending(fn),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);let U=m!==this.type;U&&_.traverse(function(D){D.material&&(Array.isArray(D.material)?D.material.forEach(B=>B.needsUpdate=!0):D.material.needsUpdate=!0)});for(let D=0,B=T.length;D<B;D++){let H=T[D],G=H.shadow;if(G===void 0){Ue("WebGLShadowMap:",H,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;i.copy(G.mapSize);let ee=G.getFrameExtents();i.multiply(ee),r.copy(G.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/ee.x),i.x=r.x*ee.x,G.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/ee.y),i.y=r.y*ee.y,G.mapSize.y=r.y));let V=s.state.buffers.depth.getReversed();if(G.camera._reversedDepth=V,G.map===null||U===!0){if(G.map!==null&&(G.map.depthTexture!==null&&(G.map.depthTexture.dispose(),G.map.depthTexture=null),G.map.dispose()),this.type===Hr){if(H.isPointLight){Ue("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}G.map=new Wt(i.x,i.y,{format:Ms,type:Qt,minFilter:Zt,magFilter:Zt,generateMipmaps:!1}),G.map.texture.name=H.name+".shadowMap",G.map.depthTexture=new pi(i.x,i.y,Ln),G.map.depthTexture.name=H.name+".shadowMapDepth",G.map.depthTexture.format=Xi,G.map.depthTexture.compareFunction=null,G.map.depthTexture.minFilter=Ut,G.map.depthTexture.magFilter=Ut}else H.isPointLight?(G.map=new Ma(i.x),G.map.depthTexture=new Vo(i.x,ri)):(G.map=new Wt(i.x,i.y),G.map.depthTexture=new pi(i.x,i.y,ri)),G.map.depthTexture.name=H.name+".shadowMap",G.map.depthTexture.format=Xi,this.type===na?(G.map.depthTexture.compareFunction=V?Du:Lu,G.map.depthTexture.minFilter=Zt,G.map.depthTexture.magFilter=Zt):(G.map.depthTexture.compareFunction=null,G.map.depthTexture.minFilter=Ut,G.map.depthTexture.magFilter=Ut);G.camera.updateProjectionMatrix()}G.map.isWebGLCubeRenderTarget!==!0&&(G.map.width!==i.x||G.map.height!==i.y)&&G.map.setSize(i.x,i.y);let Q=G.map.isWebGLCubeRenderTarget?6:G.getViewportCount();H.isPointLight!==!0&&G.updateMatrices(H,b);let ne=(G.camera.layers.mask&4294967294)!==0?G.camera.layers:b.layers;for(let de=0;de<Q;de++){let we=G.getCamera(de);if(H.isPointLight){let $=G.camera,ue=G.matrix,Se=H.distance||$.far;Se!==$.far&&($.far=Se,$.updateProjectionMatrix()),va.setFromMatrixPosition(H.matrixWorld),$.position.copy(va),Ju.copy($.position),Ju.add(ES[de]),$.up.copy(AS[de]),$.lookAt(Ju),$.updateMatrixWorld(),ue.makeTranslation(-va.x,-va.y,-va.z),mm.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),G._frustum.setFromProjectionMatrix(mm,$.coordinateSystem,$.reversedDepth)}if(G.map.isWebGLCubeRenderTarget)s.setRenderTarget(G.map,de),s.clear();else{de===0&&(s.setRenderTarget(G.map),s.clear());let $=G.getViewport(de);o.set(r.x*$.x,r.y*$.y,r.x*$.z,r.y*$.w),I.viewport(o)}n=G.getFrustum(de),y(_,b,we,H,ne,this.type)}G.isPointLightShadow!==!0&&this.type===Hr&&x(G,b),G.needsUpdate=!1}m=this.type,p.needsUpdate=!1,s.setRenderTarget(R,w,C)};function x(T,_){let b=e.update(v);u.defines.VSM_SAMPLES!==T.blurSamples&&(u.defines.VSM_SAMPLES=T.blurSamples,d.defines.VSM_SAMPLES=T.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),T.mapPass===null?T.mapPass=new Wt(i.x,i.y,{format:Ms,type:Qt}):(T.mapPass.width!==T.map.width||T.mapPass.height!==T.map.height)&&T.mapPass.setSize(T.map.width,T.map.height),u.uniforms.shadow_pass.value=T.map.depthTexture,u.uniforms.resolution.value.set(T.map.width,T.map.height),u.uniforms.radius.value=T.radius,s.setRenderTarget(T.mapPass),s.clear(),s.renderBufferDirect(_,null,b,u,v,null),d.uniforms.shadow_pass.value=T.mapPass.texture,d.uniforms.resolution.value.set(T.map.width,T.map.height),d.uniforms.radius.value=T.radius,s.setRenderTarget(T.map),s.clear(),s.renderBufferDirect(_,null,b,d,v,null)}function S(T,_,b,R){let w=null,C=b.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(C!==void 0)w=C;else if(w=b.isPointLight===!0?l:a,s.localClippingEnabled&&_.clipShadows===!0&&Array.isArray(_.clippingPlanes)&&_.clippingPlanes.length!==0||_.displacementMap&&_.displacementScale!==0||_.alphaMap&&_.alphaTest>0||_.map&&_.alphaTest>0||_.alphaToCoverage===!0){let I=w.uuid,U=_.uuid,D=c[I];D===void 0&&(D={},c[I]=D);let B=D[U];B===void 0&&(B=w.clone(),D[U]=B,_.addEventListener("dispose",M)),w=B}if(w.visible=_.visible,w.wireframe=_.wireframe,R===Hr?w.side=_.shadowSide!==null?_.shadowSide:_.side:w.side=_.shadowSide!==null?_.shadowSide:f[_.side],w.alphaMap=_.alphaMap,w.alphaTest=_.alphaToCoverage===!0?.5:_.alphaTest,w.map=_.map,w.clipShadows=_.clipShadows,w.clippingPlanes=_.clippingPlanes,w.clipIntersection=_.clipIntersection,w.displacementMap=_.displacementMap,w.displacementScale=_.displacementScale,w.displacementBias=_.displacementBias,w.wireframeLinewidth=_.wireframeLinewidth,w.linewidth=_.linewidth,b.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let I=s.properties.get(w);I.light=b}return w}function y(T,_,b,R,w,C){if(T.visible===!1)return;if(T.layers.test(w)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&C===Hr)&&(!T.frustumCulled||T.intersectsFrustum(n))){T.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,T.matrixWorld);let D=e.update(T),B=T.material;if(Array.isArray(B)){let H=D.groups;for(let G=0,ee=H.length;G<ee;G++){let V=H[G],Q=B[V.materialIndex];if(Q&&Q.visible){let ne=S(T,Q,R,C);T.onBeforeShadow(s,T,_,b,D,ne,V),s.renderBufferDirect(b,null,D,ne,T,V),T.onAfterShadow(s,T,_,b,D,ne,V)}}}else if(B.visible){let H=S(T,B,R,C);T.onBeforeShadow(s,T,_,b,D,H,null),s.renderBufferDirect(b,null,D,H,T,null),T.onAfterShadow(s,T,_,b,D,H,null)}}let U=T.children;for(let D=0,B=U.length;D<B;D++)y(U[D],_,b,R,w,C)}function M(T){T.target.removeEventListener("dispose",M);for(let b in c){let R=c[b],w=T.target.uuid;w in R&&(R[w].dispose(),delete R[w])}}}function CS(s,e){function t(){let O=!1,te=new Mt,J=null,_e=new Mt(0,0,0,0);return{setMask:function(he){J!==he&&!O&&(s.colorMask(he,he,he,he),J=he)},setLocked:function(he){O=he},setClear:function(he,fe,Ne,Ze,oe){oe===!0&&(he*=Ze,fe*=Ze,Ne*=Ze),te.set(he,fe,Ne,Ze),_e.equals(te)===!1&&(s.clearColor(he,fe,Ne,Ze),_e.copy(te))},reset:function(){O=!1,J=null,_e.set(-1,0,0,0)}}}function n(){let O=!1,te=!1,J=null,_e=null,he=null;return{setReversed:function(fe){if(te!==fe){let Ne=e.get("EXT_clip_control");fe?Ne.clipControlEXT(Ne.LOWER_LEFT_EXT,Ne.ZERO_TO_ONE_EXT):Ne.clipControlEXT(Ne.LOWER_LEFT_EXT,Ne.NEGATIVE_ONE_TO_ONE_EXT),te=fe;let Ze=he;he=null,this.setClear(Ze)}},getReversed:function(){return te},setTest:function(fe){fe?me(s.DEPTH_TEST):Le(s.DEPTH_TEST)},setMask:function(fe){J!==fe&&!O&&(s.depthMask(fe),J=fe)},setFunc:function(fe){if(te&&(fe=Xp[fe]),_e!==fe){switch(fe){case wl:s.depthFunc(s.NEVER);break;case El:s.depthFunc(s.ALWAYS);break;case Al:s.depthFunc(s.LESS);break;case br:s.depthFunc(s.LEQUAL);break;case Rl:s.depthFunc(s.EQUAL);break;case Cl:s.depthFunc(s.GEQUAL);break;case Pl:s.depthFunc(s.GREATER);break;case Il:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}_e=fe}},setLocked:function(fe){O=fe},setClear:function(fe){he!==fe&&(he=fe,te&&(fe=1-fe),s.clearDepth(fe))},reset:function(){O=!1,J=null,_e=null,he=null,te=!1}}}function i(){let O=!1,te=null,J=null,_e=null,he=null,fe=null,Ne=null,Ze=null,oe=null;return{setTest:function(Fe){O||(Fe?me(s.STENCIL_TEST):Le(s.STENCIL_TEST))},setMask:function(Fe){te!==Fe&&!O&&(s.stencilMask(Fe),te=Fe)},setFunc:function(Fe,L,F){(J!==Fe||_e!==L||he!==F)&&(s.stencilFunc(Fe,L,F),J=Fe,_e=L,he=F)},setOp:function(Fe,L,F){(fe!==Fe||Ne!==L||Ze!==F)&&(s.stencilOp(Fe,L,F),fe=Fe,Ne=L,Ze=F)},setLocked:function(Fe){O=Fe},setClear:function(Fe){oe!==Fe&&(s.clearStencil(Fe),oe=Fe)},reset:function(){O=!1,te=null,J=null,_e=null,he=null,fe=null,Ne=null,Ze=null,oe=null}}}let r=new t,o=new n,a=new i,l={},c=new WeakMap,h={},f={},u={},d=new WeakMap,g=[],v=null,p=!1,m=null,x=null,S=null,y=null,M=null,T=null,_=null,b=new Pe(0,0,0),R=0,w=!1,C=null,I=null,U=null,D=null,B=null,H=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS),G=!1,ee=0,V=s.getParameter(s.VERSION);V.indexOf("WebGL")!==-1?(ee=parseFloat(/^WebGL (\d)/.exec(V)[1]),G=ee>=1):V.indexOf("OpenGL ES")!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),G=ee>=2);let Q=null,ne={},de=s.getParameter(s.SCISSOR_BOX),we=s.getParameter(s.VIEWPORT),$=new Mt().fromArray(de),ue=new Mt().fromArray(we);function Se(O,te,J,_e){let he=new Uint8Array(4),fe=s.createTexture();s.bindTexture(O,fe),s.texParameteri(O,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(O,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Ne=0;Ne<J;Ne++)O===s.TEXTURE_3D||O===s.TEXTURE_2D_ARRAY?s.texImage3D(te,0,s.RGBA,1,1,_e,0,s.RGBA,s.UNSIGNED_BYTE,he):s.texImage2D(te+Ne,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,he);return fe}let Ee={};Ee[s.TEXTURE_2D]=Se(s.TEXTURE_2D,s.TEXTURE_2D,1),Ee[s.TEXTURE_CUBE_MAP]=Se(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),Ee[s.TEXTURE_2D_ARRAY]=Se(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),Ee[s.TEXTURE_3D]=Se(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),me(s.DEPTH_TEST),o.setFunc(br),Yt(!1),pt(yu),me(s.CULL_FACE),Lt(fn);function me(O){h[O]!==!0&&(s.enable(O),h[O]=!0)}function Le(O){h[O]!==!1&&(s.disable(O),h[O]=!1)}function rt(O,te){return u[O]!==te?(s.bindFramebuffer(O,te),u[O]=te,O===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=te),O===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=te),!0):!1}function Be(O,te){let J=g,_e=!1;if(O){J=d.get(te),J===void 0&&(J=[],d.set(te,J));let he=O.textures;if(J.length!==he.length||J[0]!==s.COLOR_ATTACHMENT0){for(let fe=0,Ne=he.length;fe<Ne;fe++)J[fe]=s.COLOR_ATTACHMENT0+fe;J.length=he.length,_e=!0}}else J[0]!==s.BACK&&(J[0]=s.BACK,_e=!0);_e&&s.drawBuffers(J)}function He(O){return v!==O?(s.useProgram(O),v=O,!0):!1}let Ye={[ii]:s.FUNC_ADD,[gp]:s.FUNC_SUBTRACT,[_p]:s.FUNC_REVERSE_SUBTRACT};Ye[xp]=s.MIN,Ye[yp]=s.MAX;let Oe={[Ks]:s.ZERO,[vp]:s.ONE,[Sp]:s.SRC_COLOR,[Mu]:s.SRC_ALPHA,[wp]:s.SRC_ALPHA_SATURATE,[ra]:s.DST_COLOR,[sa]:s.DST_ALPHA,[Mp]:s.ONE_MINUS_SRC_COLOR,[bu]:s.ONE_MINUS_SRC_ALPHA,[Tp]:s.ONE_MINUS_DST_COLOR,[bp]:s.ONE_MINUS_DST_ALPHA,[Ep]:s.CONSTANT_COLOR,[Ap]:s.ONE_MINUS_CONSTANT_COLOR,[Rp]:s.CONSTANT_ALPHA,[Cp]:s.ONE_MINUS_CONSTANT_ALPHA};function Lt(O,te,J,_e,he,fe,Ne,Ze,oe,Fe){if(O===fn){p===!0&&(Le(s.BLEND),p=!1);return}if(p===!1&&(me(s.BLEND),p=!0),O!==jl){if(O!==m||Fe!==w){if((x!==ii||M!==ii)&&(s.blendEquation(s.FUNC_ADD),x=ii,M=ii),Fe)switch(O){case Vr:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ia:s.blendFunc(s.ONE,s.ONE);break;case vu:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Su:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:Ve("WebGLState: Invalid blending: ",O);break}else switch(O){case Vr:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ia:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case vu:Ve("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Su:Ve("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ve("WebGLState: Invalid blending: ",O);break}S=null,y=null,T=null,_=null,b.set(0,0,0),R=0,m=O,w=Fe}return}he=he||te,fe=fe||J,Ne=Ne||_e,(te!==x||he!==M)&&(s.blendEquationSeparate(Ye[te],Ye[he]),x=te,M=he),(J!==S||_e!==y||fe!==T||Ne!==_)&&(s.blendFuncSeparate(Oe[J],Oe[_e],Oe[fe],Oe[Ne]),S=J,y=_e,T=fe,_=Ne),(Ze.equals(b)===!1||oe!==R)&&(s.blendColor(Ze.r,Ze.g,Ze.b,oe),b.copy(Ze),R=oe),m=O,w=!1}function vt(O,te){O.side===En?Le(s.CULL_FACE):me(s.CULL_FACE);let J=O.side===sn;te&&(J=!J),Yt(J),O.blending===Vr&&O.transparent===!1?Lt(fn):Lt(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),o.setFunc(O.depthFunc),o.setTest(O.depthTest),o.setMask(O.depthWrite),r.setMask(O.colorWrite);let _e=O.stencilWrite;a.setTest(_e),_e&&(a.setMask(O.stencilWriteMask),a.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),a.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),Je(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?me(s.SAMPLE_ALPHA_TO_COVERAGE):Le(s.SAMPLE_ALPHA_TO_COVERAGE)}function Yt(O){C!==O&&(O?s.frontFace(s.CW):s.frontFace(s.CCW),C=O)}function pt(O){O!==pp?(me(s.CULL_FACE),O!==I&&(O===yu?s.cullFace(s.BACK):O===mp?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):Le(s.CULL_FACE),I=O}function dn(O){O!==U&&(G&&s.lineWidth(O),U=O)}function Je(O,te,J){O?(me(s.POLYGON_OFFSET_FILL),(D!==te||B!==J)&&(D=te,B=J,o.getReversed()&&(te=-te,J=-J),s.polygonOffset(te,J))):Le(s.POLYGON_OFFSET_FILL)}function St(O){O?me(s.SCISSOR_TEST):Le(s.SCISSOR_TEST)}function Vt(O){O===void 0&&(O=s.TEXTURE0+H-1),Q!==O&&(s.activeTexture(O),Q=O)}function Gt(O,te,J){J===void 0&&(Q===null?J=s.TEXTURE0+H-1:J=Q);let _e=ne[J];_e===void 0&&(_e={type:void 0,texture:void 0},ne[J]=_e),(_e.type!==O||_e.texture!==te)&&(Q!==J&&(s.activeTexture(J),Q=J),s.bindTexture(O,te||Ee[O]),_e.type=O,_e.texture=te)}function z(){let O=ne[Q];O!==void 0&&O.type!==void 0&&(s.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function wt(){try{s.compressedTexImage2D(...arguments)}catch(O){Ve("WebGLState:",O)}}function et(){try{s.compressedTexImage3D(...arguments)}catch(O){Ve("WebGLState:",O)}}function st(){try{s.texSubImage2D(...arguments)}catch(O){Ve("WebGLState:",O)}}function ge(){try{s.texSubImage3D(...arguments)}catch(O){Ve("WebGLState:",O)}}function lt(){try{s.compressedTexSubImage2D(...arguments)}catch(O){Ve("WebGLState:",O)}}function De(){try{s.compressedTexSubImage3D(...arguments)}catch(O){Ve("WebGLState:",O)}}function ke(){try{s.texStorage2D(...arguments)}catch(O){Ve("WebGLState:",O)}}function N(){try{s.texStorage3D(...arguments)}catch(O){Ve("WebGLState:",O)}}function E(){try{s.texImage2D(...arguments)}catch(O){Ve("WebGLState:",O)}}function W(){try{s.texImage3D(...arguments)}catch(O){Ve("WebGLState:",O)}}function re(O){return f[O]!==void 0?f[O]:s.getParameter(O)}function K(O,te){f[O]!==te&&(s.pixelStorei(O,te),f[O]=te)}function se(O){$.equals(O)===!1&&(s.scissor(O.x,O.y,O.z,O.w),$.copy(O))}function ce(O){ue.equals(O)===!1&&(s.viewport(O.x,O.y,O.z,O.w),ue.copy(O))}function Y(O,te){let J=c.get(te);J===void 0&&(J=new WeakMap,c.set(te,J));let _e=J.get(O);_e===void 0&&(_e=s.getUniformBlockIndex(te,O.name),s.uniformBlockBinding(te,_e,_e),J.set(O,_e))}function j(O,te,J){let he=c.get(te).get(O);l[he]!==J&&(s.bindBufferBase(s.UNIFORM_BUFFER,he,J),l[he]=J)}function ae(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),h={},f={},Q=null,ne={},u={},l={},d=new WeakMap,g=[],v=null,p=!1,m=null,x=null,S=null,y=null,M=null,T=null,_=null,b=new Pe(0,0,0),R=0,w=!1,C=null,I=null,U=null,D=null,B=null,$.set(0,0,s.canvas.width,s.canvas.height),ue.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:me,disable:Le,bindFramebuffer:rt,drawBuffers:Be,useProgram:He,setBlending:Lt,setMaterial:vt,setFlipSided:Yt,setCullFace:pt,setLineWidth:dn,setPolygonOffset:Je,setScissorTest:St,activeTexture:Vt,bindTexture:Gt,unbindTexture:z,compressedTexImage2D:wt,compressedTexImage3D:et,texImage2D:E,texImage3D:W,pixelStorei:K,getParameter:re,updateUBOMapping:Y,uniformBlockBinding:j,texStorage2D:ke,texStorage3D:N,texSubImage2D:st,texSubImage3D:ge,compressedTexSubImage2D:lt,compressedTexSubImage3D:De,scissor:se,viewport:ce,reset:ae}}function PS(s,e,t,n,i,r,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new pe,h=new WeakMap,f=new Set,u,d=new WeakMap,g=new Set,v=new FinalizationRegistry(N=>g.delete(N)),p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(N,E){return p?new OffscreenCanvas(N,E):Er("canvas")}function x(N,E,W){let re=1,K=ke(N);if((K.width>W||K.height>W)&&(re=W/Math.max(K.width,K.height)),re<1)if(typeof HTMLImageElement<"u"&&N instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&N instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&N instanceof ImageBitmap||typeof VideoFrame<"u"&&N instanceof VideoFrame){let se=Math.floor(re*K.width),ce=Math.floor(re*K.height);u===void 0&&(u=m(se,ce));let Y=E?m(se,ce):u;return Y.width=se,Y.height=ce,Y.getContext("2d").drawImage(N,0,0,se,ce),Ue("WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+se+"x"+ce+")."),Y}else return"data"in N&&Ue("WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),N;return N}function S(N){return N.generateMipmaps}function y(N){s.generateMipmap(N)}function M(N){return N.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:N.isWebGL3DRenderTarget?s.TEXTURE_3D:N.isWebGLArrayRenderTarget||N.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function T(N,E,W,re,K,se=!1){if(N!==null){if(s[N]!==void 0)return s[N];Ue("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+N+"'")}let ce;re&&(ce=e.get("EXT_texture_norm16"),ce||Ue("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=E;if(E===s.RED&&(W===s.FLOAT&&(Y=s.R32F),W===s.HALF_FLOAT&&(Y=s.R16F),W===s.UNSIGNED_BYTE&&(Y=s.R8),W===s.UNSIGNED_SHORT&&ce&&(Y=ce.R16_EXT),W===s.SHORT&&ce&&(Y=ce.R16_SNORM_EXT)),E===s.RED_INTEGER&&(W===s.UNSIGNED_BYTE&&(Y=s.R8UI),W===s.UNSIGNED_SHORT&&(Y=s.R16UI),W===s.UNSIGNED_INT&&(Y=s.R32UI),W===s.BYTE&&(Y=s.R8I),W===s.SHORT&&(Y=s.R16I),W===s.INT&&(Y=s.R32I)),E===s.RG&&(W===s.FLOAT&&(Y=s.RG32F),W===s.HALF_FLOAT&&(Y=s.RG16F),W===s.UNSIGNED_BYTE&&(Y=s.RG8),W===s.UNSIGNED_SHORT&&ce&&(Y=ce.RG16_EXT),W===s.SHORT&&ce&&(Y=ce.RG16_SNORM_EXT)),E===s.RG_INTEGER&&(W===s.UNSIGNED_BYTE&&(Y=s.RG8UI),W===s.UNSIGNED_SHORT&&(Y=s.RG16UI),W===s.UNSIGNED_INT&&(Y=s.RG32UI),W===s.BYTE&&(Y=s.RG8I),W===s.SHORT&&(Y=s.RG16I),W===s.INT&&(Y=s.RG32I)),E===s.RGB_INTEGER&&(W===s.UNSIGNED_BYTE&&(Y=s.RGB8UI),W===s.UNSIGNED_SHORT&&(Y=s.RGB16UI),W===s.UNSIGNED_INT&&(Y=s.RGB32UI),W===s.BYTE&&(Y=s.RGB8I),W===s.SHORT&&(Y=s.RGB16I),W===s.INT&&(Y=s.RGB32I)),E===s.RGBA_INTEGER&&(W===s.UNSIGNED_BYTE&&(Y=s.RGBA8UI),W===s.UNSIGNED_SHORT&&(Y=s.RGBA16UI),W===s.UNSIGNED_INT&&(Y=s.RGBA32UI),W===s.BYTE&&(Y=s.RGBA8I),W===s.SHORT&&(Y=s.RGBA16I),W===s.INT&&(Y=s.RGBA32I)),E===s.RGB&&(W===s.UNSIGNED_SHORT&&ce&&(Y=ce.RGB16_EXT),W===s.SHORT&&ce&&(Y=ce.RGB16_SNORM_EXT),W===s.UNSIGNED_INT_5_9_9_9_REV&&(Y=s.RGB9_E5),W===s.UNSIGNED_INT_10F_11F_11F_REV&&(Y=s.R11F_G11F_B10F)),E===s.RGBA){let j=se?Io:Ke.getTransfer(K);W===s.FLOAT&&(Y=s.RGBA32F),W===s.HALF_FLOAT&&(Y=s.RGBA16F),W===s.UNSIGNED_BYTE&&(Y=j===ft?s.SRGB8_ALPHA8:s.RGBA8),W===s.UNSIGNED_SHORT&&ce&&(Y=ce.RGBA16_EXT),W===s.SHORT&&ce&&(Y=ce.RGBA16_SNORM_EXT),W===s.UNSIGNED_SHORT_4_4_4_4&&(Y=s.RGBA4),W===s.UNSIGNED_SHORT_5_5_5_1&&(Y=s.RGB5_A1)}return(Y===s.R16F||Y===s.R32F||Y===s.RG16F||Y===s.RG32F||Y===s.RGBA16F||Y===s.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function _(N,E){let W;return N?E===null||E===ri||E===rs?W=s.DEPTH24_STENCIL8:E===Ln?W=s.DEPTH32F_STENCIL8:E===qr&&(W=s.DEPTH24_STENCIL8,Ue("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===ri||E===rs?W=s.DEPTH_COMPONENT24:E===Ln?W=s.DEPTH_COMPONENT32F:E===qr&&(W=s.DEPTH_COMPONENT16),W}function b(N,E){return S(N)===!0||N.isFramebufferTexture&&N.minFilter!==Ut&&N.minFilter!==Zt?Math.log2(Math.max(E.width,E.height))+1:N.mipmaps.length>0?N.mipmaps.length:N.isCompressedTexture&&Array.isArray(N.image)?E.mipmaps.length:1}function R(N){let E=new WeakRef(N);n.get(N).__ref=E,g.add(E),v.register(N,E,E)}function w(N){let E=n.get(N).__ref;E!==void 0&&(g.delete(E),v.unregister(E))}function C(N){U(N.target)}function I(N){D(N.target)}function U(N){N.removeEventListener("dispose",C),w(N),H(N),N.isVideoTexture&&h.delete(N),N.isHTMLTexture&&f.delete(N)}function D(N){N.removeEventListener("dispose",I),w(N),ee(N)}function B(){for(let N of g){let E=N.deref();E!==void 0&&(E.isRenderTarget===!0?D(E):U(E))}g.clear(),f.clear()}function H(N){let E=n.get(N);if(E.__webglInit===void 0)return;let W=N.source,re=d.get(W);if(re){let K=re[E.__cacheKey];K.usedTimes--,K.usedTimes===0&&G(N),Object.keys(re).length===0&&d.delete(W)}n.remove(N)}function G(N){let E=n.get(N);s.deleteTexture(E.__webglTexture);let W=N.source,re=d.get(W);delete re[E.__cacheKey],o.memory.textures--}function ee(N){let E=n.get(N);E.__depthDisposeCallback&&E.__depthDisposeCallback();let W=N.depthTexture;if(W&&W.renderTarget===N&&U(W),N.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(E.__webglFramebuffer[K]))for(let se=0;se<E.__webglFramebuffer[K].length;se++)s.deleteFramebuffer(E.__webglFramebuffer[K][se]);else s.deleteFramebuffer(E.__webglFramebuffer[K]);E.__webglDepthbuffer&&s.deleteRenderbuffer(E.__webglDepthbuffer[K])}else{if(Array.isArray(E.__webglFramebuffer))for(let K=0;K<E.__webglFramebuffer.length;K++)s.deleteFramebuffer(E.__webglFramebuffer[K]);else s.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&s.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&s.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let K=0;K<E.__webglColorRenderbuffer.length;K++)E.__webglColorRenderbuffer[K]&&s.deleteRenderbuffer(E.__webglColorRenderbuffer[K]);E.__webglDepthRenderbuffer&&s.deleteRenderbuffer(E.__webglDepthRenderbuffer)}let re=N.textures;for(let K=0,se=re.length;K<se;K++){let ce=n.get(re[K]);ce.__webglTexture&&(s.deleteTexture(ce.__webglTexture),o.memory.textures--),n.remove(re[K])}n.remove(N)}let V=0;function Q(){V=0}function ne(){return V}function de(N){V=N}function we(){let N=V;return N>=i.maxTextures&&Ue("WebGLTextures: Trying to use "+(N+1)+" texture units while this GPU supports only "+i.maxTextures),V+=1,N}function $(N){let E=[];return E.push(N.wrapS),E.push(N.wrapT),E.push(N.wrapR||0),E.push(N.magFilter),E.push(N.minFilter),E.push(N.anisotropy),E.push(N.internalFormat),E.push(N.format),E.push(N.type),E.push(N.generateMipmaps),E.push(N.mipmapsAutoUpdate),E.push(N.premultiplyAlpha),E.push(N.flipY),E.push(N.unpackAlignment),E.push(N.colorSpace),E.join()}function ue(N,E){let W=n.get(N);if(N.isVideoTexture&&lt(N),N.isRenderTargetTexture===!1&&N.isExternalTexture!==!0&&N.version>0&&W.__version!==N.version){let re=N.image;if(re===null)Ue("WebGLRenderer: Texture marked for update but no image data found.");else if(re.complete===!1)Ue("WebGLRenderer: Texture marked for update but image is incomplete");else{vt(W,N,E);return}}else N.isExternalTexture&&(W.__webglTexture=N.sourceTexture?N.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,W.__webglTexture,s.TEXTURE0+E)}function Se(N,E){let W=n.get(N);if(N.isRenderTargetTexture===!1&&N.version>0&&W.__version!==N.version){vt(W,N,E);return}else N.isExternalTexture&&(W.__webglTexture=N.sourceTexture?N.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,W.__webglTexture,s.TEXTURE0+E)}function Ee(N,E){let W=n.get(N);if(N.isRenderTargetTexture===!1&&N.version>0&&W.__version!==N.version){vt(W,N,E);return}t.bindTexture(s.TEXTURE_3D,W.__webglTexture,s.TEXTURE0+E)}function me(N,E){let W=n.get(N);if(N.version>0&&W.__version!==N.version){Yt(W,N,E);return}t.bindTexture(s.TEXTURE_CUBE_MAP,W.__webglTexture,s.TEXTURE0+E)}let Le={[kn]:s.REPEAT,[$n]:s.CLAMP_TO_EDGE,[Tr]:s.MIRRORED_REPEAT},rt={[Ut]:s.NEAREST,[Ql]:s.NEAREST_MIPMAP_NEAREST,[$s]:s.NEAREST_MIPMAP_LINEAR,[Zt]:s.LINEAR,[Xr]:s.LINEAR_MIPMAP_NEAREST,[si]:s.LINEAR_MIPMAP_LINEAR},Be={[Fp]:s.NEVER,[Nu]:s.ALWAYS,[Bp]:s.LESS,[Lu]:s.LEQUAL,[zp]:s.EQUAL,[Du]:s.GEQUAL,[kp]:s.GREATER,[Hp]:s.NOTEQUAL};function He(N,E){if(E.type===Ln&&e.has("OES_texture_float_linear")===!1&&(E.magFilter===Zt||E.magFilter===Xr||E.magFilter===$s||E.magFilter===si||E.minFilter===Zt||E.minFilter===Xr||E.minFilter===$s||E.minFilter===si)&&Ue("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(N,s.TEXTURE_WRAP_S,Le[E.wrapS]),s.texParameteri(N,s.TEXTURE_WRAP_T,Le[E.wrapT]),(N===s.TEXTURE_3D||N===s.TEXTURE_2D_ARRAY)&&s.texParameteri(N,s.TEXTURE_WRAP_R,Le[E.wrapR]),s.texParameteri(N,s.TEXTURE_MAG_FILTER,rt[E.magFilter]),s.texParameteri(N,s.TEXTURE_MIN_FILTER,rt[E.minFilter]),E.compareFunction&&(s.texParameteri(N,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(N,s.TEXTURE_COMPARE_FUNC,Be[E.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===Ut||E.minFilter!==$s&&E.minFilter!==si||E.type===Ln&&e.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||n.get(E).__currentAnisotropy){let W=e.get("EXT_texture_filter_anisotropic");s.texParameterf(N,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,i.getMaxAnisotropy())),n.get(E).__currentAnisotropy=E.anisotropy}}}function Ye(N,E){let W=!1;N.__webglInit===void 0&&(N.__webglInit=!0,E.addEventListener("dispose",C),R(E));let re=E.source,K=d.get(re);K===void 0&&(K={},d.set(re,K));let se=$(E);if(se!==N.__cacheKey){K[se]===void 0&&(K[se]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,W=!0),K[se].usedTimes++;let ce=K[N.__cacheKey];ce!==void 0&&(K[N.__cacheKey].usedTimes--,ce.usedTimes===0&&G(E)),N.__cacheKey=se,N.__webglTexture=K[se].texture}return W}function Oe(N,E,W){return Math.floor(Math.floor(N/W)/E)}function Lt(N,E,W,re){let se=N.updateRanges;if(se.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,E.width,E.height,W,re,E.data);else{se.sort((O,te)=>O.start-te.start);let ce=0;for(let O=1;O<se.length;O++){let te=se[ce],J=se[O],_e=te.start+te.count,he=Oe(J.start,E.width,4),fe=Oe(te.start,E.width,4);J.start<=_e+1&&he===fe&&Oe(J.start+J.count-1,E.width,4)===he?te.count=Math.max(te.count,J.start+J.count-te.start):(++ce,se[ce]=J)}se.length=ce+1;let Y=t.getParameter(s.UNPACK_ROW_LENGTH),j=t.getParameter(s.UNPACK_SKIP_PIXELS),ae=t.getParameter(s.UNPACK_SKIP_ROWS);t.pixelStorei(s.UNPACK_ROW_LENGTH,E.width);for(let O=0,te=se.length;O<te;O++){let J=se[O],_e=Math.floor(J.start/4),he=Math.ceil(J.count/4),fe=_e%E.width,Ne=Math.floor(_e/E.width),Ze=he,oe=1;t.pixelStorei(s.UNPACK_SKIP_PIXELS,fe),t.pixelStorei(s.UNPACK_SKIP_ROWS,Ne),t.texSubImage2D(s.TEXTURE_2D,0,fe,Ne,Ze,oe,W,re,E.data)}N.clearUpdateRanges(),t.pixelStorei(s.UNPACK_ROW_LENGTH,Y),t.pixelStorei(s.UNPACK_SKIP_PIXELS,j),t.pixelStorei(s.UNPACK_SKIP_ROWS,ae)}}function vt(N,E,W){let re=s.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(re=s.TEXTURE_2D_ARRAY),E.isData3DTexture&&(re=s.TEXTURE_3D);let K=Ye(N,E),se=E.source;t.bindTexture(re,N.__webglTexture,s.TEXTURE0+W);let ce=n.get(se);if(se.version!==ce.__version||K===!0){if(t.activeTexture(s.TEXTURE0+W),(typeof ImageBitmap<"u"&&E.image instanceof ImageBitmap)===!1){let oe=Ke.getPrimaries(Ke.workingColorSpace),Fe=E.colorSpace===os?null:Ke.getPrimaries(E.colorSpace),L=E.colorSpace===os||oe===Fe?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,E.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,L)}t.pixelStorei(s.UNPACK_ALIGNMENT,E.unpackAlignment);let j=x(E.image,!1,i.maxTextureSize);j=De(E,j);let ae=r.convert(E.format,E.colorSpace),O=r.convert(E.type),te=T(E.internalFormat,ae,O,E.normalized,E.colorSpace,E.isVideoTexture);He(re,E);let J,_e=E.mipmaps,he=E.isVideoTexture!==!0,fe=ce.__version===void 0||K===!0,Ne=se.dataReady,Ze=b(E,j);if(E.isDepthTexture)te=_(E.format===mi,E.type),fe&&(he?t.texStorage2D(s.TEXTURE_2D,1,te,j.width,j.height):t.texImage2D(s.TEXTURE_2D,0,te,j.width,j.height,0,ae,O,null));else if(E.isDataTexture)if(_e.length>0){he&&fe&&t.texStorage2D(s.TEXTURE_2D,Ze,te,_e[0].width,_e[0].height);for(let oe=0,Fe=_e.length;oe<Fe;oe++)J=_e[oe],he?Ne&&t.texSubImage2D(s.TEXTURE_2D,oe,0,0,J.width,J.height,ae,O,J.data):t.texImage2D(s.TEXTURE_2D,oe,te,J.width,J.height,0,ae,O,J.data);E.generateMipmaps=!1}else he?(fe&&t.texStorage2D(s.TEXTURE_2D,Ze,te,j.width,j.height),Ne&&Lt(E,j,ae,O)):t.texImage2D(s.TEXTURE_2D,0,te,j.width,j.height,0,ae,O,j.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){he&&fe&&t.texStorage3D(s.TEXTURE_2D_ARRAY,Ze,te,_e[0].width,_e[0].height,j.depth);for(let oe=0,Fe=_e.length;oe<Fe;oe++)if(J=_e[oe],E.format!==Tn)if(ae!==null)if(he){if(Ne)if(E.layerUpdates.size>0){let L=Wu(J.width,J.height,E.format,E.type);for(let F of E.layerUpdates){let ie=J.data.subarray(F*L/J.data.BYTES_PER_ELEMENT,(F+1)*L/J.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,oe,0,0,F,J.width,J.height,1,ae,ie)}}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,oe,0,0,0,J.width,J.height,j.depth,ae,J.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,oe,te,J.width,J.height,j.depth,0,J.data,0,0);else Ue("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else he?Ne&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,oe,0,0,0,J.width,J.height,j.depth,ae,O,J.data):t.texImage3D(s.TEXTURE_2D_ARRAY,oe,te,J.width,J.height,j.depth,0,ae,O,J.data);E.layerUpdates.size>0&&E.clearLayerUpdates()}else{he&&fe&&t.texStorage2D(s.TEXTURE_2D,Ze,te,_e[0].width,_e[0].height);for(let oe=0,Fe=_e.length;oe<Fe;oe++)J=_e[oe],E.format!==Tn?ae!==null?he?Ne&&t.compressedTexSubImage2D(s.TEXTURE_2D,oe,0,0,J.width,J.height,ae,J.data):t.compressedTexImage2D(s.TEXTURE_2D,oe,te,J.width,J.height,0,J.data):Ue("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):he?Ne&&t.texSubImage2D(s.TEXTURE_2D,oe,0,0,J.width,J.height,ae,O,J.data):t.texImage2D(s.TEXTURE_2D,oe,te,J.width,J.height,0,ae,O,J.data)}else if(E.isDataArrayTexture)if(he){if(fe&&t.texStorage3D(s.TEXTURE_2D_ARRAY,Ze,te,j.width,j.height,j.depth),Ne)if(E.layerUpdates.size>0){let oe=Wu(j.width,j.height,E.format,E.type);for(let Fe of E.layerUpdates){let L=j.data.subarray(Fe*oe/j.data.BYTES_PER_ELEMENT,(Fe+1)*oe/j.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Fe,j.width,j.height,1,ae,O,L)}E.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,j.width,j.height,j.depth,ae,O,j.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,te,j.width,j.height,j.depth,0,ae,O,j.data);else if(E.isData3DTexture)he?(fe&&t.texStorage3D(s.TEXTURE_3D,Ze,te,j.width,j.height,j.depth),Ne&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,j.width,j.height,j.depth,ae,O,j.data)):t.texImage3D(s.TEXTURE_3D,0,te,j.width,j.height,j.depth,0,ae,O,j.data);else if(E.isFramebufferTexture){if(fe)if(he)t.texStorage2D(s.TEXTURE_2D,Ze,te,j.width,j.height);else{let oe=j.width,Fe=j.height;for(let L=0;L<Ze;L++)t.texImage2D(s.TEXTURE_2D,L,te,oe,Fe,0,ae,O,null),oe>>=1,Fe>>=1}}else if(E.isHTMLTexture){if("texElementImage2D"in s){let oe=s.canvas;if(oe.hasAttribute("layoutsubtree")||oe.setAttribute("layoutsubtree","true"),j.parentNode!==oe){oe.appendChild(j),f.add(E),oe.onpaint=Fe=>{let L=Fe.changedElements;for(let F of f)L.includes(F.image)&&(F.needsUpdate=!0)},oe.requestPaint();return}if(s.texElementImage2D.length===3)s.texElementImage2D(s.TEXTURE_2D,s.RGBA8,j);else{let L=s.RGBA,F=s.RGBA,ie=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,0,L,F,ie,j)}s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(_e.length>0){if(he&&fe){let oe=ke(_e[0]);t.texStorage2D(s.TEXTURE_2D,Ze,te,oe.width,oe.height)}for(let oe=0,Fe=_e.length;oe<Fe;oe++)J=_e[oe],he?Ne&&t.texSubImage2D(s.TEXTURE_2D,oe,0,0,ae,O,J):t.texImage2D(s.TEXTURE_2D,oe,te,ae,O,J);E.generateMipmaps=!1}else if(he){if(fe){let oe=ke(j);t.texStorage2D(s.TEXTURE_2D,Ze,te,oe.width,oe.height)}Ne&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,ae,O,j)}else t.texImage2D(s.TEXTURE_2D,0,te,ae,O,j);S(E)&&E.mipmapsAutoUpdate===!0&&y(re),ce.__version=se.version,E.onUpdate&&E.onUpdate(E)}N.__version=E.version}function Yt(N,E,W){if(E.image.length!==6)return;let re=Ye(N,E),K=E.source;t.bindTexture(s.TEXTURE_CUBE_MAP,N.__webglTexture,s.TEXTURE0+W);let se=n.get(K);if(K.version!==se.__version||re===!0){t.activeTexture(s.TEXTURE0+W);let ce=Ke.getPrimaries(Ke.workingColorSpace),Y=E.colorSpace===os?null:Ke.getPrimaries(E.colorSpace),j=E.colorSpace===os||ce===Y?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,E.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),t.pixelStorei(s.UNPACK_ALIGNMENT,E.unpackAlignment),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,j);let ae=E.isCompressedTexture||E.image[0].isCompressedTexture,O=E.image[0]&&E.image[0].isDataTexture,te=[];for(let F=0;F<6;F++)!ae&&!O?te[F]=x(E.image[F],!0,i.maxCubemapSize):te[F]=O?E.image[F].image:E.image[F],te[F]=De(E,te[F]);let J=te[0],_e=r.convert(E.format,E.colorSpace),he=r.convert(E.type),fe=T(E.internalFormat,_e,he,E.normalized,E.colorSpace),Ne=E.isVideoTexture!==!0,Ze=se.__version===void 0||re===!0,oe=K.dataReady,Fe=b(E,J);He(s.TEXTURE_CUBE_MAP,E);let L;if(E.isDepthTexture){if(fe=_(E.format===mi,E.type),Ze)if(Ne)t.texStorage2D(s.TEXTURE_CUBE_MAP,1,fe,J.width,J.height);else for(let F=0;F<6;F++)t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,0,fe,J.width,J.height,0,_e,he,null)}else if(ae){Ne&&Ze&&t.texStorage2D(s.TEXTURE_CUBE_MAP,Fe,fe,J.width,J.height);for(let F=0;F<6;F++){L=te[F].mipmaps;for(let ie=0;ie<L.length;ie++){let Me=L[ie];E.format!==Tn?_e!==null?Ne?oe&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie,0,0,Me.width,Me.height,_e,Me.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie,fe,Me.width,Me.height,0,Me.data):Ue("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Ne?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie,0,0,Me.width,Me.height,_e,he,Me.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie,fe,Me.width,Me.height,0,_e,he,Me.data)}}}else{if(L=E.mipmaps,Ne&&Ze){L.length>0&&Fe++;let F=ke(te[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,Fe,fe,F.width,F.height)}for(let F=0;F<6;F++)if(O){Ne?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,0,0,0,te[F].width,te[F].height,_e,he,te[F].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,0,fe,te[F].width,te[F].height,0,_e,he,te[F].data);for(let ie=0;ie<L.length;ie++){let ze=L[ie].image[F].image;Ne?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie+1,0,0,ze.width,ze.height,_e,he,ze.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie+1,fe,ze.width,ze.height,0,_e,he,ze.data)}}else{Ne?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,0,0,0,_e,he,te[F]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,0,fe,_e,he,te[F]);for(let ie=0;ie<L.length;ie++){let Me=L[ie];Ne?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie+1,0,0,_e,he,Me.image[F]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+F,ie+1,fe,_e,he,Me.image[F])}}}S(E)&&E.mipmapsAutoUpdate===!0&&y(s.TEXTURE_CUBE_MAP),se.__version=K.version,E.onUpdate&&E.onUpdate(E)}N.__version=E.version}function pt(N,E,W,re,K,se){let ce=r.convert(W.format,W.colorSpace),Y=r.convert(W.type),j=T(W.internalFormat,ce,Y,W.normalized,W.colorSpace),ae=n.get(E),O=n.get(W);if(O.__renderTarget=E,!ae.__hasExternalTextures){let te=Math.max(1,E.width>>se),J=Math.max(1,E.height>>se);K===s.TEXTURE_3D||K===s.TEXTURE_2D_ARRAY?t.texImage3D(K,se,j,te,J,E.depth,0,ce,Y,null):t.texImage2D(K,se,j,te,J,0,ce,Y,null)}t.bindFramebuffer(s.FRAMEBUFFER,N),ge(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,re,K,O.__webglTexture,0,st(E)):(K===s.TEXTURE_2D||K>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,re,K,O.__webglTexture,se),t.bindFramebuffer(s.FRAMEBUFFER,null)}function dn(N,E,W){if(s.bindRenderbuffer(s.RENDERBUFFER,N),E.depthBuffer){let re=E.depthTexture,K=re&&re.isDepthTexture?re.type:null,se=_(E.stencilBuffer,K),ce=E.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;ge(E)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,st(E),se,E.width,E.height):W?s.renderbufferStorageMultisample(s.RENDERBUFFER,st(E),se,E.width,E.height):s.renderbufferStorage(s.RENDERBUFFER,se,E.width,E.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,ce,s.RENDERBUFFER,N)}else{let re=E.textures;for(let K=0;K<re.length;K++){let se=re[K],ce=r.convert(se.format,se.colorSpace),Y=r.convert(se.type),j=T(se.internalFormat,ce,Y,se.normalized,se.colorSpace);ge(E)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,st(E),j,E.width,E.height):W?s.renderbufferStorageMultisample(s.RENDERBUFFER,st(E),j,E.width,E.height):s.renderbufferStorage(s.RENDERBUFFER,j,E.width,E.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function Je(N,E,W){let re=E.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(s.FRAMEBUFFER,N),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let K=n.get(E.depthTexture);K.__renderTarget=E;let se=re?E.depthTexture.image[0]:E.depthTexture.image;(!K.__webglTexture||se.width!==E.width||se.height!==E.height)&&(se.width=E.width,se.height=E.height,E.depthTexture.needsUpdate=!0),re?me(E.depthTexture,0):ue(E.depthTexture,0);let ce=K.__webglTexture,Y=st(E),j=re?s.TEXTURE_CUBE_MAP_POSITIVE_X+W:s.TEXTURE_2D,ae=E.depthTexture.format===mi?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(E.depthTexture.format===Xi)ge(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,ae,j,ce,0,Y):s.framebufferTexture2D(s.FRAMEBUFFER,ae,j,ce,0);else if(E.depthTexture.format===mi)ge(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,ae,j,ce,0,Y):s.framebufferTexture2D(s.FRAMEBUFFER,ae,j,ce,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function St(N){let E=n.get(N),W=N.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==N.depthTexture){let re=N.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),re){let K=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,re.removeEventListener("dispose",K)};re.addEventListener("dispose",K),E.__depthDisposeCallback=K}E.__boundDepthTexture=re}if(N.depthTexture&&!E.__autoAllocateDepthBuffer)if(W)for(let re=0;re<6;re++)Je(E.__webglFramebuffer[re],N,re);else N.texture.mipmaps.length>0?Je(E.__webglFramebuffer[0],N,0):Je(E.__webglFramebuffer,N,0);else if(W){E.__webglDepthbuffer=[];for(let re=0;re<6;re++)if(t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer[re]),E.__webglDepthbuffer[re]===void 0)E.__webglDepthbuffer[re]=s.createRenderbuffer(),dn(E.__webglDepthbuffer[re],N,!1);else{let K=N.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,se=E.__webglDepthbuffer[re];s.bindRenderbuffer(s.RENDERBUFFER,se),s.framebufferRenderbuffer(s.FRAMEBUFFER,K,s.RENDERBUFFER,se)}}else if(N.texture.mipmaps.length>0?t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=s.createRenderbuffer(),dn(E.__webglDepthbuffer,N,!1);else{let K=N.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,se=E.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,se),s.framebufferRenderbuffer(s.FRAMEBUFFER,K,s.RENDERBUFFER,se)}t.bindFramebuffer(s.FRAMEBUFFER,null)}function Vt(N,E,W){let re=n.get(N);E!==void 0&&pt(re.__webglFramebuffer,N,N.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),W!==void 0&&St(N)}function Gt(N){let E=N.texture,W=n.get(N),re=n.get(E);N.addEventListener("dispose",I),R(N);let K=N.textures,se=N.isWebGLCubeRenderTarget===!0,ce=K.length>1;if(ce||(re.__webglTexture===void 0&&(re.__webglTexture=s.createTexture()),re.__version=E.version,o.memory.textures++),se){W.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(E.mipmaps.length>0){W.__webglFramebuffer[Y]=[];for(let j=0;j<E.mipmaps.length;j++)W.__webglFramebuffer[Y][j]=s.createFramebuffer()}else W.__webglFramebuffer[Y]=s.createFramebuffer()}else{if(E.mipmaps.length>0){W.__webglFramebuffer=[];for(let Y=0;Y<E.mipmaps.length;Y++)W.__webglFramebuffer[Y]=s.createFramebuffer()}else W.__webglFramebuffer=s.createFramebuffer();if(ce)for(let Y=0,j=K.length;Y<j;Y++){let ae=n.get(K[Y]);ae.__webglTexture===void 0&&(ae.__webglTexture=s.createTexture(),o.memory.textures++)}if(N.samples>0&&ge(N)===!1){W.__webglMultisampledFramebuffer=s.createFramebuffer(),W.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let Y=0;Y<K.length;Y++){let j=K[Y];W.__webglColorRenderbuffer[Y]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,W.__webglColorRenderbuffer[Y]);let ae=r.convert(j.format,j.colorSpace),O=r.convert(j.type),te=T(j.internalFormat,ae,O,j.normalized,j.colorSpace,N.isXRRenderTarget===!0),J=st(N);s.renderbufferStorageMultisample(s.RENDERBUFFER,J,te,N.width,N.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Y,s.RENDERBUFFER,W.__webglColorRenderbuffer[Y])}s.bindRenderbuffer(s.RENDERBUFFER,null),N.depthBuffer&&(W.__webglDepthRenderbuffer=s.createRenderbuffer(),dn(W.__webglDepthRenderbuffer,N,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(se){t.bindTexture(s.TEXTURE_CUBE_MAP,re.__webglTexture),He(s.TEXTURE_CUBE_MAP,E);for(let Y=0;Y<6;Y++)if(E.mipmaps.length>0)for(let j=0;j<E.mipmaps.length;j++)pt(W.__webglFramebuffer[Y][j],N,E,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Y,j);else pt(W.__webglFramebuffer[Y],N,E,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);S(E)?y(s.TEXTURE_CUBE_MAP):E.mipmaps.length>0&&s.texParameteri(s.TEXTURE_CUBE_MAP,s.TEXTURE_MAX_LEVEL,E.mipmaps.length-1),t.unbindTexture()}else if(ce){for(let Y=0,j=K.length;Y<j;Y++){let ae=K[Y],O=n.get(ae),te=s.TEXTURE_2D;(N.isWebGL3DRenderTarget||N.isWebGLArrayRenderTarget)&&(te=N.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(te,O.__webglTexture),He(te,ae),pt(W.__webglFramebuffer,N,ae,s.COLOR_ATTACHMENT0+Y,te,0),S(ae)&&y(te)}t.unbindTexture()}else{let Y=s.TEXTURE_2D;if((N.isWebGL3DRenderTarget||N.isWebGLArrayRenderTarget)&&(Y=N.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(Y,re.__webglTexture),He(Y,E),E.mipmaps.length>0)for(let j=0;j<E.mipmaps.length;j++)pt(W.__webglFramebuffer[j],N,E,s.COLOR_ATTACHMENT0,Y,j);else pt(W.__webglFramebuffer,N,E,s.COLOR_ATTACHMENT0,Y,0);S(E)?y(Y):E.mipmaps.length>0&&s.texParameteri(Y,s.TEXTURE_MAX_LEVEL,E.mipmaps.length-1),t.unbindTexture()}N.depthBuffer&&St(N)}function z(N){let E=N.textures;for(let W=0,re=E.length;W<re;W++){let K=E[W];if(S(K)&&K.mipmapsAutoUpdate===!0){let se=M(N),ce=n.get(K).__webglTexture;t.bindTexture(se,ce),y(se),t.unbindTexture()}}}let wt=[];function et(N){if(N.samples>0){if(ge(N)===!1){let E=N.textures,W=N.width,re=N.height,K=s.COLOR_BUFFER_BIT,se=N.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ce=n.get(N),Y=E.length>1;if(Y)for(let ae=0;ae<E.length;ae++)t.bindFramebuffer(s.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ae,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,ce.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+ae,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,ce.__webglMultisampledFramebuffer),N.texture.mipmaps.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,ce.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,ce.__webglFramebuffer);for(let ae=0;ae<E.length;ae++){if(N.resolveDepthBuffer&&(N.depthBuffer&&(K|=s.DEPTH_BUFFER_BIT),N.stencilBuffer&&N.resolveStencilBuffer&&(K|=s.STENCIL_BUFFER_BIT)),Y){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,ce.__webglColorRenderbuffer[ae]);let O=n.get(E[ae]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,O,0)}s.blitFramebuffer(0,0,W,re,0,0,W,re,K,s.NEAREST),l===!0&&(wt.length=0,wt.push(s.COLOR_ATTACHMENT0+ae),N.depthBuffer&&N.storeMultisampledDepthBuffer===!1&&wt.push(se),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,wt))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),Y)for(let ae=0;ae<E.length;ae++){t.bindFramebuffer(s.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ae,s.RENDERBUFFER,ce.__webglColorRenderbuffer[ae]);let O=n.get(E[ae]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,ce.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+ae,s.TEXTURE_2D,O,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,ce.__webglMultisampledFramebuffer)}else if(N.depthBuffer&&N.storeMultisampledDepthBuffer===!1&&l){let E=N.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[E])}}}function st(N){return Math.min(i.maxSamples,N.samples)}function ge(N){let E=n.get(N);return N.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function lt(N){let E=o.render.frame;h.get(N)!==E&&(h.set(N,E),N.update())}function De(N,E){let W=N.colorSpace,re=N.format,K=N.type;return N.isCompressedTexture===!0||N.isVideoTexture===!0||W!==Dn&&W!==os&&(Ke.getTransfer(W)===ft?(re!==Tn||K!==An)&&Ue("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ve("WebGLTextures: Unsupported texture color space:",W)),E}function ke(N){return typeof HTMLImageElement<"u"&&N instanceof HTMLImageElement?(c.width=N.naturalWidth||N.width,c.height=N.naturalHeight||N.height):typeof VideoFrame<"u"&&N instanceof VideoFrame?(c.width=N.displayWidth,c.height=N.displayHeight):(c.width=N.width,c.height=N.height),c}this.allocateTextureUnit=we,this.resetTextureUnits=Q,this.getTextureUnits=ne,this.setTextureUnits=de,this.setTexture2D=ue,this.setTexture2DArray=Se,this.setTexture3D=Ee,this.setTextureCube=me,this.rebindTextures=Vt,this.setupRenderTarget=Gt,this.updateRenderTargetMipmap=z,this.updateMultisampleRenderTarget=et,this.setupDepthRenderbuffer=St,this.setupFrameBufferTexture=pt,this.useMultisampledRTT=ge,this.dispose=B}function IS(s,e){function t(n,i=os){let r,o=Ke.getTransfer(i);if(n===An)return s.UNSIGNED_BYTE;if(n===tc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===nc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===Au)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Ru)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===wu)return s.BYTE;if(n===Eu)return s.SHORT;if(n===qr)return s.UNSIGNED_SHORT;if(n===ec)return s.INT;if(n===ri)return s.UNSIGNED_INT;if(n===Ln)return s.FLOAT;if(n===Qt)return s.HALF_FLOAT;if(n===Cu)return s.ALPHA;if(n===Pu)return s.RGB;if(n===Tn)return s.RGBA;if(n===Xi)return s.DEPTH_COMPONENT;if(n===mi)return s.DEPTH_STENCIL;if(n===ic)return s.RED;if(n===fa)return s.RED_INTEGER;if(n===Ms)return s.RG;if(n===sc)return s.RG_INTEGER;if(n===rc)return s.RGBA_INTEGER;if(n===da||n===pa||n===ma||n===ga)if(o===ft)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===da)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===da)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===oc||n===ac||n===lc||n===cc)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===oc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ac)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===lc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===cc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===hc||n===uc||n===fc||n===dc||n===pc||n===_a||n===mc)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===hc||n===uc)return o===ft?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===fc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===dc)return r.COMPRESSED_R11_EAC;if(n===pc)return r.COMPRESSED_SIGNED_R11_EAC;if(n===_a)return r.COMPRESSED_RG11_EAC;if(n===mc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===gc||n===_c||n===xc||n===yc||n===vc||n===Sc||n===Mc||n===bc||n===Tc||n===wc||n===Ec||n===Ac||n===Rc||n===Cc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===gc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===_c)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===xc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===yc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===vc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Sc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Mc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===bc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Tc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===wc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ec)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ac)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Rc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Cc)return o===ft?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Pc||n===Ic||n===Lc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Pc)return o===ft?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ic)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Lc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Dc||n===Nc||n===xa||n===Uc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Dc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Nc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===xa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Uc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===rs?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}var LS=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,DS=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,rf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Go(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Ft({vertexShader:LS,fragmentShader:DS,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new le(new ji(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},of=class extends di{constructor(e,t){super();let n=this,i=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,f=null,u=null,d=null,g=null,v=typeof XRWebGLBinding<"u",p=new rf,m={},x=t.getContextAttributes(),S=null,y=null,M=[],T=[],_=new pe,b=null,R=null,w=new en;w.viewport=new Mt;let C=new en;C.viewport=new Mt;let I=[w,C],U=new Yl,D=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let ue=M[$];return ue===void 0&&(ue=new Pr,M[$]=ue),ue.getTargetRaySpace()},this.getControllerGrip=function($){let ue=M[$];return ue===void 0&&(ue=new Pr,M[$]=ue),ue.getGripSpace()},this.getHand=function($){let ue=M[$];return ue===void 0&&(ue=new Pr,M[$]=ue),ue.getHandSpace()};function H($){let ue=T.indexOf($.inputSource);if(ue===-1)return;let Se=M[ue];Se!==void 0&&(Se.update($.inputSource,$.frame,c||o),Se.dispatchEvent({type:$.type,data:$.inputSource}))}function G(){i.removeEventListener("select",H),i.removeEventListener("selectstart",H),i.removeEventListener("selectend",H),i.removeEventListener("squeeze",H),i.removeEventListener("squeezestart",H),i.removeEventListener("squeezeend",H),i.removeEventListener("end",G),i.removeEventListener("inputsourceschange",ee);for(let $=0;$<M.length;$++){let ue=T[$];ue!==null&&(T[$]=null,M[$].disconnect(ue))}D=null,B=null,p.reset();for(let $ in m)delete m[$];if(e.setRenderTarget(S),d=null,u=null,f=null,i=null,y=null,we.stop(),n.isPresenting=!1,e.setPixelRatio(b),e.setSize(_.width,_.height,!1),R!==null){let $=R.camera;$.fov=R.fov,$.zoom=R.zoom,$.updateProjectionMatrix(),R=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,n.isPresenting===!0&&Ue("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){a=$,n.isPresenting===!0&&Ue("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function($){c=$},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f===null&&v&&(f=new XRWebGLBinding(i,t)),f},this.getFrame=function(){return g},this.getSession=function(){return i},this.setSession=async function($){if(i=$,i!==null){if(S=e.getRenderTarget(),i.addEventListener("select",H),i.addEventListener("selectstart",H),i.addEventListener("selectend",H),i.addEventListener("squeeze",H),i.addEventListener("squeezestart",H),i.addEventListener("squeezeend",H),i.addEventListener("end",G),i.addEventListener("inputsourceschange",ee),x.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(_),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let Se=null,Ee=null,me=null;x.depth&&(me=x.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Se=x.stencil?mi:Xi,Ee=x.stencil?rs:ri);let Le={colorFormat:t.RGBA8,depthFormat:me,scaleFactor:r};f=this.getBinding(),u=f.createProjectionLayer(Le),i.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),y=new Wt(u.textureWidth,u.textureHeight,{format:Tn,type:An,depthTexture:new pi(u.textureWidth,u.textureHeight,Ee,void 0,void 0,void 0,void 0,void 0,void 0,Se),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let Se={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(i,t,Se),i.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),y=new Wt(d.framebufferWidth,d.framebufferHeight,{format:Tn,type:An,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await i.requestReferenceSpace(a),we.setContext(i),we.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function ee($){for(let ue=0;ue<$.removed.length;ue++){let Se=$.removed[ue],Ee=T.indexOf(Se);Ee>=0&&(T[Ee]=null,M[Ee].disconnect(Se))}for(let ue=0;ue<$.added.length;ue++){let Se=$.added[ue],Ee=T.indexOf(Se);if(Ee===-1){for(let Le=0;Le<M.length;Le++)if(Le>=T.length){T.push(Se),Ee=Le;break}else if(T[Le]===null){T[Le]=Se,Ee=Le;break}if(Ee===-1)break}let me=M[Ee];me&&me.connect(Se)}}function V($,ue){ue===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(ue.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(i===null)return;let ue=$.near,Se=$.far;p.texture!==null&&(p.depthNear>0&&(ue=p.depthNear),p.depthFar>0&&(Se=p.depthFar)),U.near=C.near=w.near=ue,U.far=C.far=w.far=Se,(D!==U.near||B!==U.far)&&(i.updateRenderState({depthNear:U.near,depthFar:U.far}),D=U.near,B=U.far),U.layers.mask=$.layers.mask|6,w.layers.mask=U.layers.mask&-5,C.layers.mask=U.layers.mask&-3;let Ee=$.parent,me=U.cameras;V(U,Ee);for(let Le=0;Le<me.length;Le++)V(me[Le],Ee);U.projectionMatrix.copy(w.projectionMatrix),U.projectionMatrixInverse.copy(w.projectionMatrixInverse),R===null&&$.isPerspectiveCamera&&(R={camera:$,fov:$.fov,zoom:$.zoom}),Q($,U,Ee)};function Q($,ue,Se){Se===null?$.matrix.copy(ue.matrixWorld):($.matrix.copy(Se.matrixWorld),$.matrix.invert(),$.matrix.multiply(ue.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(ue.projectionMatrix),$.projectionMatrixInverse.copy(ue.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=Hs*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return U},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function($){l=$,u!==null&&(u.fixedFoveation=$),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=$)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(U)},this.getCameraTexture=function($){return m[$]};let ne=null;function de($,ue){if(h=ue.getViewerPose(c||o),g=ue,h!==null){let Se=h.views;d!==null&&(e.setRenderTargetFramebuffer(y,d.framebuffer),e.setRenderTarget(y));let Ee=!1;Se.length!==U.cameras.length&&(U.cameras.length=0,Ee=!0);for(let Be=0;Be<Se.length;Be++){let He=Se[Be],Ye=null;if(d!==null)Ye=d.getViewport(He);else{let Lt=f.getViewSubImage(u,He);Ye=Lt.viewport,Be===0&&(e.setRenderTargetTextures(y,Lt.colorTexture,Lt.depthStencilTexture),e.setRenderTarget(y))}let Oe=I[Be];Oe===void 0&&(Oe=new en,Oe.layers.enable(Be),Oe.viewport=new Mt,I[Be]=Oe),Oe.matrix.fromArray(He.transform.matrix),Oe.matrix.decompose(Oe.position,Oe.quaternion,Oe.scale),Oe.projectionMatrix.fromArray(He.projectionMatrix),Oe.projectionMatrixInverse.copy(Oe.projectionMatrix).invert(),Oe.viewport.set(Ye.x,Ye.y,Ye.width,Ye.height),Be===0&&(U.matrix.copy(Oe.matrix),U.matrix.decompose(U.position,U.quaternion,U.scale)),Ee===!0&&U.cameras.push(Oe)}let me=i.enabledFeatures;if(me&&me.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&v){f=n.getBinding();let Be=f.getDepthInformation(Se[0]);Be&&Be.isValid&&Be.texture&&p.init(Be,i.renderState)}if(me&&me.includes("camera-access")&&v){e.state.unbindTexture(),f=n.getBinding();for(let Be=0;Be<Se.length;Be++){let He=Se[Be].camera;if(He){let Ye=m[He];Ye||(Ye=new Go,m[He]=Ye);let Oe=f.getCameraImage(He);Ye.sourceTexture=Oe}}}}for(let Se=0;Se<M.length;Se++){let Ee=T[Se],me=M[Se];Ee!==null&&me!==void 0&&me.update(Ee,ue,c||o)}ne&&ne($,ue),ue.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ue}),g=null}let we=new gm;we.setAnimationLoop(de),this.setAnimationLoop=function($){ne=$},this.dispose=function(){}}},NS=new Te,Em=new Ge;Em.set(-1,0,0,0,1,0,0,0,1);function US(s,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,Hu(s)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function i(p,m,x,S,y){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),f(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),u(p,m),m.isMeshPhysicalMaterial&&d(p,m,y)):m.isMeshMatcapMaterial?(r(p,m),g(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),v(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,x,S):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===sn&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===sn&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let x=e.get(m),S=x.envMap,y=x.envMapRotation;S&&(p.envMap.value=S,p.envMapRotation.value.setFromMatrix4(NS.makeRotationFromEuler(y)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Em),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,x,S){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*x,p.scale.value=S*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function f(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function u(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function d(p,m,x){p.ior.value=m.ior,m.diffuseRoughness>0&&(p.diffuseRoughness.value=m.diffuseRoughness,m.diffuseRoughnessMap&&(p.diffuseRoughnessMap.value=m.diffuseRoughnessMap,t(m.diffuseRoughnessMap,p.diffuseRoughnessMapTransform))),m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===sn&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessMinimum,p.iridescenceThicknessMaximum.value=m.iridescenceThicknessMaximum,m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=x.texture,p.transmissionSamplerSize.value.set(x.width,x.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function v(p,m){let x=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(x.matrixWorld),p.nearDistance.value=x.shadow.camera.near,p.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function OS(s,e,t,n){let i={},r={};function o(x,S){let y=S.program;n.uniformBlockBinding(x,y,i[x.id])}function a(x,S){let y=i[x.id];y===void 0&&(g(x),y=l(x),i[x.id]=y,x.addEventListener("dispose",p));let M=S.program;n.updateUBOMapping(x,M);let T=e.render.frame;r[x.id]!==T&&(c(x),r[x.id]=T)}function l(x){let S=s.createBuffer(),y=x.__size,M=x.usage;return s.bindBuffer(s.UNIFORM_BUFFER,S),s.bufferData(s.UNIFORM_BUFFER,y,M),s.bindBuffer(s.UNIFORM_BUFFER,null),S}function c(x){let S=i[x.id],y=x.uniforms,M=x.__cache;s.bindBuffer(s.UNIFORM_BUFFER,S);for(let T=0,_=y.length;T<_;T++){let b=y[T];if(Array.isArray(b))for(let R=0,w=b.length;R<w;R++)h(b[R],T,R,M);else h(b,T,0,M)}s.bindBuffer(s.UNIFORM_BUFFER,null)}function h(x,S,y,M){if(u(x,S,y,M)===!0){let T=x.__offset,_=x.value;if(Array.isArray(_)){let b=0;for(let R=0;R<_.length;R++){let w=_[R],C=v(w,!0);f(w,x.__data,b),b+=C.storage/Float32Array.BYTES_PER_ELEMENT}}else f(_,x.__data,0);s.bufferSubData(s.UNIFORM_BUFFER,T,x.__data)}}function f(x,S,y){typeof x=="number"||typeof x=="boolean"?S[y]=x:x.isMatrix3?(S[y]=x.elements[0],S[y+1]=x.elements[1],S[y+2]=x.elements[2],S[y+3]=0,S[y+4]=x.elements[3],S[y+5]=x.elements[4],S[y+6]=x.elements[5],S[y+7]=0,S[y+8]=x.elements[6],S[y+9]=x.elements[7],S[y+10]=x.elements[8],S[y+11]=0):ArrayBuffer.isView(x)?S.set(x.subarray(0,S.length-y),y):x.toArray(S,y)}function u(x,S,y,M){let T=x.value,_=S+"_"+y;if(Array.isArray(T)){M[_]===void 0&&(M[_]=[]);let b=M[_],R=!1;for(let w=0;w<T.length;w++)d(T[w],b,w)===!0&&(R=!0);return R}return d(T,M,_)}function d(x,S,y){if(S[y]===void 0)return typeof x=="number"||typeof x=="boolean"?S[y]=x:ArrayBuffer.isView(x)?S[y]=x.slice():S[y]=x.clone(),!0;{let M=S[y];if(typeof x=="number"||typeof x=="boolean"){if(M!==x)return S[y]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(M.equals(x)===!1)return M.copy(x),!0}}return!1}function g(x){let S=x.uniforms,y=0,M=16;for(let _=0,b=S.length;_<b;_++){let R=Array.isArray(S[_])?S[_]:[S[_]];for(let w=0,C=R.length;w<C;w++){let I=R[w],U=Array.isArray(I.value)?I.value:[I.value],D=Array.isArray(S[_])||Array.isArray(I.value),B=y;for(let G=0,ee=U.length;G<ee;G++){let V=U[G],Q=v(V,D),ne=y%M,de=ne%Q.boundary,we=ne+de;y+=de,we!==0&&M-we<Q.storage&&(y+=M-we),G===0&&(B=y),y+=Q.storage}let H=I.type==="int"?Int32Array:I.type==="uint"?Uint32Array:Float32Array;I.__data=new H((y-B)/Float32Array.BYTES_PER_ELEMENT),I.__offset=B}}let T=y%M;return T>0&&(y+=M-T),x.__size=y,x.__cache={},this}function v(x,S){let y={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(y.boundary=4,y.storage=4):x.isVector2?(y.boundary=8,y.storage=8):x.isVector3||x.isColor?(y.boundary=16,y.storage=12):x.isVector4?(y.boundary=16,y.storage=16):x.isMatrix3?(y.boundary=16,y.storage=48):x.isMatrix4?(y.boundary=16,y.storage=64):x.isTexture?Ue("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(y.boundary=16,y.storage=x.byteLength):Ue("WebGLRenderer: Unsupported uniform value type.",x),S===!0&&(y.boundary=16,y.storage=Math.ceil(y.storage/16)*16),y}function p(x){let S=x.target;S.removeEventListener("dispose",p),s.deleteBuffer(i[S.id]),delete i[S.id],delete r[S.id]}function m(){for(let x in i)s.deleteBuffer(i[x]);i={},r={}}return{bind:o,update:a,dispose:m}}var FS=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Ei=null;function BS(){return Ei===null&&(Ei=new qn(FS,16,16,Ms,Qt),Ei.name="DFG_LUT",Ei.minFilter=Zt,Ei.magFilter=Zt,Ei.wrapS=$n,Ei.wrapT=$n,Ei.generateMipmaps=!1,Ei.needsUpdate=!0),Ei}var zc=class{constructor(e={}){let{canvas:t=Vp(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:u=!1,outputBufferType:d=An}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;let v=d,p=new Set([rc,sc,fa]),m=new Set([An,ri,qr,rs,tc,nc]),x=new Uint32Array(4),S=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]},M=null,T=null,_=[],b=[],R=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Ti,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let w=this,C=!1,I=null,U=null,D=null,B=null;this._outputColorSpace=kt;let H=0,G=0,ee=null,V=-1,Q=null,ne=new Mt,de=new Mt,we=null,$=new Pe(0),ue=0,Se=t.width,Ee=t.height,me=1,Le=null,rt=null,Be=new Mt(0,0,Se,Ee),He=new Mt(0,0,Se,Ee),Ye=!1,Oe=new Yi,Lt=new zo,vt=!1,Yt=!1,pt=new Te,dn=new P,Je=new Mt,St={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Vt=!1;function Gt(){return ee===null?me:1}let z=n;function wt(A,k){return t.getContext(A,k)}let et,st,ge,lt,De,ke,N,E,W,re,K,se,ce,Y,j,ae,O,te,J,_e,he,fe,Ne;try{let A={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"187"}`),t.addEventListener("webglcontextlost",Fe,!1),t.addEventListener("webglcontextrestored",L,!1),t.addEventListener("webglcontextcreationerror",F,!1),z===null){let k="webgl2";if(z=wt(k,A),z===null)throw wt(k)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ze()}catch(A){throw t.removeEventListener("webglcontextlost",Fe,!1),t.removeEventListener("webglcontextrestored",L,!1),t.removeEventListener("webglcontextcreationerror",F,!1),Ve("WebGLRenderer: "+A.message),A}function Ze(){et=new Ky(z),et.init(),he=new IS(z,et),st=new By(z,et,e,he),ge=new CS(z,et),st.reversedDepthBuffer&&u&&ge.buffers.depth.setReversed(!0),U=z.createFramebuffer(),D=z.createFramebuffer(),B=z.createFramebuffer(),lt=new $y(z),De=new mS,ke=new PS(z,et,ge,De,st,he,lt),N=new Zy(w),E=new e_(z),fe=new Oy(z,E),W=new jy(z,E,lt,fe),re=new ev(z,W,E,fe,lt),te=new Qy(z,st,ke),j=new zy(De),K=new pS(w,N,et,st,fe,j),se=new US(w,De),ce=new _S,Y=new bS(et),O=new Uy(w,N,ge,re,g,l),ae=new RS(w,re,st),Ne=new OS(z,lt,st,ge),J=new Fy(z,et,lt),_e=new Jy(z,et,lt),lt.programs=K.programs,w.capabilities=st,w.extensions=et,w.properties=De,w.renderLists=ce,w.shadowMap=ae,w.state=ge,w.info=lt}v!==An&&(R=new nv(v,t.width,t.height,a,i,r));let oe=new of(w,z);this.xr=oe,this.getContext=function(){return z},this.getContextAttributes=function(){return z.getContextAttributes()},this.forceContextLoss=function(){let A=et.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){let A=et.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return me},this.setPixelRatio=function(A){A!==void 0&&(me=A,this.setSize(Se,Ee,!1))},this.getSize=function(A){return A.set(Se,Ee)},this.setSize=function(A,k,Z=!0){if(oe.isPresenting){Ue("WebGLRenderer: Can't change size while VR device is presenting.");return}Se=A,Ee=k,t.width=Math.floor(A*me),t.height=Math.floor(k*me),Z===!0&&(t.style.width=A+"px",t.style.height=k+"px"),R!==null&&R.setSize(t.width,t.height),this.setViewport(0,0,A,k)},this.getDrawingBufferSize=function(A){return A.set(Se*me,Ee*me).floor()},this.setDrawingBufferSize=function(A,k,Z){Se=A,Ee=k,me=Z,t.width=Math.floor(A*Z),t.height=Math.floor(k*Z),this.setViewport(0,0,A,k)},this.setEffects=function(A){if(v===An){Ve("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let k=0;k<A.length;k++)if(A[k].isOutputPass===!0){Ue("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}R.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(ne)},this.getViewport=function(A){return A.copy(Be)},this.setViewport=function(A,k,Z,X){A.isVector4?Be.set(A.x,A.y,A.z,A.w):Be.set(A,k,Z,X),ge.viewport(ne.copy(Be).multiplyScalar(Gt()).round())},this.getScissor=function(A){return A.copy(He)},this.setScissor=function(A,k,Z,X){A.isVector4?He.set(A.x,A.y,A.z,A.w):He.set(A,k,Z,X),ge.scissor(de.copy(He).multiplyScalar(Gt()).round())},this.getScissorTest=function(){return Ye},this.setScissorTest=function(A){ge.setScissorTest(Ye=A)},this.setOpaqueSort=function(A){Le=A},this.setTransparentSort=function(A){rt=A},this.getClearColor=function(A){return A.copy(O.getClearColor())},this.setClearColor=function(){O.setClearColor(...arguments)},this.getClearAlpha=function(){return O.getClearAlpha()},this.setClearAlpha=function(){O.setClearAlpha(...arguments)},this.clear=function(A=!0,k=!0,Z=!0){let X=0;if(A){let q=!1;if(ee!==null){let ye=ee.texture.format;q=p.has(ye)}if(q){let ye=ee.texture.type,Ae=m.has(ye),xe=O.getClearColor(),be=O.getClearAlpha(),Ie=xe.r,qe=xe.g,tt=xe.b;Ae?(x[0]=Ie,x[1]=qe,x[2]=tt,x[3]=be,z.clearBufferuiv(z.COLOR,0,x)):(S[0]=Ie,S[1]=qe,S[2]=tt,S[3]=be,z.clearBufferiv(z.COLOR,0,S))}else X|=z.COLOR_BUFFER_BIT}k&&(X|=z.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Z&&(X|=z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),X!==0&&z.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),I=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Fe,!1),t.removeEventListener("webglcontextrestored",L,!1),t.removeEventListener("webglcontextcreationerror",F,!1),O.dispose(),ce.dispose(),Y.dispose(),ke.dispose(),De.dispose(),N.dispose(),re.dispose(),W.dispose(),fe.dispose(),Ne.dispose(),K.dispose(),oe.dispose(),oe.removeEventListener("sessionstart",Ui),oe.removeEventListener("sessionend",Gn),Oi.stop()};function Fe(A){A.preventDefault(),Lo("WebGLRenderer: Context Lost."),C=!0}function L(){Lo("WebGLRenderer: Context Restored."),C=!1;let A=lt.autoReset,k=ae.enabled,Z=ae.autoUpdate,X=ae.needsUpdate,q=ae.type;Ze(),lt.autoReset=A,ae.enabled=k,ae.autoUpdate=Z,ae.needsUpdate=X,ae.type=q}function F(A){Ve("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function ie(A){let k=A.target;k.removeEventListener("dispose",ie),Me(k)}function Me(A){ze(A),De.remove(A)}function ze(A){let k=De.get(A).programs;k!==void 0&&(k.forEach(function(Z){K.releaseProgram(Z)}),A.isShaderMaterial&&K.releaseShaderCache(A))}this.renderBufferDirect=function(A,k,Z,X,q,ye){k===null&&(k=St);let Ae=q.isMesh&&q.matrixWorld.determinantAffine()<0,xe=zg(A,k,Z,X,q);ge.setMaterial(X,Ae);let be=Z.index,Ie=1;if(X.wireframe===!0){if(be=W.getWireframeAttribute(Z),be===void 0)return;Ie=2}let qe=Z.drawRange,tt=Z.attributes.position,Re=qe.start*Ie,nt=(qe.start+qe.count)*Ie;ye!==null&&(Re=Math.max(Re,ye.start*Ie),nt=Math.min(nt,(ye.start+ye.count)*Ie)),be!==null?(Re=Math.max(Re,0),nt=Math.min(nt,be.count)):tt!=null&&(Re=Math.max(Re,0),nt=Math.min(nt,tt.count));let jt=nt-Re;if(jt<0||jt===1/0)return;fe.setup(q,X,xe,Z,be);let Dt,Et=J;if(be!==null&&(Dt=E.get(be),Et=_e,Et.setIndex(Dt)),q.isMesh)X.wireframe===!0?(ge.setLineWidth(X.wireframeLinewidth*Gt()),Et.setMode(z.LINES)):Et.setMode(z.TRIANGLES);else if(q.isLine){let xn=X.linewidth;xn===void 0&&(xn=1),ge.setLineWidth(xn*Gt()),q.isLineSegments?Et.setMode(z.LINES):q.isLineLoop?Et.setMode(z.LINE_LOOP):Et.setMode(z.LINE_STRIP)}else q.isPoints?Et.setMode(z.POINTS):q.isSprite&&Et.setMode(z.TRIANGLES);if(q.isBatchedMesh)if(et.get("WEBGL_multi_draw"))Et.renderMultiDraw(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount);else{let xn=q._multiDrawStarts,Ce=q._multiDrawCounts,Pn=q._multiDrawCount,mt=be?E.get(be).bytesPerElement:1,Is=De.get(X).currentProgram.getUniforms();for(let yn=0;yn<Pn;yn++)Is.setValue(z,"_gl_DrawID",yn),Et.render(xn[yn]/mt,Ce[yn])}else if(q.isInstancedMesh)Et.renderInstances(Re,jt,q.count);else if(Z.isInstancedBufferGeometry){let xn=Z._maxInstanceCount!==void 0?Z._maxInstanceCount:1/0,Ce=Math.min(Z.instanceCount,xn);Et.renderInstances(Re,jt,Ce)}else Et.render(Re,jt)};function ot(A,k,Z,X){I!==null&&A.isNodeMaterial&&I.setObject(X,A),vt===!0&&j.setState(A,Z,!1),A.transparent===!0&&A.side===En&&A.forceSinglePass===!1?(A.side=sn,A.needsUpdate=!0,yo(A,k,X),A.side=Yn,A.needsUpdate=!0,yo(A,k,X),A.side=En):yo(A,k,X)}this.compile=function(A,k,Z=null){Z===null&&(Z=A),I!==null&&I.renderStart(A,k,Z),T=Y.get(Z),T.init(k),b.push(T),Z.traverseVisible(function(q){q.isLight&&q.layers.test(k.layers)&&(T.pushLight(q),q.castShadow&&T.pushShadow(q))}),A!==Z&&A.traverseVisible(function(q){q.isLight&&q.layers.test(k.layers)&&(T.pushLight(q),q.castShadow&&T.pushShadow(q))}),T.setupLights(),I!==null&&I.updateLights(T.state.lightsArray),Yt=this.localClippingEnabled,vt=j.init(this.clippingPlanes,Yt),vt===!0&&j.setGlobalState(this.clippingPlanes,k),I!==null&&ae.render(T.state.shadowsArray,Z,k);let X=new Set;return A.traverse(function(q){if(!(q.isMesh||q.isPoints||q.isLine||q.isSprite))return;let ye=q.material;if(ye)if(Array.isArray(ye))for(let Ae=0;Ae<ye.length;Ae++){let xe=ye[Ae];ot(xe,Z,k,q),X.add(xe)}else ot(ye,Z,k,q),X.add(ye)}),T=b.pop(),I!==null&&I.renderEnd(),X},this.compileAsync=function(A,k,Z=null){let X=this.compile(A,k,Z);return new Promise(q=>{function ye(){if(X.forEach(function(Ae){let be=De.get(Ae).currentProgram;(be===void 0||be.isReady())&&X.delete(Ae)}),X.size===0){q(A);return}setTimeout(ye,10)}et.get("KHR_parallel_shader_compile")!==null?ye():setTimeout(ye,10)})};let ct=null;function jn(A){ct&&ct(A)}function Ui(){Oi.stop()}function Gn(){Oi.start()}let Oi=new gm;Oi.setAnimationLoop(jn),typeof self<"u"&&Oi.setContext(self),this.setAnimationLoop=function(A){ct=A,oe.setAnimationLoop(A),A===null?Oi.stop():Oi.start()},oe.addEventListener("sessionstart",Ui),oe.addEventListener("sessionend",Gn),this.render=function(A,k){if(k!==void 0&&k.isCamera!==!0){Ve("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;I!==null&&I.renderStart(A,k);let Z=oe.enabled===!0&&oe.isPresenting===!0,X=R!==null&&(ee===null||Z)&&R.begin(w,ee);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),oe.enabled===!0&&oe.isPresenting===!0&&(R===null||R.isCompositing()===!1)&&(oe.cameraAutoUpdate===!0&&oe.updateCamera(k),k=oe.getCamera()),A.isScene===!0&&A.onBeforeRender(w,A,k,ee),T=Y.get(A,b.length),T.init(k),T.state.textureUnits=ke.getTextureUnits(),b.push(T),pt.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),k.isArrayCamera?Lt.setFromArrayCamera(k):Oe.setFromProjectionMatrix(pt,Qn,k.reversedDepth),Yt=this.localClippingEnabled,vt=j.init(this.clippingPlanes,Yt),M=ce.get(A,_.length),M.init(),_.push(M),this.info.render.frame++,oe.enabled===!0&&oe.isPresenting===!0){let Ae=w.xr.getDepthSensingMesh();Ae!==null&&Ps(Ae,k,-1/0,w.sortObjects)}Ps(A,k,0,w.sortObjects),M.finish(),I!==null&&I.updateLights(T.state.lightsArray),w.sortObjects===!0&&M.sort(Le,rt),Vt=oe.enabled===!1||oe.isPresenting===!1||oe.hasDepthSensing()===!1,Vt&&O.addToRenderList(M,A),this.info.autoReset===!0&&this.info.reset(),vt===!0&&j.beginShadows();let q=T.state.shadowsArray;if(ae.render(q,A,k),vt===!0&&j.endShadows(),(X&&R.hasRenderPass())===!1){let Ae=M.opaque,xe=M.transmissive;if(T.setupLights(),k.isArrayCamera){let be=k.cameras;if(xe.length>0)for(let Ie=0,qe=be.length;Ie<qe;Ie++){let tt=be[Ie];gd(Ae,xe,A,tt)}Vt&&O.render(A);for(let Ie=0,qe=be.length;Ie<qe;Ie++){let tt=be[Ie];md(M,A,tt,tt.viewport)}}else xe.length>0&&gd(Ae,xe,A,k),Vt&&O.render(A),md(M,A,k)}ee!==null&&G===0&&(ke.updateMultisampleRenderTarget(ee),ke.updateRenderTargetMipmap(ee)),X&&R.end(w),A.isScene===!0&&A.onAfterRender(w,A,k),fe.resetDefaultState(),V=-1,Q=null,b.pop(),b.length>0?(T=b[b.length-1],ke.setTextureUnits(T.state.textureUnits),vt===!0&&j.setGlobalState(w.clippingPlanes,T.state.camera)):T=null,_.pop(),_.length>0?M=_[_.length-1]:M=null,I!==null&&I.renderEnd()};function Ps(A,k,Z,X){if(A.visible===!1)return;if(A.layers.test(k.layers)){if(A.isGroup)Z=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(k);else if(A.isLight)T.pushLight(A),A.castShadow&&T.pushShadow(A);else if(A.isSprite){let Ae=k.isArrayCamera?Lt:Oe;if(!A.frustumCulled||A.intersectsFrustum(Ae)){X&&Je.setFromMatrixPosition(A.matrixWorld).applyMatrix4(pt);let xe=re.update(A),be=A.material;be.visible&&M.push(A,xe,be,Z,Je.z,null,k)}}else if(A.isMesh||A.isLine||A.isPoints){let Ae=k.isArrayCamera?Lt:Oe;if(!A.frustumCulled||A.intersectsFrustum(Ae)){let xe=re.update(A),be=A.material;if(X&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),Je.copy(A.boundingSphere.center)):(xe.boundingSphere===null&&xe.computeBoundingSphere(),Je.copy(xe.boundingSphere.center)),Je.applyMatrix4(A.matrixWorld).applyMatrix4(pt)),Array.isArray(be)){let Ie=xe.groups;for(let qe=0,tt=Ie.length;qe<tt;qe++){let Re=Ie[qe],nt=be[Re.materialIndex];nt&&nt.visible&&M.push(A,xe,nt,Z,Je.z,Re,k)}}else be.visible&&M.push(A,xe,be,Z,Je.z,null,k)}}}let ye=A.children;for(let Ae=0,xe=ye.length;Ae<xe;Ae++)Ps(ye[Ae],k,Z,X)}function md(A,k,Z,X){let{opaque:q,transmissive:ye,transparent:Ae}=A;T.setupLightsView(Z),vt===!0&&j.setGlobalState(w.clippingPlanes,Z),X&&ge.viewport(ne.copy(X)),q.length>0&&qa(q,k,Z),ye.length>0&&qa(ye,k,Z),Ae.length>0&&qa(Ae,k,Z),ge.buffers.depth.setTest(!0),ge.buffers.depth.setMask(!0),ge.buffers.color.setMask(!0),ge.setPolygonOffset(!1)}function gd(A,k,Z,X){if((Z.isScene===!0?Z.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[X.id]===void 0){let Re=et.has("EXT_color_buffer_half_float")||et.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[X.id]=new Wt(1,1,{generateMipmaps:!0,type:Re?Qt:An,minFilter:si,samples:Math.max(4,st.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Ke.workingColorSpace})}let ye=T.state.transmissionRenderTarget[X.id],Ae=X.viewport||ne;ye.setSize(Ae.z*w.transmissionResolutionScale,Ae.w*w.transmissionResolutionScale);let xe=w.getRenderTarget(),be=w.getActiveCubeFace(),Ie=w.getActiveMipmapLevel();w.setRenderTarget(ye),w.getClearColor($),ue=w.getClearAlpha(),ue<1&&w.setClearColor(16777215,.5),w.clear(),Vt&&O.render(Z);let qe=w.toneMapping;w.toneMapping=Ti;let tt=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),T.setupLightsView(X),vt===!0&&j.setGlobalState(w.clippingPlanes,X),qa(A,Z,X),ke.updateMultisampleRenderTarget(ye),ke.updateRenderTargetMipmap(ye),et.has("WEBGL_multisampled_render_to_texture")===!1){let Re=!1;for(let nt=0,jt=k.length;nt<jt;nt++){let Dt=k[nt],{object:Et,geometry:xn,material:Ce,group:Pn}=Dt;if(Ce.side===En&&Et.layers.test(X.layers)){let mt=Ce.side;Ce.side=sn,Ce.needsUpdate=!0,_d(Et,Z,X,xn,Ce,Pn),Ce.side=mt,Ce.needsUpdate=!0,Re=!0}}Re===!0&&(ke.updateMultisampleRenderTarget(ye),ke.updateRenderTargetMipmap(ye))}w.setRenderTarget(xe,be,Ie),w.setClearColor($,ue),tt!==void 0&&(X.viewport=tt),w.toneMapping=qe}function qa(A,k,Z){let X=k.isScene===!0?k.overrideMaterial:null;for(let q=0,ye=A.length;q<ye;q++){let Ae=A[q],{object:xe,geometry:be,group:Ie}=Ae,qe=Ae.material;qe.allowOverride===!0&&X!==null&&(qe=X),xe.layers.test(Z.layers)&&_d(xe,k,Z,be,qe,Ie)}}function _d(A,k,Z,X,q,ye){I!==null&&q.isNodeMaterial&&I.setObject(A,q),A.onBeforeRender(w,k,Z,X,q,ye),A.modelViewMatrix.multiplyMatrices(Z.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),q.onBeforeRender(w,k,Z,X,A,ye),q.transparent===!0&&q.side===En&&q.forceSinglePass===!1?(q.side=sn,q.needsUpdate=!0,w.renderBufferDirect(Z,k,X,q,A,ye),q.side=Yn,q.needsUpdate=!0,w.renderBufferDirect(Z,k,X,q,A,ye),q.side=En):w.renderBufferDirect(Z,k,X,q,A,ye),A.onAfterRender(w,k,Z,X,q,ye)}function xd(A){let k=0;for(let Z of A)Z.texture!==null&&k++;return k}function yo(A,k,Z){k.isScene!==!0&&(k=St);let X=De.get(A),q=T.state.lights,ye=T.state.shadowsArray,Ae=q.state.version,xe=K.getParameters(A,q.state,ye,k,Z,T.state.lightProbeGridArray),be=K.getProgramCacheKey(xe),Ie=X.programs;X.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?k.environment:null,X.fog=k.fog;let qe=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;X.envMap=N.get(A.envMap||X.environment,qe),X.envMapRotation=X.environment!==null&&A.envMap===null?k.environmentRotation:A.envMapRotation,Ie===void 0&&(A.addEventListener("dispose",ie),Ie=new Map,X.programs=Ie,X.programVariants=new Map);let tt=Ie.get(be);if(tt!==void 0){if(X.currentProgram===tt&&X.lightsStateVersion===Ae)return vd(A,xe),tt}else xe.uniforms=K.getUniforms(A),I!==null&&A.isNodeMaterial&&I.build(A,Z,xe),A.onBeforeCompile(xe,w),tt=K.acquireProgram(xe,be),Ie.set(be,tt),X.uniforms=xe.uniforms;let Re=X.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Re.clippingPlanes=j.uniform),vd(A,xe),X.needsLights=Hg(A),X.lightsStateVersion=Ae,X.needsLights&&(Re.ambientLightColor.value=q.state.ambient,Re.lightProbe.value=q.state.probe,Re.sunLights.value=q.state.sun,Re.sunLightShadows.value=q.state.sunShadow,Re.directionalLights.value=q.state.directional,Re.directionalLightShadows.value=q.state.directionalShadow,Re.spotLights.value=q.state.spot,Re.spotLightShadows.value=q.state.spotShadow,Re.rectAreaLights.value=q.state.rectArea,Re.ltc_1.value=q.state.rectAreaLTC1,Re.ltc_2.value=q.state.rectAreaLTC2,Re.pointLights.value=q.state.point,Re.pointLightShadows.value=q.state.pointShadow,Re.hemisphereLights.value=q.state.hemi,Re.sunShadowMatrix.value=q.state.sunShadowMatrix,Re.sunShadowCascade.value=q.state.sunShadowCascade,Re.directionalShadowMatrix.value=q.state.directionalShadowMatrix,Re.spotLightMatrix.value=q.state.spotLightMatrix,Re.spotLightMap.value=q.state.spotLightMap,Re.pointShadowMatrix.value=q.state.pointShadowMatrix),X.numLightProbeGrids=xd(T.state.lightProbeGridArray),X.currentProgram=tt,X.uniformsList=null,tt}function Bg(A,k,Z,X,q){let ye=De.get(A),Ae=ye.currentProgram.id+","+X+","+q,xe=ye.programVariants.get(Ae);return xe===void 0?(xe=yo(A,k,Z),ye.programVariants.set(Ae,xe)):(ye.currentProgram=xe,ye.uniformsList=null,ye.outputColorSpace=X,ye.toneMapping=q),xe}function yd(A){if(A.uniformsList===null){let k=A.currentProgram.getUniforms();A.uniformsList=Kr.seqWithValue(k.seq,A.uniforms)}return A.uniformsList}function vd(A,k){let Z=De.get(A);Z.outputColorSpace=k.outputColorSpace,Z.batching=k.batching,Z.batchingColor=k.batchingColor,Z.instancing=k.instancing,Z.instancingColor=k.instancingColor,Z.instancingMorph=k.instancingMorph,Z.skinning=k.skinning,Z.morphTargets=k.morphTargets,Z.morphNormals=k.morphNormals,Z.morphColors=k.morphColors,Z.morphTargetsCount=k.morphTargetsCount,Z.numClippingPlanes=k.numClippingPlanes,Z.numIntersection=k.numClipIntersection,Z.vertexAlphas=k.vertexAlphas,Z.vertexTangents=k.vertexTangents,Z.toneMapping=k.toneMapping}function zg(A,k,Z,X,q){k.isScene!==!0&&(k=St),ke.resetTextureUnits();let ye=k.fog,Ae=X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial?k.environment:null,xe=ee===null?w.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:Ke.workingColorSpace,be=X.isMeshStandardMaterial||X.isMeshLambertMaterial&&!X.envMap||X.isMeshPhongMaterial&&!X.envMap,Ie=N.get(X.envMap||Ae,be),qe=X.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,tt=!!Z.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Re=!!Z.morphAttributes.position,nt=!!Z.morphAttributes.normal,jt=!!Z.morphAttributes.color,Dt=Ti;X.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(Dt=w.toneMapping);let Et=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,xn=Et!==void 0?Et.length:0,Ce=De.get(X),Pn=T.state.lights;if(vt===!0&&(Yt===!0||A!==Q)){let zt=A===Q&&X.id===V;j.setState(X,A,zt)}let mt=!1,Is=!1;X.version===Ce.__version?Ce.needsLights&&Ce.lightsStateVersion!==Pn.state.version||q.isBatchedMesh&&Ce.batching===!1||!q.isBatchedMesh&&Ce.batching===!0||q.isBatchedMesh&&Ce.batchingColor===!0&&q._colorsTexture===null||q.isBatchedMesh&&Ce.batchingColor===!1&&q._colorsTexture!==null||q.isInstancedMesh&&Ce.instancing===!1||!q.isInstancedMesh&&Ce.instancing===!0||q.isSkinnedMesh&&Ce.skinning===!1||!q.isSkinnedMesh&&Ce.skinning===!0||q.isInstancedMesh&&Ce.instancingColor===!0&&q.instanceColor===null||q.isInstancedMesh&&Ce.instancingColor===!1&&q.instanceColor!==null||q.isInstancedMesh&&Ce.instancingMorph===!0&&q.morphTexture===null||q.isInstancedMesh&&Ce.instancingMorph===!1&&q.morphTexture!==null||Ce.envMap!==Ie||X.fog===!0&&Ce.fog!==ye||Ce.numClippingPlanes!==void 0&&(Ce.numClippingPlanes!==j.numPlanes||Ce.numIntersection!==j.numIntersection)||Ce.vertexAlphas!==qe||Ce.vertexTangents!==tt||Ce.morphTargets!==Re||Ce.morphNormals!==nt||Ce.morphColors!==jt||Ce.morphTargetsCount!==xn||Ce.numLightProbeGrids!==xd(T.state.lightProbeGridArray)?mt=!0:(Ce.outputColorSpace!==xe||Ce.toneMapping!==Dt)&&(Is=!0):(mt=!0,Ce.__version=X.version);let yn=Ce.currentProgram;(mt===!0||Is===!0)&&(yn=Is===!0?Bg(X,k,q,xe,Dt):yo(X,k,q),I&&X.isNodeMaterial&&I.onUpdateProgram(X,yn,Ce));let Ya=!1,cs=!1,Ls=!1,ht=yn.getUniforms(),pn=Ce.uniforms;if(ge.useProgram(yn.program)&&(Ya=!0,cs=!0,Ls=!0),X.id!==V&&(V=X.id,cs=!0),Ya||Q!==A){ge.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),ht.setValue(z,"projectionMatrix",A.projectionMatrix),ht.setValue(z,"viewMatrix",A.matrixWorldInverse);let ln=ht.map.cameraPosition;ln!==void 0&&ln.setValue(z,dn.setFromMatrixPosition(A.matrixWorld)),st.logarithmicDepthBuffer&&ht.setValue(z,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&ht.setValue(z,"isOrthographic",A.isOrthographicCamera===!0),Q!==A&&(Q=A,cs=!0,Ls=!0)}if(Ce.needsLights&&(Pn.state.sunShadowMap.length>0&&ht.setValue(z,"sunShadowMap",Pn.state.sunShadowMap,ke),Pn.state.directionalShadowMap.length>0&&ht.setValue(z,"directionalShadowMap",Pn.state.directionalShadowMap,ke),Pn.state.spotShadowMap.length>0&&ht.setValue(z,"spotShadowMap",Pn.state.spotShadowMap,ke),Pn.state.pointShadowMap.length>0&&ht.setValue(z,"pointShadowMap",Pn.state.pointShadowMap,ke)),q.isSkinnedMesh){ht.setOptional(z,q,"bindMatrix"),ht.setOptional(z,q,"bindMatrixInverse");let zt=q.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),ht.setValue(z,"boneTexture",zt.boneTexture,ke))}q.isBatchedMesh&&(ht.setOptional(z,q,"batchingTexture"),ht.setValue(z,"batchingTexture",q._matricesTexture,ke),ht.setOptional(z,q,"batchingIdTexture"),ht.setValue(z,"batchingIdTexture",q._indirectTexture,ke),ht.setOptional(z,q,"batchingColorTexture"),q._colorsTexture!==null&&ht.setValue(z,"batchingColorTexture",q._colorsTexture,ke));let li=Z.morphAttributes;if((li.position!==void 0||li.normal!==void 0||li.color!==void 0)&&te.update(q,Z,yn),(cs||Ce.receiveShadow!==q.receiveShadow)&&(Ce.receiveShadow=q.receiveShadow,ht.setValue(z,"receiveShadow",q.receiveShadow)),(X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial)&&X.envMap===null&&k.environment!==null&&(pn.envMapIntensity.value=k.environmentIntensity),pn.dfgLUT!==void 0&&(pn.dfgLUT.value=BS()),cs){if(ht.setValue(z,"toneMappingExposure",w.toneMappingExposure),Ce.needsLights&&kg(pn,Ls),ye&&X.fog===!0&&se.refreshFogUniforms(pn,ye),se.refreshMaterialUniforms(pn,X,me,Ee,T.state.transmissionRenderTarget[A.id]),Ce.needsLights&&Ce.numLightProbeGrids>0){let zt=y,ln=0;for(let Fi of T.state.lightProbeGridArray)Fi.texture!==null&&(zt.textures[ln]=Fi.texture,zt.min[ln]=Fi.boundingBox.min,zt.max[ln]=Fi.boundingBox.max,zt.resolution[ln]=Fi.resolution,ln++);for(let Fi in zt)zt[Fi].length=ln;pn.probesSH.value=zt.textures,pn.probesMin.value=zt.min,pn.probesMax.value=zt.max,pn.probesResolution.value=zt.resolution}Kr.upload(z,yd(Ce),pn,ke)}if(X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Kr.upload(z,yd(Ce),pn,ke),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&ht.setValue(z,"center",q.center),ht.setValue(z,"modelViewMatrix",q.modelViewMatrix),ht.setValue(z,"normalMatrix",q.normalMatrix),ht.setValue(z,"modelMatrix",q.matrixWorld),X.uniformsGroups!==void 0){let zt=X.uniformsGroups;for(let ln=0,Fi=zt.length;ln<Fi;ln++){let Md=zt[ln];Ne.update(Md,yn),Ne.bind(Md,yn)}}return yn}function kg(A,k){A.ambientLightColor.needsUpdate=k,A.lightProbe.needsUpdate=k,A.sunLights.needsUpdate=k,A.sunLightShadows.needsUpdate=k,A.directionalLights.needsUpdate=k,A.directionalLightShadows.needsUpdate=k,A.pointLights.needsUpdate=k,A.pointLightShadows.needsUpdate=k,A.spotLights.needsUpdate=k,A.spotLightShadows.needsUpdate=k,A.rectAreaLights.needsUpdate=k,A.hemisphereLights.needsUpdate=k}function Hg(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return H},this.getActiveMipmapLevel=function(){return G},this.getRenderTarget=function(){return ee},this.setRenderTargetTextures=function(A,k,Z){let X=De.get(A);X.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),De.get(A.texture).__webglTexture=k,De.get(A.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:Z,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,k){let Z=De.get(A);Z.__webglFramebuffer=k,Z.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(A,k=0,Z=0){ee=A,H=k,G=Z;let X=null,q=!1,ye=!1;if(A){let xe=De.get(A);if(xe.__useDefaultFramebuffer!==void 0){ge.bindFramebuffer(z.FRAMEBUFFER,xe.__webglFramebuffer),ne.copy(A.viewport),de.copy(A.scissor),we=A.scissorTest,ge.viewport(ne),ge.scissor(de),ge.setScissorTest(we),V=-1;return}else if(xe.__webglFramebuffer===void 0)ke.setupRenderTarget(A);else if(xe.__hasExternalTextures)ke.rebindTextures(A,De.get(A.texture).__webglTexture,De.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){let qe=A.depthTexture;if(xe.__boundDepthTexture!==qe){if(qe!==null&&De.has(qe)&&(A.width!==qe.image.width||A.height!==qe.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ke.setupDepthRenderbuffer(A)}}let be=A.texture;(be.isData3DTexture||be.isDataArrayTexture||be.isCompressedArrayTexture)&&(ye=!0);let Ie=De.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(Ie[k])?X=Ie[k][Z]:X=Ie[k],q=!0):A.samples>0&&ke.useMultisampledRTT(A)===!1?X=De.get(A).__webglMultisampledFramebuffer:Array.isArray(Ie)?X=Ie[Z]:X=Ie,ne.copy(A.viewport),de.copy(A.scissor),we=A.scissorTest}else ne.copy(Be).multiplyScalar(me).floor(),de.copy(He).multiplyScalar(me).floor(),we=Ye;if(Z!==0&&(X=U),ge.bindFramebuffer(z.FRAMEBUFFER,X)&&ge.drawBuffers(A,X),ge.viewport(ne),ge.scissor(de),ge.setScissorTest(we),q){let xe=De.get(A.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_CUBE_MAP_POSITIVE_X+k,xe.__webglTexture,Z)}else if(ye){let xe=k;for(let be=0;be<A.textures.length;be++){let Ie=De.get(A.textures[be]);z.framebufferTextureLayer(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0+be,Ie.__webglTexture,Z,xe)}}else if(A!==null&&Z!==0){let xe=De.get(A.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,xe.__webglTexture,Z)}V=-1};function Sd(A){let k=De.get(A);return(k.__readFormat!==A.format||k.__readType!==A.type)&&(k.__readFormat=A.format,k.__readType=A.type,k.__formatReadable=st.textureFormatReadable(A.format),k.__typeReadable=st.textureTypeReadable(A.type)),k}this.readRenderTargetPixels=function(A,k,Z,X,q,ye,Ae,xe=0){if(!(A&&A.isWebGLRenderTarget)){Ve("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let be=De.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Ae!==void 0&&(be=be[Ae],Array.isArray(be)&&(be=be[0])),be){ge.bindFramebuffer(z.FRAMEBUFFER,be);try{let Ie=A.textures[xe],qe=Ie.format,tt=Ie.type;A.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+xe);let Re=Sd(Ie);if(Re.__formatReadable===!1){Ve("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Re.__typeReadable===!1){Ve("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=A.width-X&&Z>=0&&Z<=A.height-q&&z.readPixels(k,Z,X,q,he.convert(qe),he.convert(tt),ye)}finally{let Ie=ee!==null?De.get(ee).__webglFramebuffer:null;ge.bindFramebuffer(z.FRAMEBUFFER,Ie)}}},this.readRenderTargetPixelsAsync=async function(A,k,Z,X,q,ye,Ae,xe=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let be=De.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Ae!==void 0&&(be=be[Ae],Array.isArray(be)&&(be=be[0])),be)if(k>=0&&k<=A.width-X&&Z>=0&&Z<=A.height-q){ge.bindFramebuffer(z.FRAMEBUFFER,be);let Ie=A.textures[xe],qe=Ie.format,tt=Ie.type;A.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+xe);let Re=Sd(Ie);if(Re.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Re.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let nt=z.createBuffer();z.bindBuffer(z.PIXEL_PACK_BUFFER,nt),z.bufferData(z.PIXEL_PACK_BUFFER,ye.byteLength,z.STREAM_READ),z.readPixels(k,Z,X,q,he.convert(qe),he.convert(tt),0),z.bindBuffer(z.PIXEL_PACK_BUFFER,null);let jt=ee!==null?De.get(ee).__webglFramebuffer:null;ge.bindFramebuffer(z.FRAMEBUFFER,jt);let Dt=z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE,0);return z.flush(),await Wp(z,Dt,4),z.bindBuffer(z.PIXEL_PACK_BUFFER,nt),z.getBufferSubData(z.PIXEL_PACK_BUFFER,0,ye),z.bindBuffer(z.PIXEL_PACK_BUFFER,null),z.deleteBuffer(nt),z.deleteSync(Dt),ye}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,k=null,Z=0){let X=Math.pow(2,-Z),q=Math.floor(A.image.width*X),ye=Math.floor(A.image.height*X),Ae=k!==null?k.x:0,xe=k!==null?k.y:0;ke.setTexture2D(A,0),z.copyTexSubImage2D(z.TEXTURE_2D,Z,0,0,Ae,xe,q,ye),ge.unbindTexture()},this.copyTextureToTexture=function(A,k,Z=null,X=null,q=0,ye=0){let Ae,xe,be,Ie,qe,tt,Re,nt,jt,Dt=A.isCompressedTexture?A.mipmaps[ye]:A.image;if(Z!==null)Ae=Z.max.x-Z.min.x,xe=Z.max.y-Z.min.y,be=Z.isBox3?Z.max.z-Z.min.z:1,Ie=Z.min.x,qe=Z.min.y,tt=Z.isBox3?Z.min.z:0;else{let ht=Math.pow(2,-q);Ae=Math.floor(Dt.width*ht),xe=Math.floor(Dt.height*ht),A.isDataArrayTexture?be=Dt.depth:A.isData3DTexture?be=Math.floor(Dt.depth*ht):be=1,Ie=0,qe=0,tt=0}X!==null?(Re=X.x,nt=X.y,jt=X.z):(Re=0,nt=0,jt=0);let Et=he.convert(k.format),xn=he.convert(k.type),Ce;k.isData3DTexture?(ke.setTexture3D(k,0),Ce=z.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(ke.setTexture2DArray(k,0),Ce=z.TEXTURE_2D_ARRAY):(ke.setTexture2D(k,0),Ce=z.TEXTURE_2D),ge.activeTexture(z.TEXTURE0),ge.pixelStorei(z.UNPACK_FLIP_Y_WEBGL,k.flipY),ge.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),ge.pixelStorei(z.UNPACK_ALIGNMENT,k.unpackAlignment);let Pn=ge.getParameter(z.UNPACK_ROW_LENGTH),mt=ge.getParameter(z.UNPACK_IMAGE_HEIGHT),Is=ge.getParameter(z.UNPACK_SKIP_PIXELS),yn=ge.getParameter(z.UNPACK_SKIP_ROWS),Ya=ge.getParameter(z.UNPACK_SKIP_IMAGES);ge.pixelStorei(z.UNPACK_ROW_LENGTH,Dt.width),ge.pixelStorei(z.UNPACK_IMAGE_HEIGHT,Dt.height),ge.pixelStorei(z.UNPACK_SKIP_PIXELS,Ie),ge.pixelStorei(z.UNPACK_SKIP_ROWS,qe),ge.pixelStorei(z.UNPACK_SKIP_IMAGES,tt);let cs=A.isDataArrayTexture||A.isData3DTexture,Ls=k.isDataArrayTexture||k.isData3DTexture;if(A.isDepthTexture){let ht=De.get(A),pn=De.get(k),li=De.get(ht.__renderTarget),zt=De.get(pn.__renderTarget);ge.bindFramebuffer(z.READ_FRAMEBUFFER,li.__webglFramebuffer),ge.bindFramebuffer(z.DRAW_FRAMEBUFFER,zt.__webglFramebuffer);for(let ln=0;ln<be;ln++)cs&&(z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,De.get(A).__webglTexture,q,tt+ln),z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,De.get(k).__webglTexture,ye,jt+ln)),z.blitFramebuffer(Ie,qe,Ie+Ae,qe+xe,Re,nt,Re+Ae,nt+xe,z.DEPTH_BUFFER_BIT,z.NEAREST);ge.bindFramebuffer(z.READ_FRAMEBUFFER,null),ge.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else if(q!==0||A.isRenderTargetTexture||De.has(A)){let ht=De.get(A),pn=De.get(k);ge.bindFramebuffer(z.READ_FRAMEBUFFER,D),ge.bindFramebuffer(z.DRAW_FRAMEBUFFER,B);for(let li=0;li<be;li++)cs?z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,ht.__webglTexture,q,tt+li):z.framebufferTexture2D(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,ht.__webglTexture,q),Ls?z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,pn.__webglTexture,ye,jt+li):z.framebufferTexture2D(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,pn.__webglTexture,ye),q!==0?z.blitFramebuffer(Ie,qe,Ie+Ae,qe+xe,Re,nt,Re+Ae,nt+xe,z.COLOR_BUFFER_BIT,z.NEAREST):Ls?z.copyTexSubImage3D(Ce,ye,Re,nt,jt+li,Ie,qe,Ae,xe):z.copyTexSubImage2D(Ce,ye,Re,nt,Ie,qe,Ae,xe);ge.bindFramebuffer(z.READ_FRAMEBUFFER,null),ge.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else Ls?A.isDataTexture||A.isData3DTexture?z.texSubImage3D(Ce,ye,Re,nt,jt,Ae,xe,be,Et,xn,Dt.data):k.isCompressedArrayTexture?z.compressedTexSubImage3D(Ce,ye,Re,nt,jt,Ae,xe,be,Et,Dt.data):z.texSubImage3D(Ce,ye,Re,nt,jt,Ae,xe,be,Et,xn,Dt):A.isDataTexture?z.texSubImage2D(z.TEXTURE_2D,ye,Re,nt,Ae,xe,Et,xn,Dt.data):A.isCompressedTexture?z.compressedTexSubImage2D(z.TEXTURE_2D,ye,Re,nt,Dt.width,Dt.height,Et,Dt.data):z.texSubImage2D(z.TEXTURE_2D,ye,Re,nt,Ae,xe,Et,xn,Dt);ge.pixelStorei(z.UNPACK_ROW_LENGTH,Pn),ge.pixelStorei(z.UNPACK_IMAGE_HEIGHT,mt),ge.pixelStorei(z.UNPACK_SKIP_PIXELS,Is),ge.pixelStorei(z.UNPACK_SKIP_ROWS,yn),ge.pixelStorei(z.UNPACK_SKIP_IMAGES,Ya),ye===0&&k.generateMipmaps===!0&&k.mipmapsAutoUpdate===!0&&z.generateMipmap(Ce),ge.unbindTexture()},this.initRenderTarget=function(A){De.get(A).__webglFramebuffer===void 0&&ke.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?ke.setTextureCube(A,0):A.isData3DTexture?ke.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?ke.setTexture2DArray(A,0):ke.setTexture2D(A,0),ge.unbindTexture()},this.resetState=function(){H=0,G=0,ee=null,ge.reset(),fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Qn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ke._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ke._getUnpackColorSpace()}};function af(s,e){if(e===Iu)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),s;if(e===Yr||e===ya){let t=s.getIndex();if(t===null){let r=[],o=s.getAttribute("position");if(o!==void 0){for(let a=0;a<o.count;a++)r.push(a);s.setIndex(r),t=s.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),s}let n=t.count-2,i=[];if(e===Yr)for(let r=1;r<=n;r++)i.push(t.getX(0)),i.push(t.getX(r)),i.push(t.getX(r+1));else for(let r=0;r<n;r++)r%2===0?(i.push(t.getX(r)),i.push(t.getX(r+1)),i.push(t.getX(r+2))):(i.push(t.getX(r+2)),i.push(t.getX(r+1)),i.push(t.getX(r)));return i.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles."),s.setIndex(i),s.clearGroups(),s}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),s}function Am(s){let e=new Map,t=new Map,n=s.clone();return Rm(s,n,function(i,r){e.set(r,i),t.set(i,r)}),n.traverse(function(i){if(!i.isSkinnedMesh)return;let r=i,o=e.get(i),a=o.skeleton.bones;r.skeleton=o.skeleton.clone(),r.bindMatrix.copy(o.bindMatrix),r.skeleton.bones=a.map(function(l){return t.get(l)}),r.bind(r.skeleton,r.bindMatrix)}),n}function Rm(s,e,t){t(s,e);for(let n=0;n<s.children.length;n++)Rm(s.children[n],e.children[n],t)}var Vc=class extends bi{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new pf(t)}),this.register(function(t){return new mf(t)}),this.register(function(t){return new gf(t)}),this.register(function(t){return new wf(t)}),this.register(function(t){return new Ef(t)}),this.register(function(t){return new Af(t)}),this.register(function(t){return new xf(t)}),this.register(function(t){return new yf(t)}),this.register(function(t){return new vf(t)}),this.register(function(t){return new Sf(t)}),this.register(function(t){return new df(t)}),this.register(function(t){return new Mf(t)}),this.register(function(t){return new _f(t)}),this.register(function(t){return new Tf(t)}),this.register(function(t){return new bf(t)}),this.register(function(t){return new uf(t)}),this.register(function(t){return new Gc(t,$e.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new Gc(t,$e.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new Rf(t)})}load(e,t,n,i){let r=this,o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){let c=ss.extractUrlBase(e);o=ss.resolveURL(c,this.path)}else o=ss.extractUrlBase(e);this.manager.itemStart(e);let a=function(c){i?i(c):console.error(c),r.manager.itemError(e),r.manager.itemEnd(e)},l=new Fr(this.manager);l.setPriority(this.priority),l.setCache(this.cache),l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(c){try{r.parse(c,o,function(h){t(h),r.manager.itemEnd(e)},a)}catch(h){a(h)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,i){let r,o={},a={},l=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===Dm){try{o[$e.KHR_BINARY_GLTF]=new Cf(e)}catch(f){i&&i(f);return}r=JSON.parse(o[$e.KHR_BINARY_GLTF].content)}else r=JSON.parse(l.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){i&&i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let c=new Of(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,priority:this.priority,cache:this.cache,withCredentials:this.withCredentials,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){let f=this.pluginCallbacks[h](c);f.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[f.name]=f,o[f.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){let f=r.extensionsUsed[h],u=r.extensionsRequired||[];switch(f){case $e.KHR_MATERIALS_UNLIT:o[f]=new ff;break;case $e.KHR_DRACO_MESH_COMPRESSION:o[f]=new Pf(r,this.dracoLoader);break;case $e.KHR_TEXTURE_TRANSFORM:o[f]=new If;break;case $e.KHR_MESH_QUANTIZATION:o[f]=new Lf;break;default:u.indexOf(f)>=0&&a[f]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+f+'".')}}c.setExtensions(o),c.setPlugins(a),c.parse(n,i)}parseAsync(e,t){let n=this;return new Promise(function(i,r){n.parse(e,t,i,r)})}};function kS(){let s={};return{get:function(e){return s[e]},add:function(e,t){s[e]=t},remove:function(e){delete s[e]},removeAll:function(){s={}}}}function Ht(s,e,t){let n=s.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}var $e={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DIFFUSE_ROUGHNESS:"KHR_materials_diffuse_roughness",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"},uf=class{constructor(e){this.parser=e,this.name=$e.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,i=t.length;n<i;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n="light:"+e,i=t.cache.get(n);if(i)return i;let r=t.json,l=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e],c,h=new Pe(16777215);l.color!==void 0&&h.setRGB(l.color[0],l.color[1],l.color[2],Dn);let f=l.range!==void 0?l.range:0;switch(l.type){case"directional":c=new qs(h),c.target.position.set(0,0,-1),c.add(c.target);break;case"point":c=new ns(h),c.distance=f;break;case"spot":c=new Jo(h),c.distance=f,l.spot=l.spot||{},l.spot.innerConeAngle=l.spot.innerConeAngle!==void 0?l.spot.innerConeAngle:0,l.spot.outerConeAngle=l.spot.outerConeAngle!==void 0?l.spot.outerConeAngle:Math.PI/4,c.angle=l.spot.outerConeAngle,c.penumbra=1-l.spot.innerConeAngle/l.spot.outerConeAngle,c.target.position.set(0,0,-1),c.add(c.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+l.type)}return c.position.set(0,0,0),Ri(c,l),l.intensity!==void 0&&(c.intensity=l.intensity),c.name=t.createUniqueName(l.name||"light_"+e),i=Promise.resolve(c),t.cache.add(n,i),i}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(l){return n._getNodeRef(t.cache,a,l)})}},ff=class{constructor(){this.name=$e.KHR_MATERIALS_UNLIT}getMaterialType(){return hn}extendParams(e,t,n){let i=[];e.color=new Pe(1,1,1),e.opacity=1;let r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){let o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],Dn),e.opacity=o[3]}r.baseColorTexture!==void 0&&i.push(n.assignTexture(e,"map",r.baseColorTexture,kt))}return Promise.all(i)}},df=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}},pf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&i.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(i.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){let r=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new pe(r,r)}return Promise.all(i)}},mf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_DIFFUSE_ROUGHNESS}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];return t.diffuseRoughness=n.diffuseRoughnessFactor!==void 0?n.diffuseRoughnessFactor:0,n.diffuseRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"diffuseRoughnessMap",n.diffuseRoughnessTexture)),Promise.all(i)}},gf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}},_f=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&i.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessMinimum=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessMaximum=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&i.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(i)}},xf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_SHEEN}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];if(t.sheenColor=new Pe(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){let r=n.sheenColorFactor;t.sheenColor.setRGB(r[0],r[1],r[2],Dn)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&i.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,kt)),n.sheenRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(i)}},yf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&i.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(i)}},vf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_VOLUME}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&i.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let r=n.attenuationColor||[1,1,1];return t.attenuationColor=new Pe().setRGB(r[0],r[1],r[2],Dn),Promise.all(i)}},Sf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_IOR}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5,t.ior===0&&(t.ior=1e3)),Promise.resolve()}},Mf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&i.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));let r=n.specularColorFactor||[1,1,1];return t.specularColor=new Pe().setRGB(r[0],r[1],r[2],Dn),n.specularColorTexture!==void 0&&i.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,kt)),Promise.all(i)}},bf=class{constructor(e){this.parser=e,this.name=$e.EXT_MATERIALS_BUMP}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&i.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(i)}},Tf=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Ht(this.parser,e,this.name)!==null?Nn:null}extendMaterialParams(e,t){let n=Ht(this.parser,e,this.name);if(n===null)return Promise.resolve();let i=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&i.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(i)}},wf=class{constructor(e){this.parser=e,this.name=$e.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,i=n.textures[e];if(!i.extensions||!i.extensions[this.name])return null;let r=i.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}},Ef=class{constructor(e){this.parser=e,this.name=$e.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;let o=r.extensions[t],a=i.images[o.source],l=n.textureLoader;if(a.uri){let c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}},Af=class{constructor(e){this.parser=e,this.name=$e.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;let o=r.extensions[t],a=i.images[o.source],l=n.textureLoader;if(a.uri){let c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}},Gc=class{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let i=n.extensions[this.name],r=this.parser.getDependency("buffer",i.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){let l=i.byteOffset||0,c=i.byteLength||0,h=i.count,f=i.byteStride,u=new Uint8Array(a,l,c);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(h,f,u,i.mode,i.filter).then(function(d){return d.buffer}):o.ready.then(function(){let d=new ArrayBuffer(h*f);return o.decodeGltfBuffer(new Uint8Array(d),h,f,u,i.mode,i.filter),d})})}else return null}},Rf=class{constructor(e){this.name=$e.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let i=t.meshes[n.mesh];for(let c of i.primitives)if(c.mode!==oi.TRIANGLES&&c.mode!==oi.TRIANGLE_STRIP&&c.mode!==oi.TRIANGLE_FAN&&c.mode!==void 0)return null;let o=n.extensions[this.name].attributes,a=[],l={};for(let c in o)a.push(this.parser.getDependency("accessor",o[c]).then(h=>(l[c]=h,l[c])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(c=>{let h=c.pop(),f=h.isGroup?h.children:[h],u=c[0].count,d=[];for(let g of f){let v=new Te,p=new P,m=new Rt,x=new P(1,1,1),S=new Gs(g.geometry,g.material,u);for(let M=0;M<u;M++)l.TRANSLATION&&p.fromBufferAttribute(l.TRANSLATION,M),l.ROTATION&&m.fromBufferAttribute(l.ROTATION,M),l.SCALE&&x.fromBufferAttribute(l.SCALE,M),S.setMatrixAt(M,v.compose(p,m,x));let y=null;for(let M in l)if(M==="_COLOR_0"){let T=l[M];S.instanceColor=new qi(T.array,T.itemSize,T.normalized)}else if(M!=="TRANSLATION"&&M!=="ROTATION"&&M!=="SCALE"){if(y===null){let _=S.geometry;y=new bt,y.name=_.name;for(let b in _.attributes)y.setAttribute(b,_.attributes[b]);for(let b in _.morphAttributes)y.morphAttributes[b]=_.morphAttributes[b];_.index!==null&&y.setIndex(_.index),y.morphTargetsRelative=_.morphTargetsRelative;for(let b of _.groups)y.addGroup(b.start,b.count,b.materialIndex);_.boundingBox!==null&&(y.boundingBox=_.boundingBox.clone()),_.boundingSphere!==null&&(y.boundingSphere=_.boundingSphere.clone()),y.drawRange.start=_.drawRange.start,y.drawRange.count=_.drawRange.count,y.userData=Object.assign({},_.userData),S.geometry=y}let T=l[M];y.setAttribute(M,new qi(T.array,T.itemSize,T.normalized))}dt.prototype.copy.call(S,g),this.parser.assignFinalMaterial(S),d.push(S)}return h.isGroup?(h.clear(),h.add(...d),h):d[0]}))}},Dm="glTF",Ta=12,Cm={JSON:1313821514,BIN:5130562},Cf=class{constructor(e){this.name=$e.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,Ta),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Dm)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");let i=this.header.length-Ta,r=new DataView(e,Ta),o=0;for(;o<i;){let a=r.getUint32(o,!0);o+=4;let l=r.getUint32(o,!0);if(o+=4,l===Cm.JSON){let c=new Uint8Array(e,Ta+o,a);this.content=n.decode(c)}else if(l===Cm.BIN){let c=Ta+o;this.body=e.slice(c,c+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}},Pf=class{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=$e.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,i=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},l={},c={};for(let h in o){let f=Nf[h]||h.toLowerCase();a[f]=o[h]}for(let h in e.attributes){let f=Nf[h]||h.toLowerCase();if(o[h]!==void 0){let u=n.accessors[e.attributes[h]],d=Qr[u.componentType];c[f]=d.name,l[f]=u.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(f,u){i.decodeDracoFile(h,function(d){for(let g in d.attributes){let v=d.attributes[g],p=l[g];p!==void 0&&(v.normalized=p)}f(d)},a,c,Dn,u)})})}},If=class{constructor(){this.name=$e.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){let n=Math.cos(e.rotation),i=Math.sin(e.rotation);e.matrix.set(e.repeat.x*n,e.repeat.y*i,e.offset.x,-e.repeat.x*i,e.repeat.y*n,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}},Lf=class{constructor(){this.name=$e.KHR_MESH_QUANTIZATION}},Wc=class extends Mi{constructor(e,t,n,i){super(e,t,n,i)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i*3+i;for(let o=0;o!==i;o++)t[o]=n[r+o];return t}interpolate_(e,t,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=a*2,c=a*3,h=i-t,f=(n-t)/h,u=f*f,d=u*f,g=e*c,v=g-c,p=-2*d+3*u,m=d-u,x=1-p,S=m-u+f;for(let y=0;y!==a;y++){let M=o[v+y+a],T=o[v+y+l]*h,_=o[g+y+a],b=o[g+y]*h;r[y]=x*M+S*T+p*_+m*b}return r}},HS=new Rt,Df=class extends Wc{interpolate_(e,t,n,i){let r=super.interpolate_(e,t,n,i);return HS.fromArray(r).normalize().toArray(r),r}},oi={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},Qr={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Pm={9728:Ut,9729:Zt,9984:Ql,9985:Xr,9986:$s,9987:si},Im={33071:$n,33648:Tr,10497:kn},lf={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Nf={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},bs={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},VS={CUBICSPLINE:void 0,LINEAR:ks,STEP:zs},cf={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function GS(s){return s.DefaultMaterial===void 0&&(s.DefaultMaterial=new ni({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Yn})),s.DefaultMaterial}function er(s,e,t){for(let n in t.extensions)s[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Ri(s,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(s.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function WS(s,e,t){let n=!1,i=!1,r=!1;for(let c=0,h=e.length;c<h;c++){let f=e[c];if(f.POSITION!==void 0&&(n=!0),f.NORMAL!==void 0&&(i=!0),f.COLOR_0!==void 0&&(r=!0),n&&i&&r)break}if(!n&&!i&&!r)return Promise.resolve(s);let o=[],a=[],l=[];for(let c=0,h=e.length;c<h;c++){let f=e[c];if(n){let u=f.POSITION!==void 0?t.getDependency("accessor",f.POSITION):s.attributes.position;o.push(u)}if(i){let u=f.NORMAL!==void 0?t.getDependency("accessor",f.NORMAL):s.attributes.normal;a.push(u)}if(r){let u=f.COLOR_0!==void 0?t.getDependency("accessor",f.COLOR_0):s.attributes.color;l.push(u)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l)]).then(function(c){let h=c[0],f=c[1],u=c[2];return n&&(s.morphAttributes.position=h),i&&(s.morphAttributes.normal=f),r&&(s.morphAttributes.color=u),s.morphTargetsRelative=!0,s})}function XS(s,e){if(s.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)s.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){let t=e.extras.targetNames;if(s.morphTargetInfluences.length===t.length){s.morphTargetDictionary={};for(let n=0,i=t.length;n<i;n++)s.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function qS(s){let e,t=s.extensions&&s.extensions[$e.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+hf(t.attributes):e=s.indices+":"+hf(s.attributes)+":"+s.mode,s.targets!==void 0)for(let n=0,i=s.targets.length;n<i;n++)e+=":"+hf(s.targets[n]);return e}function hf(s){let e="",t=Object.keys(s).sort();for(let n=0,i=t.length;n<i;n++)e+=t[n]+":"+s[t[n]]+";";return e}function Uf(s){switch(s){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function YS(s){return s.search(/\.jpe?g($|\?)/i)>0||s.search(/^data\:image\/jpeg/)===0?"image/jpeg":s.search(/\.webp($|\?)/i)>0||s.search(/^data\:image\/webp/)===0?"image/webp":s.search(/\.ktx2($|\?)/i)>0||s.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}var ZS=new Te,Of=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new kS,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,i=-1,r=!1,o=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){let a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;let l=a.match(/Version\/(\d+)/);i=n&&l?parseInt(l[1],10):-1,r=a.indexOf("Firefox")>-1,o=r?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&i<17||r&&o<98?(this.textureLoader=new Ws(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)):(this.textureLoader=new $o(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setWithCredentials(this.options.withCredentials),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Fr(this.options.manager),this.fileLoader.setPriority(this.options.priority),this.fileLoader.setCache(this.options.cache),this.fileLoader.setResponseType("arraybuffer"),(this.options.withCredentials||this.options.crossOrigin==="use-credentials")&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,i=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){let a={scene:o[0][i.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:i.asset,parser:n,userData:{}};return er(r,a,i),Ri(a,i),Promise.all(n._invokeAll(function(l){return l.afterRoot&&l.afterRoot(a)})).then(function(){for(let l of a.scenes)l.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let i=0,r=t.length;i<r;i++){let o=t[i].joints;for(let a=0,l=o.length;a<l;a++)e[o[a]].isBone=!0}for(let i=0,r=e.length;i<r;i++){let o=e[i];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let i=n.clone(),r=(o,a)=>{let l=this.associations.get(o);l!=null&&this.associations.set(a,l);for(let[c,h]of o.children.entries())r(h,a.children[c])};return r(n,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let i=e(t[n]);if(i)return i}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let i=0;i<t.length;i++){let r=e(t[i]);r&&n.push(r)}return n}getDependency(e,t){let n=e+":"+t,i=this.cache.get(n);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":i=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(i=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!i)throw new Error("Unknown type: "+e);break}this.cache.add(n,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,i=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(i.map(function(r,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[$e.KHR_BINARY_GLTF].body);let i=this.options;return new Promise(function(r,o){n.load(ss.resolveURL(t.uri,i.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){let i=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+i)})}loadAccessor(e){let t=this,n=this.json,i=this.json.accessors[e];if(i.bufferView===void 0&&i.sparse===void 0){let o=lf[i.type],a=Qr[i.componentType],l=i.normalized===!0,c=new a(i.count*o);return Promise.resolve(new Nt(c,o,l))}let r=[];return i.bufferView!==void 0?r.push(this.getDependency("bufferView",i.bufferView)):r.push(null),i.sparse!==void 0&&(r.push(this.getDependency("bufferView",i.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",i.sparse.values.bufferView))),Promise.all(r).then(function(o){let a=o[0],l=lf[i.type],c=Qr[i.componentType],h=c.BYTES_PER_ELEMENT,f=h*l,u=i.byteOffset||0,d=i.bufferView!==void 0?n.bufferViews[i.bufferView].byteStride:void 0,g=i.normalized===!0,v,p;if(d&&d!==f){let m=Math.floor(u/d),x="InterleavedBuffer:"+i.bufferView+":"+i.componentType+":"+m+":"+i.count,S=t.cache.get(x);S||(v=new c(a,m*d,i.count*d/h),S=new Ir(v,d/h),t.cache.add(x,S)),p=new Lr(S,l,u%d/h,g)}else a===null?v=new c(i.count*l):v=new c(a,u,i.count*l),p=new Nt(v,l,g);if(i.sparse!==void 0){let m=lf.SCALAR,x=Qr[i.sparse.indices.componentType],S=i.sparse.indices.byteOffset||0,y=i.sparse.values.byteOffset||0,M=new x(o[1],S,i.sparse.count*m),T=new c(o[2],y,i.sparse.count*l);a!==null&&(p=new Nt(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let _=0,b=M.length;_<b;_++){let R=M[_];if(p.setX(R,T[_*l]),l>=2&&p.setY(R,T[_*l+1]),l>=3&&p.setZ(R,T[_*l+2]),l>=4&&p.setW(R,T[_*l+3]),l>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}p.normalized=g}return p})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,o=t.images[r],a=this.textureLoader;if(o.uri){let l=n.manager.getHandler(o.uri);l!==null&&(a=l)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){let i=this,r=this.json,o=r.textures[e],a=r.images[t],l=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[l])return this.textureCache[l];let c=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=o.name||a.name||"",h.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(h.name=a.uri);let u=(r.samplers||{})[o.sampler]||{};return h.magFilter=Pm[u.magFilter]||Zt,h.minFilter=Pm[u.minFilter]||si,h.wrapS=Im[u.wrapS]||kn,h.wrapT=Im[u.wrapT]||kn,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Ut&&h.minFilter!==Zt,i.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[l]=c,c}loadImageSource(e,t){let n=this,i=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());let o=i.images[e],a=self.URL||self.webkitURL,l=o.uri||"",c=!1,h;if(t.isKTX2Loader===!0&&o.bufferView!==void 0)h=n.getDependency("bufferView",o.bufferView).then(function(u){return new Promise(function(d,g){t.parse(u,d,g)})});else{if(o.bufferView!==void 0)l=n.getDependency("bufferView",o.bufferView).then(function(u){c=!0;let d=new Blob([u],{type:o.mimeType});return l=a.createObjectURL(d),l});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");h=Promise.resolve(l).then(function(u){return new Promise(function(d,g){let v=d;t.isImageBitmapLoader===!0&&(v=function(p){let m=new tn(p);m.needsUpdate=!0,d(m)}),t.load(ss.resolveURL(u,r.path),v,void 0,g)})})}let f=h.then(function(u){return c===!0&&a.revokeObjectURL(l),Ri(u,o),u.userData.mimeType=o.mimeType||YS(o.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",l),u});return this.sourceCache[e]=f,f}assignTexture(e,t,n,i){let r=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),r.extensions[$e.KHR_TEXTURE_TRANSFORM]){let a=n.extensions!==void 0?n.extensions[$e.KHR_TEXTURE_TRANSFORM]:void 0;if(a){let l=r.associations.get(o);o=r.extensions[$e.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,l)}}return i!==void 0&&(o.colorSpace=i),e[t]=o,o})}assignFinalMaterial(e){let t=e.geometry,n=e.material,i=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){let a="PointsMaterial:"+n.uuid,l=this.cache.get(a);l||(l=new Nr,wn.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,l.sizeAttenuation=!1,this.cache.add(a,l)),n=l}else if(e.isLine){let a="LineBasicMaterial:"+n.uuid,l=this.cache.get(a);l||(l=new Zi,wn.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,this.cache.add(a,l)),n=l}if(i||r||o){let a="ClonedMaterial:"+n.uuid+":";i&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let l=this.cache.get(a);l||(l=n.clone(),r&&(l.vertexColors=!0),o&&(l.flatShading=!0),i&&(l.normalScale&&(l.normalScale.y*=-1),l.clearcoatNormalScale&&(l.clearcoatNormalScale.y*=-1)),this.cache.add(a,l),this.associations.set(l,this.associations.get(n))),n=l}e.material=n}getMaterialType(){return ni}loadMaterial(e){let t=this,n=this.json,i=this.extensions,r=n.materials[e],o,a={},l=r.extensions||{},c=[];if(l[$e.KHR_MATERIALS_UNLIT]){let f=i[$e.KHR_MATERIALS_UNLIT];o=f.getMaterialType(),c.push(f.extendParams(a,r,t))}else{let f=r.pbrMetallicRoughness||{};if(a.color=new Pe(1,1,1),a.opacity=1,Array.isArray(f.baseColorFactor)){let u=f.baseColorFactor;a.color.setRGB(u[0],u[1],u[2],Dn),a.opacity=u[3]}f.baseColorTexture!==void 0&&c.push(t.assignTexture(a,"map",f.baseColorTexture,kt)),a.metalness=f.metallicFactor!==void 0?f.metallicFactor:1,a.roughness=f.roughnessFactor!==void 0?f.roughnessFactor:1,f.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(a,"metalnessMap",f.metallicRoughnessTexture)),c.push(t.assignTexture(a,"roughnessMap",f.metallicRoughnessTexture))),o=this._invokeOne(function(u){return u.getMaterialType&&u.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(u){return u.extendMaterialParams&&u.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=En);let h=r.alphaMode||cf.OPAQUE;if(h===cf.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,h===cf.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==hn&&(c.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new pe(1,1),r.normalTexture.scale!==void 0)){let f=r.normalTexture.scale;a.normalScale.set(f,f)}if(r.occlusionTexture!==void 0&&o!==hn&&(c.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==hn){let f=r.emissiveFactor;a.emissive=new Pe().setRGB(f[0],f[1],f[2],Dn)}return r.emissiveTexture!==void 0&&o!==hn&&c.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,kt)),Promise.all(c).then(function(){let f=new o(a);return r.name&&(f.name=r.name),Ri(f,r),t.associations.set(f,{materials:e}),r.extensions&&er(i,f,r),f})}createUniqueName(e){let t=At.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,i=this.primitiveCache;function r(a){return n[$e.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(l){return Lm(l,a,t)})}let o=[];for(let a=0,l=e.length;a<l;a++){let c=e[a],h=qS(c),f=i[h];if(f)o.push(f.promise);else{let u;c.extensions&&c.extensions[$e.KHR_DRACO_MESH_COMPRESSION]?u=r(c):u=Lm(new bt,c,t),c.mode===oi.TRIANGLE_STRIP?u=u.then(d=>af(d,ya)):c.mode===oi.TRIANGLE_FAN&&(u=u.then(d=>af(d,Yr))),i[h]={primitive:c,promise:u},o.push(u)}}return Promise.all(o)}loadMesh(e){let t=this,n=this.json,i=this.extensions,r=n.meshes[e],o=r.primitives,a=[];for(let l=0,c=o.length;l<c;l++){let h=o[l].material===void 0?GS(this.cache):this.getDependency("material",o[l].material);a.push(h)}return a.push(t.loadGeometries(o)),Promise.all(a).then(async function(l){let c=l.slice(0,l.length-1),h=l[l.length-1],f=[];for(let d=0,g=h.length;d<g;d++){let v=h[d],p=o[d],m,x=c[d];if(p.mode===oi.TRIANGLES||p.mode===oi.TRIANGLE_STRIP||p.mode===oi.TRIANGLE_FAN||p.mode===void 0){let S=r.isSkinnedMesh===!0,y=v.hasAttribute("skinIndex")&&v.hasAttribute("skinWeight");S&&y===!1&&console.warn("THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled."),m=S&&y?new Fo(v,x):new le(v,x),m.isSkinnedMesh===!0&&m.normalizeSkinWeights()}else if(p.mode===oi.LINES)m=new Ki(v,x);else if(p.mode===oi.LINE_STRIP)m=new nn(v,x);else if(p.mode===oi.LINE_LOOP)m=new gs(v,x);else if(p.mode===oi.POINTS)m=new _s(v,x);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+p.mode);Object.keys(m.geometry.morphAttributes).length>0&&XS(m,r),m.name=t.createUniqueName(r.name||"mesh_"+e),Ri(m,r),p.extensions&&er(i,m,p),t.assignFinalMaterial(m),f.push(m)}for(let d=0,g=f.length;d<g;d++)t.associations.set(f[d],{meshes:e,primitives:d});if(f.length===1)return r.extensions&&er(i,f[0],r),f[0];let u=new fi;r.extensions&&er(i,u,r),t.associations.set(u,{meshes:e});for(let d=0,g=f.length;d<g;d++)u.add(f[d]);return u})}loadCamera(e){let t,n=this.json.cameras[e],i=n[n.type];if(!i){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new en(as.radToDeg(i.yfov),i.aspectRatio||1,i.znear||1,i.zfar||2e6):n.type==="orthographic"&&(t=new is(-i.xmag,i.xmag,i.ymag,-i.ymag,i.znear,i.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Ri(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let i=0,r=t.joints.length;i<r;i++)n.push(this._loadNodeShallow(t.joints[i]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(i){let r=i.pop(),o=i,a=[],l=[];for(let c=0,h=o.length;c<h;c++){let f=o[c];if(f){a.push(f);let u=new Te;r!==null&&u.fromArray(r.array,c*16),l.push(u)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[c])}return new Bo(a,l)})}loadAnimation(e){let t=this.json,n=this,i=t.animations[e],r=i.name?i.name:"animation_"+e,o=[],a=[],l=[],c=[],h=[];for(let f=0,u=i.channels.length;f<u;f++){let d=i.channels[f],g=i.samplers[d.sampler],v=d.target,p=v.node,m=i.parameters!==void 0?i.parameters[g.input]:g.input,x=i.parameters!==void 0?i.parameters[g.output]:g.output;v.node!==void 0&&(o.push(this.getDependency("node",p)),a.push(this.getDependency("accessor",m)),l.push(this.getDependency("accessor",x)),c.push(g),h.push(v))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l),Promise.all(c),Promise.all(h)]).then(function(f){let u=f[0],d=f[1],g=f[2],v=f[3],p=f[4],m=[];for(let S=0,y=u.length;S<y;S++){let M=u[S],T=d[S],_=g[S],b=v[S],R=p[S];if(M===void 0)continue;M.updateMatrix&&M.updateMatrix();let w=n._createAnimationTracks(M,T,_,b,R);if(w)for(let C=0;C<w.length;C++)m.push(w[C])}let x=new Zo(r,void 0,m);return Ri(x,i),x})}createNodeMesh(e){let t=this.json,n=this,i=t.nodes[e];return i.mesh===void 0?null:n.getDependency("mesh",i.mesh).then(function(r){let o=n._getNodeRef(n.meshCache,i.mesh,r);return i.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let l=0,c=i.weights.length;l<c;l++)a.morphTargetInfluences[l]=i.weights[l]}),o})}loadNode(e){let t=this.json,n=this,i=t.nodes[e],r=n._loadNodeShallow(e),o=[],a=i.children||[];for(let c=0,h=a.length;c<h;c++)o.push(n.getDependency("node",a[c]));let l=i.skin===void 0?Promise.resolve(null):n.getDependency("skin",i.skin);return Promise.all([r,Promise.all(o),l]).then(function(c){let h=c[0],f=c[1],u=c[2];u!==null&&h.traverse(function(d){d.isSkinnedMesh&&d.bind(u,ZS)});for(let d=0,g=f.length;d<g;d++)h.add(f[d]);if(h.userData.pivot!==void 0&&f.length>0){let d=h.userData.pivot,g=f[0];h.pivot=new P().fromArray(d),h.position.x-=d[0],h.position.y-=d[1],h.position.z-=d[2],g.position.set(0,0,0),delete h.userData.pivot}return h})}_loadNodeShallow(e){let t=this.json,n=this.extensions,i=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let r=t.nodes[e],o=r.name?i.createUniqueName(r.name):"",a=[],l=i._invokeOne(function(c){return c.createNodeMesh&&c.createNodeMesh(e)});return l&&a.push(l),r.camera!==void 0&&a.push(i.getDependency("camera",r.camera).then(function(c){return i._getNodeRef(i.cameraCache,r.camera,c)})),i._invokeAll(function(c){return c.createNodeAttachment&&c.createNodeAttachment(e)}).forEach(function(c){a.push(c)}),this.nodeCache[e]=Promise.all(a).then(function(c){let h;if(r.isBone===!0?h=new Dr:c.length>1?h=new fi:c.length===1?h=c[0]:h=new dt,h!==c[0])for(let f=0,u=c.length;f<u;f++)h.add(c[f]);if(r.name&&(h.userData.name=r.name,h.name=o),Ri(h,r),r.extensions&&er(n,h,r),r.matrix!==void 0){let f=new Te;f.fromArray(r.matrix),h.applyMatrix4(f)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!i.associations.has(h))i.associations.set(h,{});else if(r.mesh!==void 0&&i.meshCache.refs[r.mesh]>1){let f=i.associations.get(h);i.associations.set(h,{...f})}return i.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],i=this,r=new fi;n.name&&(r.name=i.createUniqueName(n.name)),Ri(r,n),n.extensions&&er(t,r,n);let o=n.nodes||[],a=[];for(let l=0,c=o.length;l<c;l++)a.push(i.getDependency("node",o[l]));return Promise.all(a).then(function(l){for(let h=0,f=l.length;h<f;h++){let u=l[h];u.parent!==null?r.add(Am(u)):r.add(u)}let c=h=>{let f=new Map;for(let[u,d]of i.associations)(u instanceof wn||u instanceof tn)&&f.set(u,d);return h.traverse(u=>{let d=i.associations.get(u);d!=null&&f.set(u,d)}),f};return i.associations=c(r),r})}_createAnimationTracks(e,t,n,i,r){let o=[],a=e.name?e.name:e.uuid,l=[];function c(d){d.morphTargetInfluences&&l.push(d.name?d.name:d.uuid)}bs[r.path]===bs.weights?(c(e),e.isGroup&&e.children.forEach(c)):l.push(a);let h;switch(bs[r.path]){case bs.weights:h=Qi;break;case bs.rotation:h=es;break;case bs.translation:case bs.scale:h=ys;break;default:n.itemSize===1?h=Qi:h=ys;break}let f=i.interpolation!==void 0?VS[i.interpolation]:ks,u=this._getArrayFromAccessor(n);for(let d=0,g=l.length;d<g;d++){let v=new h(l[d]+"."+bs[r.path],t.array,u,f);i.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(v),o.push(v)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let n=Uf(t.constructor),i=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)i[r]=t[r]*n;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){let i=this instanceof es?Df:Wc;return new i(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function KS(s,e,t){let n=e.attributes,i=new it;if(n.POSITION!==void 0){let a=t.json.accessors[n.POSITION],l=a.min,c=a.max;if(l!==void 0&&c!==void 0){if(i.set(new P(l[0],l[1],l[2]),new P(c[0],c[1],c[2])),a.normalized){let h=Uf(Qr[a.componentType]);i.min.multiplyScalar(h),i.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let r=e.targets;if(r!==void 0){let a=new P,l=new P;for(let c=0,h=r.length;c<h;c++){let f=r[c];if(f.POSITION!==void 0){let u=t.json.accessors[f.POSITION],d=u.min,g=u.max;if(d!==void 0&&g!==void 0){if(l.setX(Math.max(Math.abs(d[0]),Math.abs(g[0]))),l.setY(Math.max(Math.abs(d[1]),Math.abs(g[1]))),l.setZ(Math.max(Math.abs(d[2]),Math.abs(g[2]))),u.normalized){let v=Uf(Qr[u.componentType]);l.multiplyScalar(v)}a.max(l)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}i.expandByVector(a)}s.boundingBox=i;let o=new $t;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,s.boundingSphere=o}function Lm(s,e,t){let n=e.attributes,i=[];function r(o,a){return t.getDependency("accessor",o).then(function(l){s.setAttribute(a,l)})}for(let o in n){let a=Nf[o]||o.toLowerCase();a in s.attributes||i.push(r(n[o],a))}if(e.indices!==void 0&&!s.index){let o=t.getDependency("accessor",e.indices).then(function(a){s.setIndex(a)});i.push(o)}return Ke.workingColorSpace!==Dn&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${Ke.workingColorSpace}" not supported.`),Ri(s,e),KS(s,e,t),Promise.all(i).then(function(){return e.targets!==void 0?WS(s,e.targets,t):s})}var Nm={type:"change"},Bf={type:"start"},Om={type:"end"},Xc=new ti,Um=new mn,jS=Math.cos(70*as.DEG2RAD),an=new P,Vn=2*Math.PI,gt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Ff=1e-6,qc=class extends Zs{constructor(e,t=null){super(e,t),this.state=gt.NONE,this.target=new P,this.cursor=new P,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:vs.ROTATE,MIDDLE:vs.DOLLY,RIGHT:vs.PAN},this.touches={ONE:Ss.ROTATE,TWO:Ss.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new P,this._lastQuaternion=new Rt,this._lastTargetPosition=new P,this._quat=new Rt().setFromUnitVectors(e.up,new P(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new kr,this._sphericalDelta=new kr,this._scale=1,this._panOffset=new P,this._rotateStart=new pe,this._rotateEnd=new pe,this._rotateDelta=new pe,this._panStart=new pe,this._panEnd=new pe,this._panDelta=new pe,this._dollyStart=new pe,this._dollyEnd=new pe,this._dollyDelta=new pe,this._dollyDirection=new P,this._mouse=new pe,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=$S.bind(this),this._onPointerDown=JS.bind(this),this._onPointerUp=QS.bind(this),this._onContextMenu=oM.bind(this),this._onMouseWheel=nM.bind(this),this._onKeyDown=iM.bind(this),this._onTouchStart=sM.bind(this),this._onTouchMove=rM.bind(this),this._onMouseDown=eM.bind(this),this._onMouseMove=tM.bind(this),this._interceptControlDown=aM.bind(this),this._interceptControlUp=lM.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=gt.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Nm),this.update(),this.state=gt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;an.copy(t).sub(this.target),an.applyQuaternion(this._quat),this._spherical.setFromVector3(an),this.autoRotate&&this.state===gt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,i=this.maxAzimuthAngle;isFinite(n)&&isFinite(i)&&(n<-Math.PI?n+=Vn:n>Math.PI&&(n-=Vn),i<-Math.PI?i+=Vn:i>Math.PI&&(i-=Vn),n<=i?this._spherical.theta=Math.max(n,Math.min(i,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+i)/2?Math.max(n,this._spherical.theta):Math.min(i,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(an.setFromSpherical(this._spherical),an.applyQuaternion(this._quatInverse),t.copy(this.target).add(an),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=an.length();o=this._clampDistance(a*this._scale);let l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let a=new P(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new P(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=an.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Xc.origin.copy(this.object.position),Xc.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Xc.direction))<jS?this.object.lookAt(this.target):(Um.setFromNormalAndCoplanarPoint(this.object.up,this.target),Xc.intersectPlane(Um,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Ff||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Ff||this._lastTargetPosition.distanceToSquared(this.target)>Ff?(this.dispatchEvent(Nm),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?Vn/60*this.autoRotateSpeed*e:Vn/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){an.setFromMatrixColumn(t,0),an.multiplyScalar(-e),this._panOffset.add(an)}_panUp(e,t){this.screenSpacePanning===!0?an.setFromMatrixColumn(t,1):(an.setFromMatrixColumn(t,0),an.crossVectors(this.object.up,an)),an.multiplyScalar(e),this._panOffset.add(an)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let i=this.object.position;an.copy(i).sub(this.target);let r=an.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),i=e-n.left,r=t-n.top,o=n.width,a=n.height;this._mouse.x=i/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Vn*this._rotateDelta.x/t.clientHeight),this._rotateUp(Vn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Vn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Vn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Vn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Vn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._rotateStart.set(n,i)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._panStart.set(n,i)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y,r=Math.sqrt(n*n+i*i);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(i,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Vn*this._rotateDelta.x/t.clientHeight),this._rotateUp(Vn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._panEnd.set(n,i)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y,r=Math.sqrt(n*n+i*i);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(e.pageX+t.x)*.5,a=(e.pageY+t.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new pe,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function JS(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function $S(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function QS(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Om),this.state=gt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function eM(s){let e;switch(s.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case vs.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=gt.DOLLY;break;case vs.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=gt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=gt.ROTATE}break;case vs.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=gt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=gt.PAN}break;default:this.state=gt.NONE}this.state!==gt.NONE&&this.dispatchEvent(Bf)}function tM(s){switch(this.state){case gt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case gt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case gt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function nM(s){this.enabled===!1||this.enableZoom===!1||this.state!==gt.NONE||(s.preventDefault(),this.dispatchEvent(Bf),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent(Om))}function iM(s){this.enabled!==!1&&this._handleKeyDown(s)}function sM(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case Ss.ROTATE:if(this.enableRotate===!1){this.state=gt.NONE;break}this._handleTouchStartRotate(s),this.state=gt.TOUCH_ROTATE;break;case Ss.PAN:if(this.enablePan===!1){this.state=gt.NONE;break}this._handleTouchStartPan(s),this.state=gt.TOUCH_PAN;break;default:this.state=gt.NONE}break;case 2:switch(this.touches.TWO){case Ss.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=gt.TOUCH_DOLLY_PAN;break;case Ss.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=gt.TOUCH_DOLLY_ROTATE;break;default:this.state=gt.NONE}break;default:this.state=gt.NONE}this.state!==gt.NONE&&this.dispatchEvent(Bf)}function rM(s){switch(this._trackPointer(s),this.state){case gt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case gt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case gt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case gt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=gt.NONE}}function oM(s){this.enabled!==!1&&s.preventDefault()}function aM(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function lM(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Yc=class extends Vs{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let e=new Ot;e.deleteAttribute("uv");let t=new ni({side:sn}),n=new ni,i=new ns(16777215,900,28,2);i.position.set(.418,16.199,.3),this.add(i);let r=new le(e,t);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let o=new Gs(e,n,6),a=new dt;a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),a.updateMatrix(),o.setMatrixAt(0,a.matrix),a.position.set(-5.607,-.754,-.758),a.rotation.set(0,.994,0),a.scale.set(1.97,1.534,3.955),a.updateMatrix(),o.setMatrixAt(1,a.matrix),a.position.set(6.167,.857,7.803),a.rotation.set(0,.561,0),a.scale.set(3.927,6.285,3.687),a.updateMatrix(),o.setMatrixAt(2,a.matrix),a.position.set(-2.017,.018,6.124),a.rotation.set(0,.333,0),a.scale.set(2.002,4.566,2.064),a.updateMatrix(),o.setMatrixAt(3,a.matrix),a.position.set(2.291,-.756,-2.621),a.rotation.set(0,-.286,0),a.scale.set(1.546,1.552,1.496),a.updateMatrix(),o.setMatrixAt(4,a.matrix),a.position.set(-2.193,-.369,-5.547),a.rotation.set(0,.516,0),a.scale.set(3.875,3.487,2.986),a.updateMatrix(),o.setMatrixAt(5,a.matrix),this.add(o);let l=new le(e,eo(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new le(e,eo(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let h=new le(e,eo(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);let f=new le(e,eo(43));f.position.set(-.462,8.89,14.52),f.scale.set(4.38,5.441,.088),this.add(f);let u=new le(e,eo(20));u.position.set(3.235,11.486,-12.541),u.scale.set(2.5,2,.1),this.add(u);let d=new le(e,eo(100));d.position.set(0,20,0),d.scale.set(1,.1,1),this.add(d)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function eo(s){return new qo({color:0,emissive:16777215,emissiveIntensity:s})}var Ci={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var Fn=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},cM=new is(-1,1,1,-1,0,1),zf=class extends bt{constructor(){super(),this.setAttribute("position",new ut([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ut([0,2,0,0,2,0],2))}},hM=new zf,Pi=class{constructor(e){this._mesh=new le(hM,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,cM)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var Zc=class extends Fn{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Ft?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=On.clone(e.uniforms),this.material=new Ft({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Pi(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var wa=class extends Fn{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let i=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),r.buffers.stencil.setFunc(i.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(i.EQUAL,1,4294967295),r.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),r.buffers.stencil.setLocked(!0)}},Kc=class extends Fn{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var jc=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new pe);this._width=n.width,this._height=n.height,t=new Wt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Qt}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Zc(Ci),this.copyPass.material.blending=fn,this.timer=new Qo}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let i=0,r=this.passes.length;i<r;i++){let o=this.passes[i];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),o.needsSwap){if(n){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}wa!==void 0&&(o instanceof wa?n=!0:o instanceof Kc&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new pe);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(n,i),this.renderTarget2.setSize(n,i);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Jc=class extends Fn{constructor(e,t,n=null,i=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=i,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Pe}render(e,t,n){let i=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=i}};var Ea={name:"GTAOShader",defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new pe},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new Te},cameraProjectionMatrixInverse:{value:new Te},cameraWorldMatrix:{value:new Te},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new P(-1,-1,-1)},sceneBoxMax:{value:new P(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).r;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).r;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);

			#ifdef USE_REVERSED_DEPTH_BUFFER
				if (depth <= 0.0) {
					discard;
					return;
				}
			#else
				if (depth >= 1.0) {
					discard;
					return;
				}
			#endif
			
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				#if PERSPECTIVE_CAMERA == 1
					vec3 viewDir = normalize(-viewPos.xyz);
				#else
					vec3 viewDir = vec3(0., 0., 1.);
				#endif
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},Aa={name:"GTAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},$c={name:"GTAOBlendShader",uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function Fm(s=5){let e=Math.floor(s)%2===0?Math.floor(s)+1:Math.floor(s),t=uM(e),n=t.length,i=new Uint8Array(n*4);for(let o=0;o<n;++o){let a=t[o],l=2*Math.PI*a/n,c=new P(Math.cos(l),Math.sin(l),0).normalize();i[o*4]=(c.x*.5+.5)*255,i[o*4+1]=(c.y*.5+.5)*255,i[o*4+2]=127,i[o*4+3]=255}let r=new qn(i,e,e);return r.wrapS=kn,r.wrapT=kn,r.needsUpdate=!0,r}function uM(s){let e=Math.floor(s)%2===0?Math.floor(s)+1:Math.floor(s),t=e*e,n=Array(t).fill(0),i=Math.floor(e/2),r=e-1;for(let o=1;o<=t;){if(i===-1&&r===e?(r=e-2,i=0):(r===e&&(r=0),i<0&&(i=e-1)),n[i*e+r]!==0){r-=2,i++;continue}else n[i*e+r]=o++;r++,i--}return n}var Ra={name:"PoissonDenoiseShader",defines:{SAMPLES:16,SAMPLE_VECTORS:kf(16,2,1),NORMAL_VECTOR_TYPE:1},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new pe},cameraProjectionMatrixInverse:{value:new Te},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).r;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).r;
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function kf(s,e,t){let n=fM(s,e,t),i="vec3[SAMPLES](";for(let r=0;r<s;r++){let o=n[r];i+=`vec3(${o.x}, ${o.y}, ${o.z})${r<s-1?",":")"}`}return i}function fM(s,e,t){let n=[];for(let i=0;i<s;i++){let r=2*Math.PI*e*i/s,o=Math.pow(i/(s-1),t);n.push(new P(Math.cos(r),Math.sin(r),o))}return n}var Qc=class{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let n,i,r,o=.5*(Math.sqrt(3)-1),a=(e+t)*o,l=Math.floor(e+a),c=Math.floor(t+a),h=(3-Math.sqrt(3))/6,f=(l+c)*h,u=l-f,d=c-f,g=e-u,v=t-d,p,m;g>v?(p=1,m=0):(p=0,m=1);let x=g-p+h,S=v-m+h,y=g-1+2*h,M=v-1+2*h,T=l&255,_=c&255,b=this.perm[T+this.perm[_]]%12,R=this.perm[T+p+this.perm[_+m]]%12,w=this.perm[T+1+this.perm[_+1]]%12,C=.5-g*g-v*v;C<0?n=0:(C*=C,n=C*C*this._dot(this.grad3[b],g,v));let I=.5-x*x-S*S;I<0?i=0:(I*=I,i=I*I*this._dot(this.grad3[R],x,S));let U=.5-y*y-M*M;return U<0?r=0:(U*=U,r=U*U*this._dot(this.grad3[w],y,M)),70*(n+i+r)}noise3d(e,t,n){let i,r,o,a,c=(e+t+n)*.3333333333333333,h=Math.floor(e+c),f=Math.floor(t+c),u=Math.floor(n+c),d=1/6,g=(h+f+u)*d,v=h-g,p=f-g,m=u-g,x=e-v,S=t-p,y=n-m,M,T,_,b,R,w;x>=S?S>=y?(M=1,T=0,_=0,b=1,R=1,w=0):x>=y?(M=1,T=0,_=0,b=1,R=0,w=1):(M=0,T=0,_=1,b=1,R=0,w=1):S<y?(M=0,T=0,_=1,b=0,R=1,w=1):x<y?(M=0,T=1,_=0,b=0,R=1,w=1):(M=0,T=1,_=0,b=1,R=1,w=0);let C=x-M+d,I=S-T+d,U=y-_+d,D=x-b+2*d,B=S-R+2*d,H=y-w+2*d,G=x-1+3*d,ee=S-1+3*d,V=y-1+3*d,Q=h&255,ne=f&255,de=u&255,we=this.perm[Q+this.perm[ne+this.perm[de]]]%12,$=this.perm[Q+M+this.perm[ne+T+this.perm[de+_]]]%12,ue=this.perm[Q+b+this.perm[ne+R+this.perm[de+w]]]%12,Se=this.perm[Q+1+this.perm[ne+1+this.perm[de+1]]]%12,Ee=.6-x*x-S*S-y*y;Ee<0?i=0:(Ee*=Ee,i=Ee*Ee*this._dot3(this.grad3[we],x,S,y));let me=.6-C*C-I*I-U*U;me<0?r=0:(me*=me,r=me*me*this._dot3(this.grad3[$],C,I,U));let Le=.6-D*D-B*B-H*H;Le<0?o=0:(Le*=Le,o=Le*Le*this._dot3(this.grad3[ue],D,B,H));let rt=.6-G*G-ee*ee-V*V;return rt<0?a=0:(rt*=rt,a=rt*rt*this._dot3(this.grad3[Se],G,ee,V)),32*(i+r+o+a)}noise4d(e,t,n,i){let r=this.grad4,o=this.simplex,a=this.perm,l=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20,h,f,u,d,g,v=(e+t+n+i)*l,p=Math.floor(e+v),m=Math.floor(t+v),x=Math.floor(n+v),S=Math.floor(i+v),y=(p+m+x+S)*c,M=p-y,T=m-y,_=x-y,b=S-y,R=e-M,w=t-T,C=n-_,I=i-b,U=R>w?32:0,D=R>C?16:0,B=w>C?8:0,H=R>I?4:0,G=w>I?2:0,ee=C>I?1:0,V=U+D+B+H+G+ee,Q=o[V][0]>=3?1:0,ne=o[V][1]>=3?1:0,de=o[V][2]>=3?1:0,we=o[V][3]>=3?1:0,$=o[V][0]>=2?1:0,ue=o[V][1]>=2?1:0,Se=o[V][2]>=2?1:0,Ee=o[V][3]>=2?1:0,me=o[V][0]>=1?1:0,Le=o[V][1]>=1?1:0,rt=o[V][2]>=1?1:0,Be=o[V][3]>=1?1:0,He=R-Q+c,Ye=w-ne+c,Oe=C-de+c,Lt=I-we+c,vt=R-$+2*c,Yt=w-ue+2*c,pt=C-Se+2*c,dn=I-Ee+2*c,Je=R-me+3*c,St=w-Le+3*c,Vt=C-rt+3*c,Gt=I-Be+3*c,z=R-1+4*c,wt=w-1+4*c,et=C-1+4*c,st=I-1+4*c,ge=p&255,lt=m&255,De=x&255,ke=S&255,N=a[ge+a[lt+a[De+a[ke]]]]%32,E=a[ge+Q+a[lt+ne+a[De+de+a[ke+we]]]]%32,W=a[ge+$+a[lt+ue+a[De+Se+a[ke+Ee]]]]%32,re=a[ge+me+a[lt+Le+a[De+rt+a[ke+Be]]]]%32,K=a[ge+1+a[lt+1+a[De+1+a[ke+1]]]]%32,se=.6-R*R-w*w-C*C-I*I;se<0?h=0:(se*=se,h=se*se*this._dot4(r[N],R,w,C,I));let ce=.6-He*He-Ye*Ye-Oe*Oe-Lt*Lt;ce<0?f=0:(ce*=ce,f=ce*ce*this._dot4(r[E],He,Ye,Oe,Lt));let Y=.6-vt*vt-Yt*Yt-pt*pt-dn*dn;Y<0?u=0:(Y*=Y,u=Y*Y*this._dot4(r[W],vt,Yt,pt,dn));let j=.6-Je*Je-St*St-Vt*Vt-Gt*Gt;j<0?d=0:(j*=j,d=j*j*this._dot4(r[re],Je,St,Vt,Gt));let ae=.6-z*z-wt*wt-et*et-st*st;return ae<0?g=0:(ae*=ae,g=ae*ae*this._dot4(r[K],z,wt,et,st)),27*(h+f+u+d+g)}_dot(e,t,n){return e[0]*t+e[1]*n}_dot3(e,t,n,i){return e[0]*t+e[1]*n+e[2]*i}_dot4(e,t,n,i,r){return e[0]*t+e[1]*n+e[2]*i+e[3]*r}};var Ca=class s extends Fn{constructor(e,t,n=512,i=512,r,o,a){super(),this.width=n,this.height=i,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Fm(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new Wt(this.width,this.height,{type:Qt,depthBuffer:!1}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new Ft({defines:Object.assign({},Ea.defines),uniforms:On.clone(Ea.uniforms),vertexShader:Ea.vertexShader,fragmentShader:Ea.fragmentShader,blending:fn,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Xo,this.normalMaterial.blending=fn,this.pdMaterial=new Ft({defines:Object.assign({},Ra.defines),uniforms:On.clone(Ra.uniforms),vertexShader:Ra.vertexShader,fragmentShader:Ra.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new Ft({defines:Object.assign({},Aa.defines),uniforms:On.clone(Aa.uniforms),vertexShader:Aa.vertexShader,fragmentShader:Aa.fragmentShader,blending:fn}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Ft({uniforms:On.clone(Ci.uniforms),vertexShader:Ci.vertexShader,fragmentShader:Ci.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:ra,blendDst:Ks,blendEquation:ii,blendSrcAlpha:sa,blendDstAlpha:Ks,blendEquationAlpha:ii}),this.blendMaterial=new Ft({uniforms:On.clone($c.uniforms),vertexShader:$c.vertexShader,fragmentShader:$c.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:jl,blendSrc:ra,blendDst:Ks,blendEquation:ii,blendSrcAlpha:sa,blendDstAlpha:Ks,blendEquationAlpha:ii}),this._fsQuad=new Pi(null),this._originalClearColor=new Pe,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget&&this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget&&this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){if(e!==void 0)this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1;else{if(this.normalRenderTarget===void 0){let i=new pi;i.format=mi,i.type=rs,this.normalRenderTarget=new Wt(this.width,this.height,{minFilter:Ut,magFilter:Ut,type:Qt,depthTexture:i})}this.depthTexture=this.normalRenderTarget.depthTexture,this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0}let n=this.normalTexture?1:0;this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.needsUpdate=!0,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.needsUpdate=!0,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&(e.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=e.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=kf(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,n){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case s.OUTPUT.Off:break;case s.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=fn,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case s.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=fn,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case s.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=fn,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case s.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case s.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalTexture||null,this.copyMaterial.blending=fn,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case s.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=fn,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,n,i,r){e.getClearColor(this._originalClearColor);let o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,i!=null&&(e.setClearColor(i),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_renderOverride(e,t,n,i,r){e.getClearColor(this._originalClearColor);let o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,i=t.clearColor||i,r=t.clearAlpha||r,i!=null&&(e.setClearColor(i),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(n){(n.isPoints||n.isLine||n.isLine2)&&n.visible&&(n.visible=!1,t.push(n))})}_restoreVisibility(){let e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){let t=new Qc,n=e*e*4,i=new Uint8Array(n);for(let o=0;o<e;o++)for(let a=0;a<e;a++){let l=o,c=a;i[(o*e+a)*4]=(t.noise(l,c)*.5+.5)*255,i[(o*e+a)*4+1]=(t.noise(l+e,c)*.5+.5)*255,i[(o*e+a)*4+2]=(t.noise(l,c+e)*.5+.5)*255,i[(o*e+a)*4+3]=(t.noise(l+e,c+e)*.5+.5)*255}let r=new qn(i,e,e,Tn,An);return r.wrapS=kn,r.wrapT=kn,r.needsUpdate=!0,r}};Ca.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};var Pa={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var eh=class extends Fn{constructor(){super(),this.isOutputPass=!0,this.uniforms=On.clone(Pa.uniforms),this.material=new Or({name:Pa.name,uniforms:this.uniforms,vertexShader:Pa.vertexShader,fragmentShader:Pa.fragmentShader}),this._fsQuad=new Pi(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ke.getTransfer(this._outputColorSpace)===ft&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===oa?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===aa?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===la?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ca?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===js?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===ua?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===ha&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Bm={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Pe(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var to=class s extends Fn{constructor(e,t=1,n,i){super(),this.strength=t,this.radius=n,this.threshold=i,this.resolution=e!==void 0?new pe(e.x,e.y):new pe(256,256),this.clearColor=new Pe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Wt(r,o,{type:Qt,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let f=new Wt(r,o,{type:Qt,depthBuffer:!1});f.texture.name="UnrealBloomPass.h"+h,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);let u=new Wt(r,o,{type:Qt,depthBuffer:!1});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),o=Math.round(o/2)}let a=Bm;this.highPassUniforms=On.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ft({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new pe(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new P(1,1,1),new P(1,1,1),new P(1,1,1),new P(1,1,1),new P(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=On.clone(Ci.uniforms),this.blendMaterial=new Ft({uniforms:this.copyUniforms,vertexShader:Ci.vertexShader,fragmentShader:Ci.fragmentShader,premultipliedAlpha:!0,blending:ia,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Pe,this._oldClearAlpha=1,this._basic=new hn,this._fsQuad=new Pi(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),i=Math.round(t/2);this.renderTargetBright.setSize(n,i);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,i),this.renderTargetsVertical[r].setSize(n,i),this.separableBlurMaterials[r].uniforms.invSize.value=new pe(1/n,1/i),n=Math.round(n/2),i=Math.round(i/2)}render(e,t,n,i,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=s.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=s.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let o=0;o<e;o++)t.push(.39894*Math.exp(-.5*o*o/(n*n))/n);let i=[],r=[];for(let o=1;o<e;o+=2){let a=t[o],l=o+1<e?t[o+1]:0,c=a+l;i.push((o*a+(o+1)*l)/c),r.push(c)}return new Ft({defines:{KERNEL_PAIRS:i.length},uniforms:{colorTexture:{value:null},invSize:{value:new pe(.5,.5)},direction:{value:new pe(.5,.5)},centerWeight:{value:t[0]},gaussianOffsets:{value:i},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new Ft({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};to.BlurDirectionX=new pe(1,0);to.BlurDirectionY=new pe(0,1);var tr=new Ys,Xt=new P,Ts=new P,Bt=new Rt,zm={X:new P(1,0,0),Y:new P(0,1,0),Z:new P(0,0,1)},Hf={type:"change"},km={type:"mouseDown",mode:null},Hm={type:"mouseUp",mode:null},Vm={type:"objectChange"},rh=class extends Zs{constructor(e,t=null){super(void 0,t);let n=new Gf(this);this._root=n;let i=new Wf;this._gizmo=i,n.add(i);let r=new Xf;this._plane=r,n.add(r);let o=this;function a(S,y){let M=y;Object.defineProperty(o,S,{get:function(){return M!==void 0?M:y},set:function(T){M!==T&&(M=T,r[S]=T,i[S]=T,o.dispatchEvent({type:S+"-changed",value:T}),o.dispatchEvent(Hf))}}),o[S]=y,r[S]=y,i[S]=y}a("camera",e),a("object",void 0),a("enabled",!0),a("axis",null),a("mode","translate"),a("translationSnap",null),a("rotationSnap",null),a("scaleSnap",null),a("space","world"),a("size",1),this.viewport=null,a("dragging",!1),a("showX",!0),a("showY",!0),a("showZ",!0),a("showXY",!0),a("showYZ",!0),a("showXZ",!0),a("showXYZE",!0),a("showE",!0),a("minX",-1/0),a("maxX",1/0),a("minY",-1/0),a("maxY",1/0),a("minZ",-1/0),a("maxZ",1/0);let l=new P,c=new P,h=new Rt,f=new Rt,u=new P,d=new Rt,g=new P,v=new P,p=new P,m=0,x=new P;a("worldPosition",l),a("worldPositionStart",c),a("worldQuaternion",h),a("worldQuaternionStart",f),a("cameraPosition",u),a("cameraQuaternion",d),a("pointStart",g),a("pointEnd",v),a("rotationAxis",p),a("rotationAngle",m),a("eye",x),this._offset=new P,this._startNorm=new P,this._endNorm=new P,this._cameraScale=new P,this._parentPosition=new P,this._parentQuaternion=new Rt,this._parentQuaternionInv=new Rt,this._parentScale=new P,this._worldScaleStart=new P,this._worldQuaternionInv=new Rt,this._worldScale=new P,this._positionStart=new P,this._quaternionStart=new Rt,this._scaleStart=new P,this._getPointer=dM.bind(this),this._onPointerDown=mM.bind(this),this._onPointerHover=pM.bind(this),this._onPointerMove=gM.bind(this),this._onPointerUp=_M.bind(this),t!==null&&this.connect(t)}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointermove",this._onPointerHover),this.domElement.addEventListener("pointerup",this._onPointerUp),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerHover),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.style.touchAction=""}getHelper(){return this._root}pointerHover(e){if(this.object===void 0||this.dragging===!0)return;e!==null&&tr.setFromCamera(e,this.camera);let t=Vf(this._gizmo.picker[this.mode],tr);t?this.axis=t.object.name:this.axis=null}pointerDown(e){if(!(this.object===void 0||this.dragging===!0||e!=null&&e.button!==0)&&this.axis!==null){e!==null&&tr.setFromCamera(e,this.camera);let t=Vf(this._plane,tr,!0);t&&(this.object.updateMatrixWorld(),this.object.parent.updateMatrixWorld(),this._positionStart.copy(this.object.position),this._quaternionStart.copy(this.object.quaternion),this._scaleStart.copy(this.object.scale),this.object.matrixWorld.decompose(this.worldPositionStart,this.worldQuaternionStart,this._worldScaleStart),this.pointStart.copy(t.point).sub(this.worldPositionStart)),this.dragging=!0,km.mode=this.mode,this.dispatchEvent(km)}}pointerMove(e){let t=this.axis,n=this.mode,i=this.object,r=this.space;if(n==="scale"?r="local":(t==="E"||t==="XYZE"||t==="XYZ")&&(r="world"),i===void 0||t===null||this.dragging===!1||e!==null&&e.button!==-1)return;e!==null&&tr.setFromCamera(e,this.camera);let o=Vf(this._plane,tr,!0);if(o){if(this.pointEnd.copy(o.point).sub(this.worldPositionStart),n==="translate")this._offset.copy(this.pointEnd).sub(this.pointStart),r==="local"&&t!=="XYZ"&&this._offset.applyQuaternion(this._worldQuaternionInv),t.indexOf("X")===-1&&(this._offset.x=0),t.indexOf("Y")===-1&&(this._offset.y=0),t.indexOf("Z")===-1&&(this._offset.z=0),r==="local"&&t!=="XYZ"?this._offset.applyQuaternion(this._quaternionStart).divide(this._parentScale):this._offset.applyQuaternion(this._parentQuaternionInv).divide(this._parentScale),i.position.copy(this._offset).add(this._positionStart),this.translationSnap&&(r==="local"&&(i.position.applyQuaternion(Bt.copy(this._quaternionStart).invert()),t.search("X")!==-1&&(i.position.x=Math.round(i.position.x/this.translationSnap)*this.translationSnap),t.search("Y")!==-1&&(i.position.y=Math.round(i.position.y/this.translationSnap)*this.translationSnap),t.search("Z")!==-1&&(i.position.z=Math.round(i.position.z/this.translationSnap)*this.translationSnap),i.position.applyQuaternion(this._quaternionStart)),r==="world"&&(i.getWorldPosition(Xt),t.search("X")!==-1&&(Xt.x=Math.round(Xt.x/this.translationSnap)*this.translationSnap),t.search("Y")!==-1&&(Xt.y=Math.round(Xt.y/this.translationSnap)*this.translationSnap),t.search("Z")!==-1&&(Xt.z=Math.round(Xt.z/this.translationSnap)*this.translationSnap),i.position.copy(i.parent.worldToLocal(Xt)))),i.position.x=Math.max(this.minX,Math.min(this.maxX,i.position.x)),i.position.y=Math.max(this.minY,Math.min(this.maxY,i.position.y)),i.position.z=Math.max(this.minZ,Math.min(this.maxZ,i.position.z));else if(n==="scale"){if(t.search("XYZ")!==-1){let a=this.pointEnd.length()/this.pointStart.length();this.pointEnd.dot(this.pointStart)<0&&(a*=-1),Ts.set(a,a,a)}else Xt.copy(this.pointStart),Ts.copy(this.pointEnd),Xt.applyQuaternion(this._worldQuaternionInv),Ts.applyQuaternion(this._worldQuaternionInv),Ts.divide(Xt),t.search("X")===-1&&(Ts.x=1),t.search("Y")===-1&&(Ts.y=1),t.search("Z")===-1&&(Ts.z=1);i.scale.copy(this._scaleStart).multiply(Ts),this.scaleSnap&&(t.search("X")!==-1&&(i.scale.x=Math.round(i.scale.x/this.scaleSnap)*this.scaleSnap||this.scaleSnap),t.search("Y")!==-1&&(i.scale.y=Math.round(i.scale.y/this.scaleSnap)*this.scaleSnap||this.scaleSnap),t.search("Z")!==-1&&(i.scale.z=Math.round(i.scale.z/this.scaleSnap)*this.scaleSnap||this.scaleSnap))}else if(n==="rotate"){this._offset.copy(this.pointEnd).sub(this.pointStart);let a=20/this.worldPosition.distanceTo(Xt.setFromMatrixPosition(this.camera.matrixWorld)),l=!1;t==="XYZE"?(this.rotationAxis.copy(this._offset).cross(this.eye).normalize(),this.rotationAngle=this._offset.dot(Xt.copy(this.rotationAxis).cross(this.eye))*a):(t==="X"||t==="Y"||t==="Z")&&(this.rotationAxis.copy(zm[t]),Xt.copy(zm[t]),r==="local"&&Xt.applyQuaternion(this.worldQuaternion),Xt.cross(this.eye),Xt.length()===0?l=!0:this.rotationAngle=this._offset.dot(Xt.normalize())*a),(t==="E"||l)&&(this.rotationAxis.copy(this.eye),this.rotationAngle=this.pointEnd.angleTo(this.pointStart),this._startNorm.copy(this.pointStart).normalize(),this._endNorm.copy(this.pointEnd).normalize(),this.rotationAngle*=this._endNorm.cross(this._startNorm).dot(this.eye)<0?1:-1),this.rotationSnap&&(this.rotationAngle=Math.round(this.rotationAngle/this.rotationSnap)*this.rotationSnap),r==="local"&&t!=="E"&&t!=="XYZE"?(i.quaternion.copy(this._quaternionStart),i.quaternion.multiply(Bt.setFromAxisAngle(this.rotationAxis,this.rotationAngle)).normalize()):(this.rotationAxis.applyQuaternion(this._parentQuaternionInv),i.quaternion.copy(Bt.setFromAxisAngle(this.rotationAxis,this.rotationAngle)),i.quaternion.multiply(this._quaternionStart).normalize())}this.dispatchEvent(Hf),this.dispatchEvent(Vm)}}pointerUp(e){e!==null&&e.button!==0||(this.dragging&&this.axis!==null&&(Hm.mode=this.mode,this.dispatchEvent(Hm)),this.dragging=!1,this.axis=null)}dispose(){this.disconnect(),this._root.dispose()}attach(e){return this.object=e,this._root.visible=!0,this}detach(){return this.object=void 0,this.axis=null,this._root.visible=!1,this}reset(){this.enabled&&this.dragging&&(this.object.position.copy(this._positionStart),this.object.quaternion.copy(this._quaternionStart),this.object.scale.copy(this._scaleStart),this.dispatchEvent(Hf),this.dispatchEvent(Vm),this.pointStart.copy(this.pointEnd))}getRaycaster(){return tr}getMode(){return this.mode}setMode(e){this.mode=e}setTranslationSnap(e){this.translationSnap=e}setRotationSnap(e){this.rotationSnap=e}setScaleSnap(e){this.scaleSnap=e}setSize(e){this.size=e}setSpace(e){this.space=e}setColors(e,t,n,i){let r=this._gizmo.materialLib;r.xAxis.color.set(e),r.yAxis.color.set(t),r.zAxis.color.set(n),r.active.color.set(i),r.xAxisTransparent.color.set(e),r.yAxisTransparent.color.set(t),r.zAxisTransparent.color.set(n),r.activeTransparent.color.set(i),r.xAxis._color&&r.xAxis._color.set(e),r.yAxis._color&&r.yAxis._color.set(t),r.zAxis._color&&r.zAxis._color.set(n),r.active._color&&r.active._color.set(i),r.xAxisTransparent._color&&r.xAxisTransparent._color.set(e),r.yAxisTransparent._color&&r.yAxisTransparent._color.set(t),r.zAxisTransparent._color&&r.zAxisTransparent._color.set(n),r.activeTransparent._color&&r.activeTransparent._color.set(i)}};function dM(s){if(this.domElement.ownerDocument.pointerLockElement)return{x:0,y:0,button:s.button};{let e=this.domElement.getBoundingClientRect(),t=this.viewport,n,i,r,o;return t!==null?(n=t.x,i=e.height-t.y-t.w,r=t.z,o=t.w):(n=0,i=0,r=e.width,o=e.height),{x:(s.clientX-e.left-n)/r*2-1,y:-(s.clientY-e.top-i)/o*2+1,button:s.button}}}function pM(s){if(this.enabled)switch(s.pointerType){case"mouse":case"pen":this.pointerHover(this._getPointer(s));break}}function mM(s){this.enabled&&(document.pointerLockElement||this.domElement.setPointerCapture(s.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.pointerHover(this._getPointer(s)),this.pointerDown(this._getPointer(s)))}function gM(s){this.enabled&&this.pointerMove(this._getPointer(s))}function _M(s){this.enabled&&(this.domElement.releasePointerCapture(s.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.pointerUp(this._getPointer(s)))}function Vf(s,e,t){let n=e.intersectObject(s,!0);for(let i=0;i<n.length;i++)if(n[i].object.visible||t)return n[i];return!1}var th=new ei,Ct=new P(0,1,0),Gm=new P(0,0,0),Wm=new Te,nh=new Rt,sh=new Rt,Ii=new P,oh=new Te,Da=new P(1,0,0),nr=new P(0,1,0),Na=new P(0,0,1),ih=new P,Ia=new P,La=new P,Gf=class extends dt{constructor(e){super(),this.isTransformControlsRoot=!0,this.controls=e,this.visible=!1}updateMatrixWorld(e){let t=this.controls;t.object!==void 0&&(t.object.updateMatrixWorld(),t.object.parent===null?console.error("TransformControls: The attached 3D object must be a part of the scene graph."):t.object.parent.matrixWorld.decompose(t._parentPosition,t._parentQuaternion,t._parentScale),t.object.matrixWorld.decompose(t.worldPosition,t.worldQuaternion,t._worldScale),t._parentQuaternionInv.copy(t._parentQuaternion).invert(),t._worldQuaternionInv.copy(t.worldQuaternion).invert()),t.camera.updateMatrixWorld(),t.camera.matrixWorld.decompose(t.cameraPosition,t.cameraQuaternion,t._cameraScale),t.camera.isOrthographicCamera?t.camera.getWorldDirection(t.eye).negate():t.eye.copy(t.cameraPosition).sub(t.worldPosition).normalize(),this.parent&&(oh.copy(this.parent.matrixWorld).invert(),oh.decompose(this.position,this.quaternion,this.scale)),super.updateMatrixWorld(e)}dispose(){this.traverse(function(e){e.geometry&&e.geometry.dispose(),e.material&&e.material.dispose()})}},Wf=class extends dt{constructor(){super(),this.isTransformControlsGizmo=!0,this.type="TransformControlsGizmo";let e=new hn({depthTest:!1,depthWrite:!1,fog:!1,toneMapped:!1,transparent:!0}),t=new Zi({depthTest:!1,depthWrite:!1,fog:!1,toneMapped:!1,transparent:!0}),n=e.clone();n.opacity=.15;let i=t.clone();i.opacity=.5;let r=e.clone();r.color.setHex(16711680);let o=e.clone();o.color.setHex(65280);let a=e.clone();a.color.setHex(255);let l=e.clone();l.color.setHex(16711680),l.opacity=.5;let c=e.clone();c.color.setHex(65280),c.opacity=.5;let h=e.clone();h.color.setHex(255),h.opacity=.5;let f=e.clone();f.opacity=.25;let u=e.clone();u.color.setHex(16776960),u.opacity=.25;let d=e.clone();d.color.setHex(16776960);let g=e.clone();g.color.setHex(7895160),this.materialLib={xAxis:r,yAxis:o,zAxis:a,active:d,xAxisTransparent:l,yAxisTransparent:c,zAxisTransparent:h,activeTransparent:u};let v=new un(0,.04,.1,12);v.translate(0,.05,0);let p=new Ot(.08,.08,.08);p.translate(0,.04,0);let m=new bt;m.setAttribute("position",new ut([0,0,0,1,0,0],3));let x=new un(.0075,.0075,.5,3);x.translate(0,.25,0);function S(B,H){let G=new Ji(B,.0075,3,64,H*Math.PI*2);return G.rotateY(Math.PI/2),G.rotateX(Math.PI/2),G}function y(){let B=new bt;return B.setAttribute("position",new ut([0,0,0,1,1,1],3)),B}let M={X:[[new le(v,r),[.5,0,0],[0,0,-Math.PI/2]],[new le(v,r),[-.5,0,0],[0,0,Math.PI/2]],[new le(x,r),[0,0,0],[0,0,-Math.PI/2]]],Y:[[new le(v,o),[0,.5,0]],[new le(v,o),[0,-.5,0],[Math.PI,0,0]],[new le(x,o)]],Z:[[new le(v,a),[0,0,.5],[Math.PI/2,0,0]],[new le(v,a),[0,0,-.5],[-Math.PI/2,0,0]],[new le(x,a),null,[Math.PI/2,0,0]]],XYZ:[[new le(new xs(.1,0),f),[0,0,0]]],XY:[[new le(new Ot(.15,.15,.01),h),[.15,.15,0]]],YZ:[[new le(new Ot(.15,.15,.01),l),[0,.15,.15],[0,Math.PI/2,0]]],XZ:[[new le(new Ot(.15,.15,.01),c),[.15,0,.15],[-Math.PI/2,0,0]]]},T={X:[[new le(new un(.2,0,.6,4),n),[.3,0,0],[0,0,-Math.PI/2]],[new le(new un(.2,0,.6,4),n),[-.3,0,0],[0,0,Math.PI/2]]],Y:[[new le(new un(.2,0,.6,4),n),[0,.3,0]],[new le(new un(.2,0,.6,4),n),[0,-.3,0],[0,0,Math.PI]]],Z:[[new le(new un(.2,0,.6,4),n),[0,0,.3],[Math.PI/2,0,0]],[new le(new un(.2,0,.6,4),n),[0,0,-.3],[-Math.PI/2,0,0]]],XYZ:[[new le(new xs(.2,0),n)]],XY:[[new le(new Ot(.2,.2,.01),n),[.15,.15,0]]],YZ:[[new le(new Ot(.2,.2,.01),n),[0,.15,.15],[0,Math.PI/2,0]]],XZ:[[new le(new Ot(.2,.2,.01),n),[.15,0,.15],[-Math.PI/2,0,0]]]},_={START:[[new le(new xs(.01,2),i),null,null,null,"helper"]],END:[[new le(new xs(.01,2),i),null,null,null,"helper"]],DELTA:[[new nn(y(),i),null,null,null,"helper"]],X:[[new nn(m,i),[-1e3,0,0],null,[1e6,1,1],"helper"]],Y:[[new nn(m,i),[0,-1e3,0],[0,0,Math.PI/2],[1e6,1,1],"helper"]],Z:[[new nn(m,i),[0,0,-1e3],[0,-Math.PI/2,0],[1e6,1,1],"helper"]]},b={XYZE:[[new le(S(.5,1),g),null,[0,Math.PI/2,0]]],X:[[new le(S(.5,.5),r)]],Y:[[new le(S(.5,.5),o),null,[0,0,-Math.PI/2]]],Z:[[new le(S(.5,.5),a),null,[0,Math.PI/2,0]]],E:[[new le(S(.75,1),u),null,[0,Math.PI/2,0]]]},R={AXIS:[[new nn(m,i),[-1e3,0,0],null,[1e6,1,1],"helper"]]},w={XYZE:[[new le(new Wo(.25,10,8),n)]],X:[[new le(new Ji(.5,.1,4,24),n),[0,0,0],[0,-Math.PI/2,-Math.PI/2]]],Y:[[new le(new Ji(.5,.1,4,24),n),[0,0,0],[Math.PI/2,0,0]]],Z:[[new le(new Ji(.5,.1,4,24),n),[0,0,0],[0,0,-Math.PI/2]]],E:[[new le(new Ji(.75,.1,2,24),n)]]},C={X:[[new le(p,r),[.5,0,0],[0,0,-Math.PI/2]],[new le(x,r),[0,0,0],[0,0,-Math.PI/2]],[new le(p,r),[-.5,0,0],[0,0,Math.PI/2]]],Y:[[new le(p,o),[0,.5,0]],[new le(x,o)],[new le(p,o),[0,-.5,0],[0,0,Math.PI]]],Z:[[new le(p,a),[0,0,.5],[Math.PI/2,0,0]],[new le(x,a),[0,0,0],[Math.PI/2,0,0]],[new le(p,a),[0,0,-.5],[-Math.PI/2,0,0]]],XY:[[new le(new Ot(.15,.15,.01),h),[.15,.15,0]]],YZ:[[new le(new Ot(.15,.15,.01),l),[0,.15,.15],[0,Math.PI/2,0]]],XZ:[[new le(new Ot(.15,.15,.01),c),[.15,0,.15],[-Math.PI/2,0,0]]],XYZ:[[new le(new Ot(.1,.1,.1),f)]]},I={X:[[new le(new un(.2,0,.6,4),n),[.3,0,0],[0,0,-Math.PI/2]],[new le(new un(.2,0,.6,4),n),[-.3,0,0],[0,0,Math.PI/2]]],Y:[[new le(new un(.2,0,.6,4),n),[0,.3,0]],[new le(new un(.2,0,.6,4),n),[0,-.3,0],[0,0,Math.PI]]],Z:[[new le(new un(.2,0,.6,4),n),[0,0,.3],[Math.PI/2,0,0]],[new le(new un(.2,0,.6,4),n),[0,0,-.3],[-Math.PI/2,0,0]]],XY:[[new le(new Ot(.2,.2,.01),n),[.15,.15,0]]],YZ:[[new le(new Ot(.2,.2,.01),n),[0,.15,.15],[0,Math.PI/2,0]]],XZ:[[new le(new Ot(.2,.2,.01),n),[.15,0,.15],[-Math.PI/2,0,0]]],XYZ:[[new le(new Ot(.2,.2,.2),n),[0,0,0]]]},U={X:[[new nn(m,i),[-1e3,0,0],null,[1e6,1,1],"helper"]],Y:[[new nn(m,i),[0,-1e3,0],[0,0,Math.PI/2],[1e6,1,1],"helper"]],Z:[[new nn(m,i),[0,0,-1e3],[0,-Math.PI/2,0],[1e6,1,1],"helper"]]};function D(B){let H=new dt;for(let G in B)for(let ee=B[G].length;ee--;){let V=B[G][ee][0].clone(),Q=B[G][ee][1],ne=B[G][ee][2],de=B[G][ee][3],we=B[G][ee][4];V.name=G,V.tag=we,Q&&V.position.set(Q[0],Q[1],Q[2]),ne&&V.rotation.set(ne[0],ne[1],ne[2]),de&&V.scale.set(de[0],de[1],de[2]),V.updateMatrix();let $=V.geometry.clone();$.applyMatrix4(V.matrix),V.geometry=$,V.renderOrder=1/0,V.position.set(0,0,0),V.rotation.set(0,0,0),V.scale.set(1,1,1),H.add(V)}return H}this.gizmo={},this.picker={},this.helper={},this.add(this.gizmo.translate=D(M)),this.add(this.gizmo.rotate=D(b)),this.add(this.gizmo.scale=D(C)),this.add(this.picker.translate=D(T)),this.add(this.picker.rotate=D(w)),this.add(this.picker.scale=D(I)),this.add(this.helper.translate=D(_)),this.add(this.helper.rotate=D(R)),this.add(this.helper.scale=D(U)),this.picker.translate.visible=!1,this.picker.rotate.visible=!1,this.picker.scale.visible=!1}updateMatrixWorld(e){let n=(this.mode==="scale"?"local":this.space)==="local"?this.worldQuaternion:sh;this.gizmo.translate.visible=this.mode==="translate",this.gizmo.rotate.visible=this.mode==="rotate",this.gizmo.scale.visible=this.mode==="scale",this.helper.translate.visible=this.mode==="translate",this.helper.rotate.visible=this.mode==="rotate",this.helper.scale.visible=this.mode==="scale";let i=[];i=i.concat(this.picker[this.mode].children),i=i.concat(this.gizmo[this.mode].children),i=i.concat(this.helper[this.mode].children);for(let r=0;r<i.length;r++){let o=i[r];o.visible=!0,o.rotation.set(0,0,0),o.position.copy(this.worldPosition);let a;if(this.camera.isOrthographicCamera?a=(this.camera.top-this.camera.bottom)/this.camera.zoom:a=this.worldPosition.distanceTo(this.cameraPosition)*Math.min(1.9*Math.tan(Math.PI*this.camera.fov/360)/this.camera.zoom,7),o.scale.set(1,1,1).multiplyScalar(a*this.size/4),o.tag==="helper"){o.visible=!1,o.name==="AXIS"?(o.visible=!!this.axis,this.axis==="X"&&(Bt.setFromEuler(th.set(0,0,0)),o.quaternion.copy(n).multiply(Bt),Math.abs(Ct.copy(Da).applyQuaternion(n).dot(this.eye))>.9&&(o.visible=!1)),this.axis==="Y"&&(Bt.setFromEuler(th.set(0,0,Math.PI/2)),o.quaternion.copy(n).multiply(Bt),Math.abs(Ct.copy(nr).applyQuaternion(n).dot(this.eye))>.9&&(o.visible=!1)),this.axis==="Z"&&(Bt.setFromEuler(th.set(0,Math.PI/2,0)),o.quaternion.copy(n).multiply(Bt),Math.abs(Ct.copy(Na).applyQuaternion(n).dot(this.eye))>.9&&(o.visible=!1)),this.axis==="XYZE"&&(Bt.setFromEuler(th.set(0,Math.PI/2,0)),Ct.copy(this.rotationAxis),o.quaternion.setFromRotationMatrix(Wm.lookAt(Gm,Ct,nr)),o.quaternion.multiply(Bt),o.visible=this.dragging),this.axis==="E"&&(o.visible=!1)):o.name==="START"?(o.position.copy(this.worldPositionStart),o.visible=this.dragging):o.name==="END"?(o.position.copy(this.worldPosition),o.visible=this.dragging):o.name==="DELTA"?(o.position.copy(this.worldPositionStart),o.quaternion.copy(this.worldQuaternionStart),Xt.set(1e-10,1e-10,1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(-1),Xt.applyQuaternion(this.worldQuaternionStart.clone().invert()),o.scale.copy(Xt),o.visible=this.dragging):(o.quaternion.copy(n),this.dragging?o.position.copy(this.worldPositionStart):o.position.copy(this.worldPosition),this.axis&&(o.visible=this.axis.search(o.name)!==-1));continue}o.quaternion.copy(n),this.mode==="translate"||this.mode==="scale"?(o.name==="X"&&Math.abs(Ct.copy(Da).applyQuaternion(n).dot(this.eye))>.99&&(o.scale.set(1e-10,1e-10,1e-10),o.visible=!1),o.name==="Y"&&Math.abs(Ct.copy(nr).applyQuaternion(n).dot(this.eye))>.99&&(o.scale.set(1e-10,1e-10,1e-10),o.visible=!1),o.name==="Z"&&Math.abs(Ct.copy(Na).applyQuaternion(n).dot(this.eye))>.99&&(o.scale.set(1e-10,1e-10,1e-10),o.visible=!1),o.name==="XY"&&Math.abs(Ct.copy(Na).applyQuaternion(n).dot(this.eye))<.2&&(o.scale.set(1e-10,1e-10,1e-10),o.visible=!1),o.name==="YZ"&&Math.abs(Ct.copy(Da).applyQuaternion(n).dot(this.eye))<.2&&(o.scale.set(1e-10,1e-10,1e-10),o.visible=!1),o.name==="XZ"&&Math.abs(Ct.copy(nr).applyQuaternion(n).dot(this.eye))<.2&&(o.scale.set(1e-10,1e-10,1e-10),o.visible=!1)):this.mode==="rotate"&&(nh.copy(n),Ct.copy(this.eye).applyQuaternion(Bt.copy(n).invert()),o.name.search("E")!==-1&&o.quaternion.setFromRotationMatrix(Wm.lookAt(this.eye,Gm,nr)),o.name==="X"&&(Bt.setFromAxisAngle(Da,Math.atan2(-Ct.y,Ct.z)),Bt.multiplyQuaternions(nh,Bt),o.quaternion.copy(Bt)),o.name==="Y"&&(Bt.setFromAxisAngle(nr,Math.atan2(Ct.x,Ct.z)),Bt.multiplyQuaternions(nh,Bt),o.quaternion.copy(Bt)),o.name==="Z"&&(Bt.setFromAxisAngle(Na,Math.atan2(Ct.y,Ct.x)),Bt.multiplyQuaternions(nh,Bt),o.quaternion.copy(Bt))),o.visible=o.visible&&(o.name.indexOf("X")===-1||this.showX),o.visible=o.visible&&(o.name.indexOf("Y")===-1||this.showY),o.visible=o.visible&&(o.name.indexOf("Z")===-1||this.showZ),o.visible=o.visible&&(o.name.indexOf("E")===-1||this.showX&&this.showY&&this.showZ),o.visible=o.visible&&(o.name.indexOf("XY")===-1||this.showXY),o.visible=o.visible&&(o.name.indexOf("YZ")===-1||this.showYZ),o.visible=o.visible&&(o.name.indexOf("XZ")===-1||this.showXZ),o.visible=o.visible&&(o.name!=="E"||this.showE),o.visible=o.visible&&(o.name!=="XYZE"||this.showXYZE),o.material._color=o.material._color||o.material.color.clone(),o.material._opacity=o.material._opacity||o.material.opacity,o.material.color.copy(o.material._color),o.material.opacity=o.material._opacity,this.enabled&&this.axis&&(o.name===this.axis?(o.material.color.copy(this.materialLib.active.color),o.material.opacity=1):this.axis.split("").some(function(l){return o.name===l})&&(o.material.color.copy(this.materialLib.active.color),o.material.opacity=1))}super.updateMatrixWorld(e)}},Xf=class extends le{constructor(){super(new ji(1e5,1e5,2,2),new hn({visible:!1,wireframe:!0,side:En,transparent:!0,opacity:.1,toneMapped:!1})),this.isTransformControlsPlane=!0,this.type="TransformControlsPlane"}updateMatrixWorld(e){let t=this.space;switch(this.position.copy(this.worldPosition),this.mode==="scale"&&(t="local"),ih.copy(Da).applyQuaternion(t==="local"?this.worldQuaternion:sh),Ia.copy(nr).applyQuaternion(t==="local"?this.worldQuaternion:sh),La.copy(Na).applyQuaternion(t==="local"?this.worldQuaternion:sh),Ct.copy(Ia),this.mode){case"translate":case"scale":switch(this.axis){case"X":Ct.copy(this.eye).cross(ih),Ii.copy(ih).cross(Ct);break;case"Y":Ct.copy(this.eye).cross(Ia),Ii.copy(Ia).cross(Ct);break;case"Z":Ct.copy(this.eye).cross(La),Ii.copy(La).cross(Ct);break;case"XY":Ii.copy(La);break;case"YZ":Ii.copy(ih);break;case"XZ":Ct.copy(La),Ii.copy(Ia);break;case"XYZ":case"E":Ii.set(0,0,0);break}break;default:Ii.set(0,0,0)}Ii.length()===0?this.quaternion.copy(this.cameraQuaternion):(oh.lookAt(Xt.set(0,0,0),Ii,Ct),this.quaternion.setFromRotationMatrix(oh)),super.updateMatrixWorld(e)}};var no=Math.pow(2,-24),Ua=Symbol("SKIP_GENERATION"),ah={strategy:0,maxDepth:40,targetLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[Ua]:!1};function Pt(s,e,t){return t.min.x=e[s],t.min.y=e[s+1],t.min.z=e[s+2],t.max.x=e[s+3],t.max.y=e[s+4],t.max.z=e[s+5],t}function Oa(s){let e=-1,t=-1/0;for(let n=0;n<3;n++){let i=s[n+3]-s[n];i>t&&(t=i,e=n)}return e}function qf(s,e,t){for(let n=0;n<3;n++){let i=e[s+2*n],r=e[s+2*n+1],o=i-r,a=i+r;o<t[n]&&(t[n]=o),a>t[n+3]&&(t[n+3]=a)}}function lh(s){let e=s[3]-s[0],t=s[4]-s[1],n=s[5]-s[2];return 2*(e*t+t*n+n*e)}function at(s,e){return e[s+15]===65535}function yt(s,e){return e[s+6]}function Tt(s,e){return e[s+14]}function _t(s){return s+8}function xt(s,e){let t=e[s+6];return s+t*8}function io(s,e){return e[s+7]}function ch(s,e,t,n,i){let r=1/0,o=1/0,a=1/0,l=-1/0,c=-1/0,h=-1/0,f=1/0,u=1/0,d=1/0,g=-1/0,v=-1/0,p=-1/0,m=s.offset||0;for(let x=(e-m)*6,S=(e+t-m)*6;x<S;x+=6){let y=s[x+0],M=s[x+1],T=y-M,_=y+M;T<r&&(r=T),_>l&&(l=_),y<f&&(f=y),y>g&&(g=y);let b=s[x+2],R=s[x+3],w=b-R,C=b+R;w<o&&(o=w),C>c&&(c=C),b<u&&(u=b),b>v&&(v=b);let I=s[x+4],U=s[x+5],D=I-U,B=I+U;D<a&&(a=D),B>h&&(h=B),I<d&&(d=I),I>p&&(p=I)}n[0]=r,n[1]=o,n[2]=a,n[3]=l,n[4]=c,n[5]=h,i[0]=f,i[1]=u,i[2]=d,i[3]=g,i[4]=v,i[5]=p}var Di=8,Zf=8,Yf=new Int32Array(Di),Li=new Float32Array(Di*6),so=new Float32Array(Di*6),gi=new Float32Array(6),hh=new Float32Array(6),ws=new Int32Array(Zf),qm=new Float32Array(Zf*6);function vM(s,e,t,n){for(let i=0;i<3;i++){let r=e[s+2*i],o=e[s+2*i+1],a=r-o,l=r+o;a<t[n+i]&&(t[n+i]=a),l>t[n+i+3]&&(t[n+i+3]=l)}}function Ym(s,e){let t=s[e+3]-s[e],n=s[e+4]-s[e+1],i=s[e+5]-s[e+2];return 2*(t*n+n*i+i*t)}function Zm(s,e,t,n,i,r){let o=-1,a=0;if(r===0)o=Oa(e),o!==-1&&(a=(e[o]+e[o+3])/2);else if(r===1)o=Oa(s),o!==-1&&(a=SM(t,n,i,o));else if(r===2){let l=lh(s),c=1.25*i,h=t.offset||0,f=(n-h)*6,u=(n+i-h)*6;for(let d=0;d<3;d++){let g=e[d],m=(e[d+3]-g)/Di;if(i<Zf){for(let x=0;x<i;x++){let S=f+x*6,y=t[S+2*d],M=x;for(;M>0&&t[ws[M-1]+2*d]>y;)ws[M]=ws[M-1],M--;ws[M]=S}for(let x=0;x<3;x++)gi[x]=1/0,gi[x+3]=-1/0,hh[x]=1/0,hh[x+3]=-1/0;for(let x=i-1;x>=0;x--)qf(ws[x],t,hh),qm.set(hh,x*6);for(let x=0;x<i-1;x++){qf(ws[x],t,gi);let S=t[ws[x+1]+2*d];if(t[ws[x]+2*d]===S)continue;let y=x+1,M=i-y,T=lh(gi)/l,_=Ym(qm,y*6)/l,b=1+1.25*(T*y+_*M);b<c&&(o=d,c=b,a=S)}}else{for(let y=0;y<Di;y++){Yf[y]=0;for(let M=0;M<3;M++)Li[y*6+M]=1/0,Li[y*6+M+3]=-1/0}for(let y=f;y<u;y+=6){let _=~~((t[y+2*d]-g)/m);_>=Di&&(_=Di-1),Yf[_]++,vM(y,t,Li,_*6)}let x=(Di-1)*6;for(let y=0;y<6;y++)so[x+y]=Li[x+y];for(let y=Di-2;y>=0;y--){let M=y*6,T=M+6;for(let _=0;_<3;_++)so[M+_]=Math.min(Li[M+_],so[T+_]),so[M+_+3]=Math.max(Li[M+_+3],so[T+_+3])}let S=0;for(let y=0;y<Di-1;y++){let M=y*6,T=Yf[y];if(T!==0)for(let C=0;C<3;C++)S===0?(gi[C]=Li[M+C],gi[C+3]=Li[M+C+3]):(gi[C]=Math.min(gi[C],Li[M+C]),gi[C+3]=Math.max(gi[C+3],Li[M+C+3]));S+=T;let _=0,b=0;S!==0&&(_=lh(gi)/l);let R=i-S;R!==0&&(b=Ym(so,M+6)/l);let w=1+1.25*(_*S+b*R);w<c&&(o=d,c=w,a=g+m+y*m)}}}}else console.warn(`BVH: Invalid build strategy value ${r} used.`);return{axis:o,pos:a}}function SM(s,e,t,n){let i=0,r=s.offset;for(let o=e,a=e+t;o<a;o++)i+=s[(o-r)*6+n*2];return i/t}function Km(s,e,t,n,i,r){let o=n,a=n+i-1,l=r.pos,c=r.axis*2,h=t.offset||0;for(;;){for(;o<=a&&t[(o-h)*6+c]<l;)o++;for(;o<=a&&t[(a-h)*6+c]>=l;)a--;if(o<a){for(let f=0;f<e;f++){let u=s[o*e+f];s[o*e+f]=s[a*e+f],s[a*e+f]=u}for(let f=0;f<6;f++){let u=o-h,d=a-h,g=t[u*6+f];t[u*6+f]=t[d*6+f],t[d*6+f]=g}o++,a--}else return o}}var MM=Math.pow(2,32),ro=new Float32Array(6),uh=new Float32Array(6);function bM(s,e,t,n,i,r){let{maxDepth:o,verbose:a,targetLeafSize:l,_strictLeafSize:c=1/0,strategy:h,onProgress:f,useSharedArrayBuffer:u=!1}=i,d=s.primitiveBuffer,g=s.primitiveBufferStride,v=u?SharedArrayBuffer:ArrayBuffer,p=new v(32*Math.max(1,2*Math.ceil(n)-1)),m=new Float32Array(p),x=new Uint32Array(p),S=new Uint16Array(p),y=0,M=!1;return ch(e,t,n,ro,uh),b(t,n,0),p.slice(0,y*32);function T(R){f&&f((R-r.offset)/r.count)}function _(R,w,C){let I=R*2;x[R+6]=w,S[I+14]=C,S[I+15]=65535,T(w+C)}function b(R,w,C){let I=y++,U=I*8;m.set(ro,U),!M&&C>=o&&(M=!0,a&&console.warn(`BVH: Max depth of ${o} reached when generating BVH. Consider increasing maxDepth.`));let D=w>c;if(w<=l&&!D||C>=o){_(U,R,w);return}let B=Zm(ro,uh,e,R,w,h),H=B.axis===-1?-1:Km(d,g,e,R,w,B);if(B.axis===-1||H===R||H===R+w){if(!D){_(U,R,w);return}B.axis=Math.max(0,Oa(ro)),H=R+Math.max(1,Math.floor(w/2))}x[U+7]=B.axis;let G=H-R;ch(e,R,G,ro,uh),b(R,G,C+1);let ee=y-I;if(ee>MM)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");x[U+6]=ee;let V=w-G;ch(e,H,V,ro,uh),b(H,V,C+1)}}function jm(s,e){let t=s.getRootRanges(e.range),n=t[0],i=t[t.length-1],r={offset:n.offset,count:i.offset+i.count-n.offset},o=new Float32Array(6*r.count);o.offset=r.offset,s.computePrimitiveBounds(r.offset,r.count,o),s._roots=t.map(a=>bM(s,o,a.offset,a.count,e,r))}var Es=class{constructor(e){this._getNewPrimitive=e,this._primitives=[]}getPrimitive(){let e=this._primitives;return e.length===0?this._getNewPrimitive():e.pop()}releasePrimitive(e){this._primitives.push(e)}};var Kf=class{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;let e=[],t=null;this.setBuffer=n=>{t&&e.push(t),t=n,this.float32Array=new Float32Array(n),this.uint16Array=new Uint16Array(n),this.uint32Array=new Uint32Array(n)},this.clearBuffer=()=>{t=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,e.length!==0&&this.setBuffer(e.pop())}}},Qe=new Kf;var As,ao,oo=[],fh=new Es(()=>new it);function Jm(s,e,t,n,i,r){As=fh.getPrimitive(),ao=fh.getPrimitive(),oo.push(As,ao),Qe.setBuffer(s._roots[e]);let o=jf(0,s.geometry,t,n,i,r);Qe.clearBuffer(),fh.releasePrimitive(As),fh.releasePrimitive(ao),oo.pop(),oo.pop();let a=oo.length;return a>0&&(ao=oo[a-1],As=oo[a-2]),o}function jf(s,e,t,n,i=null,r=0,o=0){let{float32Array:a,uint16Array:l,uint32Array:c}=Qe,h=s*2;if(at(h,l)){let u=yt(s,c),d=Tt(h,l);return Pt(s,a,As),n(u,d,!1,o,r+s/8,As)}else{let w=function(I){let{uint16Array:U,uint32Array:D}=Qe,B=I*2;for(;!at(B,U);)I=_t(I),B=I*2;return yt(I,D)},C=function(I){let{uint16Array:U,uint32Array:D}=Qe,B=I*2;for(;!at(B,U);)I=xt(I,D),B=I*2;return yt(I,D)+Tt(B,U)},u=_t(s),d=xt(s,c),g=u,v=d,p,m,x,S;if(i&&(x=As,S=ao,Pt(g,a,x),Pt(v,a,S),p=i(x),m=i(S),m<p)){g=d,v=u;let I=p;p=m,m=I,x=S}x||(x=As,Pt(g,a,x));let y=at(g*2,l),M=t(x,y,p,o+1,r+g/8),T;if(M===2){let I=w(g),D=C(g)-I;T=n(I,D,!0,o+1,r+g/8,x)}else T=M&&jf(g,e,t,n,i,r,o+1);if(T)return!0;S=ao,Pt(v,a,S);let _=at(v*2,l),b=t(S,_,m,o+1,r+v/8),R;if(b===2){let I=w(v),D=C(v)-I;R=n(I,D,!0,o+1,r+v/8,S)}else R=b&&jf(v,e,t,n,i,r,o+1);return!!R}}var Fa=new Qe.constructor,dh=new Qe.constructor,Rs=new Es(()=>new it),lo=new it,co=new it,$f=new it,Qf=new it,ed=!1;function $m(s,e,t,n){if(ed)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");ed=!0;let i=s._roots,r=e._roots,o,a=0,l=0,c=new Te().copy(t).invert();for(let h=0,f=i.length;h<f;h++){Fa.setBuffer(i[h]),l=0;let u=Rs.getPrimitive();Pt(0,Fa.float32Array,u),u.applyMatrix4(c);for(let d=0,g=r.length;d<g&&(dh.setBuffer(r[d]),o=_i(0,0,t,c,n,a,l,0,0,u),dh.clearBuffer(),l+=r[d].byteLength/32,!o);d++);if(Rs.releasePrimitive(u),Fa.clearBuffer(),a+=i[h].byteLength/32,o)break}return ed=!1,o}function _i(s,e,t,n,i,r=0,o=0,a=0,l=0,c=null,h=!1){let f,u;h?(f=dh,u=Fa):(f=Fa,u=dh);let d=f.float32Array,g=f.uint32Array,v=f.uint16Array,p=u.float32Array,m=u.uint32Array,x=u.uint16Array,S=s*2,y=e*2,M=at(S,v),T=at(y,x),_=!1;if(T&&M)h?_=i(yt(e,m),Tt(e*2,x),yt(s,g),Tt(s*2,v),l,o+e/8,a,r+s/8):_=i(yt(s,g),Tt(s*2,v),yt(e,m),Tt(e*2,x),a,r+s/8,l,o+e/8);else if(T){let b=Rs.getPrimitive();Pt(e,p,b),b.applyMatrix4(t);let R=_t(s),w=xt(s,g);Pt(R,d,lo),Pt(w,d,co);let C=b.intersectsBox(lo),I=b.intersectsBox(co);_=C&&_i(e,R,n,t,i,o,r,l,a+1,b,!h)||I&&_i(e,w,n,t,i,o,r,l,a+1,b,!h),Rs.releasePrimitive(b)}else{let b=_t(e),R=xt(e,m);Pt(b,p,$f),Pt(R,p,Qf);let w=c.intersectsBox($f),C=c.intersectsBox(Qf);if(w&&C)_=_i(s,b,t,n,i,r,o,a,l+1,c,h)||_i(s,R,t,n,i,r,o,a,l+1,c,h);else if(w)if(M)_=_i(s,b,t,n,i,r,o,a,l+1,c,h);else{let I=Rs.getPrimitive();I.copy($f).applyMatrix4(t);let U=_t(s),D=xt(s,g);Pt(U,d,lo),Pt(D,d,co);let B=I.intersectsBox(lo),H=I.intersectsBox(co);_=B&&_i(b,U,n,t,i,o,r,l,a+1,I,!h)||H&&_i(b,D,n,t,i,o,r,l,a+1,I,!h),Rs.releasePrimitive(I)}else if(C)if(M)_=_i(s,R,t,n,i,r,o,a,l+1,c,h);else{let I=Rs.getPrimitive();I.copy(Qf).applyMatrix4(t);let U=_t(s),D=xt(s,g);Pt(U,d,lo),Pt(D,d,co);let B=I.intersectsBox(lo),H=I.intersectsBox(co);_=B&&_i(R,U,n,t,i,o,r,l,a+1,I,!h)||H&&_i(R,D,n,t,i,o,r,l,a+1,I,!h),Rs.releasePrimitive(I)}}return _}var ph=new class{constructor(){let s=null,e=null,t=null,n=!1;this.root=null,this.buffer=null,this.uint32Array=null,this.uint16Array=null,this.setBVH=(r,o)=>{if(n)throw new Error("BVHTraversalHelper: cannot call setBVH during an active traversal.");this.root=o,this.buffer=s=r._roots[o],this.uint16Array=t=new Uint16Array(s),this.uint32Array=e=new Uint32Array(s)},this.reset=()=>{this.root=null,this.buffer=s=null,this.uint16Array=t=null,this.uint32Array=e=null},this.getRangeStart=r=>{let o=r*2;for(;!at(o,t);)r=_t(r),o=r*2;return yt(r,e)},this.getRangeEnd=r=>{let o=r*2;for(;!at(o,t);)r=xt(r,e),o=r*2;return yt(r,e)+Tt(o,t)};let i=(r,o,a)=>{let l=o*2,c=at(l,t);if(!r(a,c,o)&&!c){let f=_t(o),u=xt(o,e);i(r,f,a+1),i(r,u,a+1)}};this.traverseBuffer=r=>{if(n)throw new Error("BVHTraversalHelper: cannot start a traversal during an active traversal.");n=!0;try{i(r,0,0)}finally{n=!1}},this.traverse=r=>{this.traverseBuffer((o,a,l)=>{if(a){let c=l*2,h=e[l+6],f=t[c+14];return r(o,a,new Float32Array(s,l*4,6),h,f)}else{let c=io(l,e);return r(o,a,new Float32Array(s,l*4,6),c)}})}}};var Qm=new it,ho=new Float32Array(6),mh=class{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(e){e={...ah,...e},"maxLeafSize"in e&&(console.warn('BVH: "maxLeafSize" option has been deprecated. Use "targetLeafSize", instead.'),e={...e,targetLeafSize:e.maxLeafSize}),jm(this,e)}getRootRanges(){throw new Error("BVH: getRootRanges() not implemented")}writePrimitiveBounds(){throw new Error("BVH: writePrimitiveBounds() not implemented")}writePrimitiveRangeBounds(e,t,n,i){let r=1/0,o=1/0,a=1/0,l=-1/0,c=-1/0,h=-1/0;for(let f=e,u=e+t;f<u;f++){this.writePrimitiveBounds(f,ho,0);let[d,g,v,p,m,x]=ho;d<r&&(r=d),p>l&&(l=p),g<o&&(o=g),m>c&&(c=m),v<a&&(a=v),x>h&&(h=x)}return n[i+0]=r,n[i+1]=o,n[i+2]=a,n[i+3]=l,n[i+4]=c,n[i+5]=h,n}computePrimitiveBounds(e,t,n){let i=n.offset||0;for(let r=e,o=e+t;r<o;r++){this.writePrimitiveBounds(r,ho,0);let[a,l,c,h,f,u]=ho,d=(a+h)/2,g=(l+f)/2,v=(c+u)/2,p=(h-a)/2,m=(f-l)/2,x=(u-c)/2,S=(r-i)*6;n[S+0]=d,n[S+1]=p+(Math.abs(d)+p)*no,n[S+2]=g,n[S+3]=m+(Math.abs(g)+m)*no,n[S+4]=v,n[S+5]=x+(Math.abs(v)+x)*no}return n}shiftPrimitiveOffsets(e){let t=this._indirectBuffer;if(t)for(let n=0,i=t.length;n<i;n++)t[n]+=e;else{let n=this._roots;for(let i=0;i<n.length;i++){let r=n[i],o=new Uint32Array(r),a=new Uint16Array(r),l=r.byteLength/32;for(let c=0;c<l;c++){let h=8*c,f=2*h;at(f,a)&&(o[h+6]+=e)}}}}traverse(e,t=0){ph.setBVH(this,t),ph.traverse(e),ph.reset()}refit(){let e=this._roots;for(let t=0,n=e.length;t<n;t++){let i=e[t],r=new Uint32Array(i),o=new Uint16Array(i),a=new Float32Array(i),l=i.byteLength/32;for(let c=l-1;c>=0;c--){let h=c*8,f=h*2;if(at(f,o)){let d=yt(h,r),g=Tt(f,o);this.writePrimitiveRangeBounds(d,g,ho,0),a.set(ho,h)}else{let d=_t(h),g=xt(h,r);for(let v=0;v<3;v++){let p=a[d+v],m=a[d+v+3],x=a[g+v],S=a[g+v+3];a[h+v]=p<x?p:x,a[h+v+3]=m>S?m:S}}}}}getBoundingBox(e){return e.makeEmpty(),this._roots.forEach(n=>{Pt(0,new Float32Array(n),Qm),e.union(Qm)}),e}shapecast(e){let{boundsTraverseOrder:t,intersectsBounds:n,intersectsRange:i,intersectsPrimitive:r,scratchPrimitive:o,iterate:a}=e;if(i&&r){let f=i;i=(u,d,g,v,p)=>f(u,d,g,v,p)?!0:a(u,d,this,r,g,v,o)}else i||(r?i=(f,u,d,g)=>a(f,u,this,r,d,g,o):i=(f,u,d)=>d);let l=!1,c=0,h=this._roots;for(let f=0,u=h.length;f<u;f++){let d=h[f];if(l=Jm(this,f,n,i,t,c),l)break;c+=d.byteLength/32}return l}bvhcast(e,t,n){let{intersectsRanges:i}=n;return $m(this,e,t,i)}};function eg(){return typeof SharedArrayBuffer<"u"}function td(s){return s.index?s.index.count:s.attributes.position.count}function Cs(s){return td(s)/3}function wM(s,e=ArrayBuffer){return s>65535?new Uint32Array(new e(4*s)):new Uint16Array(new e(2*s))}function tg(s,e){if(!s.index){let t=s.attributes.position.count,n=e.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,i=wM(t,n);s.setIndex(new Nt(i,1));for(let r=0;r<t;r++)i[r]=r}}function EM(s,e,t){let n=td(s)/t,i=e||s.drawRange,r=i.start/t,o=(i.start+i.count)/t,a=Math.max(0,r),l=Math.min(n,o)-a;return{offset:Math.floor(a),count:Math.floor(l)}}function AM(s,e){return s.groups.map(t=>({offset:t.start/e,count:t.count/e}))}function nd(s,e,t){let n=EM(s,e,t),i=AM(s,t);if(!i.length)return[n];let r=[],o=n.offset,a=n.offset+n.count,l=td(s)/t,c=[];for(let u of i){let{offset:d,count:g}=u,v=d,p=isFinite(g)?g:l-d,m=d+p;v<a&&m>o&&(c.push({pos:Math.max(o,v),isStart:!0}),c.push({pos:Math.min(a,m),isStart:!1}))}c.sort((u,d)=>u.pos!==d.pos?u.pos-d.pos:u.type==="end"?-1:1);let h=0,f=null;for(let u of c){let d=u.pos;h!==0&&d!==f&&r.push({offset:f,count:d-f}),h+=u.isStart?1:-1,f=d}return r}function RM(s,e){let t=s[s.length-1],n=t.offset+t.count>2**16,i=s.reduce((c,h)=>c+h.count,0),r=n?4:2,o=e?new SharedArrayBuffer(i*r):new ArrayBuffer(i*r),a=n?new Uint32Array(o):new Uint16Array(o),l=0;for(let c=0;c<s.length;c++){let{offset:h,count:f}=s[c];for(let u=0;u<f;u++)a[l+u]=h+u;l+=f}return a}var gh=class extends mh{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(e){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(e){}constructor(e,t={}){if(e.isBufferGeometry){if(e.index&&e.index.isInterleavedBufferAttribute)throw new Error("BVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("BVH: Only BufferGeometries are supported.");if(t.useSharedArrayBuffer&&!eg())throw new Error("BVH: SharedArrayBuffer is not available.");super(),this.geometry=e,this.resolvePrimitiveIndex=t.indirect?n=>this._indirectBuffer[n]:n=>n,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,t={...ah,...t},t[Ua]||this.init(t)}init(e){let{geometry:t,primitiveStride:n}=this;if(e.indirect){let i=nd(t,e.range,n),r=RM(i,e.useSharedArrayBuffer);this._indirectBuffer=r}else tg(t,e);super.init(e),!t.boundingBox&&e.setBoundingBox&&(t.boundingBox=this.getBoundingBox(new it))}getRootRanges(e){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:nd(this.geometry,e,this.primitiveStride)}raycastObject3D(){throw new Error("BVH: raycastObject3D() not implemented")}};var Kn=class{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(e,t){let n=1/0,i=-1/0;for(let r=0,o=e.length;r<o;r++){let l=e[r][t];n=l<n?l:n,i=l>i?l:i}this.min=n,this.max=i}setFromPoints(e,t){let n=1/0,i=-1/0;for(let r=0,o=t.length;r<o;r++){let a=t[r],l=e.dot(a);n=l<n?l:n,i=l>i?l:i}this.min=n,this.max=i}isSeparated(e){return this.min>e.max||e.min>this.max}};Kn.prototype.setFromBox=(function(){let s=new P;return function(t,n){let i=n.min,r=n.max,o=1/0,a=-1/0;for(let l=0;l<=1;l++)for(let c=0;c<=1;c++)for(let h=0;h<=1;h++){s.x=i.x*l+r.x*(1-l),s.y=i.y*c+r.y*(1-c),s.z=i.z*h+r.z*(1-h);let f=t.dot(s);o=Math.min(f,o),a=Math.max(f,a)}this.min=o,this.max=a}})();var CM=(function(){let s=new P,e=new P,t=new P;return function(i,r,o){let a=i.start,l=s,c=r.start,h=e;t.subVectors(a,c),s.subVectors(i.end,i.start),e.subVectors(r.end,r.start);let f=t.dot(h),u=h.dot(l),d=h.dot(h),g=t.dot(l),p=l.dot(l)*d-u*u,m,x;p!==0?m=(f*u-g*d)/p:m=0,x=(f+m*u)/d,o.x=m,o.y=x}})(),Ba=(function(){let s=new pe,e=new P,t=new P;return function(i,r,o,a){CM(i,r,s);let l=s.x,c=s.y;if(l>=0&&l<=1&&c>=0&&c<=1){i.at(l,o),r.at(c,a);return}else if(l>=0&&l<=1){c<0?r.at(0,a):r.at(1,a),i.closestPointToPoint(a,!0,o);return}else if(c>=0&&c<=1){l<0?i.at(0,o):i.at(1,o),r.closestPointToPoint(o,!0,a);return}else{let h;l<0?h=i.start:h=i.end;let f;c<0?f=r.start:f=r.end;let u=e,d=t;if(i.closestPointToPoint(f,!0,e),r.closestPointToPoint(h,!0,t),u.distanceToSquared(f)<=d.distanceToSquared(h)){o.copy(u),a.copy(f);return}else{o.copy(h),a.copy(d);return}}}})(),ng=(function(){let s=new P,e=new P,t=new mn,n=new Un;return function(r,o){let{radius:a,center:l}=r,{a:c,b:h,c:f}=o;if(n.start=c,n.end=h,n.closestPointToPoint(l,!0,s).distanceTo(l)<=a||(n.start=c,n.end=f,n.closestPointToPoint(l,!0,s).distanceTo(l)<=a)||(n.start=h,n.end=f,n.closestPointToPoint(l,!0,s).distanceTo(l)<=a))return!0;let v=o.getPlane(t);if(Math.abs(v.distanceToPoint(l))<=a){let m=v.projectPoint(l,e);if(o.containsPoint(m))return!0}return!1}})();var PM=["x","y","z"],ls=1e-15,ig=ls*ls;function ai(s){return Math.abs(s)<ls}var gn=class extends bn{constructor(...e){super(...e),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new P),this.satBounds=new Array(4).fill().map(()=>new Kn),this.points=[this.a,this.b,this.c],this.plane=new mn,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new Un,this.needsUpdate=!0}intersectsSphere(e){return ng(e,this)}update(){let e=this.a,t=this.b,n=this.c,i=this.points,r=this.satAxes,o=this.satBounds,a=r[0],l=o[0];this.getNormal(a),l.setFromPoints(a,i);let c=r[1],h=o[1];c.subVectors(e,t),h.setFromPoints(c,i);let f=r[2],u=o[2];f.subVectors(t,n),u.setFromPoints(f,i);let d=r[3],g=o[3];d.subVectors(n,e),g.setFromPoints(d,i);let v=c.length(),p=f.length(),m=d.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,v<ls?p<ls||m<ls?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(n)):p<ls?m<ls?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(e)):m<ls&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(n),this.degenerateSegment.end.copy(t)),this.plane.setFromNormalAndCoplanarPoint(a,e),this.needsUpdate=!1}};gn.prototype.closestPointToSegment=(function(){let s=new P,e=new P,t=new Un;return function(i,r=null,o=null){this.needsUpdate&&this.update();let{start:a,end:l}=i,c=this.points,h,f=1/0,u=this.plane.distanceToPoint(a),d=this.plane.distanceToPoint(l);if(u*d<0&&this.plane.intersectLine(i,s)!==null&&this.containsPoint(s))return r&&r.copy(s),o&&o.copy(s),0;for(let g=0;g<3;g++){let v=(g+1)%3;t.start.copy(c[g]),t.end.copy(c[v]),Ba(t,i,s,e),h=s.distanceToSquared(e),h<f&&(f=h,r&&r.copy(s),o&&o.copy(e))}return this.closestPointToPoint(a,s),h=a.distanceToSquared(s),h<f&&(f=h,r&&r.copy(s),o&&o.copy(a)),this.closestPointToPoint(l,s),h=l.distanceToSquared(s),h<f&&(f=h,r&&r.copy(s),o&&o.copy(l)),Math.sqrt(f)}})();gn.prototype.intersectsTriangle=(function(){let s=new gn,e=new Kn,t=new Kn,n=new P,i=new P,r=new P,o=new P,a=new Un,l=new Un,c=new P,h=new pe,f=new pe;function u(S,y,M,T){let _=n;!S.isDegenerateIntoPoint&&!S.isDegenerateIntoSegment?_.copy(S.plane.normal):_.copy(y.plane.normal);let b=S.satBounds,R=S.satAxes;for(let I=1;I<4;I++){let U=b[I],D=R[I];if(e.setFromPoints(D,y.points),U.isSeparated(e)||(o.copy(_).cross(D),e.setFromPoints(o,S.points),t.setFromPoints(o,y.points),e.isSeparated(t)))return!1}let w=y.satBounds,C=y.satAxes;for(let I=1;I<4;I++){let U=w[I],D=C[I];if(e.setFromPoints(D,S.points),U.isSeparated(e)||(o.crossVectors(_,D),e.setFromPoints(o,S.points),t.setFromPoints(o,y.points),e.isSeparated(t)))return!1}return M&&(T||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),M.start.set(0,0,0),M.end.set(0,0,0)),!0}function d(S,y,M,T,_,b,R,w,C,I,U){let D=R/(R-w);I.x=T+(_-T)*D,U.start.subVectors(y,S).multiplyScalar(D).add(S),D=R/(R-C),I.y=T+(b-T)*D,U.end.subVectors(M,S).multiplyScalar(D).add(S)}function g(S,y,M,T,_,b,R,w,C,I,U){if(_>0)d(S.c,S.a,S.b,T,y,M,C,R,w,I,U);else if(b>0)d(S.b,S.a,S.c,M,y,T,w,R,C,I,U);else if(w*C>0||R!=0)d(S.a,S.b,S.c,y,M,T,R,w,C,I,U);else if(w!=0)d(S.b,S.a,S.c,M,y,T,w,R,C,I,U);else if(C!=0)d(S.c,S.a,S.b,T,y,M,C,R,w,I,U);else return!0;return!1}function v(S,y,M,T){let _=y.degenerateSegment,b=S.plane.distanceToPoint(_.start),R=S.plane.distanceToPoint(_.end);return ai(b)?ai(R)?u(S,y,M,T):(M&&(M.start.copy(_.start),M.end.copy(_.start)),S.containsPoint(_.start)):ai(R)?(M&&(M.start.copy(_.end),M.end.copy(_.end)),S.containsPoint(_.end)):S.plane.intersectLine(_,n)!=null?(M&&(M.start.copy(n),M.end.copy(n)),S.containsPoint(n)):!1}function p(S,y,M){let T=y.a;return ai(S.plane.distanceToPoint(T))&&S.containsPoint(T)?(M&&(M.start.copy(T),M.end.copy(T)),!0):!1}function m(S,y,M){let T=S.degenerateSegment,_=y.a;return T.closestPointToPoint(_,!0,n),_.distanceToSquared(n)<ig?(M&&(M.start.copy(_),M.end.copy(_)),!0):!1}function x(S,y,M,T){if(S.isDegenerateIntoSegment)if(y.isDegenerateIntoSegment){let _=S.degenerateSegment,b=y.degenerateSegment,R=i,w=r;_.delta(R),b.delta(w);let C=n.subVectors(b.start,_.start),I=R.x*w.y-R.y*w.x;if(ai(I))return!1;let U=(C.x*w.y-C.y*w.x)/I,D=-(R.x*C.y-R.y*C.x)/I;if(U<0||U>1||D<0||D>1)return!1;let B=_.start.z+R.z*U,H=b.start.z+w.z*D;return ai(B-H)?(M&&(M.start.copy(_.start).addScaledVector(R,U),M.end.copy(_.start).addScaledVector(R,U)),!0):!1}else return y.isDegenerateIntoPoint?m(S,y,M):v(y,S,M,T);else{if(S.isDegenerateIntoPoint)return y.isDegenerateIntoPoint?y.a.distanceToSquared(S.a)<ig?(M&&(M.start.copy(S.a),M.end.copy(S.a)),!0):!1:y.isDegenerateIntoSegment?m(y,S,M):p(y,S,M);if(y.isDegenerateIntoPoint)return p(S,y,M);if(y.isDegenerateIntoSegment)return v(S,y,M,T)}}return function(y,M=null,T=!1){this.needsUpdate&&this.update(),y.isExtendedTriangle?y.needsUpdate&&y.update():(s.copy(y),s.update(),y=s);let _=x(this,y,M,T);if(_!==void 0)return _;let b=this.plane,R=y.plane,w=R.distanceToPoint(this.a),C=R.distanceToPoint(this.b),I=R.distanceToPoint(this.c);ai(w)&&(w=0),ai(C)&&(C=0),ai(I)&&(I=0);let U=w*C,D=w*I;if(U>0&&D>0)return!1;let B=b.distanceToPoint(y.a),H=b.distanceToPoint(y.b),G=b.distanceToPoint(y.c);ai(B)&&(B=0),ai(H)&&(H=0),ai(G)&&(G=0);let ee=B*H,V=B*G;if(ee>0&&V>0)return!1;i.copy(b.normal),r.copy(R.normal);let Q=i.cross(r),ne=0,de=Math.abs(Q.x),we=Math.abs(Q.y);we>de&&(de=we,ne=1),Math.abs(Q.z)>de&&(ne=2);let ue=PM[ne],Se=this.a[ue],Ee=this.b[ue],me=this.c[ue],Le=y.a[ue],rt=y.b[ue],Be=y.c[ue];if(g(this,Se,Ee,me,U,D,w,C,I,h,a))return u(this,y,M,T);if(g(y,Le,rt,Be,ee,V,B,H,G,f,l))return u(this,y,M,T);if(h.y<h.x){let He=h.y;h.y=h.x,h.x=He,c.copy(a.start),a.start.copy(a.end),a.end.copy(c)}if(f.y<f.x){let He=f.y;f.y=f.x,f.x=He,c.copy(l.start),l.start.copy(l.end),l.end.copy(c)}return h.y<f.x||f.y<h.x?!1:(M&&(f.x>h.x?M.start.copy(l.start):M.start.copy(a.start),f.y<h.y?M.end.copy(l.end):M.end.copy(a.end)),!0)}})();gn.prototype.distanceToPoint=(function(){let s=new P;return function(t){return this.closestPointToPoint(t,s),t.distanceTo(s)}})();gn.prototype.distanceToTriangle=(function(){let s=new P,e=new P,t=["a","b","c"],n=new Un,i=new Un;return function(o,a=null,l=null){let c=a||l?n:null;if(this.intersectsTriangle(o,c,!0))return(a||l)&&(a&&c.getCenter(a),l&&c.getCenter(l)),0;let h=1/0;for(let f=0;f<3;f++){let u,d=t[f],g=o[d];this.closestPointToPoint(g,s),u=g.distanceToSquared(s),u<h&&(h=u,a&&a.copy(s),l&&l.copy(g));let v=this[d];o.closestPointToPoint(v,s),u=v.distanceToSquared(s),u<h&&(h=u,a&&a.copy(v),l&&l.copy(s))}for(let f=0;f<3;f++){let u=t[f],d=t[(f+1)%3];n.set(this[u],this[d]);for(let g=0;g<3;g++){let v=t[g],p=t[(g+1)%3];i.set(o[v],o[p]),Ba(n,i,s,e);let m=s.distanceToSquared(e);m<h&&(h=m,a&&a.copy(s),l&&l.copy(e))}}return Math.sqrt(h)}})();var qt=class{constructor(e,t,n){this.isOrientedBox=!0,this.min=new P,this.max=new P,this.matrix=new Te,this.invMatrix=new Te,this.points=new Array(8).fill().map(()=>new P),this.satAxes=new Array(3).fill().map(()=>new P),this.satBounds=new Array(3).fill().map(()=>new Kn),this.alignedSatBounds=new Array(3).fill().map(()=>new Kn),this.needsUpdate=!1,e&&this.min.copy(e),t&&this.max.copy(t),n&&this.matrix.copy(n)}set(e,t,n){this.min.copy(e),this.max.copy(t),this.matrix.copy(n),this.needsUpdate=!0}copy(e){this.min.copy(e.min),this.max.copy(e.max),this.matrix.copy(e.matrix),this.needsUpdate=!0}};qt.prototype.update=(function(){return function(){let e=this.matrix,t=this.min,n=this.max,i=this.points;for(let c=0;c<=1;c++)for(let h=0;h<=1;h++)for(let f=0;f<=1;f++){let u=1*c|2*h|4*f,d=i[u];d.x=c?n.x:t.x,d.y=h?n.y:t.y,d.z=f?n.z:t.z,d.applyMatrix4(e)}let r=this.satBounds,o=this.satAxes,a=i[0];for(let c=0;c<3;c++){let h=o[c],f=r[c],u=1<<c,d=i[u];h.subVectors(a,d),f.setFromPoints(h,i)}let l=this.alignedSatBounds;l[0].setFromPointsField(i,"x"),l[1].setFromPointsField(i,"y"),l[2].setFromPointsField(i,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})();qt.prototype.intersectsBox=(function(){let s=new Kn;return function(t){this.needsUpdate&&this.update();let n=t.min,i=t.max,r=this.satBounds,o=this.satAxes,a=this.alignedSatBounds;if(s.min=n.x,s.max=i.x,a[0].isSeparated(s)||(s.min=n.y,s.max=i.y,a[1].isSeparated(s))||(s.min=n.z,s.max=i.z,a[2].isSeparated(s)))return!1;for(let l=0;l<3;l++){let c=o[l],h=r[l];if(s.setFromBox(c,t),h.isSeparated(s))return!1}return!0}})();qt.prototype.intersectsTriangle=(function(){let s=new gn,e=new Array(3),t=new Kn,n=new Kn,i=new P;return function(o){this.needsUpdate&&this.update(),o.isExtendedTriangle?o.needsUpdate&&o.update():(s.copy(o),s.update(),o=s);let a=this.satBounds,l=this.satAxes;e[0]=o.a,e[1]=o.b,e[2]=o.c;for(let u=0;u<3;u++){let d=a[u],g=l[u];if(t.setFromPoints(g,e),d.isSeparated(t))return!1}let c=o.satBounds,h=o.satAxes,f=this.points;for(let u=0;u<3;u++){let d=c[u],g=h[u];if(t.setFromPoints(g,f),d.isSeparated(t))return!1}for(let u=0;u<3;u++){let d=l[u];for(let g=0;g<4;g++){let v=h[g];if(i.crossVectors(d,v),t.setFromPoints(i,e),n.setFromPoints(i,f),t.isSeparated(n))return!1}}return!0}})();qt.prototype.closestPointToPoint=(function(){return function(e,t){return this.needsUpdate&&this.update(),t.copy(e).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),t}})();qt.prototype.distanceToPoint=(function(){let s=new P;return function(t){return this.closestPointToPoint(t,s),t.distanceTo(s)}})();qt.prototype.distanceToBox=(function(){let s=["x","y","z"],e=new Array(12).fill().map(()=>new Un),t=new Array(12).fill().map(()=>new Un),n=new P,i=new P;return function(o,a=0,l=null,c=null){if(this.needsUpdate&&this.update(),this.intersectsBox(o))return(l||c)&&(o.getCenter(i),this.closestPointToPoint(i,n),o.closestPointToPoint(n,i),l&&l.copy(n),c&&c.copy(i)),0;let h=a*a,f=o.min,u=o.max,d=this.points,g=1/0;for(let p=0;p<8;p++){let m=d[p];i.copy(m).clamp(f,u);let x=m.distanceToSquared(i);if(x<g&&(g=x,l&&l.copy(m),c&&c.copy(i),x<h))return Math.sqrt(x)}let v=0;for(let p=0;p<3;p++)for(let m=0;m<=1;m++)for(let x=0;x<=1;x++){let S=(p+1)%3,y=(p+2)%3,M=m<<S|x<<y,T=1<<p|m<<S|x<<y,_=d[M],b=d[T];e[v].set(_,b);let w=s[p],C=s[S],I=s[y],U=t[v],D=U.start,B=U.end;D[w]=f[w],D[C]=m?f[C]:u[C],D[I]=x?f[I]:u[I],B[w]=u[w],B[C]=m?f[C]:u[C],B[I]=x?f[I]:u[I],v++}for(let p=0;p<=1;p++)for(let m=0;m<=1;m++)for(let x=0;x<=1;x++){i.x=p?u.x:f.x,i.y=m?u.y:f.y,i.z=x?u.z:f.z,this.closestPointToPoint(i,n);let S=i.distanceToSquared(n);if(S<g&&(g=S,l&&l.copy(n),c&&c.copy(i),S<h))return Math.sqrt(S)}for(let p=0;p<12;p++){let m=e[p];for(let x=0;x<12;x++){let S=t[x];Ba(m,S,n,i);let y=n.distanceToSquared(i);if(y<g&&(g=y,l&&l.copy(n),c&&c.copy(i),y<h))return Math.sqrt(y)}}return Math.sqrt(g)}})();var id=class extends Es{constructor(){super(()=>new gn)}},Bn=new id;var za=new P,sd=new P;function sg(s,e,t={},n=0,i=1/0){let r=n*n,o=i*i,a=1/0,l=null;if(s.shapecast({boundsTraverseOrder:h=>(za.copy(e).clamp(h.min,h.max),za.distanceToSquared(e)),intersectsBounds:(h,f,u)=>u<a&&u<o,intersectsTriangle:(h,f)=>{h.closestPointToPoint(e,za);let u=e.distanceToSquared(za);return u<a&&(sd.copy(za),a=u,l=f),u<r}}),a===1/0)return null;let c=Math.sqrt(a);return t.point?t.point.copy(sd):t.point=sd.clone(),t.distance=c,t.faceIndex=l,t}var _h=parseInt("187")>=169,IM=parseInt("187")<=161,ir=new P,sr=new P,rr=new P,xh=new pe,yh=new pe,vh=new pe,rg=new P,og=new P,ag=new P,ka=new P;function LM(s,e,t,n,i,r,o,a){let l;if(r===sn?l=s.intersectTriangle(n,t,e,!0,i):l=s.intersectTriangle(e,t,n,r!==En,i),l===null)return null;let c=s.origin.distanceTo(i);return c<o||c>a?null:{distance:c,point:i.clone()}}function lg(s,e,t,n,i,r,o,a,l,c,h){ir.fromBufferAttribute(e,r),sr.fromBufferAttribute(e,o),rr.fromBufferAttribute(e,a);let f=LM(s,ir,sr,rr,ka,l,c,h);if(f){if(n){xh.fromBufferAttribute(n,r),yh.fromBufferAttribute(n,o),vh.fromBufferAttribute(n,a),f.uv=new pe;let d=bn.getInterpolation(ka,ir,sr,rr,xh,yh,vh,f.uv);_h||(f.uv=d)}if(i){xh.fromBufferAttribute(i,r),yh.fromBufferAttribute(i,o),vh.fromBufferAttribute(i,a),f.uv1=new pe;let d=bn.getInterpolation(ka,ir,sr,rr,xh,yh,vh,f.uv1);_h||(f.uv1=d),IM&&(f.uv2=f.uv1)}if(t){rg.fromBufferAttribute(t,r),og.fromBufferAttribute(t,o),ag.fromBufferAttribute(t,a),f.normal=new P;let d=bn.getInterpolation(ka,ir,sr,rr,rg,og,ag,f.normal);f.normal.dot(s.direction)>0&&f.normal.multiplyScalar(-1),_h||(f.normal=d)}let u={a:r,b:o,c:a,normal:new P,materialIndex:0};if(bn.getNormal(ir,sr,rr,u.normal),f.face=u,f.faceIndex=r,_h){let d=new P;bn.getBarycoord(ka,ir,sr,rr,d),f.barycoord=d}}return f}function cg(s){return s&&s.isMaterial?s.side:s}function uo(s,e,t,n,i,r,o){let a=n*3,l=a+0,c=a+1,h=a+2,{index:f,groups:u}=s;s.index&&(l=f.getX(l),c=f.getX(c),h=f.getX(h));let{position:d,normal:g,uv:v,uv1:p}=s.attributes;if(Array.isArray(e)){let m=n*3;for(let x=0,S=u.length;x<S;x++){let{start:y,count:M,materialIndex:T}=u[x];if(m>=y&&m<y+M){let _=cg(e[T]),b=lg(t,d,g,v,p,l,c,h,_,r,o);if(b)if(b.faceIndex=n,b.face.materialIndex=T,i)i.push(b);else return b}}}else{let m=cg(e),x=lg(t,d,g,v,p,l,c,h,m,r,o);if(x)if(x.faceIndex=n,x.face.materialIndex=0,i)i.push(x);else return x}return null}function It(s,e,t,n){let i=s.a,r=s.b,o=s.c,a=e,l=e+1,c=e+2;t&&(a=t.getX(a),l=t.getX(l),c=t.getX(c)),i.x=n.getX(a),i.y=n.getY(a),i.z=n.getZ(a),r.x=n.getX(l),r.y=n.getY(l),r.z=n.getZ(l),o.x=n.getX(c),o.y=n.getY(c),o.z=n.getZ(c)}function hg(s,e,t,n,i,r,o,a){let{geometry:l,_indirectBuffer:c}=s;for(let h=n,f=n+i;h<f;h++)uo(l,e,t,h,r,o,a)}function ug(s,e,t,n,i,r,o){let{geometry:a,_indirectBuffer:l}=s,c=1/0,h=null;for(let f=n,u=n+i;f<u;f++){let d;d=uo(a,e,t,f,null,r,o),d&&d.distance<c&&(h=d,c=d.distance)}return h}function fg(s,e,t,n,i,r,o){let{geometry:a}=t,{index:l}=a,c=a.attributes.position;for(let h=s,f=e+s;h<f;h++){let u;if(u=h,It(o,u*3,l,c),o.needsUpdate=!0,n(o,u,i,r))return!0}return!1}function dg(s,e=null){e&&Array.isArray(e)&&(e=new Set(e));let t=s.geometry,n=t.index?t.index.array:null,i=t.attributes.position,r,o,a,l,c=0,h=s._roots;for(let u=0,d=h.length;u<d;u++)r=h[u],o=new Uint32Array(r),a=new Uint16Array(r),l=new Float32Array(r),f(0,c),c+=r.byteLength;function f(u,d,g=!1){let v=u*2;if(at(v,a)){let p=yt(u,o),m=Tt(v,a),x=1/0,S=1/0,y=1/0,M=-1/0,T=-1/0,_=-1/0;for(let b=3*p,R=3*(p+m);b<R;b++){let w=n[b],C=i.getX(w),I=i.getY(w),U=i.getZ(w);C<x&&(x=C),C>M&&(M=C),I<S&&(S=I),I>T&&(T=I),U<y&&(y=U),U>_&&(_=U)}return l[u+0]!==x||l[u+1]!==S||l[u+2]!==y||l[u+3]!==M||l[u+4]!==T||l[u+5]!==_?(l[u+0]=x,l[u+1]=S,l[u+2]=y,l[u+3]=M,l[u+4]=T,l[u+5]=_,!0):!1}else{let p=_t(u),m=xt(u,o),x=g,S=!1,y=!1;if(e){if(!x){let w=p/8+d/32,C=m/8+d/32;S=e.has(w),y=e.has(C),x=!S&&!y}}else S=!0,y=!0;let M=x||S,T=x||y,_=!1;M&&(_=f(p,d,x));let b=!1;T&&(b=f(m,d,x));let R=_||b;if(R)for(let w=0;w<3;w++){let C=p+w,I=m+w,U=l[C],D=l[C+3],B=l[I],H=l[I+3];l[u+w]=U<B?U:B,l[u+w+3]=D>H?D:H}return R}}}function Cn(s,e,t,n,i){let r,o,a,l,c,h,f=1/t.direction.x,u=1/t.direction.y,d=1/t.direction.z,g=t.origin.x,v=t.origin.y,p=t.origin.z,m=e[s],x=e[s+3],S=e[s+1],y=e[s+3+1],M=e[s+2],T=e[s+3+2];return f>=0?(r=(m-g)*f,o=(x-g)*f):(r=(x-g)*f,o=(m-g)*f),u>=0?(a=(S-v)*u,l=(y-v)*u):(a=(y-v)*u,l=(S-v)*u),r>l||a>o||((a>r||isNaN(r))&&(r=a),(l<o||isNaN(o))&&(o=l),d>=0?(c=(M-p)*d,h=(T-p)*d):(c=(T-p)*d,h=(M-p)*d),r>h||c>o)?!1:((c>r||r!==r)&&(r=c),(h<o||o!==o)&&(o=h),r<=i&&o>=n)}function pg(s,e,t,n,i,r,o,a){let{geometry:l,_indirectBuffer:c}=s;for(let h=n,f=n+i;h<f;h++){let u=c?c[h]:h;uo(l,e,t,u,r,o,a)}}function mg(s,e,t,n,i,r,o){let{geometry:a,_indirectBuffer:l}=s,c=1/0,h=null;for(let f=n,u=n+i;f<u;f++){let d;d=uo(a,e,t,l?l[f]:f,null,r,o),d&&d.distance<c&&(h=d,c=d.distance)}return h}function gg(s,e,t,n,i,r,o){let{geometry:a}=t,{index:l}=a,c=a.attributes.position;for(let h=s,f=e+s;h<f;h++){let u;if(u=t.resolveTriangleIndex(h),It(o,u*3,l,c),o.needsUpdate=!0,n(o,u,i,r))return!0}return!1}function _g(s,e,t,n,i,r,o){Qe.setBuffer(s._roots[e]),Cn(0,Qe.float32Array,n,r,o)&&rd(0,s,t,n,i,r,o),Qe.clearBuffer()}function rd(s,e,t,n,i,r,o){let{float32Array:a,uint16Array:l,uint32Array:c}=Qe,h=s*2;if(at(h,l)){let u=yt(s,c),d=Tt(h,l);hg(e,t,n,u,d,i,r,o)}else{let u=_t(s);Cn(u,a,n,r,o)&&rd(u,e,t,n,i,r,o);let d=xt(s,c);Cn(d,a,n,r,o)&&rd(d,e,t,n,i,r,o)}}var DM=["x","y","z"];function xg(s,e,t,n,i,r){Qe.setBuffer(s._roots[e]);let o=null;return Cn(0,Qe.float32Array,n,i,r)&&(o=od(0,s,t,n,i,r)),Qe.clearBuffer(),o}function od(s,e,t,n,i,r){let{float32Array:o,uint16Array:a,uint32Array:l}=Qe,c=s*2;if(at(c,a)){let f=yt(s,l),u=Tt(c,a);return ug(e,t,n,f,u,i,r)}else{let f=io(s,l),u=DM[f],g=n.direction[u]>=0,v,p;g?(v=_t(s),p=xt(s,l)):(v=xt(s,l),p=_t(s));let x=Cn(v,o,n,i,r)?od(v,e,t,n,i,r):null;if(x){let M=x.point[u];if(g?M<=o[p+f]:M>=o[p+f+3])return x}let y=Cn(p,o,n,i,r)?od(p,e,t,n,i,r):null;return x&&y?x.distance<=y.distance?x:y:x||y||null}}var Sh=new it,fo=new gn,po=new gn,Ha=new Te,yg=new qt,Mh=new qt;function vg(s,e,t,n){Qe.setBuffer(s._roots[e]);let i=ad(0,s,t,n);return Qe.clearBuffer(),i}function ad(s,e,t,n,i=null){let{float32Array:r,uint16Array:o,uint32Array:a}=Qe,l=s*2;if(i===null&&(t.boundingBox||t.computeBoundingBox(),yg.set(t.boundingBox.min,t.boundingBox.max,n),i=yg),at(l,o)){let h=e.geometry,f=h.index,u=h.attributes.position,d=t.index,g=t.attributes.position,v=yt(s,a),p=Tt(l,o);if(Ha.copy(n).invert(),t.boundsTree)return Pt(s,r,Mh),Mh.matrix.copy(Ha),Mh.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:x=>Mh.intersectsBox(x),intersectsTriangle:x=>{x.a.applyMatrix4(n),x.b.applyMatrix4(n),x.c.applyMatrix4(n),x.needsUpdate=!0;for(let S=v*3,y=(p+v)*3;S<y;S+=3)if(It(po,S,f,u),po.needsUpdate=!0,x.intersectsTriangle(po))return!0;return!1}});{let m=Cs(t);for(let x=v*3,S=(p+v)*3;x<S;x+=3){It(fo,x,f,u),fo.a.applyMatrix4(Ha),fo.b.applyMatrix4(Ha),fo.c.applyMatrix4(Ha),fo.needsUpdate=!0;for(let y=0,M=m*3;y<M;y+=3)if(It(po,y,d,g),po.needsUpdate=!0,fo.intersectsTriangle(po))return!0}}}else{let h=_t(s),f=xt(s,a);return Pt(h,r,Sh),!!(i.intersectsBox(Sh)&&ad(h,e,t,n,i)||(Pt(f,r,Sh),i.intersectsBox(Sh)&&ad(f,e,t,n,i)))}}var bh=new Te,ld=new qt,Va=new qt,NM=new P,UM=new P,OM=new P,FM=new P;function Sg(s,e,t,n={},i={},r=0,o=1/0){e.boundingBox||e.computeBoundingBox(),ld.set(e.boundingBox.min,e.boundingBox.max,t),ld.needsUpdate=!0;let a=s.geometry,l=a.attributes.position,c=a.index,h=e.attributes.position,f=e.index,u=Bn.getPrimitive(),d=Bn.getPrimitive(),g=NM,v=UM,p=null,m=null;i&&(p=OM,m=FM);let x=1/0,S=null,y=null;return bh.copy(t).invert(),Va.matrix.copy(bh),s.shapecast({boundsTraverseOrder:M=>ld.distanceToBox(M),intersectsBounds:(M,T,_)=>_<x&&_<o?(T&&(Va.min.copy(M.min),Va.max.copy(M.max),Va.needsUpdate=!0),!0):!1,intersectsRange:(M,T)=>{if(e.boundsTree)return e.boundsTree.shapecast({boundsTraverseOrder:b=>Va.distanceToBox(b),intersectsBounds:(b,R,w)=>w<x&&w<o,intersectsRange:(b,R)=>{for(let w=b,C=b+R;w<C;w++){It(d,3*w,f,h),d.a.applyMatrix4(t),d.b.applyMatrix4(t),d.c.applyMatrix4(t),d.needsUpdate=!0;for(let I=M,U=M+T;I<U;I++){It(u,3*I,c,l),u.needsUpdate=!0;let D=u.distanceToTriangle(d,g,p);if(D<x&&(v.copy(g),m&&m.copy(p),x=D,S=I,y=w),D<r)return!0}}}});{let _=Cs(e);for(let b=0,R=_;b<R;b++){It(d,3*b,f,h),d.a.applyMatrix4(t),d.b.applyMatrix4(t),d.c.applyMatrix4(t),d.needsUpdate=!0;for(let w=M,C=M+T;w<C;w++){It(u,3*w,c,l),u.needsUpdate=!0;let I=u.distanceToTriangle(d,g,p);if(I<x&&(v.copy(g),m&&m.copy(p),x=I,S=w,y=b),I<r)return!0}}}}}),Bn.releasePrimitive(u),Bn.releasePrimitive(d),x===1/0?null:(n.point?n.point.copy(v):n.point=v.clone(),n.distance=x,n.faceIndex=S,i&&(i.point?i.point.copy(m):i.point=m.clone(),i.point.applyMatrix4(bh),v.applyMatrix4(bh),i.distance=v.sub(i.point).length(),i.faceIndex=y),n)}function Mg(s,e=null){e&&Array.isArray(e)&&(e=new Set(e));let t=s.geometry,n=t.index?t.index.array:null,i=t.attributes.position,r,o,a,l,c=0,h=s._roots;for(let u=0,d=h.length;u<d;u++)r=h[u],o=new Uint32Array(r),a=new Uint16Array(r),l=new Float32Array(r),f(0,c),c+=r.byteLength;function f(u,d,g=!1){let v=u*2;if(at(v,a)){let p=yt(u,o),m=Tt(v,a),x=1/0,S=1/0,y=1/0,M=-1/0,T=-1/0,_=-1/0;for(let b=p,R=p+m;b<R;b++){let w=3*s.resolveTriangleIndex(b);for(let C=0;C<3;C++){let I=w+C;I=n?n[I]:I;let U=i.getX(I),D=i.getY(I),B=i.getZ(I);U<x&&(x=U),U>M&&(M=U),D<S&&(S=D),D>T&&(T=D),B<y&&(y=B),B>_&&(_=B)}}return l[u+0]!==x||l[u+1]!==S||l[u+2]!==y||l[u+3]!==M||l[u+4]!==T||l[u+5]!==_?(l[u+0]=x,l[u+1]=S,l[u+2]=y,l[u+3]=M,l[u+4]=T,l[u+5]=_,!0):!1}else{let p=_t(u),m=xt(u,o),x=g,S=!1,y=!1;if(e){if(!x){let w=p/8+d/32,C=m/8+d/32;S=e.has(w),y=e.has(C),x=!S&&!y}}else S=!0,y=!0;let M=x||S,T=x||y,_=!1;M&&(_=f(p,d,x));let b=!1;T&&(b=f(m,d,x));let R=_||b;if(R)for(let w=0;w<3;w++){let C=p+w,I=m+w,U=l[C],D=l[C+3],B=l[I],H=l[I+3];l[u+w]=U<B?U:B,l[u+w+3]=D>H?D:H}return R}}}function bg(s,e,t,n,i,r,o){Qe.setBuffer(s._roots[e]),Cn(0,Qe.float32Array,n,r,o)&&cd(0,s,t,n,i,r,o),Qe.clearBuffer()}function cd(s,e,t,n,i,r,o){let{float32Array:a,uint16Array:l,uint32Array:c}=Qe,h=s*2;if(at(h,l)){let u=yt(s,c),d=Tt(h,l);pg(e,t,n,u,d,i,r,o)}else{let u=_t(s);Cn(u,a,n,r,o)&&cd(u,e,t,n,i,r,o);let d=xt(s,c);Cn(d,a,n,r,o)&&cd(d,e,t,n,i,r,o)}}var BM=["x","y","z"];function Tg(s,e,t,n,i,r){Qe.setBuffer(s._roots[e]);let o=null;return Cn(0,Qe.float32Array,n,i,r)&&(o=hd(0,s,t,n,i,r)),Qe.clearBuffer(),o}function hd(s,e,t,n,i,r){let{float32Array:o,uint16Array:a,uint32Array:l}=Qe,c=s*2;if(at(c,a)){let f=yt(s,l),u=Tt(c,a);return mg(e,t,n,f,u,i,r)}else{let f=io(s,l),u=BM[f],g=n.direction[u]>=0,v,p;g?(v=_t(s),p=xt(s,l)):(v=xt(s,l),p=_t(s));let x=Cn(v,o,n,i,r)?hd(v,e,t,n,i,r):null;if(x){let M=x.point[u];if(g?M<=o[p+f]:M>=o[p+f+3])return x}let y=Cn(p,o,n,i,r)?hd(p,e,t,n,i,r):null;return x&&y?x.distance<=y.distance?x:y:x||y||null}}var Th=new it,mo=new gn,go=new gn,Ga=new Te,wg=new qt,wh=new qt;function Eg(s,e,t,n){Qe.setBuffer(s._roots[e]);let i=ud(0,s,t,n);return Qe.clearBuffer(),i}function ud(s,e,t,n,i=null){let{float32Array:r,uint16Array:o,uint32Array:a}=Qe,l=s*2;if(i===null&&(t.boundingBox||t.computeBoundingBox(),wg.set(t.boundingBox.min,t.boundingBox.max,n),i=wg),at(l,o)){let h=e.geometry,f=h.index,u=h.attributes.position,d=t.index,g=t.attributes.position,v=yt(s,a),p=Tt(l,o);if(Ga.copy(n).invert(),t.boundsTree)return Pt(s,r,wh),wh.matrix.copy(Ga),wh.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:x=>wh.intersectsBox(x),intersectsTriangle:x=>{x.a.applyMatrix4(n),x.b.applyMatrix4(n),x.c.applyMatrix4(n),x.needsUpdate=!0;for(let S=v,y=p+v;S<y;S++)if(It(go,3*e.resolveTriangleIndex(S),f,u),go.needsUpdate=!0,x.intersectsTriangle(go))return!0;return!1}});{let m=Cs(t);for(let x=v,S=p+v;x<S;x++){let y=e.resolveTriangleIndex(x);It(mo,3*y,f,u),mo.a.applyMatrix4(Ga),mo.b.applyMatrix4(Ga),mo.c.applyMatrix4(Ga),mo.needsUpdate=!0;for(let M=0,T=m*3;M<T;M+=3)if(It(go,M,d,g),go.needsUpdate=!0,mo.intersectsTriangle(go))return!0}}}else{let h=_t(s),f=xt(s,a);return Pt(h,r,Th),!!(i.intersectsBox(Th)&&ud(h,e,t,n,i)||(Pt(f,r,Th),i.intersectsBox(Th)&&ud(f,e,t,n,i)))}}var Eh=new Te,fd=new qt,Wa=new qt,zM=new P,kM=new P,HM=new P,VM=new P;function Ag(s,e,t,n={},i={},r=0,o=1/0){e.boundingBox||e.computeBoundingBox(),fd.set(e.boundingBox.min,e.boundingBox.max,t),fd.needsUpdate=!0;let a=s.geometry,l=a.attributes.position,c=a.index,h=e.attributes.position,f=e.index,u=Bn.getPrimitive(),d=Bn.getPrimitive(),g=zM,v=kM,p=null,m=null;i&&(p=HM,m=VM);let x=1/0,S=null,y=null;return Eh.copy(t).invert(),Wa.matrix.copy(Eh),s.shapecast({boundsTraverseOrder:M=>fd.distanceToBox(M),intersectsBounds:(M,T,_)=>_<x&&_<o?(T&&(Wa.min.copy(M.min),Wa.max.copy(M.max),Wa.needsUpdate=!0),!0):!1,intersectsRange:(M,T)=>{if(e.boundsTree){let _=e.boundsTree;return _.shapecast({boundsTraverseOrder:b=>Wa.distanceToBox(b),intersectsBounds:(b,R,w)=>w<x&&w<o,intersectsRange:(b,R)=>{for(let w=b,C=b+R;w<C;w++){let I=_.resolveTriangleIndex(w);It(d,3*I,f,h),d.a.applyMatrix4(t),d.b.applyMatrix4(t),d.c.applyMatrix4(t),d.needsUpdate=!0;for(let U=M,D=M+T;U<D;U++){let B=s.resolveTriangleIndex(U);It(u,3*B,c,l),u.needsUpdate=!0;let H=u.distanceToTriangle(d,g,p);if(H<x&&(v.copy(g),m&&m.copy(p),x=H,S=U,y=w),H<r)return!0}}}})}else{let _=Cs(e);for(let b=0,R=_;b<R;b++){It(d,3*b,f,h),d.a.applyMatrix4(t),d.b.applyMatrix4(t),d.c.applyMatrix4(t),d.needsUpdate=!0;for(let w=M,C=M+T;w<C;w++){let I=s.resolveTriangleIndex(w);It(u,3*I,c,l),u.needsUpdate=!0;let U=u.distanceToTriangle(d,g,p);if(U<x&&(v.copy(g),m&&m.copy(p),x=U,S=w,y=b),U<r)return!0}}}}}),Bn.releasePrimitive(u),Bn.releasePrimitive(d),x===1/0?null:(n.point?n.point.copy(v):n.point=v.clone(),n.distance=x,n.faceIndex=S,i&&(i.point?i.point.copy(m):i.point=m.clone(),i.point.applyMatrix4(Eh),v.applyMatrix4(Eh),i.distance=v.sub(i.point).length(),i.faceIndex=y),n)}function dd(s,e,t){return s===null?null:(s.point.applyMatrix4(e.matrixWorld),s.distance=s.point.distanceTo(t.ray.origin),s.object=e,s)}var Ah=new qt,Rh=new ti,Rg=new P,Cg=new Te,Pg=new P,pd=["getX","getY","getZ"],Ch=class s extends gh{static serialize(e,t={}){t={cloneBuffers:!0,...t};let n=e.geometry,i=e._roots,r=e._indirectBuffer,o=n.getIndex(),a={version:1,roots:null,index:null,indirectBuffer:null};return t.cloneBuffers?(a.roots=i.map(l=>l.slice()),a.index=o?o.array.slice():null,a.indirectBuffer=r?r.slice():null):(a.roots=i,a.index=o?o.array:null,a.indirectBuffer=r),a}static deserialize(e,t,n={}){n={setIndex:!0,indirect:!!e.indirectBuffer,...n};let{index:i,roots:r,indirectBuffer:o}=e;e.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),l(r));let a=new s(t,{...n,[Ua]:!0});if(a._roots=r,a._indirectBuffer=o||null,n.setIndex){let c=t.getIndex();if(c===null){let h=new Nt(e.index,1,!1);t.setIndex(h)}else c.array!==i&&(c.array.set(i),c.needsUpdate=!0)}return a;function l(c){for(let h=0;h<c.length;h++){let f=c[h],u=new Uint32Array(f),d=new Uint16Array(f);for(let g=0,v=f.byteLength/32;g<v;g++){let p=8*g,m=2*p;at(m,d)||(u[p+6]=u[p+6]/8-g)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(e,t={}){t.maxLeafTris&&(console.warn('MeshBVH: "maxLeafTris" option has been deprecated. Use "targetLeafSize", instead.'),t={...t,targetLeafSize:t.maxLeafTris}),super(e,t)}shiftTriangleOffsets(e){return super.shiftPrimitiveOffsets(e)}writePrimitiveBounds(e,t,n){let i=this.geometry,r=this._indirectBuffer,o=i.attributes.position,a=i.index?i.index.array:null,c=(r?r[e]:e)*3,h=c+0,f=c+1,u=c+2;a&&(h=a[h],f=a[f],u=a[u]);for(let d=0;d<3;d++){let g=o[pd[d]](h),v=o[pd[d]](f),p=o[pd[d]](u),m=g;v<m&&(m=v),p<m&&(m=p);let x=g;v>x&&(x=v),p>x&&(x=p),t[n+d]=m,t[n+d+3]=x}return t}computePrimitiveBounds(e,t,n){let i=this.geometry,r=this._indirectBuffer,o=i.attributes.position,a=i.index?i.index.array:null,l=o.normalized;if(e<0||t+e-n.offset>n.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");let c=o.array,h=o.offset||0,f=3;o.isInterleavedBufferAttribute&&(f=o.data.stride);let u=["getX","getY","getZ"],d=n.offset;for(let g=e,v=e+t;g<v;g++){let m=(r?r[g]:g)*3,x=(g-d)*6,S=m+0,y=m+1,M=m+2;a&&(S=a[S],y=a[y],M=a[M]),l||(S=S*f+h,y=y*f+h,M=M*f+h);for(let T=0;T<3;T++){let _,b,R;l?(_=o[u[T]](S),b=o[u[T]](y),R=o[u[T]](M)):(_=c[S+T],b=c[y+T],R=c[M+T]);let w=_;b<w&&(w=b),R<w&&(w=R);let C=_;b>C&&(C=b),R>C&&(C=R);let I=(C-w)/2,U=T*2;n[x+U+0]=w+I,n[x+U+1]=I+(Math.abs(w)+I)*no}}return n}raycastObject3D(e,t,n=[]){let{material:i}=e;if(i===void 0)return;Cg.copy(e.matrixWorld).invert(),Rh.copy(t.ray).applyMatrix4(Cg),Pg.setFromMatrixScale(e.matrixWorld),Rg.copy(Rh.direction).multiply(Pg);let r=Rg.length(),o=t.near/r,a=t.far/r;if(t.firstHitOnly===!0){let l=this.raycastFirst(Rh,i,o,a);l=dd(l,e,t),l&&n.push(l)}else{let l=this.raycast(Rh,i,o,a);for(let c=0,h=l.length;c<h;c++){let f=dd(l[c],e,t);f&&n.push(f)}}return n}refit(e=null){return(this.indirect?Mg:dg)(this,e)}raycast(e,t=Yn,n=0,i=1/0){let r=this._roots,o=[],a=this.indirect?bg:_g;for(let l=0,c=r.length;l<c;l++)a(this,l,t,e,o,n,i);return o}raycastFirst(e,t=Yn,n=0,i=1/0){let r=this._roots,o=null,a=this.indirect?Tg:xg;for(let l=0,c=r.length;l<c;l++){let h=a(this,l,t,e,n,i);h!=null&&(o==null||h.distance<o.distance)&&(o=h)}return o}intersectsGeometry(e,t){let n=!1,i=this._roots,r=this.indirect?Eg:vg;for(let o=0,a=i.length;o<a&&(n=r(this,o,e,t),!n);o++);return n}shapecast(e){let t=Bn.getPrimitive(),n=super.shapecast({...e,intersectsPrimitive:e.intersectsTriangle,scratchPrimitive:t,iterate:this.indirect?gg:fg});return Bn.releasePrimitive(t),n}bvhcast(e,t,n){let{intersectsRanges:i,intersectsTriangles:r}=n,o=Bn.getPrimitive(),a=this.geometry.index,l=this.geometry.attributes.position,c=this.indirect?g=>{let v=this.resolveTriangleIndex(g);It(o,v*3,a,l)}:g=>{It(o,g*3,a,l)},h=Bn.getPrimitive(),f=e.geometry.index,u=e.geometry.attributes.position,d=e.indirect?g=>{let v=e.resolveTriangleIndex(g);It(h,v*3,f,u)}:g=>{It(h,g*3,f,u)};if(r){if(!(e instanceof s))throw new Error('MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.');let g=(v,p,m,x,S,y,M,T)=>{for(let _=m,b=m+x;_<b;_++){d(_),h.a.applyMatrix4(t),h.b.applyMatrix4(t),h.c.applyMatrix4(t),h.needsUpdate=!0;for(let R=v,w=v+p;R<w;R++)if(c(R),o.needsUpdate=!0,r(o,h,R,_,S,y,M,T))return!0}return!1};if(i){let v=i;i=function(p,m,x,S,y,M,T,_){return v(p,m,x,S,y,M,T,_)?!0:g(p,m,x,S,y,M,T,_)}}else i=g}return super.bvhcast(e,t,{intersectsRanges:i})}intersectsBox(e,t){return Ah.set(e.min,e.max,t),Ah.needsUpdate=!0,this.shapecast({intersectsBounds:n=>Ah.intersectsBox(n),intersectsTriangle:n=>Ah.intersectsTriangle(n)})}intersectsSphere(e){return this.shapecast({intersectsBounds:t=>e.intersectsBox(t),intersectsTriangle:t=>t.intersectsSphere(e)})}closestPointToGeometry(e,t,n={},i={},r=0,o=1/0){return(this.indirect?Ag:Sg)(this,e,t,n,i,r,o)}closestPointToPoint(e,t={},n=0,i=1/0){return sg(this,e,t,n,i)}};var DR=parseInt("187")>=166,_o={Mesh:le.prototype.raycast,Line:nn.prototype.raycast,LineSegments:Ki.prototype.raycast,LineLoop:gs.prototype.raycast,Points:_s.prototype.raycast,BatchedMesh:ko.prototype.raycast},_n=new le,Ph=[];function Ig(s,e){if(this.isBatchedMesh)GM.call(this,s,e);else{let{geometry:t}=this;if(t.boundsTree)t.boundsTree.raycastObject3D(this,s,e);else{let n;if(this instanceof le)n=_o.Mesh;else if(this instanceof Ki)n=_o.LineSegments;else if(this instanceof gs)n=_o.LineLoop;else if(this instanceof nn)n=_o.Line;else if(this instanceof _s)n=_o.Points;else throw new Error("BVH: Fallback raycast function not found.");n.call(this,s,e)}}}function GM(s,e){if(this.boundsTrees){let t=this.boundsTrees,n=this._drawInfo||this._instanceInfo,i=this._drawRanges||this._geometryInfo,r=this.matrixWorld;_n.material=this.material,_n.geometry=this.geometry;let o=_n.geometry.boundsTree,a=_n.geometry.drawRange;_n.geometry.boundingSphere===null&&(_n.geometry.boundingSphere=new $t);for(let l=0,c=n.length;l<c;l++){if(!this.getVisibleAt(l))continue;let h=n[l].geometryIndex;if(_n.geometry.boundsTree=t[h],this.getMatrixAt(l,_n.matrixWorld).premultiply(r),!_n.geometry.boundsTree){this.getBoundingBoxAt(h,_n.geometry.boundingBox),this.getBoundingSphereAt(h,_n.geometry.boundingSphere);let f=i[h];_n.geometry.setDrawRange(f.start,f.count)}_n.raycast(s,Ph);for(let f=0,u=Ph.length;f<u;f++){let d=Ph[f];d.object=this,d.batchId=l,e.push(d)}Ph.length=0}_n.geometry.boundsTree=o,_n.geometry.drawRange=a,_n.material=null,_n.geometry=null}else _o.BatchedMesh.call(this,s,e)}function Lg(s={}){let{type:e=Ch}=s;return this.boundsTree=new e(this,s),this.boundsTree}function Dg(){this.boundsTree=null}bt.prototype.computeBoundsTree=Lg;bt.prototype.disposeBoundsTree=Dg;le.prototype.raycast=Ig;var xo=.3048,Ng=1.6,WM=.22,Ug=.45,XM=3,Og="firstfloor3d-v1",Ni=new URLSearchParams(location.search),Xa=matchMedia("(pointer: coarse)").matches,Xe=s=>document.getElementById(s),xi=(s,e,t=0)=>new P(-e*xo,t*xo,s*xo),Fg=s=>({u:s.z/xo,v:-s.x/xo});async function qM(){let s=await(await fetch("plan.json")).json(),e=Xe("c"),t=new zc({canvas:e,antialias:!0,powerPreference:"high-performance"});t.setPixelRatio(Math.min(devicePixelRatio,Xa?1.5:2)),t.setSize(innerWidth,innerHeight),t.outputColorSpace=kt,t.toneMapping=js,t.toneMappingExposure=1.45,t.shadowMap.enabled=!0,t.shadowMap.type=Kl;let n=new Vs;n.background=ZM(),n.fog=new No(13620955,60,160);let i=new jr(t);n.environment=i.fromScene(new Yc,.04).texture,n.environmentIntensity=.35;let r=new en(Xa?70:65,innerWidth/innerHeight,.05,400);r.rotation.order="YXZ";let o=new Ko(16773600,10127992,.9);n.add(o);let a=new qs(16773340,2.6),l=xi(21.75,21.75,0);a.position.set(l.x-22,24,l.z+8),a.target.position.copy(l),a.castShadow=!0,a.shadow.mapSize.set(2048,2048),Object.assign(a.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:80}),a.shadow.bias=-4e-4,a.shadow.normalBias=.02,n.add(a,a.target);let c=[];for(let L of s.rooms){if(L.kind==="stair")continue;let[F,ie,Me,ze]=L.rect,ot=[],ct=ie-F,jn=ze-Me;L.id==="main_hall"?ot.push([11,17],[19,17],[28,17]):L.id.startsWith("store")&&L.id.length===6?ot.push([(F+ie)/2,26],[(F+ie)/2,33]):L.id==="west_path"?ot.push([8,40.6],[24,40.6]):ot.push([(F+ie)/2,(Me+ze)/2]);let Ui=Math.max(Math.min(ct,jn)*.5+2.5,5.5)*xo*(ot.length>1?1.25:1.15);for(let[Gn,Oi]of ot){let Ps=new ns(16769728,L.kind==="open"?0:5.5,Ui,1.2);Ps.position.copy(xi(Gn,Oi,s.heights.ceiling-.8)),n.add(Ps),c.push(Ps)}}let h=[],f=[],u=[],d=[],g=new Vc,v=document.querySelector('meta[name="model"]')?.content||"model.glb",p;if(v.endsWith(".b64.txt")){Xe("prog").firstChild.style.width="30%";let L=(await(await fetch(v)).text()).trim(),F=Uint8Array.from(atob(L),ie=>ie.charCodeAt(0));Xe("prog").firstChild.style.width="80%",p=await g.parseAsync(F.buffer,"")}else p=await g.loadAsync(v,L=>{L.total&&(Xe("prog").firstChild.style.width=`${100*L.loaded/L.total}%`)});let m=t.capabilities.getMaxAnisotropy(),x={};await Promise.all(["WALL","FLOOR","CEIL"].map(async L=>{try{let F=await new Ws().loadAsync(`lm_${L}.jpg`);F.flipY=!1,F.channel=1,F.colorSpace=kt,F.minFilter=Zt,F.generateMipmaps=!1,x[L]=F}catch{}}));let S=Object.keys(x).length>0,y=new Map,M=new Set,T=L=>{for(let F=L;F;F=F.parent)if(F.name?.startsWith("ITEM__"))return F;return null};p.scene.traverse(L=>{if(L.name?.startsWith("ITEM__")&&!L.isMesh){let F=L.name.slice(6);y.set(F,{id:F,node:L,label:L.userData.label||F,layer:L.userData.layer||"furniture",home:{pos:L.position.clone(),rotY:L.rotation.y},meshes:[]})}}),p.scene.traverse(L=>{if(!L.isMesh)return;let F=(L.name||"").split("__")[0],ie=L.material?.name||"",Me=T(L);Me&&y.get(Me.name.slice(6))?.meshes.push(L),d.push(L),L.castShadow=!["FLOOR","SITE","LIGHT","DECO","GLASS","MEP","ELEC","FCEIL"].includes(F),L.receiveShadow=F!=="LIGHT"&&F!=="GLASS";let ze=L.material;for(let ot of["map","normalMap"])ze[ot]&&(ze[ot].anisotropy=m);L.userData.lm&&x[L.userData.lm]&&(ze=L.material=new hn({name:ie,map:ze.map,color:ze.color,lightMap:x[L.userData.lm],lightMapIntensity:XM*Math.PI})),ie.startsWith("glass")&&(ze=L.material=new ni({color:ie==="glass"?13624298:15265520,roughness:ie==="glass"?.05:.4,metalness:0,transparent:!0,opacity:ie==="glass"?.16:.65,depthWrite:!1,envMapIntensity:1.2}),L.castShadow=!1),ie==="mirror"&&(ze.metalness=1,ze.roughness=.02,ze.envMapIntensity=1.5),F==="LIGHT"&&(ze.emissiveIntensity=ie==="cove"?2.2:2.6),["WALL","FURN","DOOR","GLASS"].includes(F)&&h.push(L),["FLOOR","SITE"].includes(F)&&f.push(L),["CEIL","UPPER"].includes(F)&&!Me&&u.push(L),(["WALL","CEIL","FCEIL","DOOR"].includes(F)||F==="FLOOR"&&!Me)&&M.add(ze),L.userData.cat=F});let _=YM();for(let L of y.values()){if(L.layer!=="furniture")continue;let F=new it().setFromObject(L.node),ie=F.getSize(new P);if(F.min.y>.25||F.min.y<-.2||ie.y<.12)continue;let Me=new le(new ji(ie.x+.3,ie.z+.3),new hn({map:_,transparent:!0,opacity:.55,depthWrite:!1,color:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));Me.rotation.x=-Math.PI/2,Me.position.y=.012-(F.min.y-.01),Me.position.y=.012,Me.renderOrder=1,Me.userData.cat="SHADOW",L.node.add(Me)}n.add(p.scene);for(let L of[...h,...f])L.geometry.computeBoundsTree();Xe("loading").style.display="none";let b=new jc(t);b.addPass(new Jc(n,r));let R=new Ca(n,r,innerWidth,innerHeight);R.updateGtaoMaterial({radius:.45,distanceExponent:1.5,thickness:1.2,scale:1,samples:12}),R.blendIntensity=.85,b.addPass(R);let w=new to(new pe(innerWidth,innerHeight),.22,.55,.92);b.addPass(w),b.addPass(new eh);let C=Ni.has("hq")?Ni.get("hq")!=="0":!Xa,I=L=>{C=L,Xe("bHQ").setAttribute("aria-pressed",String(L)),t.shadowMap.enabled=L,a.castShadow=L,n.traverse(F=>{F.material&&(F.material.needsUpdate=!0)})};I(C);let U=new P,D=0,B=0,H="walk",G=0,ee=new qc(r,e);ee.enabled=!1,ee.enableDamping=!0,ee.maxPolarAngle=Math.PI*.47,ee.minDistance=4,ee.maxDistance=45;function V(L,F){let ie=new P().subVectors(F,L);D=Math.atan2(-ie.x,-ie.z),B=Math.atan2(ie.y,Math.hypot(ie.x,ie.z))*.5}function Q(L){let F=s.views[L];if(!F)return;if(F.hide||L==="aerial"){de("overview",F);return}let ie=xi(...F.eye),Me=xi(...F.look);U.set(ie.x,ie.y-Ng,ie.z),Se(!0),V(ie,Me),de("walk")}function ne(L){let F=s.rooms.find(ct=>ct.id===L);if(!F)return;let[ie,Me,ze,ot]=F.rect;U.copy(xi((ie+Me)/2,(ze+ot)/2,0)),Se(!0),D=Me-ie>ot-ze?0:-Math.PI/2,B=-.05,de("walk")}function de(L,F){H=L,Xe("bWalk").setAttribute("aria-pressed",String(L==="walk")),Xe("bOver").setAttribute("aria-pressed",String(L==="overview"));for(let ie of u)ie.visible=L==="walk";for(let ie of y.values())ie.layer==="false_ceiling"&&(ie.node.visible=L==="walk"&&Je.false_ceiling&&!(St[ie.id]||{}).hidden);if(Le(),ee.enabled=L==="overview",Xe("cross").style.display=L==="walk"?"block":"none",Xe("labels").style.display=L==="overview"?"block":"none",L==="overview"){document.pointerLockElement&&document.exitPointerLock(),ee.target.copy(xi(21.75,21.75,0));let ie=F?xi(...F.eye):innerWidth<innerHeight?xi(68,62,70):xi(52,50,40);r.position.copy(ie),r.lookAt(ee.target),ee.update()}E()}let we=new Ys;we.firstHitOnly=!0;let $=new P(0,-1,0);function ue(L,F=.7){we.set(new P(L.x,L.y+F,L.z),$),we.far=30;let ie=we.intersectObjects(f,!1)[0];return ie?ie.point.y:null}function Se(L){let F=ue(U,L?3.5:Ug+.05);F!==null&&(U.y=F)}let Ee=h,me=L=>{for(let F=L;F;F=F.parent)if(!F.visible)return!1;return!0};function Le(){Ee=h.filter(me)}function rt(L,F,ie){for(let Me of[.35,1,1.5])if(we.set(new P(L.x,L.y+Me,L.z),F),we.far=ie+WM,we.intersectObjects(Ee,!1).length)return!0;return!1}function Be(L){let F=L.length();if(F<1e-5)return;let ie=L.clone().normalize();if(!rt(U,ie,F)){U.add(L);return}for(let Me of[new P(Math.sign(L.x),0,0),new P(0,0,Math.sign(L.z))]){let ze=Math.abs(Me.x?L.x:L.z);if(ze>1e-5&&!rt(U,Me,ze)){U.addScaledVector(Me,ze);return}}}let He=new Set;addEventListener("keydown",L=>{L.target.tagName!=="SELECT"&&(He.add(L.code),L.code==="KeyO"&&de(H==="walk"?"overview":"walk"))}),addEventListener("keyup",L=>He.delete(L.code)),addEventListener("blur",()=>He.clear());let Ye=null,Oe=null,Lt=Xe("joy");e.addEventListener("click",()=>{if(H==="walk"&&!Gt&&!Xa&&!document.pointerLockElement&&e.requestPointerLock)try{e.requestPointerLock()}catch{}}),document.addEventListener("mousemove",L=>{H==="walk"&&document.pointerLockElement===e&&(D-=L.movementX*.0023,B=as.clamp(B-L.movementY*.0023,-1.35,1.35))});let vt=null;e.addEventListener("pointerdown",L=>{vt={x:L.clientX,y:L.clientY},!(H!=="walk"||document.pointerLockElement||wt.dragging||wt.axis)&&(L.pointerType==="touch"&&L.clientX<innerWidth*.45&&!Oe?(Oe={id:L.pointerId,x0:L.clientX,y0:L.clientY,dx:0,dy:0},Object.assign(Lt.style,{display:"block",left:`${L.clientX}px`,top:`${L.clientY}px`})):Ye||(Ye={id:L.pointerId,x:L.clientX,y:L.clientY}),e.setPointerCapture(L.pointerId))}),e.addEventListener("pointermove",L=>{if(Oe&&L.pointerId===Oe.id){let F=L.clientX-Oe.x0,ie=L.clientY-Oe.y0,Me=Math.min(1,Math.hypot(F,ie)/50),ze=Math.atan2(ie,F);Oe.dx=Math.cos(ze)*Me,Oe.dy=Math.sin(ze)*Me,Lt.firstChild.style.transform=`translate(${Oe.dx*32}px, ${Oe.dy*32}px)`}else if(Ye&&L.pointerId===Ye.id){let F=L.pointerType==="touch"?.005:.004;D+=(L.clientX-Ye.x)*F,B=as.clamp(B+(L.clientY-Ye.y)*F,-1.35,1.35),Ye.x=L.clientX,Ye.y=L.clientY}});let Yt=L=>{Gt&&vt&&L.type==="pointerup"&&Math.hypot(L.clientX-vt.x,L.clientY-vt.y)<6&&!wt.dragging&&De(L),vt=null,Oe&&L.pointerId===Oe.id&&(Oe=null,Lt.style.display="none",Lt.firstChild.style.transform=""),Ye&&L.pointerId===Ye.id&&(Ye=null)};e.addEventListener("pointerup",Yt),e.addEventListener("pointercancel",Yt),e.addEventListener("dblclick",L=>{if(H!=="overview")return;let F=new pe(L.clientX/innerWidth*2-1,-(L.clientY/innerHeight)*2+1);we.setFromCamera(F,r),we.far=500;let ie=we.intersectObjects(f,!1)[0];ie&&(U.copy(ie.point),de("walk"))});let pt=[["furniture","Furniture"],["false_ceiling","False ceiling"],["water","Water lines"],["electrical","Electric lines"],["xray","X-ray walls"]],dn=(()=>{try{return JSON.parse(localStorage.getItem(Og))||{}}catch{return{}}})(),Je=Object.assign({furniture:!0,false_ceiling:!0,water:!1,electrical:!1,xray:!1},dn.layers),St=dn.edits||{},Vt=()=>{try{localStorage.setItem(Og,JSON.stringify({layers:Je,edits:St}))}catch{}},Gt=!1,z=null,wt=new rh(r,e);wt.setMode("translate"),wt.showY=!1,wt.setSize(.9),n.add(wt.getHelper());let et=new ta(new dt,14722136);et.visible=!1,n.add(et),wt.addEventListener("dragging-changed",L=>{ee.enabled=H==="overview"&&!L.value,!L.value&&z&&(ge(z),Le())});function st(){for(let L of y.values()){let F=St[L.id]||{};L.node.position.set(L.home.pos.x+(F.dx||0),L.home.pos.y,L.home.pos.z+(F.dz||0)),L.node.rotation.y=L.home.rotY+(F.r||0),L.node.visible=!!Je[L.layer]&&!F.hidden}for(let L of M)L.transparent=Je.xray,L.opacity=Je.xray?.22:1,L.depthWrite=!Je.xray,L.needsUpdate=!0;for(let[L]of pt){let F=Xe("ly_"+L);F&&(F.checked=!!Je[L])}Xe("nRemoved").textContent=Object.values(St).filter(L=>L.hidden).length,Le()}function ge(L){let F=St[L.id]||(St[L.id]={});F.dx=L.node.position.x-L.home.pos.x,F.dz=L.node.position.z-L.home.pos.z,F.r=L.node.rotation.y-L.home.rotY,Vt()}function lt(L){z=L,L?(wt.attach(L.node),et.setFromObject(L.node),et.visible=!0,Xe("selName").textContent=L.label):(wt.detach(),et.visible=!1,Xe("selName").textContent="Tap an object to select it");for(let F of["bRot","bDel","bHome"])Xe(F).disabled=!L}function De(L){let F=new pe(L.clientX/innerWidth*2-1,-(L.clientY/innerHeight)*2+1);we.setFromCamera(F,r),we.far=200;let ie=[];for(let ct of y.values())ct.node.visible&&ie.push(...ct.meshes);let Me=Je.xray?[]:d.filter(ct=>!T(ct)&&me(ct)&&["WALL","CEIL","DOOR"].includes(ct.userData.cat)),ze=we.intersectObjects([...ie,...Me],!1)[0],ot=ze&&T(ze.object);lt(ot?y.get(ot.name.slice(6)):null)}function ke(L){Gt=L,Xe("bEdit").setAttribute("aria-pressed",String(L)),Xe("editp").hidden=!L,L&&document.pointerLockElement&&document.exitPointerLock(),L||lt(null),E()}Xe("bEdit").onclick=()=>ke(!Gt),Xe("bLayers").onclick=()=>{Xe("layers").hidden=!Xe("layers").hidden,Xe("bLayers").setAttribute("aria-pressed",String(!Xe("layers").hidden))},Xe("layerList").innerHTML=pt.map(([L,F])=>`<label><input type="checkbox" id="ly_${L}"> ${F}</label>`).join("");for(let[L]of pt)Xe("ly_"+L).onchange=F=>{Je[L]=F.target.checked,(L==="water"||L==="electrical")&&F.target.checked&&(Je.xray=!0),z&&!Je[z.layer]&&lt(null),st(),Vt()};Xe("bRot").onclick=()=>{z&&(z.node.rotation.y+=Math.PI/2,ge(z),Le())},Xe("bDel").onclick=()=>{z&&((St[z.id]||(St[z.id]={})).hidden=!0,lt(null),st(),Vt())},Xe("bHome").onclick=()=>{z&&(delete St[z.id],st(),Vt(),et.setFromObject(z.node))},Xe("bRestore").onclick=()=>{for(let L of Object.keys(St))delete St[L];lt(null),st(),Vt()},Xe("bCopy").onclick=async()=>{let L=JSON.stringify({layers:Je,edits:St},null,1);try{await navigator.clipboard.writeText(L),Xe("bCopy").textContent="Copied"}catch{Xe("bCopy").textContent="Copy failed"}setTimeout(()=>{Xe("bCopy").textContent="Copy layout"},1500)},Xe("bWalk").onclick=()=>de("walk"),Xe("bOver").onclick=()=>de("overview"),Xe("bHQ").onclick=()=>I(!C);let N=Xe("goto");N.innerHTML='<option value="">Go to\u2026</option>'+Object.entries(s.views).map(([L,F])=>`<option value="v:${L}">${F.label}</option>`).join("")+'<optgroup label="Rooms">'+s.rooms.filter(L=>L.kind!=="stair").map(L=>`<option value="r:${L.id}">${L.label}${L.size?` (${L.size})`:""}</option>`).join("")+"</optgroup>",N.onchange=()=>{let[L,F]=N.value.split(":");L==="v"?Q(F):L==="r"&&ne(F),N.value="",N.blur()};function E(){Xe("help").textContent=Gt?"Edit: tap an object to select it \xB7 drag the arrows to move \xB7 Rotate / Remove in the panel \xB7 changes are saved on this device":H==="walk"?Xa?"Left thumb: move \xB7 right side: look \xB7 tap the map to jump":"Click to look with the mouse \xB7 WASD / arrows to walk \xB7 Shift to run \xB7 Esc to free the mouse \xB7 O = overview":"Drag to orbit \xB7 scroll / pinch to zoom \xB7 double-click a floor or a label to walk there"}let W=s.rooms.filter(L=>!["open_space","walk_path","up_stair","down_stair","kitchen_out"].includes(L.id)).map(L=>{let F=document.createElement("div");F.className="lbl",F.innerHTML=`${L.label}${L.size?`<small>${L.size}</small>`:""}`,F.onclick=()=>ne(L.id),Xe("labels").appendChild(F);let[ie,Me,ze,ot]=L.rect;return{el:F,p:xi((ie+Me)/2,(ze+ot)/2,1)}}),re=Xe("map"),K=re.getContext("2d"),se=re.width,ce=26,Y=(se-2*ce)/43.5,j=L=>ce+L*Y,ae=L=>ce+L*Y,O=document.createElement("canvas");O.width=O.height=se,te(O.getContext("2d"));function te(L){let F={room:"#e9e4da",open:"#cfd3cf",stair:"#b9bfc3"},ie={master_bedroom:"#f3d9c4",kitchen:"#d8ead9",main_hall:"#e2dcef",master_bath:"#d5e5ec",storeroom_bath:"#d5e5ec",common_bath:"#d5e5ec",store_room:"#e8e8e2"};L.fillStyle="rgba(0,0,0,0)",L.clearRect(0,0,se,se);for(let Me of s.rooms){let[ze,ot,ct,jn]=Me.rect;L.fillStyle=ie[Me.id]||F[Me.kind],L.fillRect(j(ze),ae(ct),(ot-ze)*Y,(jn-ct)*Y)}for(let Me of s.walls){let[ze,ot,ct,jn]=Me.rect;L.fillStyle=Me.kind==="parapet"?"#8d959b":"#2c3237",L.fillRect(j(ze),ae(ct),(ot-ze)*Y,(jn-ct)*Y);let Ui=ot-ze>=jn-ct;for(let Gn of Me.openings)L.fillStyle=Gn[0]==="door"?"#e9e4da":Gn[0]==="shutter"?"#e0a458":"#8fd0ff",Ui?L.fillRect(j(Gn[1]),ae(ct),(Gn[2]-Gn[1])*Y,(jn-ct)*Y):L.fillRect(j(ze),ae(Gn[1]),(ot-ze)*Y,(Gn[2]-Gn[1])*Y)}L.fillStyle="#eef1f3",L.font="600 20px system-ui, sans-serif",L.textAlign="center",L.textBaseline="middle",L.fillText("E",se/2,12),L.fillText("W",se/2,se-11),L.fillText("N",11,se/2),L.fillText("S",se-11,se/2)}function J(){K.clearRect(0,0,se,se),K.drawImage(O,0,0);let L=Fg(H==="walk"?U:r.position),F=j(L.u),ie=ae(L.v),Me=-Math.sin(H==="walk"?D:_e()),ze=-Math.cos(H==="walk"?D:_e()),ot=Math.atan2(-Me,ze);K.save(),K.translate(F,ie),K.rotate(ot),K.fillStyle="rgba(224,164,88,0.35)",K.beginPath(),K.moveTo(0,0),K.arc(0,0,46,-.55,.55),K.closePath(),K.fill(),K.fillStyle="#e0a458",K.strokeStyle="#1a1208",K.lineWidth=2,K.beginPath(),K.arc(0,0,8,0,Math.PI*2),K.fill(),K.stroke(),K.restore()}let _e=()=>Math.atan2(r.position.x-ee.target.x,r.position.z-ee.target.z)+Math.PI;re.addEventListener("pointerdown",L=>{let F=re.getBoundingClientRect(),ie=((L.clientX-F.left)/F.width*se-ce)/Y,Me=((L.clientY-F.top)/F.height*se-ce)/Y;ie<0||Me<0||ie>43.5||Me>43.5||(U.copy(xi(ie,Me,2)),Se(!0),de("walk"))});function he(L,F){let ie=null;for(let Me of s.rooms){let[ze,ot,ct,jn]=Me.rect;if(L>=ze&&L<=ot&&F>=ct&&F<=jn){let Ui=(ot-ze)*(jn-ct);(!ie||Ui<ie.a)&&(ie={r:Me,a:Ui})}}return ie?.r}let fe="";function Ne(){if(H==="overview"){fe!=="#"&&(Xe("room").textContent="Overview",Xe("size").textContent="Inside sizes in feet",fe="#");return}let L=Fg(U),F=he(L.u,L.v),ie=F?F.id:U.y<-1?"ground":"outside";ie!==fe&&(fe=ie,Xe("room").textContent=F?F.label:ie==="ground"?"Ground level (road side)":"Outside",Xe("size").textContent=F?.size?`${F.size} inside`:"")}let Ze=new ea,oe=new P;function Fe(){let L=Math.min(Ze.getDelta(),.05);if(H==="walk"){let F=0,ie=0;(He.has("KeyW")||He.has("ArrowUp"))&&(F+=1),(He.has("KeyS")||He.has("ArrowDown"))&&(F-=1),He.has("KeyD")&&(ie+=1),He.has("KeyA")&&(ie-=1),He.has("ArrowLeft")&&(D+=1.8*L),He.has("ArrowRight")&&(D-=1.8*L),Oe&&(F-=Oe.dy,ie+=Oe.dx);let Me=(He.has("ShiftLeft")||He.has("ShiftRight")?3.2:1.5)*L,ze=Math.sin(D),ot=Math.cos(D);oe.set(-ze*F+ot*ie,0,-ot*F-ze*ie),oe.lengthSq()>1&&oe.normalize(),Be(oe.multiplyScalar(Me));let ct=ue(U,Ug+.05);ct!==null&&ct>=U.y-.05?(U.y+=(ct-U.y)*Math.min(1,L*14),G=0):(G-=9.8*L,U.y=Math.max(ct??-50,U.y+G*L),ct!==null&&U.y<=ct&&(G=0)),r.position.set(U.x,U.y+Ng,U.z),r.rotation.set(B,D,0)}else{ee.update();let F=new P;for(let ie of W){F.copy(ie.p).project(r);let Me=F.z<1;ie.el.style.display=Me?"block":"none",Me&&(ie.el.style.transform=`translate(-50%,-50%) translate(${(F.x*.5+.5)*innerWidth}px, ${(-F.y*.5+.5)*innerHeight}px)`),ie.el.style.left="0",ie.el.style.top="0"}}z&&et.update(),C?b.render():t.render(n,r),J(),Ne(),window.__frames=(window.__frames||0)+1,Ni.has("still")&&window.__frames>=Number(Ni.get("still")||4)||requestAnimationFrame(Fe)}if(addEventListener("resize",()=>{r.aspect=innerWidth/innerHeight,r.updateProjectionMatrix(),t.setSize(innerWidth,innerHeight),b.setSize(innerWidth,innerHeight),w.setSize(innerWidth,innerHeight)}),st(),lt(null),Ni.get("layers")){for(let L of Ni.get("layers").split(","))Je[L]=!0;(Je.water||Je.electrical)&&(Je.xray=!0),st()}window.__viewer={gotoView:Q,gotoRoom:ne,setMode:de,setHQ:I,setEdit:ke,select:lt,items:y,feet:U,plan:s},Ni.get("mode")==="overview"?de("overview"):Q(Ni.get("view")||s.spawn),Ni.get("room")&&ne(Ni.get("room")),E(),Fe(),window.__ready=!0}function YM(){let s=document.createElement("canvas");s.width=s.height=128;let e=s.getContext("2d"),t=e.createImageData(128,128);for(let n=0;n<128;n++)for(let i=0;i<128;i++){let r=Math.max(0,Math.abs(i-63.5)/63.5-.62)/.38,o=Math.max(0,Math.abs(n-63.5)/63.5-.62)/.38,a=Math.max(0,1-Math.hypot(r,o));t.data.set([255,255,255,255*a*a],(n*128+i)*4)}return e.putImageData(t,0,0),new Ur(s)}function ZM(){let s=document.createElement("canvas");s.width=2,s.height=256;let e=s.getContext("2d"),t=e.createLinearGradient(0,0,0,256);t.addColorStop(0,"#5f8fc9"),t.addColorStop(.55,"#a9c3dc"),t.addColorStop(.75,"#e4ddd0"),t.addColorStop(1,"#cfc3ae"),e.fillStyle=t,e.fillRect(0,0,2,256);let n=new Ur(s);return n.colorSpace=kt,n.mapping=Wr,n}qM().catch(s=>{console.error(s),document.querySelector("#loading .box").textContent=`Could not load the model: ${s.message}`});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
