/**
 * Copyright...
 */
#target "InDesign";

(function(glob, app) {
  var pub = {};

  // ----------------------------------------
  // constants
  pub.VERSION = "0.1";
  pub.PT = "pt";
  pub.PX = "px";
  pub.CM = "cm";
  pub.MM = "mm";
  var ERROR_PREFIX = "### Basil Error -> ",
    WARNING_PREFIX = "### Basil Warning -> ";

  // ----------------------------------------
  // public vars
  pub.width = null;
  pub.height = null;

  // ----------------------------------------
  // private vars
  var currDoc = null,
    currPage = null,
    currLayer = null,
    currUnits = null,
    currColorMode = null,
    currFillColor = null,
    currNoFillColor = null,
    currStrokeColor = null,
    currStrokeTint = null,
    currFillTint = null,
    currStrokeWeight = null;

  // ----------------------------------------
  // global functions

  if (!glob.forEach) {
    glob.forEach = function(collection, cb) {
      for (var i = 0, len = collection.length; i < len; i++) {
        cb(collection[i],i);
      }
    };
  }
  

  // ----------------------------------------
  // Environment
  
  /**
   * Sets or possibly creates the current document and returns it. 
   * If the param doc is not given the current document gets set to the active document 
   * in the application. If no document at all is open, a new document gets created.
   * 
   * @param  {Document} [doc] The document to set the current document to.
   * @return {Document} The current document instance.
   */
  pub.doc = function(doc) {
    if (doc instanceof Document) {
      setCurrDoc(doc);
    }
    return currentDoc();
  };

  /**
   * Closes the current document.
   * @param  {SaveOptions} [saveOptions] The indesign SaveOptions constant
   * @param  {File} [file] The indesign file instance to save the document to
   */
  pub.close = function(saveOptions, file) {
    var doc = currentDoc();
    if (doc) {
      doc.close(saveOptions, file);
      resetCurrDoc();
    }
  }

  /**
   * Returns the current page and possibly sets it.
   * 
   * @param  {Page|Number} [page] The page or page index to set the current page to.
   * @return {Page} The current page instance.
   */
  pub.page = function(page) {
    if (page instanceof Page) {
      currPage = page;
    } else if (typeof page === 'number') {
      var tempPage = currentDoc().pages[page];
      try {
        tempPage.id;
      } catch (e) {
        error('Page ' + page + ' does not exist.');
      }
      currPage = tempPage;
    }
    updatePublicPageSizeVars();
    return currentPage();
  };

  /**
   * Returns the current layer and possibly sets it.
   * 
   * @param  {Layer|String} [layer] The layer or layer name to set the current layer to.
   * @return {Layer} The current page instance.
   */
  pub.layer = function(layer) {
    if (layer instanceof Layer) {
      currLayer = layer;
    } else if (typeof layer === 'string') {
      var layers = currentDoc().layers;
      currLayer = layers.item(layer);
      if (!currLayer.isValid) {
        currLayer = layers.add({name: layer});
      }
    }
    return currentLayer();
  };

  /**
   * Sets the units of the document (like right clicking the rulers).
   * @param  {Constant} [units] supported: PT, PX, CM or MM
   * @return {Constant} current unit setting
   */
  pub.units = function (units) {
    if (!units) return currUnits;

    if (units === pub.CM || 
        units === pub.MM ||
        units === pub.PT || 
        units === pub.PX ) {
      var unitType = null;
      if      (units === pub.CM) unitType = MeasurementUnits.centimeters;
      else if (units === pub.MM) unitType = MeasurementUnits.millimeters;
      else if (units === pub.PT) unitType = MeasurementUnits.points;
      else if (units === pub.PX) unitType = MeasurementUnits.pixels;
      var doc = currentDoc(); 
      with (doc.viewPreferences){
        //* MeasurementUnits.agates
        //* MeasurementUnits.picas
        //* MeasurementUnits.points
        //* MeasurementUnits.inches
        //* MeasurementUnits.inchesDecimal
        //* MeasurementUnits.millimeters
        //* MeasurementUnits.centimeters
        //* MeasurementUnits.ciceros
        horizontalMeasurementUnits = unitType; 
        verticalMeasurementUnits = unitType;
      }
      currUnits = units;
    } else {
      error("Not supported unit");
    }
    return currUnits;
  }

  // ----------------------------------------
  // Shape
  
  /**
   * Draws an ellipse (oval) in the display window. An ellipse with an equal <b>width</b> and <b>height</b> is a circle.
   * The first two parameters set the location, the third sets the width, and the fourth sets the height.
   * @param  {Number} x Location x-value
   * @param  {Number} y Location y-value
   * @param  {Number} w Width
   * @param  {Number} h Height
   * @return {Oval} new oval (in Adobe Scripting the type is Oval, not ellipse)
   */
  pub.ellipse = function(x, y, w, h){
    var ellipseBounds = [0,0,0,0];
    ellipseBounds[0] = y;
    ellipseBounds[1] = x;
    ellipseBounds[2] = y+h;
    ellipseBounds[3] = x+w;
    var ovals = app.activeWindow.activeSpread.ovals;
    var newOval = ovals.add( currentLayer() );
    with(newOval) {
      strokeWeight = currStrokeWeight;
      strokeTint = currStrokeTint; 
      fillColor = currFillColor;
      fillTint = currFillTint; 
      strokeColor = currStrokeColor;  
      geometricBounds = ellipseBounds;
    } 
    return newOval;
  };

  /**
   * Draws a line (a direct path between two points) to the screen.
   * @param  {Number} [x1] Point A x-value
   * @param  {Number} [y1] Point A y-value
   * @param  {Number} [x2] Point B x-value
   * @param  {Number} [y2] Point B y-value
   * @return {Rectangle} new rectangle
   */
  pub.line = function(x1, y1, x2, y2) {
    var lines = currentPage().graphicLines;
    var lineBounds = [];
    lineBounds[0] = y1;
    lineBounds[1] = x1;
    lineBounds[2] = y2;
    lineBounds[3] = x2;
    
    var newLine = lines.add( currentLayer() );
    with(newLine) {
      strokeWeight = currStrokeWeight;
      strokeTint = currStrokeTint; 
      fillColor = currFillColor;
      fillTint = currFillTint; 
      strokeColor = currStrokeColor; 
      geometricBounds = lineBounds;
    }

    var scaleX = 1.0, scaleY = 1.0;
    if (x2 < x1) scaleX = -1.0;
    if (y2 < y1) scaleY = -1.0;
    var scaleMatrix = app.transformationMatrices.add({'horizontalScaleFactor': scaleX, 'verticalScaleFactor': scaleY});
    newLine.transform(CoordinateSpaces.PASTEBOARD_COORDINATES,
                   AnchorPoint.CENTER_ANCHOR,
                   scaleMatrix);
    return newLine;
  };

  /**
   * Draws a rectangle to the page.
   * @param  {Number} [x] Position X
   * @param  {Number} [y] Position Y
   * @param  {Number} [w] Width
   * @param  {Number} [h] Height
   * @return {Rectangle}   new Rectangle
   */
  pub.rect = function(x, y, w, h){
    var rectBounds = [];
    rectBounds[0] = y;
    rectBounds[1] = x;
    rectBounds[2] = (y+h);
    rectBounds[3] = (x+w);
    var newRect = currentPage().rectangles.add( currentLayer() );
    with(newRect) {
      geometricBounds = rectBounds;
      strokeWeight = currStrokeWeight;
      strokeTint = currStrokeTint;
      fillColor = currFillColor;
      fillTint = currFillTint;
      strokeColor = currStrokeColor;
    }
    return newRect;
  };


  // ----------------------------------------
  // Color
  
  pub.fill = function (fillColor) {
    if (fillColor instanceof Color || fillColor instanceof Swatch) {
      currFillColor = fillColor;
    } else {
      currFillColor = pub.color(arguments);
    }
  };

  pub.noFill = function () {
    currFillColor = currNoFillColor;
  };

  /**
   * Creates a new RGB or CMYK color and adds the new color to the document,
   * or gets a color by name from the document
   * @param  {Numbers|String} Get color: name. Create new color: R,G,B,name or C,M,Y,K,name or Grey,name. Name is always optional
   * @return {Color} new color
   */
  pub.color = function() {
    var newCol = null;
    var props = {};
    var a = arguments[0],
        b = arguments[1],
        c = arguments[2],
        d = arguments[3],
        e = arguments[4];
    if (arguments.length === 1) {
      if (typeof a === 'string') {
        try {
          newCol = currentDoc().swatches.item(a);
          newCol.name;
        } catch (e) {
          error("Color doesn't exist. "+e);
        }
        return newCol;
      } else if (typeof a === 'number') {
        props.model = ColorModel.PROCESS;
        props.space = ColorSpace.CMYK;
        props.colorValue = [0,0,0,a];
        props.name = "C="+0+" M="+0+" Y="+0+" K="+a;
      } else {
        error("Color doesn't exist.");
      }

    } else if (arguments.length === 2) {
      props.model = ColorModel.PROCESS;
      props.space = ColorSpace.CMYK;
      props.colorValue = [0,0,0,a];
      props.name = b;

    } else if (arguments.length === 3) {
      props.model = ColorModel.PROCESS;
      props.space = ColorSpace.RGB;
      props.colorValue = [a,b,c];
      props.name = "R="+a+" G="+b+" B="+c;

    } else if (arguments.length === 4) {
      if (typeof d === 'string') {
        props.model = ColorModel.PROCESS;
        props.space = ColorSpace.RGB;
        props.colorValue = [a,b,c];
        props.name = d;
      } else {
        props.model = ColorModel.PROCESS;
        props.space = ColorSpace.CMYK;
        props.colorValue = [a,b,c,d];
        props.name = "C="+a+" M="+b+" Y="+c+" K="+d;
      }

    } else if (arguments.length === 5) {
      props.model = ColorModel.PROCESS;
      props.space = ColorSpace.CMYK;
      props.colorValue = [a,b,c,d];
      props.name = e;

    } else {
      error("Wrong parameters. Use: "
        + "R,G,B,name or "
        + "C,M,Y,K,name. "
        + "Grey,name "
        + "Name is optional");
    }
    newCol = currentDoc().colors.add();
    newCol.properties = props;
    return newCol;
  };

  // ----------------------------------------
  // Typography
  
  /**
   * Creates a text frame on the current layer on the current page in the current document. 
   * The text frame gets created in the position specified by the x and y parameters.
   * The default document font will be used unless a font is set with the textFont() function. 
   * Change the color of the text with the fill() function.
   * The text displays in relation to the textAlign() function, which gives the option to draw to the left, 
   * right, and center of the coordinates. 
   * The width and height parameters define a rectangular area.
   * 
   * @param  {String} txt The text content to set in the text frame.
   * @param  {Number} x   x-coordinate of text frame
   * @param  {Number} y   y-coordinate of text frame
   * @param  {Number} w   width of text frame
   * @param  {Number} h   height of text frame
   * @return {TextFrame}  The created text frame instance.
   */
  pub.text = function(txt, x, y, w, h) {
    var textFrame = currentPage().textFrames.add( currentLayer() );
    with (textFrame) {
      contents = txt;
      geometricBounds = [y, x, (y+h), (x+w)];
      /* TODO
      strokeWeight = currStrokeWeight;
      strokeColor = currStrokeColor;
      strokeTint = currStrokeTint;
      fillColor = currFillColor;
      fillTint = currFillTint;
      //align
      */
    }
    return textFrame;
  };

  /**
   * Sets text properties to the given item. If the item is not an instance the text property can be set to, 
   * the property gets set to the direct descendants of the given item, e.g. all stories of a given document.
   * 
   * If no value is given and the given property is a string, the corresponding value is returned. This can 
   * either be the value of the concrete item (e.g. character) or an array of values of the item's descendants 
   * (e.g. paragraphs of given text frame).
   * 
   * @param  {Document|Spread|Page|Layer|Story|TextFrame|Text} item  The object to apply the property to.
   * @param  {String|Object} property  The text property name of an object of key/value property/value pairs.
   *                                   If property is a string and no value is given, the function acts as getter.
   * @param  {String|Number} [value]   The value to apply to the property.
   * @return {String[]|Number[]}  The property value(s) or the items the property was assigned to.
   */
  pub.typo = function(item, property, value) {
    var result = [],
      actsAsGetter = typeof property === 'string' && (typeof value === 'undefined' || value === null),
      getOrSetProperties = function(textItem) {
        if (actsAsGetter) {
          result.push(textItem[prop]);
        } else {
          setProperties(textItem);
        }
      },
      setProperties = function(textItem) {
        if (typeof property === 'string') {
          result.push(textItem);
          setProperty(textItem, property, value);  
        } else if (typeof property === 'object') {
          result.push(textItem);
          for (var prop in property) {
            setProperty(textItem, prop, property[prop]);  
          }
        }
      },
      setProperty = function(textItem, prop, val) {
        textItem[prop] = val;
      };

    if (item instanceof Document ||
        item instanceof Spread ||
        item instanceof Page ||
        item instanceof Layer) {
      forEach(item.textFrames, function(textFrame) {
        pub.typo(textFrame, property, value);
      });
    } else if (item instanceof TextFrame) {
      forEach(item.paragraphs, function(para) {
        getOrSetProperties(para);
      });
    } else if (item instanceof Character ||
               item instanceof InsertionPoint ||
               item instanceof Line ||
               item instanceof Paragraph ||
               item instanceof TextColumn ||
               item instanceof TextStyleRange ||
               item instanceof Word) 
    {
      getOrSetProperties(item);
    }
    return result;
  };
  

  // ----------------------------------------
  // Math
  
  var currentRandom = Math.random;
  pub.random = function() {
    if (arguments.length === 0) return currentRandom();
    if (arguments.length === 1) return currentRandom() * arguments[0];
    var aMin = arguments[0],
      aMax = arguments[1];
    return currentRandom() * (aMax - aMin) + aMin
  };

  function Marsaglia(i1, i2) {
    var z = i1 || 362436069,
      w = i2 || 521288629;
    var nextInt = function() {
      z = 36969 * (z & 65535) + (z >>> 16) & 4294967295;
      w = 18E3 * (w & 65535) + (w >>> 16) & 4294967295;
      return ((z & 65535) << 16 | w & 65535) & 4294967295
    };
    this.nextDouble = function() {
      var i = nextInt() / 4294967296;
      return i < 0 ? 1 + i : i
    };
    this.nextInt = nextInt
  }
  Marsaglia.createRandomized = function() {
    var now = new Date;
    return new Marsaglia(now / 6E4 & 4294967295, now & 4294967295)
  };

  pub.randomSeed = function(seed) {
    currentRandom = (new Marsaglia(seed)).nextDouble
  };

  pub.Random = function(seed) {
    var haveNextNextGaussian = false,
      nextNextGaussian, random;
    this.nextGaussian = function() {
      if (haveNextNextGaussian) {
        haveNextNextGaussian = false;
        return nextNextGaussian
      }
      var v1, v2, s;
      do {
        v1 = 2 * random() - 1;
        v2 = 2 * random() - 1;
        s = v1 * v1 + v2 * v2
      } while (s >= 1 || s === 0);
      var multiplier = Math.sqrt(-2 * Math.log(s) / s);
      nextNextGaussian = v2 * multiplier;
      haveNextNextGaussian = true;
      return v1 * multiplier
    };
    random = seed === undef ? Math.random : (new Marsaglia(seed)).nextDouble
  };
    
  pub.map = function(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  };
    
  pub.constrain = function(aNumber, aMin, aMax) {
    return aNumber > aMax ? aMax : aNumber < aMin ? aMin : aNumber;
  };


  // ----------------------------------------
  // Input
  
  pub.findByLabel = function(label) {
    var result = [];
    var doc = currentDoc();
    for (var i = 0, len = doc.pageItems.length; i < len; i++) {
      var pageItem = doc.pageItems[i];
      if (pageItem.label === label) {
        // push pageItem's 1st element to get the concrete PageItem instance, e.g. a TextFrame 
        result.push(pageItem.getElements()[0]);
      }
    }
    return result;
  };


  // ----------------------------------------
  // Output
  
  pub.println = function(msg) {
    $.writeln(msg);
  };

  pub.print = function(msg) {
    $.write(msg);
  };
  

  // ----------------------------------------
  // all private from here

  var init = function() {
    glob.b = pub;

    // -- init internal state vars --
    currStrokeWeight = 1;
    currStrokeTint = 100;
    currFillTint = 100;

    welcome();
    runUserScript();
  };

  var runUserScript = function() {
    app.doScript(function() {
      if (typeof glob.setup === 'function') {
        glob.setup();
      }
      if (typeof glob.draw === 'function') {
        glob.draw();
      }      
    }, ScriptLanguage.javascript, undefined, UndoModes.entireScript);
  };

  var welcome = function() {
    $.writeln("basil.js "
        + pub.VERSION
        + " "
        + "infos, feedback @ http://basiljs.ch");
  };
  
  var currentDoc = function() {
    if (!currDoc) {
      var doc = null;
      try {
        doc = app.activeDocument;  
      } catch(e) {
        doc = app.documents.add();
      }
      setCurrDoc(doc);
    }
    return currDoc;
  };

  var setCurrDoc = function(doc) {
    resetCurrDoc();
    currDoc = doc;
    // -- setup document --
    currDoc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
    pub.units(pub.PT);
    updatePublicPageSizeVars();
  };

  var resetCurrDoc = function() {
    // resets doc and doc specific vars
    currDoc = null;
    currPage = null;
    currLayer = null;
    currFillColor = "Black";
    currNoFillColor = "None";
    currStrokeColor = "Black";
  };

  var currentLayer = function() {
    if (!currLayer) {
      currentDoc();
      currLayer = app.activeDocument.activeLayer;
    }
    return currLayer;
  };
  
  var currentPage = function() {
    if (!currPage) {
      currentDoc();
      currPage = app.activeWindow.activePage;
    }
    return currPage;
  };

  var updatePublicPageSizeVars = function () {
    var pageBounds = currentPage().bounds; // [y1, x1, y2, x2]
    var w = pageBounds[3] - pageBounds[1];
    var h = pageBounds[2] - pageBounds[0];
    pub.width = w;
    pub.height = h;
    //return {width: w, height: h};
  };

  var error = function(msg) {
    $.writeln(ERROR_PREFIX + msg);
    throw msg;
  };

  var warning = function(msg) {
    $.writeln(WARNING_PREFIX + msg);
  };
  
  init();
  
})(this, app);