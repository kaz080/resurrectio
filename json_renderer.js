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
}

JsonRenderer.prototype.text = function(txt) {
  // todo: long lines
  this.document.writeln(txt);
}

JsonRenderer.prototype.stmt = function(text, indent) {
  if (typeof text == "object")
    text = JSON.stringify(text) + ",";
  if (indent==undefined) indent = 1;
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

JsonRenderer.prototype.render = function(with_xy) {
  this.with_xy = with_xy;
  var etypes = EventTypes;
  this.document.open();
  this.document.write("<" + "pre" + ">");
  this.writeHeader();
  var last_down = null;
  var forget_click = false;

  for (var i=0; i < this.items.length; i++) {
    var item = this.items[i];
    if (item.type == etypes.Comment)
      this.space();

    if (i==0) {
      if (item.type!=etypes.OpenUrl) {
        this.stmt({type: "error", message: "the recorded sequence does not start with a url openning."});
      } else {
        this.startUrl(item);
        continue;
      }
    }

    // remember last MouseDown to identify drag
    if (item.type==etypes.MouseDown) {
      console.log("MouseDown");
      last_down = this.items[i];
      continue;
    }
    if (item.type==etypes.MouseUp && last_down) {
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
    if (item.type==etypes.Click && forget_click) {
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

    console.log(item.type);
    console.log(d[item.type]);
    if (this.dispatch[item.type]) {
      console.log("Dispatch");
      this[this.dispatch[item.type]](item);
    }
  }
  this.writeFooter();
  this.document.write("<" + "/" + "pre" + ">");
  this.document.close();
}

JsonRenderer.prototype.writeHeader = function() {
  this.text("[");
  var text = "Rendered at " + new Date().toISOString();
  this.stmt({type: "comment", text: text});
}
JsonRenderer.prototype.writeFooter = function() {
  this.text("]");
}
JsonRenderer.prototype.rewriteUrl = function(url) {
  return url;
}

JsonRenderer.prototype.shortUrl = function(url) {
  return url.substr(url.indexOf('/', 10), 999999999);
}

JsonRenderer.prototype.startUrl = function(item) {
  var url = this.pyrepr(this.rewriteUrl(item.url));
  this.stmt({type: "viewport", width: item.width, height: item.height});
  this.stmt({type: "start", url: url});
}
JsonRenderer.prototype.openUrl = function(item) {
  var url = this.pyrepr(this.rewriteUrl(item.url));
  var history = this.history;
  // if the user apparently hit the back button, render the event as such
  if (url == history[history.length - 2]) {
    this.stmt({type: "back"});
    history.pop();
    history.pop();
  } else {
    this.stmt({type: d[EventTypes.OpenUrl], url: url});
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
    this.stmt({type: "mousedown", x: item.before.x, y: item.before.y});
    this.stmt({type: "mousemove", x: item.x, y: item.y});
    this.stmt({type: "mouseup", x: item.x, y: item.y});
  }
}
JsonRenderer.prototype.click = function(item) {
  var tag = item.info.tagName.toLowerCase();
  if (this.with_xy && !(tag == 'a' || tag == 'input' || tag == 'button')) {
    this.stmt({type: "click", x: item.x, y: item.y});
  } else {
    var selector;
    if (tag == 'a') {
      var xpath_selector = this.getLinkXPath(item);
      if (xpath_selector) {
        selector = 'x("//a['+xpath_selector+']")';
      } else {
        selector = item.info.selector;
      }
    } else if (tag == 'input' || tag == 'button') {
      selector = this.getFormSelector(item) + this.getControl(item);
      selector = '"' + selector + '"';
    } else {
      selector = '"' + item.info.selector + '"';
    }
    this.stmt({type: "click", selector: selector});
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
  var text = item.text.replace('\n','').replace('\r', '\\r');
  this.stmt({type: "keypress", selector: this.getControl(item), text: text});
}

JsonRenderer.prototype.submit = function(item) {
  // the submit has been called somehow (user, or script)
  // so no need to trigger it.
  this.stmt({type: "comment", text: "(submit form)"});
}

JsonRenderer.prototype.screenShot = function(item) {
  // wait 1 second is not the ideal solution, but will be enough most
  // part of time. For slow pages, an assert before capture will make
  // sure evrything is properly loaded before screenshot.
  this.stmt({type: "screenshot", id: this.screen_id});
  this.screen_id = this.screen_id + 1;
}

JsonRenderer.prototype.comment = function(item) {
  var text = item.text;
  this.stmt({type: "comment", text: text});
  //this.stmt('    this.captureSelector("screenshot'+this.screen_id+'.png", "html");');
}

JsonRenderer.prototype.checkPageTitle = function(item) {
  var title = this.pyrepr(item.title, true);
  this.stmt({type: "checktitle", title: title});
  //this.stmt('    test.assertTitle('+ title +');');
}

JsonRenderer.prototype.checkPageLocation = function(item) {
  var url = this.regexp_escape(item.url);
  this.stmt({type: "checkpagelocation", url: url});
  //this.stmt('    test.assertUrlMatch(/^'+ url +'$/);');
}

JsonRenderer.prototype.checkTextPresent = function(item) {
  var selector = 'x("//*[contains(text(), '+this.pyrepr(item.text, true)+')]")';
  this.waitAndTestSelector(selector);
}

JsonRenderer.prototype.checkValue = function(item) {
  var type = item.info.type;
  var way = this.getControlXPath(item);
  var selector = '';
  if (type == 'checkbox' || type == 'radio') {
    var selected;
    if (item.info.checked)
      selected = '@checked'
    else
      selected = 'not(@checked)'
    selector = 'x("//input[' + way + ' and ' +selected+ ']")';
  }
  else {
    var value = this.pyrepr(item.info.value)
    var tag = item.info.tagName.toLowerCase();
    selector = 'x("//'+tag+'[' + way + ' and @value='+value+']")';
  }
  this.waitAndTestSelector(selector);
}

JsonRenderer.prototype.checkText = function(item) {
  var selector = '';
  if ((item.info.type == "submit") || (item.info.type == "button")) {
      selector = 'x("//input[@value='+this.pyrepr(item.text, true)+']")';
  } else {
      selector = 'x("//*[normalize-space(text())='+this.pyrepr(item.text, true)+']")';
  }
  this.waitAndTestSelector(selector);
}

JsonRenderer.prototype.checkHref = function(item) {
  var href = this.pyrepr(this.shortUrl(item.info.href));
  var selector = this.getLinkXPath(item);
  if (selector) {
    selector = 'x("//a['+xpath_selector+' and @href='+ href +']")';
  } else {
    selector = item.info.selector+'[href='+ href +']';
  }
  this.stmt({type: "checkhref", selector: selector});
  //this.stmt('    test.assertExists('+selector+');');
}

JsonRenderer.prototype.checkEnabled = function(item) {
    var way = this.getControlXPath(item);
    var tag = item.info.tagName.toLowerCase();
    this.waitAndTestSelector('x("//'+tag+'[' + way + ' and not(@disabled)]")');
}

JsonRenderer.prototype.checkDisabled = function(item) {
  var way = this.getControlXPath(item);
  var tag = item.info.tagName.toLowerCase();
  this.waitAndTestSelector('x("//'+tag+'[' + way + ' and @disabled]")');
}

JsonRenderer.prototype.checkSelectValue = function(item) {
  var value = this.pyrepr(item.info.value);
  var way = this.getControlXPath(item);
  this.waitAndTestSelector('x("//select[' + way + ']/options[@selected and @value='+value+']")');
}

JsonRenderer.prototype.checkSelectOptions = function(item) {
  this.stmt({type: "comment", text: "TODO: checkSelectOptions"});
  //this.stmt('// TODO');
}

JsonRenderer.prototype.checkImageSrc = function(item) {
  var src = this.pyrepr(this.shortUrl(item.info.src));
  this.waitAndTestSelector('x("//img[@src=' + src + ']")');
}

JsonRenderer.prototype.waitAndTestSelector = function(selector) {
  this.stmt({type: "waitandtestselector", selector: selector});
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
