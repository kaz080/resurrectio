// ---------------------------------------------------------------------------
// JsonRenderer -- a class to render recorded test case as a JSON
// ---------------------------------------------------------------------------

if (typeof(EventTypes) == "undefined") {
  EventTypes = {};
}

EventTypes.OpenUrl = 0;
EventTypes.Click = 1;
EventTypes.Change = 2;
EventTypes.Comment = 3;
EventTypes.Submit = 4;
EventTypes.CheckPageTitle = 5;
EventTypes.CheckPageLocation = 6;
EventTypes.CheckTextPresent = 7;
EventTypes.CheckValue = 8;
EventTypes.CheckValueContains = 9;
EventTypes.CheckText = 10;
EventTypes.CheckHref = 11;
EventTypes.CheckEnabled = 12;
EventTypes.CheckDisabled = 13;
EventTypes.CheckSelectValue = 14;
EventTypes.CheckSelectOptions = 15;
EventTypes.CheckImageSrc = 16;
EventTypes.PageLoad = 17;
EventTypes.ScreenShot = 18;
EventTypes.MouseDown = 19;
EventTypes.MouseUp = 20;
EventTypes.MouseDrag = 21;
EventTypes.MouseDrop = 22;
EventTypes.KeyPress = 23;

function JsonRenderer(document) {
  this.document = document;
  this.title = "Testcase";
  this.items = null;
  this.history = new Array();
  this.last_events = new Array();
  this.screen_id = 1;
  this.unamed_element_id = 1;
  this.json = {};
  this.json.rendered_at = null;
  this.json.viewport = null;
  this.json.events = [];
}

JsonRenderer.prototype.push_event = function(event) {
  event.time = new Date();
  this.json.events.push(event);
}

JsonRenderer.prototype.text = function(txt) {
  // todo: long lines
  this.document.writeln(txt);
}

JsonRenderer.prototype.stmt = function(text, indent) {
  if (indent==undefined) indent = 2;
  var output = (new Array(2*indent)).join(" ") + text;
  this.document.writeln(output);
}

JsonRenderer.prototype.cont = function(text) {
  this.document.writeln("    ... " + text);
}

JsonRenderer.prototype.pyout = function(text) {
  this.document.writeln("    " + text);
}

