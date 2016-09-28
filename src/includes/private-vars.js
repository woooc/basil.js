// ----------------------------------------
// private vars
var currDoc = null,
    currPage = null,
    currLayer = null,
    currUnits = null,
    currMatrix = null,
    matrixStack = null,
    currColorMode = null,
    currGradientMode = null,
    currFillColor = null,
    currStrokeColor = null,
    currStrokeTint = null,
    currFillTint = null,
    currStrokeWeight = null,
    currRectMode = null,
    currEllipseMode = null,
    noneSwatchColor = null,
    startTime = null,
    currFont = null,
    currFontSize = null,
    currAlign = null,
    currYAlign = null,
    currLeading = null,
    currKerning = null,
    currTracking = null,
    currImageMode = null,
    currCanvasMode = null,
    currVertexPoints = null,
    currPathPointer = null,
    currPolygon = null,
    currShapeMode = null,
    // tmp cache, see addToStroy(), via indesign external library file
    addToStoryCache = null;