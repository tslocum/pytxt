var style_cookie;
var style_cookie_txt;
var style_cookie_site;
var kumod_set = false;
var ispage;
var lastid;

/* IE/Opera fix, because they need to go learn a book on how to use indexOf with arrays */
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/) {
	var len = this.length;

	var from = Number(arguments[1]) || 0;
	from = (from < 0)
		 ? Math.ceil(from)
		 : Math.floor(from);
	if (from < 0)
	  from += len;

	for (; from < len; from++) {
	  if (from in this &&
		  this[from] === elt)
		return from;
	}
	return -1;
  };
}

/**
*
*  UTF-8 data encode / decode
*  http://www.webtoolkit.info/
*
**/

var Utf8 = {

	// public method for url encoding
	encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	},

	// public method for url decoding
	decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}

		return string;
	}

}

function replaceAll( str, from, to ) {
	var idx = str.indexOf( from );
	while ( idx > -1 ) {
		str = str.replace( from, to );
		idx = str.indexOf( from );
	}
	return str;
}

function insert(text) {
	var textarea=document.forms.postform.message;
	if(textarea) {
		if(textarea.createTextRange && textarea.caretPos) { // IE 
			var caretPos=textarea.caretPos;
			caretPos.text=caretPos.text.charAt(caretPos.text.length-1)==" "?text+" ":text;
		} else if(textarea.setSelectionRange) { // Firefox 
			var start=textarea.selectionStart;
			var end=textarea.selectionEnd;
			textarea.value=textarea.value.substr(0,start)+text+textarea.value.substr(end);
			textarea.setSelectionRange(start+text.length,start+text.length);
		} else {
			textarea.value+=text+" ";
		}
		textarea.focus();
	}
}

function quote(b, a) { 
	var v = eval("document." + a + ".message");
	v.value += ">>" + b + "\n";
	v.focus();
}