JsonRenderer.prototype.pyrepr = function(text, escape) {
  // todo: handle non--strings & quoting
  var s =  "'" + text + "'";
  if (escape) s = s.replace(/(['"])/g, "\\$1");
  return s;
}

JsonRenderer.prototype.space = function() {
  this.document.write("\n");
}

JsonRenderer.prototype.regexp_escape = function(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s\/]/g, "\\$&");
};

var d = {};
d[EventTypes.OpenUrl] = "openUrl";
d[EventTypes.Click] = "click";
//d[EventTypes.Change] = "change";
d[EventTypes.Comment] = "comment";
d[EventTypes.Submit] = "submit";
d[EventTypes.CheckPageTitle] = "checkPageTitle";
d[EventTypes.CheckPageLocation] = "checkPageLocation";
d[EventTypes.CheckTextPresent] = "checkTextPresent";
d[EventTypes.CheckValue] = "checkValue";
d[EventTypes.CheckText] = "checkText";
d[EventTypes.CheckHref] = "checkHref";
d[EventTypes.CheckEnabled] = "checkEnabled";
d[EventTypes.CheckDisabled] = "checkDisabled";
d[EventTypes.CheckSelectValue] = "checkSelectValue";
d[EventTypes.CheckSelectOptions] = "checkSelectOptions";
d[EventTypes.CheckImageSrc] = "checkImageSrc";
d[EventTypes.PageLoad] = "pageLoad";
d[EventTypes.ScreenShot] = "screenShot";
/*d[EventTypes.MouseDown] = "mousedown";
d[EventTypes.MouseUp] = "mouseup";*/
d[EventTypes.MouseDrag] = "mousedrag";
d[EventTypes.KeyPress] = "keypress";

JsonRenderer.prototype.dispatch = d;

var cc = EventTypes;

JsonRenderer.ElementInfo = function(item) {
  // css is css selector estimated by
  // TestRecorder.ElementInfo.getCleanCSSSelector()
  var info = item.info;
  this.css = info.selector;
  // Those properties are optional
  this.tag = info.tagName;
  if (info.id)
    this.id = info.id;
  if (info.type)
    this.type = info.type;
  if (info.value)
    this.value = info.value;
  if (info.name)
    this.name = info.name;
  if (info.href)
    this.href = info.href;
  if (info.src)
    this.src = info.src;
  if (info.options.length)
    this.options = info.options;
}

JsonRenderer.prototype.render = function(with_xy) {
  this.with_xy = with_xy;
  var etypes = EventTypes;
  this.document.open();
  this.document.write("<" + "pre" + ">");
  var last_down = null;
  var forget_click = false;

  for (var i=0; i < this.items.length; i++) {
    var item = this.items[i];

    //var info = new JsonRenderer.ElementInfo(item);
    //console.log(JSON.stringify(info, 0, 2));

    if (item.type == etypes.Comment)
      this.space();

    if (i == 0) {
      if (item.type != etypes.OpenUrl) {
        this.push_event({error: "the recorded sequence does not start with openning URL."});
      } else {
        this.startUrl(item);
        continue;
      }
    }

    // remember last MouseDown to identify drag
    if (item.type == etypes.MouseDown) {
      console.log("MouseDown");
      last_down = this.items[i];
      continue;
    }

    if (item.type == etypes.MouseUp && last_down) {
      console.log("MouseUp");
      if (last_down.x == item.x && last_down.y == item.y) {
        console.log("Not moved. forget_click = false");
        forget_click = false;
        continue;
      } else {
        console.log("MouseDrag");
        item.before = last_down;
        this[this.dispatch[etypes.MouseDrag]](item);
        last_down = null;
        forget_click = true;
        continue;
      }
    }
    if (item.type == etypes.Click && forget_click) {
      console.log("Click but forget");
      forget_click = false;
      continue;
    }

    // we do not want click due to user checking actions
    if (i>0 && item.type==etypes.Click &&
        ((this.items[i-1].type>=etypes.CheckPageTitle &&
          this.items[i-1].type<=etypes.CheckImageSrc)
         || this.items[i-1].type==etypes.ScreenShot)) {
      continue;
    }

    console.log(item.type + ": " + d[item.type]);
    if (this.dispatch[item.type]) {
      console.log("Dispatch: " + d[item.type]);
      this[this.dispatch[item.type]](item);
    }
  }

  this.document.writeln(JSON.stringify(this.json, 0, 2));

  this.document.write("<" + "/" + "pre" + ">");
  this.document.close();
}

JsonRenderer.prototype.rewriteUrl = function(url) {
  return url;
}

JsonRenderer.prototype.shortUrl = function(url) {
  return url.substr(url.indexOf('/', 10), 999999999);
}

JsonRenderer.prototype.startUrl = function(item) {
  this.json.rendered_at = new Date();
  this.json.viewport = {width: item.width, height: item.height};
  this.push_event({start: item.url});
}

JsonRenderer.prototype.openUrl = function(item) {
  var url = this.pyrepr(this.rewriteUrl(item.url));
  var history = this.history;
  // if the user apparently hit the back button, render the event as such
  console.log(url);
  console.log(history[history.length - 2]);
  if (url == history[history.length - 2]) {
    this.push_event({back: null});
    history.pop();
    history.pop();
  } else {
    this.push_event({openurl: item.url});
  }
}

JsonRenderer.prototype.pageLoad = function(item) {
  var url = this.pyrepr(this.rewriteUrl(item.url));
  this.history.push(url);
}

JsonRenderer.prototype.normalizeWhitespace = function(s) {
  return s.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
}

JsonRenderer.prototype.getControl = function(item) {
  var type = item.info.type;
  var tag = item.info.tagName.toLowerCase();
  var selector;
  if ((type == "submit" || type == "button") && item.info.value)
    selector = tag+'[type='+type+'][value='+this.pyrepr(this.normalizeWhitespace(item.info.value))+']';
  else if (item.info.name)
    selector = tag+'[name='+this.pyrepr(item.info.name)+']';
  else if (item.info.id)
   selector = tag+'#'+item.info.id;
  else
    selector = item.info.selector;

  return selector;
}

JsonRenderer.prototype.getControlXPath = function(item) {
  var type = item.info.type;
  var way;
  if ((type == "submit" || type == "button") && item.info.value)
    way = '@value=' + this.pyrepr(this.normalizeWhitespace(item.info.value));
  else if (item.info.name)
    way = '@name=' + this.pyrepr(item.info.name);
  else if (item.info.id)
    way = '@id=' + this.pyrepr(item.info.id);
  else
    way = 'TODO';

  return way;
}

JsonRenderer.prototype.getLinkXPath = function(item) {
  var way;
  if (item.text)
    way = 'normalize-space(text())=' + this.pyrepr(this.normalizeWhitespace(item.text));
  else if (item.info.id)
    way = '@id=' + this.pyrepr(item.info.id);
  else if (item.info.href)
    way = '@href=' + this.pyrepr(this.shortUrl(item.info.href));
  else if (item.info.title)
    way = 'title='+this.pyrepr(this.normalizeWhitespace(item.info.title));

  return way;
}

JsonRenderer.prototype.mousedrag = function(item) {
  if (this.with_xy) {
    this.push_event({mousedown: {x: item.before.x, y: item.before.y}});
    this.push_event({mousemove: {x: item.x, y: item.y}});
    this.push_event({mouseup: {x: item.x, y: item.y}});
  }
}

JsonRenderer.prototype.click = function(item) {
  var tag = item.info.tagName.toLowerCase();
  if (this.with_xy && !(tag == 'a' || tag == 'input' || tag == 'button')) {
    this.push_event({click: {x: item.x, y: item.y}});
  } else {
    var info = new JsonRenderer.ElementInfo(item);
    //var selector;
    if (tag == 'a') {
      var xpath_selector = this.getLinkXPath(item);
      if (xpath_selector) {
        //selector = 'x("//a['+xpath_selector+']")';
        info.xpath = xpath_selector;
      } else {
        //selector = item.info.selector;
      }
    } else if (tag == 'input' || tag == 'button') {
      var selector = this.getFormSelector(item) + this.getControl(item);
      console.log(info.css + " -> " + selector);
      info.css = selector;
      //selector = this.getFormSelector(item) + this.getControl(item);
      //selector = '"' + selector + '"';
    } else {
      //selector = '"' + item.info.selector + '"';
    }
    this.push_event({click: info});
  }
}

JsonRenderer.prototype.getFormSelector = function(item) {
  var info = item.info;
  if (!info.form) {
    return '';
  }
  if (info.form.name) {
        return "form[name=" + info.form.name + "] ";
    } else if (info.form.id) {
    return "form#" + info.form.id + " ";
  } else {
    return "form ";
  }
}

JsonRenderer.prototype.keypress = function(item) {
  var info = new JsonRenderer.ElementInfo(item);
  //var text = item.text.replace('\n','').replace('\r', '\\r');
  var control_css = this.getControl(item);
  console.log(info.css + " -> " + control_css);
  info.css = control_css;
  this.push_event({keypress: info});
}

JsonRenderer.prototype.submit = function(item) {
  // the submit has been called somehow (user, or script)
  // so no need to trigger it.
  this.push_event({comment: "(submit form)"});
}

JsonRenderer.prototype.screenShot = function(item) {
  // wait 1 second is not the ideal solution, but will be enough most
  // part of time. For slow pages, an assert before capture will make
  // sure evrything is properly loaded before screenshot.
  this.push_event({screenshot: this.screen_id});
  this.screen_id = this.screen_id + 1;
}

JsonRenderer.prototype.comment = function(item) {
  var text = item.text;
  this.push_event({comment: text});
}

JsonRenderer.prototype.checkPageTitle = function(item) {
  this.push_event({checkpagetitle: item.title});
}

JsonRenderer.prototype.checkPageLocation = function(item) {
  this.push_event({checkpagelocation: item.url});
}

JsonRenderer.prototype.checkTextPresent = function(item) {
  //var selector = 'x("//*[contains(text(), '+this.pyrepr(item.text, true)+')]")';
  var info = new JsonRenderer.ElementInfo(item);
  info.text = item.text;
  info.xpath = '//*[contains(text(), '+this.pyrepr(item.text, true)+')]';
  this.push_event({checktextpresent: info});
}

JsonRenderer.prototype.checkValue = function(item) {
  var type = item.info.type;
  var way = this.getControlXPath(item);
  var info = new JsonRenderer.ElementInfo(item);
  if (type == 'checkbox' || type == 'radio') {
    var selected;
    if (item.info.checked)
      selected = '@checked'
    else
      selected = 'not(@checked)'
    info.xpath = '//input[' + way + ' and ' +selected+ ']';
    //selector = 'x("//input[' + way + ' and ' +selected+ ']")';
  }
  else {
    var value = this.pyrepr(item.info.value)
    var tag = item.info.tagName.toLowerCase();
    info.xpath = '//'+tag+'[' + way + ' and @value='+value+']';
    //selector = 'x("//'+tag+'[' + way + ' and @value='+value+']")';
  }
  this.push_event({checkvalue: info});
}

JsonRenderer.prototype.checkText = function(item) {
  var info = new JsonRenderer.ElementInfo(item);
  info.text = item.text;
  if ((item.info.type == "submit") || (item.info.type == "button")) {
    info.xpath = '//input[@value='+this.pyrepr(item.text, true)+']';
    //selector = 'x("//input[@value='+this.pyrepr(item.text, true)+']")';
  } else {
    info.xpath = '//*[normalize-space(text())='+this.pyrepr(item.text, true)+']';
    //selector = 'x("//*[normalize-space(text())='+this.pyrepr(item.text, true)+']")';
  }
  this.push_event({checktext: info});
}

JsonRenderer.prototype.checkHref = function(item) {
  var href = this.pyrepr(this.shortUrl(item.info.href));
  var link_xpath = this.getLinkXPath(item);
  var info = new JsonRenderer.ElementInfo(item);
  if (selector) {
    info.xpath = '//a['+link_xpath+' and @href='+ href +']';
    //selector = 'x("//a['+xpath_selector+' and @href='+ href +']")';
  } else {
    info.xpath = item.info.selector + '[href='+ href +']';
    //selector = item.info.selector+'[href='+ href +']';
  }
  this.push_event({checkhref: info});
}

JsonRenderer.prototype.checkEnabled = function(item) {
  var way = this.getControlXPath(item);
  var tag = item.info.tagName.toLowerCase();
  var info = new JsonRenderer.ElementInfo(item);
  info.xpath = '//'+tag+'[' + way + ' and not(@disabled)]';
  this.push_event({checkenabled: info});
  //this.waitAndTestSelector('x("//'+tag+'[' + way + ' and not(@disabled)]")');
}

JsonRenderer.prototype.checkDisabled = function(item) {
  var way = this.getControlXPath(item);
  var tag = item.info.tagName.toLowerCase();
  var info = new JsonRenderer.ElementInfo(item);
  info.xpath = '//'+tag+'[' + way + ' and @disabled]';
  this.push_event({checkdisabled: info});
  //this.waitAndTestSelector('x("//'+tag+'[' + way + ' and @disabled]")');
}

JsonRenderer.prototype.checkSelectValue = function(item) {
  var value = this.pyrepr(item.info.value);
  var way = this.getControlXPath(item);
  var info = new JsonRenderer.ElementInfo(item);
  info.xpath = '//select[' + way + ']/options[@selected and @value='+value+']';
  this.push_event({checkselectvalue: info});
  //this.waitAndTestSelector('x("//select[' + way + ']/options[@selected and @value='+value+']")');
}

JsonRenderer.prototype.checkSelectOptions = function(item) {
  this.push_event({comment: "TODO: checkSelectOptions"});
  //this.stmt('// TODO');
}

JsonRenderer.prototype.checkImageSrc = function(item) {
  var src = this.pyrepr(this.shortUrl(item.info.src));
  var info = new JsonRenderer.ElementInfo(item);
  info.xpath = '//img[@src=' + src + ']';
  this.push_event({checkimagesrc: info});
  //this.waitAndTestSelector('x("//img[@src=' + src + ']")');
}

JsonRenderer.prototype.waitAndTestSelector = function(selector) {
  this.push_event({waitandtest: selector});
  //this.stmt('casper.waitForSelector(' + selector + ',');
  //this.stmt('    function success() {');
  //this.stmt('        test.assertExists(' + selector + ');')
  //this.stmt('      },');
  //this.stmt('    function fail() {');
  //this.stmt('        test.assertExists(' + selector + ');')
  //this.stmt('});');
}

var dt = new JsonRenderer(document);
window.onload = function onpageload() {
  var with_xy = false;
  if (window.location.search=="?xy=true") {
    with_xy = true;
  }
  chrome.runtime.sendMessage({action: "get_items"}, function(response) {
    console.log(JSON.stringify(response.items, 0, 2));
    dt.items = response.items;
    dt.render(with_xy);
  });
};