function checkhighlight() {
	var match;

	if(match=/#i([0-9]+)/.exec(document.location.toString()))
	if(!document.forms.postform.message.value)
	insert(">>"+match[1]);

	if(match=/#([0-9]+)/.exec(document.location.toString()))
	highlight(match[1]);
}

function highlight(post, checknopage) {
	if (checknopage && ispage) {
		return;
	}
	var cells = document.getElementsByTagName("td");
	for(var i=0;i<cells.length;i++) if(cells[i].className == "highlight") cells[i].className = "reply";

	var reply = document.getElementById("reply" + post);
	if(reply) {
		reply.className = "highlight";
		var match = /^([^#]*)/.exec(document.location.toString());
		document.location = match[1] + "#" + post;
	}
}

function get_password(name) {
	var pass = getCookie(name);
	if(pass) return pass;

	var chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	var pass='';

	for(var i=0;i<8;i++) {
		var rnd = Math.floor(Math.random()*chars.length);
		pass += chars.substring(rnd, rnd+1);
	}
	set_cookie(name, pass, 365);
	return(pass);
}

function togglePassword() {
	/* Now IE/Opera safe */
	var bSaf = (navigator.userAgent.indexOf('Safari') != -1);
	var bOpera = (navigator.userAgent.indexOf('Opera') != -1);
	var bMoz = (navigator.appName == 'Netscape');
	var passwordbox = document.getElementById("passwordbox");
	var passwordbox_html;
	
	if ((bSaf) || (bOpera) || (bMoz))
		passwordbox_html = passwordbox.innerHTML;
	else passwordbox_html = passwordbox.text;
	
	passwordbox_html = passwordbox_html.toLowerCase();
	var newhtml = '<td></td><td></td>';
	
	if (passwordbox_html == newhtml) {
		var newhtml = '<td class="postblock">Mod</td><td><input type="text" name="modpassword" size="28" maxlength="75">&nbsp;<acronym title="Distplay staff status (Mod/Admin)">D</acronym>:&nbsp;<input type="checkbox" name="displaystaffstatus" checked>&nbsp;<acronym title="Lock">L</acronym>:&nbsp;<input type="checkbox" name="lockonpost">&nbsp;&nbsp;<acronym title="Sticky">S</acronym>:&nbsp;<input type="checkbox" name="stickyonpost">&nbsp;&nbsp;<acronym title="Raw HTML">RH</acronym>:&nbsp;<input type="checkbox" name="rawhtml">&nbsp;&nbsp;<acronym title="Name">N</acronym>:&nbsp;<input type="checkbox" name="usestaffname"></td>';
	}
	
	if ((bSaf) || (bOpera) || (bMoz))
		passwordbox.innerHTML = newhtml;
	else passwordbox.text = newhtml;
		
	return false;
}

function toggleOptions(threadid, formid, board) {
	if (document.getElementById('opt' + threadid)) {
		if (document.getElementById('opt' + threadid).style.display == '') {
			document.getElementById('opt' + threadid).style.display = 'none';
			document.getElementById('opt' + threadid).innerHTML = '';
		} else {
			var newhtml = '<td class="label"><label for="formatting">Formatting:</label></td><td colspan="3"><select name="formatting"><option value="" onclick="javascript:document.getElementById(\'formattinginfo' + threadid + '\').innerHTML = \'All formatting is performed by the user.\';">Normal</option><option value="aa" onclick="javascript:document.getElementById(\'formattinginfo' + threadid + '\').innerHTML = \'[aa] and [/aa] will surround your message.\';"';
			if (getCookie('kuformatting') == 'aa') {
				newhtml += ' selected';
			}
			newhtml += '>Text Art</option></select> <input type="checkbox" name="rememberformatting"><label for="rememberformatting">Remember</label> <span id="formattinginfo' + threadid + '">';
			if (getCookie('kuformatting') == 'aa') {
				newhtml += '[aa] and [/aa] will surround your message.';
			} else {
				newhtml += 'All formatting is performed by the user.';
			}
			newhtml += '</span></td><td><input type="button" value="Preview" class="submit" onclick="javascript:postpreview(\'preview' + threadid + '\', \'' + board + '\', \'' + threadid + '\', document.' + formid + '.message.value);"></td>';
			
			document.getElementById('opt' + threadid).innerHTML = newhtml;
			document.getElementById('opt' + threadid).style.display = '';
		}
	}
}

function getCookie(name) {
	with(document.cookie) {
		var regexp=new RegExp("(^|;\\s+)"+name+"=(.*?)(;|$)");
		var hit=regexp.exec(document.cookie);
		if(hit&&hit.length>2) return Utf8.decode(unescape(replaceAll(hit[2],'+','%20')));
		else return '';
	}
}

function set_cookie(name,value,days) {
	if(days) {
		var date=new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires="; expires="+date.toGMTString();
	} else expires="";
	document.cookie=name+"="+value+expires+"; path=/";
}

function set_stylesheet(styletitle, txt, site) {
	if (txt) {
		set_cookie("kustyle_txt",styletitle,365);
	} else if (site) {
		set_cookie("kustyle_site",styletitle,365);
	} else {
		set_cookie("kustyle",styletitle,365);
	}

	var links=document.getElementsByTagName("link");
	var found=false;
	for(var i=0;i<links.length;i++) {
		var rel=links[i].getAttribute("rel");
		var title=links[i].getAttribute("title");
		
		if(rel.indexOf("style")!=-1&&title) {
			links[i].disabled=true; // IE needs this to work. IE needs to die.
			if(styletitle==title) { links[i].disabled=false; found=true; }
		}
	}
	if(!found) set_preferred_stylesheet();
}

function set_preferred_stylesheet() {
	var links=document.getElementsByTagName("link");
	for(var i=0;i<links.length;i++) {
		var rel=links[i].getAttribute("rel");
		var title=links[i].getAttribute("title");
		if(rel.indexOf("style")!=-1&&title) links[i].disabled=(rel.indexOf("alt")!=-1);
	}
}

function get_active_stylesheet() {
	var links=document.getElementsByTagName("link");
	for(var i=0;i<links.length;i++) {
		var rel=links[i].getAttribute("rel");
		var title=links[i].getAttribute("title");
		if(rel.indexOf("style")!=-1&&title&&!links[i].disabled) return title;
	}
	
	return null;
}

function get_preferred_stylesheet() {
	var links=document.getElementsByTagName("link");
	for(var i=0;i<links.length;i++) {
		var rel=links[i].getAttribute("rel");
		var title=links[i].getAttribute("title");
		if(rel.indexOf("style")!=-1&&rel.indexOf("alt")==-1&&title) return title;
	}
	
	return null;
}

function delandbanlinks() {
	if (!kumod_set) return;
	
	var dnbelements = document.getElementsByTagName('span');
	var dnbelement;
	var dnbinfo;
	for(var i=0;i<dnbelements.length;i++){
		dnbelement = dnbelements[i];
		if (dnbelement.getAttribute('class')) {
			if (dnbelement.getAttribute('class').substr(0, 3) == 'dnb') {
				dnbinfo = dnbelement.getAttribute('class').split('|');
				var newhtml = '&#91;<a href="/admin/delete/' + dnbinfo[1] + '" title="Delete" onclick="return confirm(\'Are you sure you want to delete this post/thread?\');">D<\/a>&nbsp;<a href="/admin/ban/' + dnbinfo[1] + '">B<\/a>&#93;';
				
				dnbelements[i].innerHTML = newhtml;
			}
		}
	}
}

function togglethread(threadid) {
	if (hiddenthreads.toString().indexOf(threadid)!==-1) {
		document.getElementById('unhidethread' + threadid).style.display = 'none';
		document.getElementById('thread' + threadid).style.display = 'block';
		hiddenthreads.splice(hiddenthreads.indexOf(threadid),1);
		set_cookie('hiddenthreads',hiddenthreads.join('!'),30);
	} else {
		document.getElementById('unhidethread' + threadid).style.display = 'block';
		document.getElementById('thread' + threadid).style.display = 'none';
		hiddenthreads.push(threadid);
		set_cookie('hiddenthreads',hiddenthreads.join('!'),30);
	}
	return false;
}

function toggleblotter(save) {
	var elem = document.getElementsByTagName('li');
	var arr = new Array();
	var blotterentry;
	for(i = 0,iarr = 0; i < elem.length; i++) {
		att = elem[i].getAttribute('class');
		if(att == 'blotterentry') {
			blotterentry = elem[i];
			if (blotterentry.style.display == 'none') {
				blotterentry.style.display = '';
				if (save) {
					set_cookie('ku_showblotter', '1', 365);
				}
			} else {
				blotterentry.style.display = 'none';
				if (save) {
					set_cookie('ku_showblotter', '0', 365);
				}
			}
		}
	}
}

function expandthread(threadid, board) {
	if (document.getElementById('replies' + threadid + board)) {
		var repliesblock = document.getElementById('replies' + threadid + board);
		repliesblock.innerHTML = 'Expanding thread...<br><br>' + repliesblock.innerHTML;
		
		new Ajax.Request(ku_boardspath + '/expand.php?board=' + board + '&threadid=' + threadid,
		{
			method:'get',
			onSuccess: function(transport){
				var response = transport.responseText || "something went wrong (blank response)";
				repliesblock.innerHTML = response;
				
				addpreviewevents();
				delandbanlinks();
			},
			onFailure: function(){ alert('Something went wrong...') }
		});
	}
	
	return false;
}

function quickreply(threadid) {
	if (threadid == 0) {
		document.getElementById('posttypeindicator').innerHTML = 'new thread'
	} else {
		document.getElementById('posttypeindicator').innerHTML = 'reply to ' + threadid + ' [<a href="#postbox" onclick="javascript:quickreply(\'0\');" title="Cancel">x</a>]';
	}

	document.postform.replythread.value = threadid;
}

function startPostSpyTimeout(threadid, board, thelastid) {
	var postspy = getCookie('postspy');
	if (postspy == '1') {
		if (document.getElementById('thread' + threadid + board)) {
			lastid = thelastid;
			
			setTimeout('postSpy(' + threadid + ', "' + board + '");', 10000);
		}
	}
}

function postSpy(threadid, board) {
	var threadblock = document.getElementById('thread' + threadid + board);
	
	new Ajax.Request(ku_boardspath + '/expand.php?board=' + board + '&threadid=' + threadid + '&pastid=' + lastid,
	{
		method:'get',
		onSuccess: function(transport){
			var response = transport.responseText;
			var response_split = response.split('|');
			newlastid = response_split[0];
			
			if (newlastid != '') {
				lastid = newlastid;
				
				response = response.substr((newlastid.length + 1));
				threadblock.innerHTML += response;
				
				addpreviewevents();
				delandbanlinks();
			}
			
			setTimeout('postSpy(' + threadid + ', "' + board + '");', 5000);
		},
		onFailure: function(){ alert('Something went wrong...') }
	});
}

function getwatchedthreads(threadid, board) {
	if (document.getElementById('watchedthreadlist')) {
		var watchedthreadbox = document.getElementById('watchedthreadlist');
		
		watchedthreadbox.innerHTML = 'Loading watched threads...';

		new Ajax.Request(ku_boardspath + '/threadwatch.php?board=' + board + '&threadid=' + threadid,
		{
			method:'get',
			onSuccess: function(transport){
				var response = transport.responseText || "something went wrong (blank response)";
				watchedthreadbox.innerHTML = response;
			},
			onFailure: function(){ alert('Something went wrong...') }
		});
	}
}

function addtowatchedthreads(threadid, board) {
	if (document.getElementById('watchedthreadlist')) {
		new Ajax.Request(ku_boardspath + '/threadwatch.php?do=addthread&board=' + board + '&threadid=' + threadid,
		{
			method:'get',
			onSuccess: function(transport){
				var response = transport.responseText || "something went wrong (blank response)";
				alert('Thread successfully added to your watch list.');
				getwatchedthreads('0', board);
			},
			onFailure: function(){ alert('Something went wrong...') }
		});
	}
}

function removefromwatchedthreads(threadid, board) {
	if (document.getElementById('watchedthreadlist')) {
		new Ajax.Request(ku_boardspath + '/threadwatch.php?do=removethread&board=' + board + '&threadid=' + threadid,
		{
			method:'get',
			onSuccess: function(transport){
				var response = transport.responseText || "something went wrong (blank response)";
				getwatchedthreads('0', board);
			},
			onFailure: function(){ alert('Something went wrong...') }
		});
	}
}

function hidewatchedthreads() {
	set_cookie('showwatchedthreads','0',30);
	if (document.getElementById('watchedthreads')) {
		document.getElementById('watchedthreads').innerHTML = 'The Watched Threads box will be hidden the next time a page is loaded.  [<a href="#" onclick="javascript:showwatchedthreads();return false">undo</a>]';
	}
}

function showwatchedthreads() {
	set_cookie('showwatchedthreads','1',30);
	window.location.reload(true);
}

function togglePostSpy() {
	var postspy = getCookie('postspy');
	if (postspy == '1') {
		set_cookie('postspy', '0', 30);
		alert('Post Spy disabled.  Any pages loaded from now on will not utilize the Post Spy feature.');
	} else {
		set_cookie('postspy', '1', 30);
		alert('Post Spy enabled.  Any pages loaded from now on will utilize the Post Spy feature.');
	}
}

function checkcaptcha(formid) {
	if (document.getElementById(formid)) {
		if (document.getElementById(formid).captcha) {
			if (document.getElementById(formid).captcha.value == '') {
				alert('Please enter the captcha image text.');
				document.getElementById(formid).captcha.focus();
				
				return false;
			}
		}
	}
	
	return true;
}

function expandimg(postnum, imgurl, thumburl, imgw, imgh, thumbw, thumbh) {
	element = document.getElementById("thumb" + postnum);
	var thumbhtml = '<img src="' + thumburl + '" alt="' + postnum + '" class="thumb" height="' + thumbh + '" width="' + thumbw + '">';
	/* God I hate IE */
	var thumbhtml_ie = '<img class=thumb height=' + thumbh + ' alt=' + postnum + ' src="' + thumburl + '" width=' + thumbw + '>';
	if (element.innerHTML.toLowerCase() != thumbhtml && element.innerHTML.toLowerCase() != thumbhtml_ie) {
		element.innerHTML = thumbhtml;
	} else{
		element.innerHTML = '<img src="' + imgurl + '" alt="' + postnum + '" class="thumb" height="' + imgh + '" width="' + imgw + '">';
	}
}

function postpreview(divid, board, parentid, message) {
	if (document.getElementById(divid)) {
		new Ajax.Request(ku_boardspath + '/expand.php?preview&board=' + board + '&parentid=' + parentid + '&message=' + escape(message),
		{
			method:'get',
			onSuccess: function(transport){
				var response = transport.responseText || "something went wrong (blank response)";
				document.getElementById(divid).innerHTML = response;
			},
			onFailure: function(){ alert('Something went wrong...') }
		});
	}
}

function set_inputs(id) {
	if (document.getElementById(id)) {
		with(document.getElementById(id)) {
			if(!name.value) name.value = getCookie("name");
			if(!em.value) em.value = getCookie("email");
			if(!postpassword.value) postpassword.value = get_password("postpassword");
		}
	}
}

function set_delpass(id) {
	if (document.getElementById(id).postpassword) {
		with(document.getElementById(id)) {
			if(!postpassword.value) postpassword.value = get_password("postpassword");
		}
	}
}

function addreflinkpreview(e) {
	ainfo = this.getAttribute('class').split('|');
	
	var previewdiv = document.createElement('div');
	
	previewdiv.setAttribute("id", "preview" + this.getAttribute('href'));
	previewdiv.setAttribute('class', 'reflinkpreview');
	if (e.pageX) {
		previewdiv.style.left = '' + (e.pageX + 50) + 'px';
	} else {
		previewdiv.style.left = (e.clientX + 50);
	}
	
	var previewdiv_content = document.createTextNode('');
	previewdiv.appendChild(previewdiv_content);
	var parentelement = this.parentNode;
	var newelement = parentelement.insertBefore(previewdiv, this);

	new Ajax.Request(ku_boardspath + '/read.php?b=' + ainfo[1] + '&t=' + ainfo[2] + '&p=' + ainfo[3] + '&single',
	{
		method:'get',
		onSuccess: function(transport){
			var response = transport.responseText || "something went wrong (blank response)";
			
			newelement.innerHTML = response;
		},
		onFailure: function(){ alert('wut'); }
	});
}

function delreflinkpreview(e) {
	var previewelement = document.getElementById('preview' + this.getAttribute('href'));
	
	if (previewelement) {
		previewelement.parentNode.removeChild(previewelement);
	}
}

function addpreviewevents() {
	var aelements = document.getElementsByTagName('a');
	var aelement;
	var ainfo;
	for(var i=0;i<aelements.length;i++){
		aelement = aelements[i];
		if (aelement.getAttribute('class')) {
			if (aelement.getAttribute('class').substr(0, 4) == 'ref|') {
				aelement.addEventListener('mouseover', addreflinkpreview, false)
				aelement.addEventListener('mouseout', delreflinkpreview, false)
			}
		}
	}
}

function keypress(e) {
	if (e.altKey) {
		var docloc = document.location.toString();
		if ((docloc.indexOf('catalog.html') == -1 && docloc.indexOf('/res/') == -1) || (docloc.indexOf('catalog.html') == -1 && e.keyCode == 80)) {
			if (e.keyCode != 18 && e.keyCode != 16) {
				if (docloc.indexOf('.html') == -1 || docloc.indexOf('board.html') != -1) {
					var page = 0;
					var docloc_trimmed = docloc.substr(0, docloc.lastIndexOf('/') + 1);
				} else {
					var page = docloc.substr((docloc.lastIndexOf('/') + 1));
					page = (+page.substr(0, page.indexOf('.html')));
					var docloc_trimmed = docloc.substr(0, docloc.lastIndexOf('/') + 1);
				}
				if (page == 0) {
					var docloc_valid = docloc_trimmed;
				} else {
					var docloc_valid  = docloc_trimmed + page + '.html';
				}
				
				if (e.keyCode == 222 || e.keyCode == 221) {
					if(match=/#s([0-9])/.exec(docloc)) {
						var relativepost = (+match[1]);
					} else {
						var relativepost = -1;
					}
					
					if (e.keyCode == 222) {
						if (relativepost == -1 || relativepost == 9) {
							var newrelativepost = 0;
						} else {
							var newrelativepost = relativepost + 1;
						}
					} else if (e.keyCode == 221) {
						if (relativepost == -1 || relativepost == 0) {
							var newrelativepost = 9;
						} else {
							var newrelativepost = relativepost - 1;
						}
					}
					
					document.location.href = docloc_valid + '#s' + newrelativepost;
				} else if (e.keyCode == 59 || e.keyCode == 219) {
					if (e.keyCode == 59) {
						page = page + 1;
					} else if (e.keyCode == 219) {
						if (page >= 1) {
							page = page - 1;
						}
					}
					
					if (page == 0) {
						document.location.href = docloc_trimmed;
					} else {
						document.location.href = docloc_trimmed + page + '.html';
					}
				} else if (e.keyCode == 80) {
					document.location.href = docloc_valid + '#postbox';
				}
			}
		}
	}
}

function quickBrowse(direction, area) {
	var docloc = document.location.toString();
	if ((docloc.indexOf('catalog.html') == -1 && docloc.indexOf('/res/') == -1) || (docloc.indexOf('catalog.html') == -1 && e.keyCode == 80)) {
		if (docloc.indexOf('.html') == -1 || docloc.indexOf('board.html') != -1) {
			var page = 0;
			var docloc_trimmed = docloc.substr(0, docloc.lastIndexOf('/') + 1);
		} else {
			var page = docloc.substr((docloc.lastIndexOf('/') + 1));
			page = (+page.substr(0, page.indexOf('.html')));
			var docloc_trimmed = docloc.substr(0, docloc.lastIndexOf('/') + 1);
		}
		if (page == 0) {
			var docloc_valid = docloc_trimmed;
		} else {
			var docloc_valid  = docloc_trimmed + page + '.html';
		}
		
		if (area == 'thread') {
			if(match=/#s([0-9])/.exec(docloc)) {
				var relativepost = (+match[1]);
			} else {
				var relativepost = -1;
			}
			
			if (direction == 'down') {
				if (relativepost == -1 || relativepost == 9) {
					var newrelativepost = 0;
				} else {
					var newrelativepost = relativepost + 1;
				}
			} else if (direction == 'up') {
				if (relativepost == -1 || relativepost == 0) {
					var newrelativepost = 9;
				} else {
					var newrelativepost = relativepost - 1;
				}
			}
			
			document.location.href = docloc_valid + '#s' + newrelativepost;
		} else if (area == 'page') {
			if (direction == 'down') {
				page = page + 1;
			} else if (direction == 'up') {
				if (page >= 1) {
					page = page - 1;
				}
			}
			
			if (page == 0) {
				document.location.href = docloc_trimmed;
			} else {
				document.location.href = docloc_trimmed + page + '.html';
			}
		} else if (area == 'postbox') {
			document.location.href = docloc_valid + '#postbox';
		}
	}
}

// Wii Javascript
var wii = {};

wii.isWiiOperaBrowser = function() {
  return (navigator.userAgent.toLowerCase().indexOf("nintendo wii") >= 0);
}

// wii keycodes
wii.KEYCODE_MINUS_ = 170;
wii.KEYCODE_PLUS_ = 174;
wii.KEYCODE_1_ = 172;
wii.KEYCODE_2_ = 173;
wii.KEYCODE_B_ = 171;
wii.KEYCODE_UP_ = 175;
wii.KEYCODE_DOWN_ = 176;
wii.KEYCODE_RIGHT_ = 177;
wii.KEYCODE_LEFT_ = 178;

wii.controllers_ = [];

wii.addController = function(controller) {
  if (!(controller instanceof wii.Controller)) {
    throw new Error("invalid argument passed to wii.addController");
  }
  var controllers = wii.controllers_;
  var alreadyAdded = false;
  for (var i = 0, len = controllers.length; i < len; ++i) {
    if (controllers[i] === controller) {
      alreadyAdded = true;
      break;
    }
  }
  if (!alreadyAdded) {
    controllers.push(controller);
  }
  return !alreadyAdded;
}

wii.removeController = function(controller) {
  if (!(controller instanceof wii.Controller)) {
    throw new Error("invalid argument passed to wii.addController");
  }
  var controllers = wii.controllers_;
  var removed = false;
  for (var i = 0, len = controllers.length; i < len; ++i) {
    if (controllers[i] === controller) {
      controllers.splice(i, 1);
      removed = true;
      break;
    }
  }
  return removed;
}

wii.setupHandlers = function() {
  document.onkeypress = wii.handleKeyPress_;
  document.onclick = wii.handleMouseClick_;
}

wii.handleKeyPress_ = function(e) {
  var keyCode = e.which;
  var controllers = wii.controllers_;
  var returnValue = true;
  for (var i = 0, len = controllers.length; i < len; ++i) {
    var controller = controllers[i];
    if (!controller.handleKeyPress(keyCode)) {
      returnValue = false;
    }
  }
  return returnValue;
}

wii.handleMouseClick_ = function(e) {
  if (e.which != 1) {
    // not the left mouse button
    return;
  }
  var returnValue = true;
  var controllers = wii.controllers_;
  for (var i = 0, len = controllers.length; i < len; ++i) {
    var controller = controllers[i];
    if (!controller.handleMouseClick()) {
      returnValue = false;
    }
  }
  return returnValue;
}

wii.Controller = function() {};
wii.Controller.prototype.handleUp = function() { return true; };
wii.Controller.prototype.handleDown = function() { return true; };
wii.Controller.prototype.handleLeft = function() { return true; };
wii.Controller.prototype.handleRight = function() { return true; };
wii.Controller.prototype.handle1 = function() { return true; };

wii.Wiimote = function() {
  wii.Controller.call(null);
};
wii.Wiimote.prototype = new wii.Controller();
wii.Wiimote.prototype.toString = function() {
  return "[Wiimote]";
};
wii.Wiimote.prototype.handleMouseClick = function() {
  return this.handleA();
};
wii.Wiimote.prototype.handleKeyPress = function(keyCode) {
  switch (keyCode) {
    case wii.KEYCODE_UP_:
      this.handleUp();
      break;
    case wii.KEYCODE_DOWN_:
      this.handleDown();
      break;
    case wii.KEYCODE_LEFT_:
      this.handleLeft();
      break;
    case wii.KEYCODE_RIGHT_:
      this.handleRight();
      break;
    case wii.KEYCODE_1_:
      this.handle1();
      break;
    case wii.KEYCODE_2_:
      this.handle2();
      break;
    default:
      return true;
  }
  return false;
};

wii.HorizontalController = function() {
  wii.Controller.call(null);
};
wii.HorizontalController.prototype = new wii.Controller();
wii.HorizontalController.prototype.toString = function() {
  return "[HorizontalController]";
};
wii.HorizontalController.prototype.handleKeyPress = function(keyCode) {
  switch (keyCode) {
    case wii.KEYCODE_UP_:
      this.handleLeft();
      break;
    case wii.KEYCODE_DOWN_:
      this.handleRight();
      break;
    case wii.KEYCODE_LEFT_:
      this.handleDown();
      break;
    case wii.KEYCODE_RIGHT_:
      this.handleUp();
      break;
    case wii.KEYCODE_1_:
      this.handleB();
      break;
    default:
      return true;
  }
  return false;
};

wii.KeyboardController = function() {
  wii.Controller.call(null);
};
wii.KeyboardController.prototype = new wii.Controller();
wii.KeyboardController.prototype.toString = function() {
  return "[KeyboardController]";
};
wii.KeyboardController.prototype.handleKeyPress = function(keyCode) {
  switch (keyCode) {
    case 105: // I
      this.handleUp();
      break;
    case 107: // K
      this.handleDown();
      break;
    case 106: // J
      this.handleLeft();
      break;
    case 108: // L
      this.handleRight();
      break;
    case 45:  // -
      this.handleMinus();
      break;
    case 43:  // +
      this.handlePlus();
      break;
    case 49:  // 1
      this.handle1();
      break;
    case 50:  // 2
      this.handle2();
      break;
    case 98:  // B 
      this.handleB();
      break;
    case 97:  // A
      this.handleA();
      break;
    default:
      return true;
  }
  return false;
};

function createLoggerFunction(msg) {
	return function() {
		alert(msg);
	}
}

window.onunload=function(e) {
	if(style_cookie) {
		var title=get_active_stylesheet();
		set_cookie(style_cookie,title,365);
	}
	
	if(style_cookie_txt) {
		var title=get_active_stylesheet();
		set_cookie(style_cookie_txt,title,365);
	}
	
	if(style_cookie_site) {
		//do nothing
	}
}

window.onload=function(e) {
	delandbanlinks();
	addpreviewevents();
	checkhighlight();
	
	if (document.getElementById('watchedthreads')) {
		var watchedthreadsdrag = new Draggable('watchedthreads', {handle:'watchedthreadsdraghandle',onEnd:function() { watchedthreadsdragend(); }})
		var watchedthreadsresize = new Resizeable('watchedthreads', {resize:function() { watchedthreadsresizeend(); }})
		
		function watchedthreadsdragend() {
			set_cookie('watchedthreadstop',document.getElementById('watchedthreads').style.top,30);
			set_cookie('watchedthreadsleft',document.getElementById('watchedthreads').style.left,30);
		}
		
		function watchedthreadsresizeend() {
			var watchedthreadswidth = document.getElementById('watchedthreads').offsetWidth;
			var watchedthreadsheight = document.getElementById('watchedthreads').offsetHeight;
			
			set_cookie('watchedthreadswidth',watchedthreadswidth,30);
			set_cookie('watchedthreadsheight',watchedthreadsheight,30);
		}
	}
	
	document.onkeydown = keypress;
}

if(style_cookie) {
	var cookie = getCookie(style_cookie);
	var title = cookie ? cookie : get_preferred_stylesheet();

	set_stylesheet(title);
}

if(style_cookie_txt) {
	var cookie=getCookie(style_cookie_txt);
	var title=cookie?cookie:get_preferred_stylesheet();

	set_stylesheet(title, true);
}

if(style_cookie_site) {
	var cookie=getCookie(style_cookie_site);
	var title=cookie?cookie:get_preferred_stylesheet();

	set_stylesheet(title, false, true);
}

if (getCookie('kumod')=='yes') {
	kumod_set = true;
}

if (wii.isWiiOperaBrowser()) {
	var wiimote = new wii.Wiimote();
	
	wiimote.handleUp    = function() { quickBrowse('up', 'thread'); };
	wiimote.handleDown  = function() { quickBrowse('down', 'thread'); };
	wiimote.handleLeft  = function() { quickBrowse('up', 'page'); };
	wiimote.handleRight = function() { quickBrowse('down', 'page'); };
	wiimote.handle1     = function() { quickBrowse('', 'postbox'); };
	
	wii.setupHandlers();
	wii.addController(wiimote);
}